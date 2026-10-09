window.RigwiseLivePrices = (() => {
  const CACHE_KEY = "rigwise-live-price-cache-v1";
  const CACHE_TTL_MS = 60 * 60 * 1000;
  const configuredEndpoint = window.RIGWISE_PRICE_API_URL || window.RIGWISE_SERVICE_URLS?.pricing;
  const endpoint = typeof configuredEndpoint === "string"
    ? configuredEndpoint.trim().replace(/\/+$/, "")
    : "";
  const cachedOffers = new Map();

  function isSafeOffer(offer) {
    if (!offer || !Number.isFinite(offer.price) || offer.price <= 0 || typeof offer.link !== "string") {
      return false;
    }
    try {
      return new URL(offer.link).protocol === "https:";
    } catch {
      return false;
    }
  }

  try {
    const saved = sessionStorage.getItem(CACHE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        Object.entries(parsed).forEach(([query, entry]) => {
          if (
            entry
            && Array.isArray(entry.offers)
            && entry.offers.some(isSafeOffer)
            && Date.now() - Date.parse(entry.updatedAt) < CACHE_TTL_MS
          ) {
            cachedOffers.set(query, entry);
          }
        });
      }
    }
  } catch (error) {
    console.warn("Saved live price cache could not be restored.", error);
  }

  function makeQuery(...values) {
    return `${values.filter(Boolean).join(" ")} India`
      .replace(/[^\w\s.+()/,&-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getCached(query) {
    const entry = cachedOffers.get(query);
    if (!entry) {
      return null;
    }
    if (Date.now() - Date.parse(entry.updatedAt) >= CACHE_TTL_MS) {
      cachedOffers.delete(query);
      return null;
    }
    return entry.offers.filter(isSafeOffer);
  }

  function saveCachedOffers(products, payload) {
    const queriesById = new Map(products.map((product) => [product.id, product.query]));
    payload.results.forEach((result) => {
      const query = queriesById.get(result.id);
      if (!query || !Array.isArray(result.offers)) {
        return;
      }
      if (result.offers.length === 0) {
        cachedOffers.delete(query);
        return;
      }
      const offers = result.offers.flatMap((offer) => {
        if (!isSafeOffer(offer)) {
          return [];
        }
        const link = new URL(offer.link);
        return link.protocol === "https:" ? [{ ...offer, link: link.href }] : [];
      });
      if (offers.length === 0) {
        cachedOffers.delete(query);
        return;
      }
      const entry = {
        offers,
        updatedAt: result.updatedAt || payload.updatedAt
      };
      cachedOffers.set(query, entry);
    });
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(cachedOffers)));
  }

  function createOfferList(offers) {
    if (!Array.isArray(offers) || offers.length < 2) {
      return null;
    }
    const currency = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    });
    const details = document.createElement("details");
    details.className = "live-offer-list";
    const summary = document.createElement("summary");
    summary.textContent = `Compare ${offers.length} retailer offers`;
    const list = document.createElement("div");
    list.className = "live-offer-items";
    offers.forEach((offer) => {
      const link = document.createElement("a");
      link.className = "live-offer-item";
      link.href = offer.link;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.title = offer.title;
      const source = document.createElement("span");
      source.textContent = `${offer.source} · ${offer.title}`;
      const price = document.createElement("strong");
      price.textContent = currency.format(offer.price);
      link.append(source, price);
      list.append(link);
    });
    details.append(summary, list);
    return details;
  }

  async function refresh(products) {
    if (!endpoint) {
      throw new Error("Live prices are not connected. Deploy the price API and set its URL in js/price-config.js.");
    }
    if (!Array.isArray(products) || products.length < 1 || products.length > 8) {
      throw new Error("A price refresh must contain between one and eight selected parts.");
    }

    const response = await fetch(`${endpoint}/api/prices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products, forceRefresh: true }),
      signal: AbortSignal.timeout(20000)
    });

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error("The live price service returned an unreadable response.");
    }
    if (!response.ok) {
      throw new Error(payload.error || `Live price service failed (${response.status}).`);
    }
    if (!Array.isArray(payload.results)) {
      throw new Error("The live price service returned an invalid result.");
    }
    saveCachedOffers(products, payload);
    return payload;
  }

  return { createOfferList, getCached, makeQuery, refresh };
})();
