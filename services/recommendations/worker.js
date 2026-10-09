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
    if (origin && origin !== env.ALLOWED_ORIGIN) {
      return json({ error: "Origin is not allowed." }, 403);
    }
    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return json({ service: "recommendations", status: "ok" }, 200, origin);
    }
    if (request.method === "GET" && url.pathname === "/api/builds") {
      return json({ builds: recommendedBuilds }, 200, origin);
    }
    if (request.method !== "GET" || url.pathname !== "/api/recommendations") {
      return json({ error: "Route not found." }, 404, origin);
    }
    const budget = Number(url.searchParams.get("budget"));
    if (!Number.isFinite(budget) || budget < 20000 || budget > 1000000) {
      return json({ error: "budget must be between 20000 and 1000000." }, 400, origin);
    }
    const recommendations = recommendedBuilds
      .filter((build) => build.budget <= budget)
      .sort((left, right) => right.budget - left.budget)
      .slice(0, 3);
    return json({ recommendations }, 200, origin);
  }
};
