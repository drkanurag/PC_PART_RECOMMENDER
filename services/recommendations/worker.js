import { recommendedBuilds } from "../../js/services/recommendation-data.js";

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
      return json({ service: "recommendations", status: "ok", version: "1.0.0" }, 200, effectiveOrigin);
    }

    const isBuildsRoute = url.pathname === "/api/builds" || url.pathname === "/api/v1/builds";
    if (isBuildsRoute) {
      if (request.method !== "GET") {
        return json({ error: "Method not allowed. Use GET." }, 405, effectiveOrigin);
      }
      return json({ builds: recommendedBuilds }, 200, effectiveOrigin);
    }

    const isRecommendationsRoute = url.pathname === "/api/recommendations" || url.pathname === "/api/v1/recommendations";
    if (isRecommendationsRoute) {
      if (request.method !== "GET") {
        return json({ error: "Method not allowed. Use GET." }, 405, effectiveOrigin);
      }
      const budget = Number(url.searchParams.get("budget"));
      if (!Number.isFinite(budget) || budget < 20000 || budget > 1000000) {
        return json({ error: "budget must be between 20000 and 1000000." }, 400, effectiveOrigin);
      }
      const recommendations = recommendedBuilds
        .filter((build) => build.budget <= budget)
        .sort((left, right) => right.budget - left.budget)
        .slice(0, 3);
      return json({ recommendations }, 200, effectiveOrigin);
    }

    return json({ error: "Route not found." }, 404, effectiveOrigin);
  }
};
