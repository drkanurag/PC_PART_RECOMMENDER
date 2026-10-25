import { categories, getLocalProducts } from "../../js/services/catalog-data.js";

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
  if (!requestOrigin) return "*";
  const allowed = getAllowedOrigins(env);
  if (allowed.includes("*") || allowed.length === 0) return "*";
  if (allowed.includes(requestOrigin)) return requestOrigin;
  return null;
}

function json(body, status = 200, origin = "*", extraHeaders = {}) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": status === 200 ? "public, max-age=300" : "no-store",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return new Response(JSON.stringify(body), { status, headers });
}

export default {
  async fetch(request, env) {
    const originHeader = request.headers.get("Origin") || "";
    const effectiveOrigin = resolveOrigin(originHeader, env);

    if (originHeader && !effectiveOrigin) {
      return json({ error: "Origin is not allowed." }, 403, originHeader);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": effectiveOrigin || "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Accept",
          "Access-Control-Max-Age": "86400",
          Vary: "Origin"
        }
      });
    }

    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return json({ service: "catalog", status: "ok", version: "1.1.0" }, 200, effectiveOrigin);
    }

    const isProductsRoute = url.pathname === "/api/products" || url.pathname === "/api/v1/products";
    if (isProductsRoute && request.method !== "GET") {
      return json({ error: "Method not allowed. Use GET." }, 405, effectiveOrigin);
    }
    if (!isProductsRoute) {
      return json({ error: "Route not found." }, 404, effectiveOrigin);
    }

    // Category validation
    const category = url.searchParams.get("category") || "all";
    if (category !== "all" && !categories.some((c) => c.id === category)) {
      return json({ error: `Unknown category '${category}'. Valid categories are: ${categories.map((c) => c.id).join(", ")}` }, 400, effectiveOrigin);
    }

    // maxPrice handling: treat empty string or missing as undefined (not 0)
    let maxPrice;
    if (url.searchParams.has("maxPrice")) {
      const rawMax = url.searchParams.get("maxPrice").trim();
      if (rawMax !== "") {
        maxPrice = Number(rawMax);
        if (!Number.isFinite(maxPrice) || maxPrice < 0) {
          return json({ error: "maxPrice must be a non-negative number." }, 400, effectiveOrigin);
        }
      }
    }

    let minPrice;
    if (url.searchParams.has("minPrice")) {
      const rawMin = url.searchParams.get("minPrice").trim();
      if (rawMin !== "") {
        minPrice = Number(rawMin);
        if (!Number.isFinite(minPrice) || minPrice < 0) {
          return json({ error: "minPrice must be a non-negative number." }, 400, effectiveOrigin);
        }
      }
    }

    let products = getLocalProducts({
      category,
      brand: url.searchParams.get("brand") || "all",
      search: (url.searchParams.get("search") || "").slice(0, 100),
      maxPrice
    });

    if (minPrice !== undefined) {
      products = products.filter((p) => p.price >= minPrice);
    }

    // Sorting
    const sort = url.searchParams.get("sort");
    if (sort === "price-asc") {
      products.sort((a, b) => a.price - b.price);
    } else if (sort === "price-desc") {
      products.sort((a, b) => b.price - a.price);
    } else if (sort === "brand") {
      products.sort((a, b) => a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model));
    }

    // Pagination
    const total = products.length;
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 24));
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const pageCount = Math.ceil(total / limit) || 1;
    const paginatedProducts = products.slice((page - 1) * limit, page * limit);

    return json({
      categories,
      products: paginatedProducts,
      pagination: {
        total,
        page,
        pageCount,
        limit
      }
    }, 200, effectiveOrigin);
  }
};
