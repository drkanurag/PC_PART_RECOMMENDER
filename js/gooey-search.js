/**
 * Gooey Search Interaction System
 * Inspired by oguzhantufenk/gooey-search (Codrops)
 * Implements SVG feGaussianBlur + feColorMatrix gooey fluid physics
 * with responsive debounced live suggestions.
 */

const HARDWARE_SUGGESTIONS = [
  "NVIDIA GeForce RTX 4090",
  "NVIDIA GeForce RTX 4080 Super",
  "NVIDIA GeForce RTX 4070 Super",
  "NVIDIA GeForce RTX 4060 Ti",
  "AMD Ryzen 7 7800X3D",
  "AMD Ryzen 5 7600X",
  "AMD Ryzen 9 7950X3D",
  "Intel Core i9-14900K",
  "Intel Core i7-14700K",
  "Intel Core i5-14600K",
  "Crucial Pro 32GB DDR5-6000",
  "Corsair Vengeance 32GB DDR5",
  "Kingston KC3000 2TB NVMe SSD",
  "Samsung 990 Pro 2TB NVMe",
  "Corsair RM850x 850W PSU",
  "MSI MAG B650 Tomahawk WiFi",
  "ASUS ROG Strix B650-A Gaming",
  "DeepCool AK620 Digital",
  "NZXT H5 Flow RGB",
  "Lian Li O11 Dynamic EVO"
];

function ensureGooeyFilter() {
  if (document.getElementById("goo-effect-svg")) return;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.id = "goo-effect-svg";
  svg.setAttribute("aria-hidden", "true");
  svg.style.position = "absolute";
  svg.style.width = "0";
  svg.style.height = "0";
  svg.style.pointerEvents = "none";
  svg.innerHTML = `
    <defs>
      <filter id="goo-effect">
        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
        <feColorMatrix
          in="blur"
          type="matrix"
          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -15"
          result="goo"
        />
        <feComposite in="SourceGraphic" in2="goo" operator="atop" />
      </filter>
    </defs>
  `;
  document.body.appendChild(svg);
}

export function isUnsupportedBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  const isSafari =
    ua.includes("safari") &&
    !ua.includes("chrome") &&
    !ua.includes("chromium") &&
    !ua.includes("android") &&
    !ua.includes("firefox");
  const isChromeOniOS = ua.includes("crios");
  return isSafari || isChromeOniOS;
}

export function initGooeySearch(boxElement, options = {}) {
  if (!boxElement) return;
  ensureGooeyFilter();

  if (isUnsupportedBrowser()) {
    boxElement.classList.add("no-goo");
  }

  const btn = boxElement.querySelector(".gooey-search-btn");
  const input = boxElement.querySelector(".gooey-search-input");
  const bubble = boxElement.querySelector(".gooey-search-bubble");
  const resultsContainer = boxElement.querySelector(".gooey-results-dropdown");

  let debounceTimer = null;
  const dataset = options.data || HARDWARE_SUGGESTIONS;

  function openSearch() {
    boxElement.classList.add("is-open");
    input?.focus();
  }

  function closeSearch() {
    boxElement.classList.remove("is-open");
    clearResults();
  }

  function clearResults() {
    if (resultsContainer) {
      resultsContainer.replaceChildren();
    }
  }

  function renderResults(matches) {
    if (!resultsContainer) return;
    resultsContainer.replaceChildren();
    if (!matches.length) return;

    matches.slice(0, 4).forEach((item, index) => {
      const el = document.createElement("div");
      el.className = "gooey-result-item";
      el.setAttribute("role", "option");
      el.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" style="shrink: 0; opacity: 0.7;">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
        <span class="truncate">${item}</span>
      `;

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (input) input.value = item;
        clearResults();
        if (options.onSelect) {
          options.onSelect(item);
        } else if (options.isGlobal) {
          window.location.href = `shop-parts.html?search=${encodeURIComponent(item)}`;
        }
      });

      resultsContainer.appendChild(el);

      // Trigger stagger animation
      setTimeout(() => {
        el.classList.add("is-visible");
      }, index * 70 + 30);
    });
  }

  function handleSearchInput(e) {
    const query = e.target.value.trim().toLowerCase();
    clearTimeout(debounceTimer);

    if (!query) {
      clearResults();
      if (options.onSearch) options.onSearch("");
      return;
    }

    debounceTimer = setTimeout(() => {
      const matches = dataset.filter((item) => item.toLowerCase().includes(query));
      renderResults(matches);
      if (options.onSearch) options.onSearch(query);
    }, 250);
  }

  // Open triggers
  btn?.addEventListener("click", (e) => {
    if (!boxElement.classList.contains("is-open")) {
      e.stopPropagation();
      openSearch();
    }
  });

  // Submit on bubble click
  bubble?.addEventListener("click", (e) => {
    e.stopPropagation();
    const query = input?.value.trim() || "";
    if (options.onSubmit) {
      options.onSubmit(query);
    } else if (options.isGlobal && query) {
      window.location.href = `shop-parts.html?search=${encodeURIComponent(query)}`;
    }
  });

  input?.addEventListener("input", handleSearchInput);

  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const query = input.value.trim();
      clearResults();
      if (options.onSubmit) {
        options.onSubmit(query);
      } else if (options.isGlobal && query) {
        window.location.href = `shop-parts.html?search=${encodeURIComponent(query)}`;
      }
    } else if (e.key === "Escape") {
      closeSearch();
    }
  });

  // Close on click outside
  document.addEventListener("click", (e) => {
    if (!boxElement.contains(e.target)) {
      if (!input?.value.trim()) {
        closeSearch();
      } else {
        clearResults();
      }
    }
  });

  // Keyboard shortcut Ctrl+K or / to focus search
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openSearch();
    }
  });
}

// Auto-initialize standard gooey search boxes on DOM load
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const headerBox = document.querySelector("#header-gooey-search");
    if (headerBox) {
      initGooeySearch(headerBox, { isGlobal: true });
    }
  });
}

