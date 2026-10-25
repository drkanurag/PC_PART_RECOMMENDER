import { recommendedBuilds } from "../../js/services/recommendation-data.js";

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

function json(body, status = 200, origin = "*") {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": status === 200 ? "public, max-age=300" : "no-store",
    "X-Content-Type-Options": "nosniff"
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function computeBuildTotal(build) {
  if (!Array.isArray(build.parts)) return build.total || build.budget;
  return build.parts.reduce((sum, p) => sum + (p.rawPrice || p.price || 0), 0);
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
      return json({ service: "recommendations", status: "ok", version: "1.1.0" }, 200, effectiveOrigin);
    }

    // Enrich builds with calculated real-time component totals
    const enrichedBuilds = recommendedBuilds.map((build) => {
      const calculatedTotal = computeBuildTotal(build);
      return {
        ...build,
        calculatedTotal,
        totalDifference: calculatedTotal - build.budget
      };
    });

    const isBuildsRoute = url.pathname === "/api/builds" || url.pathname === "/api/v1/builds";
    if (isBuildsRoute) {
      if (request.method !== "GET") {
        return json({ error: "Method not allowed. Use GET." }, 405, effectiveOrigin);
      }
      return json({ builds: enrichedBuilds }, 200, effectiveOrigin);
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

      const useCase = (url.searchParams.get("useCase") || "all").toLowerCase();
      let matched = enrichedBuilds.filter((build) => build.budget <= budget || build.calculatedTotal <= budget * 1.08);

      if (useCase === "gaming") {
        // Prefer builds with dedicated GPUs and high FPS targets
        matched = matched.filter((b) => b.id !== "starter");
      } else if (useCase === "creator") {
        matched = matched.filter((b) => b.id === "creator" || b.id === "enthusiast" || b.id === "balanced");
      }

      if (matched.length === 0) {
        // Fallback to lowest tier if budget is tight
        matched = [enrichedBuilds[0]];
      }

      const recommendations = matched
        .sort((left, right) => right.budget - left.budget)
        .slice(0, 3);

      return json({
        budget,
        useCase,
        recommendations
      }, 200, effectiveOrigin);
    }

    return json({ error: "Route not found." }, 404, effectiveOrigin);
  }
};
