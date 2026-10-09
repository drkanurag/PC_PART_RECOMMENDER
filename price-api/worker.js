const MAX_PRODUCTS_PER_REQUEST = 8;
const MAX_UNCACHED_SEARCHES_PER_HOUR = 24;
const CACHE_TTL_SECONDS = 3600;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function jsonResponse(body, status, origin) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
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
  return { id: item.id, query };
}

async function hashQuery(query) {
  const bytes = new TextEncoder().encode(query.toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeOffers(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const price = Number(item.extracted_price);
    if (!Number.isFinite(price) || price <= 0 || price > 10000000 || typeof item.link !== "string") {
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
      title: typeof item.title === "string" ? item.title.slice(0, 240) : "Product listing",
      source: typeof item.source === "string" ? item.source.slice(0, 100) : "Retailer",
      price,
      currency: "INR",
      link: link.href
    }];
  }).sort((left, right) => left.price - right.price).slice(0, 5);
}

async function getOffers(product, env, forceRefresh) {
  const cacheKey = `offer:${await hashQuery(product.query)}`;
  if (!forceRefresh) {
    const cached = await env.PRICE_DATA.get(cacheKey, "json");
    if (cached) {
      return { id: product.id, ...cached };
    }
  }

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

  const value = {
    offers: normalizeOffers(data.shopping_results),
    updatedAt: new Date().toISOString()
  };
  await env.PRICE_DATA.put(cacheKey, JSON.stringify(value), {
    expirationTtl: CACHE_TTL_SECONDS
  });
  return { id: product.id, ...value };
}

async function checkSearchLimit(products, env, request, forceRefresh) {
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
    throw new HttpError(429, "Live price search limit reached for this hour. Please try again later.");
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
    const ids = new Set(products.map((product) => product.id));
    if (ids.size !== products.length) {
      throw new HttpError(400, "Product IDs must be unique within a refresh.");
    }
    await checkSearchLimit(products, env, request, forceRefresh);

    const results = await Promise.all(products.map(async (product) => {
      try {
        return await getOffers(product, env, forceRefresh);
      } catch {
        return { id: product.id, offers: [], error: "Could not retrieve offers for this part." };
      }
    }));
    return jsonResponse({
      results,
      updatedAt: new Date().toISOString(),
      cachedForSeconds: CACHE_TTL_SECONDS
    }, 200, origin);
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse({ error: error.message }, error.status, origin);
    }
    return jsonResponse({ error: "The live price service could not complete this request." }, 502, origin);
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const allowedOrigin = env.ALLOWED_ORIGIN;
    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return jsonResponse({
        service: "live-pricing",
        status: "ok",
        version: "1.0.0",
        configured: Boolean(env.SERPAPI_API_KEY && env.PRICE_DATA)
      }, 200, origin === allowedOrigin ? allowedOrigin : null);
    }
    if (!allowedOrigin || origin !== allowedOrigin) {
      return jsonResponse({ error: "Origin is not allowed." }, 403);
    }
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
          Vary: "Origin"
        }
      });
    }

    const isPricesRoute = url.pathname === "/api/prices" || url.pathname === "/api/v1/prices";
    if (!isPricesRoute) {
      return jsonResponse({ error: "Route not found." }, 404, allowedOrigin);
    }
    return handlePrices(request, env, allowedOrigin);
  }
};
