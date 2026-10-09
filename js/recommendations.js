import { recommendedBuilds as curatedBuilds } from "./services/recommendation-data.js";
import { listBuilds } from "./services/recommendation-service.js";
import { copyQuotationToClipboard, printQuotationView, showToast } from "./ui-enhancements.js";
let recommendedBuilds = curatedBuilds;

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const tierGrid = document.querySelector("#tier-grid");
const detail = document.querySelector("#tier-detail");
const livePrices = new Map();
const liveOfferLists = new Map();

function priceKey(build, index) {
  return `${build.id}-${index}`;
}

function partPrice(build, index) {
  return livePrices.get(priceKey(build, index))?.price ?? build.parts[index][2];
}

recommendedBuilds.forEach((build) => {
  build.parts.forEach(([name, model, estimate], index) => {
    if (estimate > 0) {
      const query = window.RigwiseLivePrices.makeQuery(name, model);
      const cachedOffers = window.RigwiseLivePrices.getCached(query);
      if (cachedOffers?.length) {
        livePrices.set(priceKey(build, index), cachedOffers[0]);
        liveOfferLists.set(priceKey(build, index), cachedOffers);
      }
    }
  });
});

function totalFor(build) {
  return build.parts.reduce((sum, part, index) => sum + partPrice(build, index), 0);
}

function renderTierCards() {
  tierGrid.replaceChildren(...recommendedBuilds.map((build, index) => {
    const card = document.createElement("a");
    card.className = `tier-card${index === 1 ? " is-popular" : ""}`;
    card.href = `recommended-builds.html?tier=${encodeURIComponent(build.id)}#tier-detail`;
    card.setAttribute("aria-label", `View ${build.name}, ${build.label}`);

    const meta = document.createElement("span");
    meta.className = "tier-card-meta";
    meta.innerHTML = `<span>${build.accent}</span><span>${build.audience}</span>`;

    const amount = document.createElement("strong");
    amount.className = "tier-card-budget";
    amount.textContent = build.label;

    const name = document.createElement("span");
    name.className = "tier-card-name";
    name.textContent = build.name;

    const description = document.createElement("span");
    description.className = "tier-card-description";
    description.textContent = build.description;

    const total = document.createElement("span");
    total.className = "tier-card-total";
    total.innerHTML = `<span>LIVE / EST. PARTS TOTAL</span><strong>${currency.format(totalFor(build))}</strong>`;

    const action = document.createElement("span");
    action.className = "tier-card-action";
    action.innerHTML = `See components <span aria-hidden="true">↗</span>`;

    card.append(meta, amount, name, description, total, action);
    return card;
  }));
}

function renderBuildDetails(build) {
  const partContainer = document.querySelector("#tier-parts");
  document.querySelector("#tier-eyebrow").textContent = `${build.accent.toUpperCase()} BUILD · ${build.audience.toUpperCase()}`;
  document.querySelector("#tier-title").textContent = build.name;
  document.querySelector("#tier-description").textContent = build.description;
  document.querySelector("#tier-total").textContent = currency.format(totalFor(build));
  const remaining = build.budget - totalFor(build);
  document.querySelector("#tier-budget").textContent = `${currency.format(build.budget)} target · ${remaining >= 0 ? `${currency.format(remaining)} remaining` : `${currency.format(Math.abs(remaining))} over budget`}`;

  partContainer.replaceChildren(...build.parts.map(([name, model, estimate], index) => {
    const key = priceKey(build, index);
    const liveOffer = livePrices.get(key);
    const row = document.createElement("article");
    row.className = "tier-part-row";
    const component = document.createElement("div");
    component.className = "tier-part-info";
    const label = document.createElement("span");
    label.textContent = name;
    const product = document.createElement("strong");
    product.textContent = model;
    component.append(label, product);
    if (liveOffer) {
      const source = document.createElement("small");
      source.className = "tier-part-live-source";
      source.textContent = `Lowest listed offer · ${liveOffer.source} · ${liveOffer.title}`;
      component.append(source);
      const offerList = window.RigwiseLivePrices.createOfferList(liveOfferLists.get(key));
      if (offerList) {
        component.append(offerList);
      }
    }

    const cost = document.createElement("strong");
    cost.className = "tier-part-price";
    cost.textContent = estimate === 0 ? "Included" : currency.format(partPrice(build, index));

    const search = document.createElement("a");
    search.className = "tier-part-search";
    search.href = liveOffer
      ? liveOffer.link
      : `https://www.google.com/search?tbm=shop&hl=en&gl=IN&q=${encodeURIComponent(`${model} India`)}`;
    search.target = "_blank";
    search.rel = "noopener noreferrer";
    search.textContent = liveOffer
      ? `View ${liveOffer.source} ↗`
      : estimate === 0 ? "Browse ↗" : "Search offers ↗";
    row.append(component, cost, search);
    return row;
  }));

  const customLink = document.querySelector(".tier-custom-link");
  customLink.href = `custom-build.html?budget=${build.budget}`;
  customLink.removeAttribute("target");

  const copyBtn = document.querySelector("#copy-tier-specs");
  if (copyBtn) {
    copyBtn.onclick = () => {
      const items = build.parts.map(([name, model, estimate], index) => {
        const price = partPrice(build, index);
        const liveOffer = livePrices.get(priceKey(build, index));
        return {
          category: name,
          name: model,
          price,
          source: liveOffer ? `Live · ${liveOffer.source}` : "Catalog Estimate"
        };
      });
      copyQuotationToClipboard({
        title: `${build.name} (${build.label})`,
        budget: build.budget,
        total: totalFor(build),
        items
      });
    };
  }

  const printBtn = document.querySelector("#print-tier-quotation");
  if (printBtn) {
    printBtn.onclick = () => printQuotationView();
  }

  document.querySelector(".recommendations-section").classList.add("has-detail");
  detail.hidden = false;
  detail.scrollIntoView({ behavior: "smooth", block: "start" });
  document.querySelector("#refresh-tier-prices").disabled = build.parts.every((part) => part[2] === 0);
}

async function refreshBuildPrices(build) {
  const button = document.querySelector("#refresh-tier-prices");
  const status = document.querySelector("#tier-price-status");
  button.disabled = true;
  status.classList.remove("is-error", "is-success");
  status.textContent = "Checking current Indian retailer offers…";
  const products = build.parts.flatMap(([name, model], index) => (
    build.parts[index][2] === 0
      ? []
      : [{ id: priceKey(build, index), query: window.RigwiseLivePrices.makeQuery(name, model) }]
  ));

  try {
    const payload = await window.RigwiseLivePrices.refresh(products);
    let updated = 0;
    let unavailable = 0;
    let failures = 0;
    payload.results.forEach((result) => {
      if (result.offers?.length) {
        livePrices.set(result.id, result.offers[0]);
        liveOfferLists.set(result.id, result.offers);
        updated += 1;
      } else {
        livePrices.delete(result.id);
        liveOfferLists.delete(result.id);
        if (result.error) {
          failures += 1;
        } else {
          unavailable += 1;
        }
      }
    });
    renderTierCards();
    renderBuildDetails(build);
    button.disabled = true;
    status.classList.toggle("is-success", updated > 0);
    status.classList.toggle("is-error", updated === 0 || unavailable > 0 || failures > 0);
    const time = new Date(payload.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const issues = [];
    if (unavailable) {
      issues.push(`${unavailable} with no offers`);
    }
    if (failures) {
      issues.push(`${failures} searches failed`);
    }
    status.textContent = `${updated} of ${products.length} parts matched offers · checked ${time}${issues.length ? ` · ${issues.join(" · ")}` : ""}.`;
  } catch (error) {
    status.classList.add("is-error");
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

async function initializeRecommendations() {
  const serviceStatus = document.querySelector("#recommendations-service-status");
  serviceStatus.textContent = window.RIGWISE_SERVICE_URLS?.recommendations
    ? "Loading curated builds from the recommendations service…"
    : "Showing the locally bundled recommendations. Configure the recommendations service for an independently deployed build catalog.";
  try {
    const response = await listBuilds();
    recommendedBuilds = response.builds;
    renderTierCards();
    if (response.source === "recommendation-service") {
      serviceStatus.textContent = `${recommendedBuilds.length} builds loaded from the recommendations service.`;
    }
  } catch (error) {
    serviceStatus.classList.add("is-error");
    serviceStatus.textContent = error.message;
    return;
  }

  const requestedBuild = new URLSearchParams(window.location.search).get("tier");
  if (requestedBuild) {
    const selectedBuild = recommendedBuilds.find((build) => build.id === requestedBuild);
    if (selectedBuild) {
      renderBuildDetails(selectedBuild);
      const cachedCount = selectedBuild.parts.filter((part, index) => livePrices.has(priceKey(selectedBuild, index))).length;
      if (cachedCount > 0) {
        const status = document.querySelector("#tier-price-status");
        status.classList.add("is-success");
        status.textContent = `${cachedCount} saved offers restored for this tab. Refresh to check current prices.`;
      }
      document.querySelector("#refresh-tier-prices").addEventListener("click", () => refreshBuildPrices(selectedBuild));
    }
  }
}

initializeRecommendations();
