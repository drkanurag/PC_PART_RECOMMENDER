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
    if (origin && origin !== env.ALLOWED_ORIGIN) {
      return json({ error: "Origin is not allowed." }, 403);
    }
    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return json({ service: "catalog", status: "ok" }, 200, origin);
    }
    if (request.method !== "GET" || url.pathname !== "/api/products") {
      return json({ error: "Route not found." }, 404, origin);
    }
    const maxPrice = url.searchParams.has("maxPrice") ? Number(url.searchParams.get("maxPrice")) : undefined;
    if (maxPrice !== undefined && (!Number.isFinite(maxPrice) || maxPrice < 0)) {
      return json({ error: "maxPrice must be a non-negative number." }, 400, origin);
    }
    const products = getLocalProducts({
      category: url.searchParams.get("category") || "all",
      brand: url.searchParams.get("brand") || "all",
      search: (url.searchParams.get("search") || "").slice(0, 100),
      maxPrice
    });
    return json({ categories, products }, 200, origin);
  }
};
