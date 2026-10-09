const STORAGE_KEY = "rigwise-demo-cart-v1";
const MAX_QUANTITY = 25;

function readCart() {
  const serialized = localStorage.getItem(STORAGE_KEY);
  if (!serialized) {
    return [];
  }
  try {
    const cart = JSON.parse(serialized);
    if (!Array.isArray(cart)) {
      throw new Error("Saved cart has an invalid format.");
    }
    return cart.filter((item) => (
      item
      && typeof item.id === "string"
      && Number.isInteger(item.quantity)
      && item.quantity > 0
      && item.quantity <= MAX_QUANTITY
    )).map((item) => {
      const savedItem = { ...item };
      delete savedItem.imageUrl;
      if (savedItem.offer && typeof savedItem.offer === "object") {
        savedItem.offer = { ...savedItem.offer };
        delete savedItem.offer.imageUrl;
      }
      return savedItem;
    });
  } catch (error) {
    console.error("Could not restore the saved demo cart.", error);
    throw new Error("Your saved cart could not be read. Clear the browser's site data and try again.");
  }
}

function writeCart(cart) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent("rigwise:cart-updated", { detail: cart }));
}

export function getCart() {
  return readCart();
}

export function addItem(product, price, offer = null) {
  if (!product || typeof product.id !== "string" || !Number.isFinite(price) || price < 0) {
    throw new Error("Cannot add an invalid product to the cart.");
  }
  const cart = readCart();
  const existing = cart.find((item) => item.id === product.id);
  if (existing) {
    if (existing.quantity >= MAX_QUANTITY) {
      throw new Error(`You can add up to ${MAX_QUANTITY} of each item.`);
    }
    existing.quantity += 1;
    existing.price = price;
    existing.offer = offer;
  } else {
    cart.push({
      id: product.id,
      name: `${product.brand} ${product.model}`,
      category: product.category,
      price,
      quantity: 1,
      offer
    });
  }
  writeCart(cart);
}

export function updateQuantity(productId, quantity) {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_QUANTITY) {
    throw new Error(`Quantity must be between 0 and ${MAX_QUANTITY}.`);
  }
  const cart = readCart()
    .map((item) => item.id === productId ? { ...item, quantity } : item)
    .filter((item) => item.quantity > 0);
  writeCart(cart);
}

export function clearCart() {
  writeCart([]);
}
