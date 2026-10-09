// Rigwise Shared UI Enhancements: Toasts, Quotation Export, Print Engine, Back-to-Top, and Cart Badge Sync

export function showToast(message, type = "info", action = null) {
  let container = document.querySelector("#rigwise-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "rigwise-toast-container";
    container.className = "rigwise-toast-container";
    container.setAttribute("aria-live", "polite");
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `rigwise-toast rigwise-toast-${type}`;

  const iconSpan = document.createElement("span");
  iconSpan.className = "rigwise-toast-icon";
  if (type === "success") iconSpan.textContent = "✓";
  else if (type === "error") iconSpan.textContent = "✕";
  else if (type === "warning") iconSpan.textContent = "⚠";
  else iconSpan.textContent = "ℹ";

  const msgSpan = document.createElement("span");
  msgSpan.className = "rigwise-toast-msg";
  msgSpan.textContent = message;

  toast.append(iconSpan, msgSpan);

  if (action && action.label) {
    const actionBtn = document.createElement(action.href ? "a" : "button");
    actionBtn.className = "rigwise-toast-action";
    actionBtn.textContent = action.label;
    if (action.href) {
      actionBtn.href = action.href;
    } else if (action.onClick) {
      actionBtn.type = "button";
      actionBtn.addEventListener("click", () => {
        action.onClick();
        removeToast();
      });
    }
    toast.append(actionBtn);
  }

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "rigwise-toast-close";
  closeBtn.innerHTML = "&times;";
  closeBtn.setAttribute("aria-label", "Close notification");
  closeBtn.addEventListener("click", removeToast);
  toast.append(closeBtn);

  function removeToast() {
    toast.classList.add("is-hiding");
    toast.addEventListener("animationend", () => {
      toast.remove();
      if (!container.hasChildNodes()) {
        container.remove();
      }
    });
  }

  container.appendChild(toast);
  setTimeout(removeToast, 4000);
}

export function copyQuotationToClipboard(data) {
  const currency = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  });

  const lines = [
    `═════════════════════════════════════════════════════`,
    ` RIGWISE PC QUOTATION · ${data.title.toUpperCase()}`,
    ` Generated: ${new Date().toLocaleDateString("en-IN", { dateStyle: "medium" })} ${new Date().toLocaleTimeString("en-IN", { timeStyle: "short" })}`,
    `═════════════════════════════════════════════════════`,
    ``
  ];

  if (data.budget) {
    lines.push(`Target Budget: ${currency.format(data.budget)}`);
  }
  if (data.wattage) {
    lines.push(`Estimated Power Draw: ~${data.wattage}W (Recommended PSU: ${data.recommendedPsu || "550W+"})`);
  }
  if (data.budget || data.wattage) {
    lines.push(``);
  }

  lines.push(`COMPONENT BREAKDOWN:`);
  lines.push(`─────────────────────────────────────────────────────`);

  data.items.forEach((item, index) => {
    const num = String(index + 1).padStart(2, "0");
    const name = item.category ? `[${item.category}] ${item.name}` : item.name;
    const price = item.price === 0 ? "Included" : currency.format(item.price);
    const qty = item.quantity && item.quantity > 1 ? ` (Qty: ${item.quantity})` : "";
    lines.push(`${num}. ${name}${qty}`);
    lines.push(`    Price: ${price}${item.source ? ` (${item.source})` : ""}`);
  });

  lines.push(`─────────────────────────────────────────────────────`);
  lines.push(`TOTAL ESTIMATED AMOUNT: ${currency.format(data.total)}`);
  lines.push(`═════════════════════════════════════════════════════`);
  lines.push(`Note: Prices are estimates/live retailer quotes subject to stock & market changes.`);
  lines.push(`Plan and verify your build at: ${window.location.origin || "Rigwise"}`);

  const text = lines.join("\n");
  navigator.clipboard.writeText(text).then(() => {
    showToast("Quotation copied to clipboard! Ready to share.", "success");
  }).catch(() => {
    showToast("Could not copy automatically. Check browser permissions.", "warning");
  });
}

export function printQuotationView(data) {
  window.print();
}

export function initBackToTop() {
  let button = document.querySelector("#rigwise-back-to-top");
  if (!button) {
    button = document.createElement("button");
    button.id = "rigwise-back-to-top";
    button.className = "rigwise-back-to-top";
    button.type = "button";
    button.setAttribute("aria-label", "Scroll back to top");
    button.innerHTML = "↑";
    document.body.appendChild(button);

    window.addEventListener("scroll", () => {
      if (window.scrollY > 350) {
        button.classList.add("is-visible");
      } else {
        button.classList.remove("is-visible");
      }
    }, { passive: true });

    button.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
}

export function updateNavCartBadge() {
  const badges = document.querySelectorAll(".nav-cart-count");
  if (!badges.length) return;
  try {
    const raw = localStorage.getItem("rigwise-demo-cart-v1");
    if (!raw) {
      badges.forEach((b) => { b.textContent = "0"; });
      return;
    }
    const cart = JSON.parse(raw);
    if (Array.isArray(cart)) {
      const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
      badges.forEach((b) => { b.textContent = String(count); });
    }
  } catch (e) {
    badges.forEach((b) => { b.textContent = "0"; });
  }
}

// Auto-run badge update & back to top
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    initBackToTop();
    updateNavCartBadge();
  });
  window.addEventListener("rigwise:cart-updated", updateNavCartBadge);
  window.addEventListener("storage", (e) => {
    if (e.key === "rigwise-demo-cart-v1") updateNavCartBadge();
  });
}
