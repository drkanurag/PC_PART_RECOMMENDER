const buildProfiles = {
  gaming: {
    title: "A balanced gaming build",
    description: "A dedicated graphics card gets the largest share once your budget can support one.",
    searchTerm: "gaming",
    dedicatedParts: [
      { name: "Graphics card", detail: "Largest share for gaming performance", search: "graphics card GPU", share: 36, max: 500000 },
      { name: "Processor", detail: "Keep gameplay responsive", search: "desktop CPU processor", share: 22, max: 250000 },
      { name: "Motherboard", detail: "Match the board to your chosen processor", search: "desktop motherboard", share: 11, max: 35000 },
      { name: "Memory", detail: "Choose the type supported by your platform", search: "desktop RAM DDR4 DDR5", share: 9, max: 50000 },
      { name: "Storage", detail: "Leave room for games and everyday apps", search: "NVMe SSD", share: 9, max: 60000 },
      { name: "Power supply", detail: "Size for your final GPU and CPU", search: "80 Plus desktop power supply", share: 8, max: 70000 },
      { name: "PC case", detail: "Check GPU length and motherboard size", search: "PC case ATX mATX", share: 5, max: 25000 }
    ],
    integratedParts: [
      { name: "Processor with integrated graphics", detail: "Start with an APU; add a graphics card later", search: "desktop APU processor integrated graphics", share: 34, max: 40000 },
      { name: "Motherboard", detail: "Confirm the socket supports your chosen APU", search: "AM4 AM5 motherboard", share: 17, max: 30000 },
      { name: "Memory", detail: "A matched memory kit also helps integrated graphics", search: "desktop dual channel RAM DDR4 DDR5", share: 13, max: 30000 },
      { name: "Storage", detail: "Fast storage for your operating system and games", search: "NVMe SSD", share: 12, max: 30000 },
      { name: "Power supply", detail: "Choose a reputable unit sized for the build", search: "80 Plus desktop power supply", share: 12, max: 30000 },
      { name: "PC case", detail: "Check motherboard size and included fans", search: "mATX PC case", share: 12, max: 25000 }
    ]
  },
  creation: {
    title: "A creator-focused build",
    description: "Give processing and graphics more room, with additional allowance for memory and storage.",
    searchTerm: "creative work video editing 3D rendering",
    dedicatedParts: [
      { name: "Processor", detail: "Prioritize the software and workloads you use", search: "desktop CPU processor", share: 30, max: 250000 },
      { name: "Graphics card", detail: "Check support in your creative software", search: "graphics card GPU video editing 3D", share: 24, max: 500000 },
      { name: "Motherboard", detail: "Match the board to your chosen processor", search: "desktop motherboard", share: 11, max: 35000 },
      { name: "Memory", detail: "More capacity helps with larger projects", search: "desktop RAM DDR4 DDR5", share: 12, max: 80000 },
      { name: "Storage", detail: "Allow room for project files and scratch space", search: "NVMe SSD", share: 11, max: 80000 },
      { name: "Power supply", detail: "Allow headroom for the complete system", search: "80 Plus desktop power supply", share: 7, max: 70000 },
      { name: "PC case", detail: "Check cooler, board and GPU clearance", search: "PC case ATX mATX", share: 5, max: 25000 }
    ],
    integratedParts: [
      { name: "Processor with integrated graphics", detail: "Choose an APU for a starter build; upgrade graphics later", search: "desktop APU processor integrated graphics", share: 32, max: 40000 },
      { name: "Motherboard", detail: "Confirm the socket supports your chosen APU", search: "AM4 AM5 motherboard", share: 16, max: 30000 },
      { name: "Memory", detail: "Plan capacity around your editing applications", search: "desktop dual channel RAM DDR4 DDR5", share: 17, max: 40000 },
      { name: "Storage", detail: "Prioritize capacity for project files", search: "NVMe SSD 1TB", share: 14, max: 40000 },
      { name: "Power supply", detail: "Choose a reputable unit sized for the build", search: "80 Plus desktop power supply", share: 11, max: 30000 },
      { name: "PC case", detail: "Check board size and airflow", search: "mATX PC case airflow", share: 10, max: 25000 }
    ]
  },
  everyday: {
    title: "A well-rounded everyday build",
    description: "An efficient processor with integrated graphics, plus room for memory, fast storage and a quality power supply.",
    searchTerm: "work study everyday desktop",
    dedicatedParts: [
      { name: "Processor with integrated graphics", detail: "Display output without a separate graphics card", search: "desktop CPU processor integrated graphics", share: 38, max: 180000 },
      { name: "Motherboard", detail: "Confirm the board's CPU socket and memory support", search: "desktop motherboard", share: 18, max: 30000 },
      { name: "Memory", detail: "Choose a matched kit for your platform", search: "desktop dual channel RAM DDR4 DDR5", share: 14, max: 40000 },
      { name: "Storage", detail: "Fast storage for everyday apps and files", search: "NVMe SSD", share: 16, max: 50000 },
      { name: "Power supply", detail: "Choose a reputable unit sized for the build", search: "80 Plus desktop power supply", share: 8, max: 45000 },
      { name: "PC case", detail: "Check motherboard size and included fans", search: "PC case ATX mATX", share: 6, max: 25000 }
    ],
    integratedParts: [
      { name: "Processor with integrated graphics", detail: "Handles everyday display output without a GPU", search: "desktop CPU processor integrated graphics", share: 30, max: 40000 },
      { name: "Motherboard", detail: "Confirm the socket supports your processor", search: "desktop motherboard", share: 16, max: 30000 },
      { name: "Memory", detail: "Choose a matched kit for your platform", search: "desktop dual channel RAM DDR4 DDR5", share: 15, max: 30000 },
      { name: "Storage", detail: "Fast storage for your everyday apps and files", search: "NVMe SSD", share: 15, max: 30000 },
      { name: "Power supply", detail: "Choose a reputable unit sized for the build", search: "80 Plus desktop power supply", share: 12, max: 30000 },
      { name: "PC case", detail: "Check motherboard size and included fans", search: "mATX PC case", share: 12, max: 25000 }
    ]
  }
};

const MIN_BUDGET = 20000;
const MAX_BUDGET = 1000000;
const INTEGRATED_GRAPHICS_BUDGET = 60000;

const formatCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const form = document.querySelector("#build-form");
const budgetInput = form.elements.budget;
const budgetSlider = document.querySelector("#budget-slider");
const partsList = document.querySelector("#parts-list");
const resultTitle = document.querySelector("#results-title");
const resultDescription = document.querySelector("#results-description");
const budgetTotal = document.querySelector("#budget-total");
const budgetWarning = document.querySelector("#budget-warning");
const updatedAt = document.querySelector("#updated-at");
const plannerStatus = document.querySelector("#planner-status");

function getAllocationAmounts(parts, budget) {
  const amounts = parts.map((part) =>
    Math.min(part.max, Math.floor((budget * part.share / 100) / 100) * 100)
  );
  let remaining = budget - amounts.reduce((sum, amount) => sum + amount, 0);
  let canGrow = parts.map((part, index) => index).filter((index) => amounts[index] < parts[index].max);

  while (remaining >= 100 && canGrow.length > 0) {
    const totalWeight = canGrow.reduce((sum, index) => sum + parts[index].share, 0);
    let distributed = 0;

    canGrow.forEach((index) => {
      const requested = Math.max(
        100,
        Math.floor((remaining * parts[index].share / totalWeight) / 100) * 100
      );
      const available = Math.floor((parts[index].max - amounts[index]) / 100) * 100;
      const amount = Math.min(requested, available, Math.floor(remaining / 100) * 100);
      amounts[index] += amount;
      distributed += amount;
      remaining -= amount;
    });

    if (distributed === 0) {
      break;
    }

    canGrow = canGrow.filter((index) => amounts[index] < parts[index].max);
  }

  return { amounts, remaining };
}

function createPartRow(part, amount, workload) {
  const row = document.createElement("div");
  row.className = "part-row";

  const name = document.createElement("div");
  name.className = "part-name";

  const title = document.createElement("strong");
  title.textContent = part.name;

  const detail = document.createElement("span");
  detail.textContent = part.detail;
  name.append(title, detail);

  const amountLabel = document.createElement("span");
  amountLabel.className = "part-amount";
  amountLabel.textContent = formatCurrency.format(amount);

  const search = document.createElement(part.search ? "a" : "span");
  search.className = part.search ? "search-link" : "search-note";
  search.textContent = part.search ? "Live prices ↗" : "Keep aside";

  if (part.search) {
    search.target = "_blank";
    search.rel = "noopener noreferrer";
    search.href = `https://www.google.com/search?tbm=shop&hl=en&gl=IN&q=${encodeURIComponent(`${part.search} ${workload} India around INR ${amount}`)}`;
    search.setAttribute("aria-label", `Search current ${part.name.toLowerCase()} listings on Google Shopping`);
  }

  row.append(name, amountLabel);
  if (amount > 0 || part.search) {
    row.append(search);
  }
  return row;
}

function updateBudgetControls(value) {
  budgetInput.value = value;
  budgetSlider.value = Math.min(MAX_BUDGET, Math.max(MIN_BUDGET, Number(value)));
}

function renderBuildMap() {
  const budget = Number(budgetInput.value);
  const workload = form.elements.workload.value;
  const profile = buildProfiles[workload];
  const useIntegratedGraphics = budget < INTEGRATED_GRAPHICS_BUDGET;
  const parts = useIntegratedGraphics ? profile.integratedParts : profile.dedicatedParts;
  const allocation = getAllocationAmounts(parts, budget);
  const plannedParts = [...parts];

  if (allocation.remaining > 0) {
    plannedParts.push({
      name: "Unallocated upgrade headroom",
      detail: "Keep aside; spend only after checking current prices and compatibility",
      share: 0,
      search: null
    });
    allocation.amounts.push(allocation.remaining);
  }

  resultTitle.textContent = useIntegratedGraphics
    ? "A starter build with integrated graphics"
    : profile.title;
  resultDescription.textContent = useIntegratedGraphics
    ? `${profile.title} priorities, adapted to focus on a processor with integrated graphics and leave a dedicated GPU as a later upgrade.`
    : profile.description;
  budgetTotal.textContent = formatCurrency.format(budget);

  budgetWarning.hidden = budget >= 35000;
  budgetWarning.textContent = budget < 35000
    ? "A brand-new complete PC at this budget is a tight fit. Consider carefully checked refurbished parts, and verify current prices before buying."
    : "";

  partsList.replaceChildren(
    ...plannedParts.map((part, index) => createPartRow(part, allocation.amounts[index], profile.searchTerm))
  );
  updatedAt.textContent = `Plan updated ${new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date())} (your local time)`;
}

function updateFromInput() {
  const budget = Number(budgetInput.value);
  if (budgetInput.value === "" || !Number.isFinite(budget)) {
    return;
  }

  if (budget >= MIN_BUDGET && budget <= MAX_BUDGET) {
    budgetInput.setCustomValidity("");
    budgetSlider.value = Math.min(MAX_BUDGET, Math.max(MIN_BUDGET, budget));
    renderBuildMap();
  } else {
    budgetInput.setCustomValidity(`Enter a whole-number budget from ${formatCurrency.format(MIN_BUDGET)} to ${formatCurrency.format(MAX_BUDGET)}.`);
  }
}

budgetInput.addEventListener("input", updateFromInput);

budgetSlider.addEventListener("input", () => {
  budgetInput.setCustomValidity("");
  budgetInput.value = budgetSlider.value;
  renderBuildMap();
});

form.querySelectorAll('input[name="workload"]').forEach((input) => {
  input.addEventListener("change", renderBuildMap);
});

document.querySelectorAll("[data-budget]").forEach((button) => {
  button.addEventListener("click", () => {
    updateBudgetControls(button.dataset.budget);
    budgetInput.setCustomValidity("");
    renderBuildMap();
    budgetInput.focus();
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  budgetInput.reportValidity();

  if (!form.checkValidity()) {
    return;
  }

  renderBuildMap();
  plannerStatus.textContent = `Your ${formatCurrency.format(Number(budgetInput.value))} build plan is ready.`;
  document.querySelector("#results").scrollIntoView({ behavior: "smooth", block: "nearest" });
});

function enableScrollAnimations() {
  const animatedElements = document.querySelectorAll(
    ".hero-copy, .hero-art, .hero-note, .section-heading, .planner-form, .results-card, .how-card, .disclaimer"
  );
  animatedElements.forEach((element) => element.classList.add("reveal"));

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
    animatedElements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  animatedElements.forEach((element) => observer.observe(element));
}

renderBuildMap();
enableScrollAnimations();
