import { recommendedBuilds } from "./recommendation-data.js";

const endpoint = window.RIGWISE_SERVICE_URLS?.recommendations?.trim().replace(/\/+$/, "") || "";

function isValidBuildList(builds) {
  return Array.isArray(builds) && builds.every((build) => (
    build
    && typeof build.id === "string"
    && Number.isFinite(build.budget)
    && Array.isArray(build.parts)
    && build.parts.every((part) => Array.isArray(part) && part.length === 3 && Number.isFinite(part[2]))
  ));
}

export async function listBuilds() {
  if (!endpoint) {
    return { source: "local-recommendations", builds: recommendedBuilds };
  }
  const response = await fetch(`${endpoint}/api/builds`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) {
    throw new Error(`Recommendation service request failed (${response.status}).`);
  }
  const result = await response.json();
  if (!result || !isValidBuildList(result.builds)) {
    throw new Error("Recommendation service returned an invalid build list.");
  }
  return { source: "recommendation-service", builds: result.builds };
}

export async function getRecommendations(budget) {
  if (!Number.isFinite(budget) || budget < 20000 || budget > 1000000) {
    throw new Error("Choose a budget between ₹20,000 and ₹10,00,000.");
  }
  if (!endpoint) {
    return {
      source: "local-recommendations",
      recommendations: recommendedBuilds
        .filter((build) => build.budget <= budget)
        .sort((left, right) => right.budget - left.budget)
        .slice(0, 3)
    };
  }
  const response = await fetch(`${endpoint}/api/recommendations?budget=${encodeURIComponent(budget)}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) {
    throw new Error(`Recommendation service request failed (${response.status}).`);
  }
  const result = await response.json();
  if (!result || !isValidBuildList(result.recommendations)) {
    throw new Error("Recommendation service returned an invalid response.");
  }
  return { source: "recommendation-service", recommendations: result.recommendations };
}
