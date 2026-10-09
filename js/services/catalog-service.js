import { categories, getLocalProducts } from "./catalog-data.js";

const endpoint = window.RIGWISE_SERVICE_URLS?.catalog?.trim().replace(/\/+$/, "") || "";

export async function listProducts(filters = {}) {
  if (!endpoint) {
    return { products: getLocalProducts(filters), source: "local-catalog" };
  }

  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "all") {
      params.set(key, String(value));
    }
  });
  try {
    const response = await fetch(`${endpoint}/api/products?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) {
      throw new Error(`Catalog service request failed (${response.status}).`);
    }
    const result = await response.json();
    if (!result || !Array.isArray(result.products)) {
      throw new Error("Catalog service returned an invalid product list.");
    }
    return { products: result.products, source: "catalog-service" };
  } catch (error) {
    console.warn("Catalog microservice request failed; gracefully falling back to bundled data.", error);
    return { products: getLocalProducts(filters), source: "local-catalog-fallback", warning: error.message };
  }
}

export { categories };
