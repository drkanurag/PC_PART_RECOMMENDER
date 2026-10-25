/**
 * Rigwise Live Pricing Service — Cloudflare Worker
 * Hardened with global budget protection, circuit breaker, offer sanity filtering, and strict CORS.
 */

const MAX_PRODUCTS_PER_REQUEST = 8;
const MAX_UNCACHED_SEARCHES_PER_HOUR = 24;
const DEFAULT_MONTHLY_LIMIT = 250;
const DEFAULT_DAILY_LIMIT = 30;
const CACHE_TTL_SECONDS = 3600; // 1 hour for valid offers
const EMPTY_CACHE_TTL_SECONDS = 60; // 1 minute for empty results

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function getAllowedOrigins(env) {
  const list = [];
  if (env.ALLOWED_ORIGINS) {
    list.push(...env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()));
  }
  if (env.ALLOWED_ORIGIN && !list.includes(env.ALLOWED_ORIGIN.trim())) {
    list.push(env.ALLOWED_ORIGIN.trim());
  }
  return list;
}

function resolveOrigin(requestOrigin, env) {
  if (!requestOrigin) return null;
  const allowed = getAllowedOrigins(env);
  if (allowed.includes("*")) return "*";
  if (allowed.includes(requestOrigin)) return requestOrigin;
  return null;
}

function jsonResponse(body, status, origin, extraHeaders = {}) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": status === 200 ? "public, max-age=60" : "no-store",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function normalizeProduct(item) {
  if (!item || typeof item.id !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(item.id)) {
    throw new HttpError(400, "Each part needs a valid product ID.");
  }
  if (typeof item.query !== "string") {
    throw new HttpError(400, "Each part needs a product search query.");
  }
  const query = item.query.trim().replace(/\s+/g, " ");
  if (query.length < 5 || query.length > 160 || !/^[a-zA-Z0-9][a-zA-Z0-9\s.+()/,&-]*$/.test(query)) {
    throw new HttpError(400, "A product search query contains unsupported text.");
  }
  const catalogPrice = Number(item.catalogPrice);
  return {
    id: item.id,
    query,
    catalogPrice: Number.isFinite(catalogPrice) && catalogPrice > 0 ? catalogPrice : null
  };
}

async function hashQuery(query) {
  const bytes = new TextEncoder().encode(query.toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Offer Sanity Filter: Drop used/refurbished/accessory listings and extreme price outliers
const UNWANTED_TITLE_PATTERNS = /\b(used|refurbished|pre-owned|renewed|box only|case only|keychain|cooling pad only|skin only|bracket only)\b/i;

function normalizeOffers(items, catalogPrice) {
  if (!Array.isArray(items)) {
    return [];
  }
  const filtered = items.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const price = Number(item.extracted_price);
    if (!Number.isFinite(price) || price <= 0 || price > 10000000 || typeof item.link !== "string") {
      return [];
    }
    const title = typeof item.title === "string" ? item.title.slice(0, 240) : "Product listing";

    // Reject suspicious titles
    if (UNWANTED_TITLE_PATTERNS.test(title)) {
      return [];
    }

    // Reject prices far below catalog estimate (< 45%), which almost always signifies an accessory or cable
    if (catalogPrice && price < catalogPrice * 0.45) {
      return [];
    }

    let link;
    try {
      link = new URL(item.link);
    } catch {
      return [];
    }
    if (link.protocol !== "https:") {
      return [];
    }
    return [{
      title,
      source: typeof item.source === "string" ? item.source.slice(0, 100) : "Retailer",
      price,
      currency: "INR",
      link: link.href
    }];
  });

  // Sort by price
  filtered.sort((left, right) => left.price - right.price);

  // If we have >= 3 offers, drop extreme outliers (> 2.5x median)
  if (filtered.length >= 3) {
    const mid = Math.floor(filtered.length / 2);
    const median = filtered[mid].price;
    return filtered.filter((o) => o.price <= median * 2.2).slice(0, 5);
  }

  return filtered.slice(0, 5);
}

// Global Budget Limiter to protect SerpApi free monthly allowance (250 searches)
async function checkGlobalBudget(env) {
  const now = new Date();
  const monthKey = `budget:month:${now.toISOString().slice(0, 7)}`;
  const dayKey = `budget:day:${now.toISOString().slice(0, 10)}`;

  const monthlyLimit = Number(env.MONTHLY_SEARCH_LIMIT) || DEFAULT_MONTHLY_LIMIT;
  const dailyLimit = Number(env.DAILY_SEARCH_LIMIT) || DEFAULT_DAILY_LIMIT;

  const monthCount = Number(await env.PRICE_DATA.get(monthKey) || 0);
  const dayCount = Number(await env.PRICE_DATA.get(dayKey) || 0);

  if (monthCount >= monthlyLimit) {
    return {
      allowed: false,
      reason: "Monthly provider quota reached. Returning cached prices only.",
      warning: "quota_exceeded"
    };
  }
  if (dayCount >= dailyLimit) {
    return {
      allowed: false,
      reason: "Daily provider quota reached. Returning cached prices only.",
      warning: "daily_quota_exceeded"
    };
  }

  const isNearLimit = monthCount >= monthlyLimit * 0.8;
  return {
    allowed: true,
    monthKey,
    dayKey,
    monthCount,
    dayCount,
    warning: isNearLimit ? "approaching_monthly_limit" : null
  };
}

// Increment quota ONLY after a successful external SerpApi call
async function recordSuccessfulSearch(env, budgetCheck) {
  if (!budgetCheck || !budgetCheck.monthKey) return;
  try {
    await env.PRICE_DATA.put(budgetCheck.monthKey, String(budgetCheck.monthCount + 1), { expirationTtl: 35 * 86400 });
    await env.PRICE_DATA.put(budgetCheck.dayKey, String(budgetCheck.dayCount + 1), { expirationTtl: 2 * 86400 });
  } catch (err) {
    console.warn("Could not record budget usage:", err);
  }
}

async function getOffers(product, env, forceRefresh, budgetCheck) {
  const cacheKey = `offer:${await hashQuery(product.query)}`;
  
  // Try reading from cache first
  const cached = await env.PRICE_DATA.get(cacheKey, "json");
  if (!forceRefresh && cached) {
    return { id: product.id, ...cached, fromCache: true };
  }

  // If live pricing is globally disabled or budget exceeded, return cached even on forceRefresh
  if (env.LIVE_PRICES_ENABLED === "false" || !budgetCheck.allowed) {
    if (cached) {
      return { id: product.id, ...cached, fromCache: true, note: budgetCheck.reason };
    }
    return { id: product.id, offers: [], error: budgetCheck.reason || "Live prices in cache-only mode." };
  }

  // External SerpApi fetch
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_shopping");
  url.searchParams.set("google_domain", "google.co.in");
  url.searchParams.set("gl", "in");
  url.searchParams.set("hl", "en");
  url.searchParams.set("q", product.query);
  url.searchParams.set("no_cache", String(forceRefresh));
  url.searchParams.set("api_key", env.SERPAPI_API_KEY);

  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error("The shopping provider could not complete this search.");
  }

  // Record quota increment only on success
  await recordSuccessfulSearch(env, budgetCheck);

  const offers = normalizeOffers(data.shopping_results, product.catalogPrice);
  const value = {
    offers,
    updatedAt: new Date().toISOString(),
    fromCache: false
  };

  // Cache valid non-empty offers for 1 hr; empty offers for only 60s
  const ttl = offers.length > 0 ? CACHE_TTL_SECONDS : EMPTY_CACHE_TTL_SECONDS;
  await env.PRICE_DATA.put(cacheKey, JSON.stringify(value), { expirationTtl: ttl });

  return { id: product.id, ...value };
}

async function checkClientRateLimit(products, env, request, forceRefresh) {
  const uncachedCount = forceRefresh
    ? products.length
    : (await Promise.all(products.map(async (product) => {
        const key = `offer:${await hashQuery(product.query)}`;
        return env.PRICE_DATA.get(key).then((cached) => cached ? 0 : 1);
      }))).reduce((sum, count) => sum + count, 0);

  if (uncachedCount === 0) {
    return;
  }

  const hour = new Date().toISOString().slice(0, 13);
  const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
  const rateKey = `rate:${hour}:${await hashQuery(clientIp)}`;
  const used = Number(await env.PRICE_DATA.get(rateKey) || 0);

  if (!Number.isInteger(used) || used + uncachedCount > MAX_UNCACHED_SEARCHES_PER_HOUR) {
    throw new HttpError(429, "Live price search limit reached for this hour (24/hr). Please try again later.");
  }
  await env.PRICE_DATA.put(rateKey, String(used + uncachedCount), { expirationTtl: 7200 });
}

async function handlePrices(request, env, origin) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Use POST to refresh selected product prices." }, 405, origin);
  }
  if (!env.SERPAPI_API_KEY || !env.PRICE_DATA) {
    return jsonResponse({ error: "Live price service is not configured. Add its API secret and KV binding." }, 503, origin);
  }

  // Body size limit (max 16KB)
  const contentLength = Number(request.headers.get("content-length"));
  if (contentLength && contentLength > 16384) {
    return jsonResponse({ error: "Request body too large. Maximum 16KB allowed." }, 413, origin);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400, origin);
  }

  if (!body || !Array.isArray(body.products) || body.products.length < 1 || body.products.length > MAX_PRODUCTS_PER_REQUEST) {
    return jsonResponse({ error: "Send between one and eight selected parts per refresh." }, 400, origin);
  }
  if (body.forceRefresh !== undefined && typeof body.forceRefresh !== "boolean") {
    return jsonResponse({ error: "forceRefresh must be true or false." }, 400, origin);
  }

  try {
    const forceRefresh = body.forceRefresh === true;
    const products = body.products.map(normalizeProduct);
    const ids = new Set(products.map((p) => p.id));
    if (ids.size !== products.length) {
      throw new HttpError(400, "Product IDs must be unique within a refresh.");
    }

    // Client rate limiter
    await checkClientRateLimit(products, env, request, forceRefresh);

    // Global budget limiter
    const budgetCheck = await checkGlobalBudget(env);

    // Fetch offers
    const results = await Promise.all(products.map(async (product) => {
      try {
        return await getOffers(product, env, forceRefresh, budgetCheck);
      } catch (err) {
        return { id: product.id, offers: [], error: err.message || "Could not retrieve offers for this part." };
      }
    }));

    const extraHeaders = {};
    if (budgetCheck.warning) {
      extraHeaders["X-Quota-Status"] = budgetCheck.warning;
    }

    return jsonResponse({
      results,
      updatedAt: new Date().toISOString(),
      cachedForSeconds: CACHE_TTL_SECONDS,
      budgetStatus: budgetCheck.warning || "ok"
    }, 200, origin, extraHeaders);
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse({ error: error.message }, error.status, origin);
    }
    return jsonResponse({ error: "The live price service could not complete this request." }, 502, origin);
  }
}

export default {
  async fetch(request, env) {
    const originHeader = request.headers.get("Origin");
    const allowedOrigin = resolveOrigin(originHeader, env);
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health" && request.method === "GET") {
      return jsonResponse({
        service: "live-pricing",
        status: "ok",
        version: "1.1.0",
        configured: Boolean(env.SERPAPI_API_KEY && env.PRICE_DATA),
        liveEnabled: env.LIVE_PRICES_ENABLED !== "false"
      }, 200, allowedOrigin || originHeader);
    }

    // Origin verification
    if (!allowedOrigin) {
      return jsonResponse({ error: "Origin is not allowed." }, 403, originHeader);
    }

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Accept",
          "Access-Control-Max-Age": "86400",
          Vary: "Origin"
        }
      });
    }

    const isPricesRoute = url.pathname === "/api/v1/prices" || url.pathname === "/api/prices";
    if (!isPricesRoute) {
      return jsonResponse({ error: "Route not found." }, 404, allowedOrigin);
    }

    const extraHeaders = url.pathname === "/api/prices" ? { "Deprecation": "Use /api/v1/prices" } : {};
    return handlePrices(request, env, allowedOrigin);
  }
};
