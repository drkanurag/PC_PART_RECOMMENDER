import { pcParts } from "./services/parts-data.js";
import { copyQuotationToClipboard, printQuotationView, showToast } from "./ui-enhancements.js";
import { addItem } from "./services/cart-service.js";
const partOrder = ["processor", "motherboard", "memory", "storage", "graphics", "power", "case", "cooler"];
const initialSelections = {
  processor: "amd-5600g",
  motherboard: "msi-b550m",
  memory: "corsair-ddr4-16",
  storage: "wd-sn580-1tb",
  graphics: "no-gpu",
  power: "corsair-cv550",
  case: "ant-ice110",
  cooler: "stock-cooler"
};
const BUILDER_STORAGE_KEY = "rigwise-pc-builder-v1";
const urlParams = new URLSearchParams(window.location.search);
const requestedStep = partOrder.indexOf(urlParams.get("component"));
const queryBudget = Number(urlParams.get("budget"));
const hasRequestedBudget = Number.isInteger(queryBudget) && queryBudget >= 20000 && queryBudget <= 1000000;
const selectedParts = { ...initialSelections };
const brandFilters = Object.fromEntries(partOrder.map((category) => [category, "all"]));
let activeStep = requestedStep < 0 ? 0 : requestedStep;
const builderContainer = document.querySelector("#builder-parts");
const stepNav = document.querySelector("#builder-step-nav");
const stepCount = document.querySelector("#builder-step-count");
const previousStepButton = document.querySelector("#previous-step");
const nextStepButton = document.querySelector("#next-step");
const builderBudget = document.querySelector("#builder-budget");
const buildTotal = document.querySelector("#build-total");
const budgetRemaining = document.querySelector("#budget-remaining");
const budgetProgress = document.querySelector("#budget-progress");
const budgetProgressFill = document.querySelector("#budget-progress-fill");
const builderAlert = document.querySelector("#builder-alert");
const summaryItems = document.querySelector("#summary-items");
const summaryDetails = document.querySelector(".summary-details");
const livePriceStatus = document.querySelector("#live-price-status");
const refreshPricesButton = document.querySelector("#refresh-build-prices");
const livePrices = new Map();
const liveOfferLists = new Map();
let lastValidBuilderBudget = hasRequestedBudget ? queryBudget : 100000;
const compactSummary = window.matchMedia("(max-width: 800px)");
let wasCompactSummary = compactSummary.matches;
summaryDetails.open = !wasCompactSummary;

function saveBuilderState() {
  localStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify({
    selectedParts,
    budget: getBudget()
  }));
}

function restoreBuilderState() {
  const saved = localStorage.getItem(BUILDER_STORAGE_KEY);
  if (!saved) {
    return;
  }

  let state;
  try {
    state = JSON.parse(saved);
  } catch (error) {
    localStorage.removeItem(BUILDER_STORAGE_KEY);
    builderAlert.hidden = false;
    builderAlert.classList.add("is-error");
    builderAlert.textContent = "Saved build data could not be read. A new build has been started.";
    return;
  }

  if (state && state.selectedParts && typeof state.selectedParts === "object") {
    partOrder.forEach((category) => {
      const savedProduct = pcParts[category].products.find(
        (product) => product.id === state.selectedParts[category]
      );
      if (savedProduct) {
        selectedParts[category] = savedProduct.id;
      }
    });
  }

  if (!hasRequestedBudget && Number.isInteger(state?.budget) && state.budget >= 20000 && state.budget <= 1000000) {
    lastValidBuilderBudget = state.budget;
  }

  const budgetInput = document.querySelector("#budget");
  budgetInput.value = String(lastValidBuilderBudget);
  document.querySelector("#budget-slider").value = String(lastValidBuilderBudget);
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(price);
}

function getProduct(category) {
  return pcParts[category].products.find((product) => product.id === selectedParts[category]);
}

function getCurrentPrice(product) {
  return livePrices.get(product.id)?.price ?? product.price;
}

function getBoardCompatible(category) {
  const cpu = getProduct("processor");
  const board = getProduct("motherboard");

  if (category === "motherboard") {
    return pcParts[category].products.filter((product) => product.socket === cpu.socket);
  }
  if (category === "memory") {
    return pcParts[category].products.filter((product) => product.memory === board.memory);
  }
  if (category === "graphics") {
    return pcParts[category].products.filter((product) =>
      product.id !== "no-gpu" || cpu.graphics
    );
  }
  if (category === "power") {
    const requiredWatts = getRequiredWattage();
    return pcParts[category].products.filter((product) => product.watts >= requiredWatts);
  }
  if (category === "case") {
    return pcParts[category].products.filter((product) =>
      product.size === "ATX" || product.size === board.size
    );
  }
  if (category === "cooler") {
    return pcParts[category].products.filter((product) =>
      product.sockets.includes(cpu.socket) && (!product.stock || cpu.coolerIncluded)
    );
  }
  return pcParts[category].products;
}

function getBuildTotal(exceptCategory = null) {
  return partOrder.reduce((sum, category) => {
    if (category === exceptCategory) {
      return sum;
    }
    const product = getProduct(category);
    return sum + (product ? getCurrentPrice(product) : 0);
  }, 0);
}

function getRequiredWattage() {
  const cpu = getProduct("processor");
  const gpu = getProduct("graphics");
  const estimated = Math.ceil(((cpu.watts + gpu.watts) * 1.35) / 50) * 50;
  return Math.max(gpu.minimumPsu ?? 0, estimated);
}

function chooseCompatible(category, currentId) {
  const compatible = getBoardCompatible(category);
  const current = compatible.find((product) => product.id === currentId);

  if (current) {
    return current.id;
  }
  if (category === "graphics" && !getProduct("processor").graphics) {
    return compatible.find((product) => product.id !== "no-gpu")?.id ?? compatible[0]?.id;
  }
  if (category === "cooler" && !getProduct("processor").coolerIncluded) {
    return compatible.find((product) => !product.stock)?.id ?? compatible[0]?.id;
  }
  if (category === "power") {
    const totalWithoutPower = getBuildTotal("power");
    const affordable = compatible.filter((product) => totalWithoutPower + getCurrentPrice(product) <= getBudget());
    return (affordable[0] ?? compatible[0])?.id;
  }
  return [...compatible].sort((left, right) => getCurrentPrice(left) - getCurrentPrice(right))[0]?.id;
}

function reconcileParts(changedCategory) {
  if (changedCategory === "processor") {
    selectedParts.motherboard = chooseCompatible("motherboard", selectedParts.motherboard);
  }

  if (changedCategory === "processor" || changedCategory === "motherboard") {
    selectedParts.memory = chooseCompatible("memory", selectedParts.memory);
  }

  if (changedCategory === "processor") {
    selectedParts.cooler = chooseCompatible("cooler", selectedParts.cooler);
    selectedParts.graphics = chooseCompatible("graphics", selectedParts.graphics);
  }

  if (changedCategory === "motherboard") {
    selectedParts.case = chooseCompatible("case", selectedParts.case);
  }

  if (changedCategory === "processor" || changedCategory === "graphics") {
    selectedParts.power = chooseCompatible("power", selectedParts.power);
  }
}

function getBudget() {
  const value = Number(document.querySelector("#budget").value);
  if (Number.isFinite(value) && value >= 20000 && value <= 1000000) {
    lastValidBuilderBudget = value;
  }
  return lastValidBuilderBudget;
}

function getCompatibleProducts(category) {
  return getBoardCompatible(category);
}

function createSelect(label, className, options, selectedValue, onChange) {
  const wrapper = document.createElement("label");
  wrapper.className = "builder-field";
  const labelText = document.createElement("span");
  labelText.textContent = label;

  const select = document.createElement("select");
  select.className = className;
  options.forEach((optionData) => {
    const option = document.createElement("option");
    option.value = optionData.value;
    option.textContent = optionData.label;
    select.append(option);
  });
  select.value = selectedValue;
  select.addEventListener("change", () => onChange(select.value));
  wrapper.append(labelText, select);
  return wrapper;
}

function createProductCard(category, index) {
  const config = pcParts[category];
  const compatible = getCompatibleProducts(category);
  const card = document.createElement("article");
  card.className = "builder-part-card";

  const top = document.createElement("div");
  top.className = "part-card-top";
  const step = document.createElement("span");
  step.className = "part-step";
  step.textContent = String(index + 1).padStart(2, "0");
  const titleGroup = document.createElement("div");
  titleGroup.className = "part-card-title";
  const title = document.createElement("h3");
  title.textContent = config.label;
  const subtitle = document.createElement("p");
  subtitle.textContent = config.subtitle;
  titleGroup.append(title, subtitle);
  top.append(step, titleGroup);

  const fields = document.createElement("div");
  fields.className = "builder-fields";

  const brands = [...new Set(compatible.map((product) => product.brand))];
  if (!brands.includes(brandFilters[category])) {
    brandFilters[category] = "all";
  }
  const brandOptions = [
    { value: "all", label: "All brands" },
    ...brands.map((brand) => ({ value: brand, label: brand }))
  ];
  fields.append(createSelect("BRAND", "brand-select", brandOptions, brandFilters[category], (value) => {
    brandFilters[category] = value;
    const productsInBrand = value === "all"
      ? compatible
      : compatible.filter((product) => product.brand === value);
    if (!productsInBrand.some((product) => product.id === selectedParts[category])) {
      selectedParts[category] = [...productsInBrand].sort((a, b) => getCurrentPrice(a) - getCurrentPrice(b))[0].id;
      reconcileParts(category);
    }
    saveBuilderState();
    renderBuilder();
  }));

  const filteredProducts = brandFilters[category] === "all"
    ? compatible
    : compatible.filter((product) => product.brand === brandFilters[category]);
  const selectedProduct = filteredProducts.some((product) => product.id === selectedParts[category])
    ? selectedParts[category]
    : filteredProducts[0].id;
  selectedParts[category] = selectedProduct;

  const productOptions = [...filteredProducts]
    .sort((left, right) => getCurrentPrice(left) - getCurrentPrice(right))
    .map((product) => ({
      value: product.id,
      label: `${product.model} — ${product.price === 0 ? "Included" : `${formatPrice(getCurrentPrice(product))} ${livePrices.has(product.id) ? "live" : "est."}`}`
    }));
  fields.append(createSelect("PART / MODEL", "product-select", productOptions, selectedProduct, (value) => {
    selectedParts[category] = value;
    reconcileParts(category);
    saveBuilderState();
    renderBuilder();
  }));

  const chosen = getProduct(category);
  const liveOffer = livePrices.get(chosen.id);
  const offers = liveOfferLists.get(chosen.id) ?? [];
  const searchQuery = `${config.label} ${chosen.brand} ${chosen.model}`;
  const retailerQuery = encodeURIComponent(searchQuery);
  const mdComputersUrl = `https://mdcomputers.in/index.php?route=product/search&search=${retailerQuery}`;
  const amazonUrl = `https://www.amazon.in/s?k=${retailerQuery}`;
  const footer = document.createElement("div");
  footer.className = "part-card-footer";
  const estimate = document.createElement("span");
  estimate.className = "part-estimate";
  const priceLabel = document.createElement("span");
  priceLabel.textContent = liveOffer ? `LIVE LOWEST · ${liveOffer.source}` : "CATALOG ESTIMATE · CHECK RETAILER";
  const priceAmount = document.createElement("strong");
  priceAmount.textContent = chosen.price === 0 ? "Included" : formatPrice(getCurrentPrice(chosen));
  estimate.append(priceLabel, priceAmount);
  footer.append(estimate);

  const retailerLinks = document.createElement("div");
  retailerLinks.className = "retailer-comparison-links";
  [
    { name: "MDComputers", href: mdComputersUrl },
    { name: "Amazon", href: amazonUrl }
  ].forEach(({ name, href }) => {
    const link = document.createElement("a");
    link.className = "product-search-link";
    link.textContent = `${name} ↗`;
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `Compare ${chosen.brand} ${chosen.model} prices on ${name}`);
    retailerLinks.append(link);
  });
  footer.append(retailerLinks);

  card.append(top, fields, footer);
  const offerList = window.RigwiseLivePrices.createOfferList(offers);
  if (offerList) {
    card.append(offerList);
  }
  return card;
}

function renderStepNavigation() {
  const items = partOrder.map((category, index) => {
    const product = getProduct(category);
    const button = document.createElement("a");
    button.className = "builder-step-tab";
    button.classList.toggle("is-current", index === activeStep);
    button.href = getComponentUrl(index);
    if (index === activeStep) {
      button.setAttribute("aria-current", "step");
    }
    button.setAttribute("aria-label", `Step ${index + 1}: ${pcParts[category].label}`);
    button.addEventListener("click", saveBuilderState);

    const number = document.createElement("span");
    number.className = "builder-step-number";
    number.textContent = String(index + 1).padStart(2, "0");

    const label = document.createElement("span");
    label.className = "builder-step-label";
    label.textContent = pcParts[category].label;

    button.append(number, label);
    return button;
  });

  stepNav.replaceChildren(...items);
  stepCount.textContent = `COMPONENT ${String(activeStep + 1).padStart(2, "0")} OF ${String(partOrder.length).padStart(2, "0")}`;
  setStepLink(previousStepButton, activeStep - 1);
  setStepLink(nextStepButton, activeStep + 1);
  nextStepButton.textContent = activeStep === partOrder.length - 1
    ? "All components selected"
    : "Next component →";
}

function getComponentUrl(stepIndex) {
  const url = new URL(window.location.href);
  url.searchParams.set("component", partOrder[stepIndex]);
  url.hash = "custom-builder";
  return url.href;
}

function setStepLink(link, stepIndex) {
  const disabled = stepIndex < 0 || stepIndex >= partOrder.length;
  link.classList.toggle("is-disabled", disabled);
  link.setAttribute("aria-disabled", String(disabled));

  if (disabled) {
    link.removeAttribute("href");
    link.removeAttribute("target");
    link.removeAttribute("rel");
    link.tabIndex = -1;
    return;
  }

  link.href = getComponentUrl(stepIndex);
  link.removeAttribute("target");
  link.tabIndex = 0;
  link.onclick = saveBuilderState;
}

function renderSummary() {
  const budget = getBudget();
  const total = getBuildTotal();
  const remainder = budget - total;
  const gpu = getProduct("graphics");
  const power = getProduct("power");
  const requiredWatts = getRequiredWattage();
  const missingGpu = !gpu;

  builderBudget.textContent = formatPrice(budget);
  buildTotal.textContent = formatPrice(total);
  buildTotal.classList.toggle("over-budget", remainder < 0);
  budgetRemaining.textContent = remainder >= 0
    ? `${formatPrice(remainder)} left in your budget`
    : `${formatPrice(Math.abs(remainder))} over your budget`;
  budgetRemaining.classList.toggle("over-budget", remainder < 0);

  const percent = Math.min(100, Math.round(total / budget * 100));
  budgetProgress.setAttribute("aria-valuenow", String(percent));
  budgetProgressFill.style.width = `${percent}%`;
  budgetProgress.classList.toggle("is-over-budget", remainder < 0);

  const summaryFragment = document.createDocumentFragment();
  partOrder.forEach((category) => {
    const product = getProduct(category);
    const item = document.createElement("div");
    item.className = "summary-item";
    const label = document.createElement("span");
    label.textContent = pcParts[category].label;
    const value = document.createElement("span");
    const liveOffer = livePrices.get(product.id);
    value.textContent = product.price === 0
      ? "Included"
      : `${formatPrice(getCurrentPrice(product))}${liveOffer ? " · live" : " · est."}`;
    item.append(label, value);
    summaryFragment.append(item);
  });
  summaryItems.replaceChildren(summaryFragment);

  builderAlert.hidden = false;
  builderAlert.classList.remove("is-warning", "is-error");
  if (missingGpu) {
    builderAlert.textContent = "This processor has no integrated graphics. Select a graphics card to complete the display output.";
    builderAlert.classList.add("is-error");
  } else if (power.watts < requiredWatts) {
    builderAlert.textContent = `Power check: this combination calls for a supply rated at approximately ${requiredWatts} W or higher.`;
    builderAlert.classList.add("is-error");
  } else if (remainder < 0) {
    builderAlert.textContent = "This selection is over budget. Choose less expensive parts or increase your budget in the planner above.";
    builderAlert.classList.add("is-error");
  } else if (remainder < budget * 0.1) {
    builderAlert.textContent = "Almost at your limit. Remember that delivery and peripherals may cost extra.";
    builderAlert.classList.add("is-warning");
  } else {
    builderAlert.hidden = true;
  }

  // Update dynamic Power & Compatibility Inspector
  const estWattsEl = document.querySelector("#compat-est-watts");
  const psuWattsEl = document.querySelector("#compat-psu-watts");
  const fillEl = document.querySelector("#compat-wattage-fill");
  const barEl = document.querySelector("#compat-wattage-bar");
  const badgeEl = document.querySelector("#compat-badge");
  const gpuCompatEl = document.querySelector("#compat-gpu");
  const psuCompatEl = document.querySelector("#compat-psu");

  if (estWattsEl && psuWattsEl && fillEl && barEl) {
    estWattsEl.textContent = `~${requiredWatts} W`;
    psuWattsEl.textContent = `${power.watts} W`;
    const loadPercent = Math.min(100, Math.round((requiredWatts / Math.max(power.watts, 1)) * 100));
    fillEl.style.width = `${loadPercent}%`;
    const isPsuWarning = power.watts < requiredWatts;
    barEl.classList.toggle("is-overloaded", isPsuWarning);

    if (badgeEl) {
      if (missingGpu || isPsuWarning) {
        badgeEl.textContent = "⚠ Action Needed";
        badgeEl.style.background = "#ffe8e8";
        badgeEl.style.color = "#c93b3b";
      } else {
        badgeEl.textContent = "✓ Compatible";
        badgeEl.style.background = "#e4f0e8";
        badgeEl.style.color = "var(--green-dark)";
      }
    }

    if (gpuCompatEl) {
      gpuCompatEl.classList.toggle("is-issue", missingGpu);
      gpuCompatEl.querySelector("span:last-child").textContent = missingGpu
        ? "Display output required (select a GPU)"
        : "Display output verified";
      gpuCompatEl.querySelector(".compat-item-icon").textContent = missingGpu ? "✕" : "✓";
    }

    if (psuCompatEl) {
      psuCompatEl.classList.toggle("is-issue", isPsuWarning);
      psuCompatEl.querySelector("span:last-child").textContent = isPsuWarning
        ? `PSU under-rated (${power.watts}W < ${requiredWatts}W required)`
        : `PSU safe margin (+${power.watts - requiredWatts}W headroom)`;
      psuCompatEl.querySelector(".compat-item-icon").textContent = isPsuWarning ? "✕" : "✓";
    }
  }
}

function renderBuilder() {
  renderStepNavigation();
  builderContainer.replaceChildren(createProductCard(partOrder[activeStep], activeStep));
  renderSummary();
}

async function refreshSelectedBuildPrices() {
  refreshPricesButton.disabled = true;
  livePriceStatus.classList.remove("is-error", "is-success");
  livePriceStatus.textContent = "Checking current Indian retailer offers…";
  const products = partOrder.map((category) => {
    const product = getProduct(category);
    return product.price === 0
      ? null
      : {
          id: product.id,
          query: window.RigwiseLivePrices.makeQuery(pcParts[category].label, product.brand, product.model)
        };
  }).filter(Boolean);

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
    renderBuilder();
    livePriceStatus.classList.toggle("is-success", updated > 0);
    livePriceStatus.classList.toggle("is-error", updated === 0 || unavailable > 0 || failures > 0);
    const time = new Date(payload.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const issues = [];
    if (unavailable) {
      issues.push(`${unavailable} with no offers`);
    }
    if (failures) {
      issues.push(`${failures} searches failed`);
    }
    livePriceStatus.textContent = `${updated} of ${products.length} parts matched offers · checked ${time}${issues.length ? ` · ${issues.join(" · ")}` : ""}.`;
  } catch (error) {
    livePriceStatus.classList.add("is-error");
    livePriceStatus.textContent = error.message;
  } finally {
    refreshPricesButton.disabled = false;
  }
}

refreshPricesButton.addEventListener("click", refreshSelectedBuildPrices);
document.querySelector("#budget").addEventListener("input", () => {
  renderSummary();
  saveBuilderState();
});
document.querySelector("#budget-slider").addEventListener("input", () => {
  renderSummary();
  saveBuilderState();
});
document.querySelectorAll("[data-budget]").forEach((button) => {
  button.addEventListener("click", () => {
    renderSummary();
    saveBuilderState();
  });
});
document.querySelector("#reset-build").addEventListener("click", () => {
  Object.assign(selectedParts, initialSelections);
  partOrder.forEach((category) => {
    brandFilters[category] = "all";
  });
  saveBuilderState();
  renderBuilder();
  builderContainer.scrollIntoView({ behavior: "smooth", block: "start" });
});

compactSummary.addEventListener("change", (event) => {
  if (event.matches !== wasCompactSummary) {
    summaryDetails.open = !event.matches;
    wasCompactSummary = event.matches;
  }
});

window.addEventListener("storage", (event) => {
  if (event.key !== BUILDER_STORAGE_KEY || !event.newValue) {
    return;
  }

  let state;
  try {
    state = JSON.parse(event.newValue);
  } catch (error) {
    builderAlert.hidden = false;
    builderAlert.classList.add("is-error");
    builderAlert.textContent = "Updates from another build window could not be read. Refresh to restore your saved build.";
    return;
  }

  if (state && state.selectedParts && typeof state.selectedParts === "object") {
    partOrder.forEach((category) => {
      const savedProduct = pcParts[category].products.find(
        (product) => product.id === state.selectedParts[category]
      );
      if (savedProduct) {
        selectedParts[category] = savedProduct.id;
      }
    });
  }

  if (Number.isInteger(state?.budget) && state.budget >= 20000 && state.budget <= 1000000) {
    lastValidBuilderBudget = state.budget;
    document.querySelector("#budget").value = String(state.budget);
    document.querySelector("#budget-slider").value = String(state.budget);
  }

  renderBuilder();
});

restoreBuilderState();
partOrder.forEach((category) => {
  const product = getProduct(category);
  if (product.price > 0) {
    const query = window.RigwiseLivePrices.makeQuery(pcParts[category].label, product.brand, product.model);
    const cachedOffers = window.RigwiseLivePrices.getCached(query);
    if (cachedOffers?.length) {
      livePrices.set(product.id, cachedOffers[0]);
      liveOfferLists.set(product.id, cachedOffers);
    }
  }
});
if (livePrices.size > 0) {
  livePriceStatus.classList.add("is-success");
  livePriceStatus.textContent = `${livePrices.size} saved live offers restored for this tab. Refresh to check current prices.`;
}
renderBuilder();

// Quotation & Cart Action Handlers
document.querySelector("#copy-build-specs")?.addEventListener("click", () => {
  const items = partOrder.map((category) => {
    const product = getProduct(category);
    const price = getCurrentPrice(product);
    const offer = livePrices.get(product.id);
    return {
      category: pcParts[category].label,
      name: `${product.brand} ${product.model}`,
      price,
      source: offer ? `Live · ${offer.source}` : "Catalog Estimate"
    };
  });
  copyQuotationToClipboard({
    title: "Custom PC Build",
    budget: getBudget(),
    wattage: getRequiredWattage(),
    recommendedPsu: `${getProduct("power")?.watts || 550}W`,
    total: getBuildTotal(),
    items
  });
});

document.querySelector("#print-build-quotation")?.addEventListener("click", () => {
  printQuotationView();
});

document.querySelector("#add-build-to-cart")?.addEventListener("click", () => {
  let count = 0;
  partOrder.forEach((category) => {
    const product = getProduct(category);
    if (product && product.price > 0) {
      const price = getCurrentPrice(product);
      const offer = livePrices.get(product.id) || null;
      try {
        addItem(product, price, offer);
        count += 1;
      } catch (e) {
        // Continue adding others
      }
    }
  });
  showToast(`Added ${count} custom build components to Demo Cart!`, "success", {
    label: "View Cart ↗",
    href: "shop-parts.html#demo-cart"
  });
});

