import { listProducts, categories } from "./services/catalog-service.js";
import { addItem, clearCart, getCart, updateQuantity } from "./services/cart-service.js";
import { findOffers } from "./services/pricing-service.js";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});
const PRODUCTS_PER_PAGE = 24;
const categoryNav = document.querySelector("#shop-category-nav");
const productGrid = document.querySelector("#shop-product-grid");
const cartItemsContainer = document.querySelector("#demo-cart-items");
const livePriceByProduct = new Map();
let activeCategory = "all";
let activeBrand = "all";
let currentPage = 1;
let products = [];

function escapeSearchValue(value) {
  return value.trim().slice(0, 100);
}

function getCategoryLabel(id) {
  return categories.find((category) => category.id === id)?.label || id;
}

function renderCategoryNav() {
  const buttons = [{ id: "all", label: "All parts" }, ...categories];
  categoryNav.replaceChildren(...buttons.map((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "shop-category-chip";
    button.classList.toggle("is-active", activeCategory === category.id);
    button.setAttribute("aria-pressed", String(activeCategory === category.id));
    const checkbox = document.createElement("span");
    checkbox.className = "shop-category-checkbox";
    checkbox.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "shop-category-label";
    label.textContent = category.label;
    const count = document.createElement("span");
    count.className = "shop-category-count";
    count.textContent = String(category.id === "all"
      ? products.length
      : products.filter((product) => product.category === category.id).length);
    button.append(checkbox, label, count);
    button.addEventListener("click", () => {
      activeCategory = category.id;
      activeBrand = "all";
      currentPage = 1;
      renderCategoryNav();
      renderBrandOptions();
      renderProducts();
    });
    return button;
  }));
}

function renderBrandOptions() {
  const brandSelect = document.querySelector("#shop-brand");
  const matchingBrands = [...new Set(products
    .filter((product) => activeCategory === "all" || product.category === activeCategory)
    .map((product) => product.brand))]
    .sort((left, right) => left.localeCompare(right));
  if (!matchingBrands.includes(activeBrand)) {
    activeBrand = "all";
  }
  brandSelect.replaceChildren(
    new Option("Any Brand", "all"),
    ...matchingBrands.map((brand) => new Option(brand, brand))
  );
  brandSelect.value = activeBrand;
}

function getFilteredProducts() {
  const search = escapeSearchValue(document.querySelector("#shop-search").value).toLowerCase();
  const minPriceInput = document.querySelector("#shop-min-price").value;
  const maxPriceInput = document.querySelector("#shop-max-price").value;
  const minPrice = minPriceInput === "" ? 0 : Number(minPriceInput);
  const maxPrice = maxPriceInput === "" ? Number.POSITIVE_INFINITY : Number(maxPriceInput);
  if (!Number.isFinite(minPrice) || (!Number.isFinite(maxPrice) && maxPrice !== Number.POSITIVE_INFINITY)) {
    return [];
  }
  const results = products.filter((product) => (
    (activeCategory === "all" || product.category === activeCategory)
    && (activeBrand === "all" || product.brand === activeBrand)
    && product.price >= minPrice
    && product.price <= maxPrice
    && (!search || `${product.brand} ${product.model} ${product.details}`.toLowerCase().includes(search))
  ));
  const sort = document.querySelector("#shop-sort").value;
  if (sort === "price-asc") {
    results.sort((left, right) => currentPrice(left) - currentPrice(right));
  } else if (sort === "price-desc") {
    results.sort((left, right) => currentPrice(right) - currentPrice(left));
  } else if (sort === "brand") {
    results.sort((left, right) => left.brand.localeCompare(right.brand) || left.model.localeCompare(right.model));
  }
  return results;
}

function currentPrice(product) {
  return livePriceByProduct.get(product.id)?.price ?? product.price;
}

function makeProductCard(product) {
  const card = document.createElement("article");
  card.className = "shop-product-card";
  const liveOffer = livePriceByProduct.get(product.id);
  const info = document.createElement("div");
  info.className = "shop-product-info";
  const category = document.createElement("span");
  category.className = "shop-product-category";
  category.textContent = getCategoryLabel(product.category);
  const name = document.createElement("h3");
  name.textContent = `${product.brand} ${product.model}`;
  const details = document.createElement("p");
  details.textContent = product.details;
  info.append(category, name, details);

  const priceRow = document.createElement("div");
  priceRow.className = "shop-product-price-row";
  const priceInfo = document.createElement("div");
  priceInfo.className = "shop-product-price";
  const priceLabel = document.createElement("span");
  priceLabel.textContent = livePriceByProduct.has(product.id) ? `LIVE OFFER · ${livePriceByProduct.get(product.id).source}` : "CATALOG ESTIMATE";
  const price = document.createElement("strong");
  price.textContent = product.price === 0 ? "Included" : currency.format(currentPrice(product));
  priceInfo.append(priceLabel, price);
  priceRow.append(priceInfo);

  const actions = document.createElement("div");
  actions.className = "shop-product-actions";
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "shop-add-button";
  addButton.textContent = "Add to cart";
  addButton.addEventListener("click", () => {
    try {
      const offer = livePriceByProduct.get(product.id) || null;
      addItem(product, currentPrice(product), offer);
      addButton.textContent = "Added ✓";
      window.setTimeout(() => {
        addButton.textContent = "Add to cart";
      }, 1200);
    } catch (error) {
      document.querySelector("#shop-catalog-status").textContent = error.message;
    }
  });
  actions.append(addButton);

  if (product.price > 0) {
    const refreshButton = document.createElement("button");
    refreshButton.type = "button";
    refreshButton.className = "shop-refresh-button";
    refreshButton.textContent = "Check live price";
    refreshButton.addEventListener("click", async () => {
      refreshButton.disabled = true;
      refreshButton.textContent = "Checking…";
      const categoryLabel = getCategoryLabel(product.category);
      try {
        const offers = await findOffers(product, categoryLabel);
        if (!offers.length) {
          throw new Error("No matching retailer offers found. Try the search link instead.");
        }
        livePriceByProduct.set(product.id, { ...offers[0], offers });
        renderProducts();
        renderCart();
        document.querySelector("#shop-catalog-status").textContent = `Found ${offers.length} offers for ${product.brand} ${product.model}; showing the lowest listed offer.`;
      } catch (error) {
        refreshButton.disabled = false;
        refreshButton.textContent = "Check live price";
        document.querySelector("#shop-catalog-status").textContent = error.message;
      }
    });
    actions.append(refreshButton);
  }

  if (liveOffer) {
    const offerLink = document.createElement("a");
    offerLink.className = "shop-offer-link";
    offerLink.href = liveOffer.link;
    offerLink.target = "_blank";
    offerLink.rel = "noopener noreferrer";
    offerLink.textContent = `View ${liveOffer.source} offer ↗`;
    actions.append(offerLink);
    const offerList = window.RigwiseLivePrices.createOfferList(liveOffer.offers);
    if (offerList) {
      actions.append(offerList);
    }
  }
  const comparisonLinks = document.createElement("div");
  comparisonLinks.className = "shop-retailer-links";
  const retailerQuery = encodeURIComponent(`${getCategoryLabel(product.category)} ${product.brand} ${product.model}`);
  [
    {
      name: "MDComputers",
      href: `https://mdcomputers.in/index.php?route=product/search&search=${retailerQuery}`
    },
    {
      name: "Amazon",
      href: `https://www.amazon.in/s?k=${retailerQuery}`
    }
  ].forEach(({ name, href }) => {
    const link = document.createElement("a");
    link.className = "shop-offer-link";
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = `${name} ↗`;
    link.setAttribute("aria-label", `Compare ${product.brand} ${product.model} on ${name}`);
    comparisonLinks.append(link);
  });
  actions.append(comparisonLinks);
  card.append(info, priceRow, actions);
  return card;
}

function renderProducts() {
  const filtered = getFilteredProducts();
  const title = activeCategory === "all" ? "All parts" : getCategoryLabel(activeCategory);
  const pageCount = Math.ceil(filtered.length / PRODUCTS_PER_PAGE);
  currentPage = Math.min(currentPage, Math.max(pageCount, 1));
  const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const pageProducts = filtered.slice(start, start + PRODUCTS_PER_PAGE);
  document.querySelector("#shop-category-title").textContent = title;
  document.querySelector("#shop-result-count").textContent = filtered.length
    ? `${start + 1}–${Math.min(start + PRODUCTS_PER_PAGE, filtered.length)} of ${filtered.length} parts`
    : "0 parts";
  document.querySelector("#shop-empty-state").hidden = filtered.length > 0;
  productGrid.replaceChildren(...pageProducts.map(makeProductCard));
  renderPagination(pageCount);
}

function renderPagination(pageCount) {
  const pagination = document.querySelector("#shop-pagination");
  pagination.replaceChildren();
  pagination.hidden = pageCount <= 1;
  if (pageCount <= 1) {
    return;
  }
  const addPageButton = (label, page, disabled = false, current = false) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "shop-page-button";
    button.textContent = label;
    button.disabled = disabled;
    if (current) {
      button.setAttribute("aria-current", "page");
    }
    button.addEventListener("click", () => {
      currentPage = page;
      renderProducts();
      document.querySelector("#shop-category-title").scrollIntoView({ block: "start", behavior: "smooth" });
    });
    pagination.append(button);
  };
  addPageButton("Previous", currentPage - 1, currentPage === 1);
  for (let page = 1; page <= pageCount; page += 1) {
    addPageButton(String(page), page, false, page === currentPage);
  }
  addPageButton("Next", currentPage + 1, currentPage === pageCount);
}

function renderCart() {
  const cart = getCart();
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  document.querySelector("#shop-cart-count").textContent = String(count);
  document.querySelector("#demo-cart-count").textContent = `${count} ${count === 1 ? "item" : "items"}`;
  document.querySelector("#demo-cart-total").textContent = currency.format(total);
  document.querySelector("#demo-cart-empty").hidden = cart.length > 0;
  document.querySelector("#demo-cart-clear").disabled = cart.length === 0;
  cartItemsContainer.replaceChildren(...cart.map((item) => {
    const row = document.createElement("article");
    row.className = "demo-cart-item";
    const description = document.createElement("div");
    description.className = "demo-cart-item-description";
    const name = document.createElement("strong");
    name.textContent = item.name;
    const category = document.createElement("span");
    category.textContent = getCategoryLabel(item.category);
    const cost = document.createElement("span");
    cost.textContent = `${currency.format(item.price)} each`;
    description.append(name, category, cost);
    const controls = document.createElement("div");
    controls.className = "demo-cart-item-controls";
    const decrement = document.createElement("button");
    decrement.type = "button";
    decrement.setAttribute("aria-label", `Remove one ${item.name}`);
    decrement.textContent = "−";
    decrement.addEventListener("click", () => updateQuantity(item.id, item.quantity - 1));
    const quantity = document.createElement("span");
    quantity.textContent = String(item.quantity);
    const increment = document.createElement("button");
    increment.type = "button";
    increment.setAttribute("aria-label", `Add one ${item.name}`);
    increment.textContent = "+";
    increment.addEventListener("click", () => updateQuantity(item.id, item.quantity + 1));
    controls.append(decrement, quantity, increment);
    row.append(description, controls);
    if (item.offer?.link) {
      const retailer = document.createElement("a");
      retailer.className = "demo-cart-retailer-link";
      retailer.href = item.offer.link;
      retailer.target = "_blank";
      retailer.rel = "noopener noreferrer";
      retailer.textContent = `View ${item.offer.source} offer ↗`;
      row.append(retailer);
    }
    return row;
  }));
}

async function initializeShop() {
  renderCategoryNav();
  document.querySelector("#shop-catalog-status").textContent = window.RIGWISE_SERVICE_URLS?.catalog
    ? "Loading parts from the catalog service…"
    : "Showing the locally bundled catalog. Deploy and configure the catalog service for a separately hosted API.";
  try {
    const result = await listProducts();
    products = result.products;
    renderCategoryNav();
    renderBrandOptions();
    renderProducts();
    renderCart();
    if (result.source === "catalog-service") {
      document.querySelector("#shop-catalog-status").textContent = `${products.length} products loaded from the catalog service.`;
    }
  } catch (error) {
    document.querySelector("#shop-catalog-status").textContent = error.message;
    document.querySelector("#shop-empty-state").hidden = false;
  }
}

document.querySelector("#shop-search").addEventListener("input", () => {
  currentPage = 1;
  renderProducts();
});
document.querySelector("#shop-min-price").addEventListener("input", () => {
  currentPage = 1;
  renderProducts();
});
document.querySelector("#shop-max-price").addEventListener("input", () => {
  currentPage = 1;
  renderProducts();
});
document.querySelector("#shop-brand").addEventListener("change", (event) => {
  activeBrand = event.target.value;
  currentPage = 1;
  renderProducts();
});
document.querySelector("#shop-sort").addEventListener("change", () => {
  currentPage = 1;
  renderProducts();
});
document.querySelector("#demo-cart-clear").addEventListener("click", () => {
  try {
    clearCart();
  } catch (error) {
    document.querySelector("#shop-catalog-status").textContent = error.message;
  }
});
window.addEventListener("rigwise:cart-updated", renderCart);
window.addEventListener("storage", (event) => {
  if (event.key === "rigwise-demo-cart-v1") {
    renderCart();
  }
});
initializeShop();
