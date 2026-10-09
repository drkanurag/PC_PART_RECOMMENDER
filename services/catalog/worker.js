import { categories, getLocalProducts } from "../../js/services/catalog-data.js";

function json(body, status = 200, origin = "") {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=300",
    "X-Content-Type-Options": "nosniff"
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }
  return new Response(JSON.stringify(body), { status, headers });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = env.ALLOWED_ORIGIN || "*";
    if (origin && allowedOrigin !== "*" && origin !== allowedOrigin) {
      return json({ error: "Origin is not allowed." }, 403);
    }
    const effectiveOrigin = allowedOrigin === "*" ? origin || "*" : allowedOrigin;

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": effectiveOrigin,
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Accept",
          "Access-Control-Max-Age": "86400"
        }
      });
    }

    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return json({ service: "catalog", status: "ok", version: "1.0.0" }, 200, effectiveOrigin);
    }

    const isProductsRoute = url.pathname === "/api/products" || url.pathname === "/api/v1/products";
    if (isProductsRoute && request.method !== "GET") {
      return json({ error: "Method not allowed. Use GET." }, 405, effectiveOrigin);
    }
    if (!isProductsRoute) {
      return json({ error: "Route not found." }, 404, effectiveOrigin);
    }
    const maxPrice = url.searchParams.has("maxPrice") ? Number(url.searchParams.get("maxPrice")) : undefined;
    if (maxPrice !== undefined && (!Number.isFinite(maxPrice) || maxPrice < 0)) {
      return json({ error: "maxPrice must be a non-negative number." }, 400, effectiveOrigin);
    }
    const products = getLocalProducts({
      category: url.searchParams.get("category") || "all",
      brand: url.searchParams.get("brand") || "all",
      search: (url.searchParams.get("search") || "").slice(0, 100),
      maxPrice
    });
    return json({ categories, products }, 200, effectiveOrigin);
  }
};
