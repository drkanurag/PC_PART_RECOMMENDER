import { pcParts } from "./parts-data.js";

export const categories = [
  { id: "processor", label: "Processors" },
  { id: "graphics", label: "Graphic Cards" },
  { id: "motherboard", label: "Motherboard" },
  { id: "memory", label: "RAM" },
  { id: "storage", label: "Internal SSD" },
  { id: "power", label: "Power Supply" },
  { id: "case", label: "Cabinets" },
  { id: "cooler", label: "CPU Cooler" },
  { id: "fans", label: "Case Fans" },
  { id: "accessories", label: "Accessories" },
  { id: "monitor", label: "Monitor" },
  { id: "keyboard", label: "Keyboard" },
  { id: "mouse", label: "Mouse" },
  { id: "mouse-pad", label: "Mouse Pad" },
  { id: "headset", label: "Headset" },
  { id: "controller", label: "Controller" }
];

// Peripheral and accessory catalog entries (real retail components)
export const peripheralProducts = [
  { id: "monitor-acer-24", category: "monitor", brand: "Acer", model: "Nitro VG240Y · 23.8 in IPS", price: 9500, details: "1080p · 100 Hz · 1ms VRB" },
  { id: "monitor-lg-27", category: "monitor", brand: "LG", model: "27MR400 · 27 in IPS", price: 12500, details: "1080p · 100 Hz · AMD FreeSync" },
  { id: "keyboard-logitech-k120", category: "keyboard", brand: "Logitech", model: "K120 wired keyboard", price: 650, details: "Full-size spill-resistant USB keyboard" },
  { id: "keyboard-ant-mk1000", category: "keyboard", brand: "Ant Esports", model: "MK1000 mechanical gaming keyboard", price: 1300, details: "RGB backlit mechanical keyboard" },
  { id: "mouse-logitech-g102", category: "mouse", brand: "Logitech", model: "G102 LIGHTSYNC gaming mouse", price: 1500, details: "8000 DPI optical sensor · 6 programmable buttons" },
  { id: "mouse-razer-deathadder", category: "mouse", brand: "Razer", model: "DeathAdder Essential", price: 1200, details: "6400 DPI optical sensor · ergonomic design" },
  { id: "fan-ant-120", category: "fans", brand: "Ant Esports", model: "120 mm case fan", price: 350, details: "120 mm hydraulic bearing chassis fan" },
  { id: "fan-deepcool-fc120", category: "fans", brand: "DeepCool", model: "FC120 · 120 mm ARGB fan", price: 900, details: "120 mm daisy-chainable ARGB chassis fan" },
  { id: "accessory-logitech-z120", category: "accessories", brand: "Logitech", model: "Z120 USB stereo speakers", price: 1600, details: "Compact USB-powered 3.5mm stereo speakers" },
  { id: "accessory-logitech-c270", category: "accessories", brand: "Logitech", model: "C270 HD webcam", price: 2200, details: "720p HD widescreen USB webcam with noise-reducing mic" },
  { id: "accessory-tp-link-archer-t2u", category: "accessories", brand: "TP-Link", model: "Archer T2U Nano Wi-Fi adapter", price: 900, details: "AC600 dual band USB wireless network adapter" },
  { id: "controller-ant-gp300", category: "controller", brand: "Ant Esports", model: "GP300 wired gamepad", price: 1100, details: "Dual vibration feedback wired PC controller" },
  { id: "controller-logitech-f310", category: "controller", brand: "Logitech", model: "F310 wired gamepad", price: 2200, details: "Console-style 4-switch D-pad PC controller" },
  { id: "headset-cosmic-byte-g2050", category: "headset", brand: "Cosmic Byte", model: "G2050 7.1 gaming headset", price: 1600, details: "7.1 virtual surround sound with RGB LED" },
  { id: "headset-logitech-g335", category: "headset", brand: "Logitech", model: "G335 wired gaming headset", price: 5900, details: "Lightweight suspension headband with Discord certified mic" },
  { id: "mouse-pad-logitech-g240", category: "mouse-pad", brand: "Logitech", model: "G240 cloth gaming mouse pad", price: 1100, details: "Moderate surface friction gaming mouse pad" },
  { id: "mouse-pad-ant-mp280", category: "mouse-pad", brand: "Ant Esports", model: "MP280 extended gaming mouse pad", price: 700, details: "800 x 300 mm extended desk mat with stitched edges" }
];

const partCategoryIds = {
  processor: "processor",
  motherboard: "motherboard",
  memory: "memory",
  storage: "storage",
  graphics: "graphics",
  power: "power",
  case: "case",
  cooler: "cooler"
};

function getProductDetails(product) {
  return [
    product.socket,
    product.memory,
    product.capacity ? `${product.capacity} GB` : "",
    product.size,
    product.watts ? `${product.watts} W` : "",
    product.minimumPsu ? `PSU ${product.minimumPsu} W minimum` : "",
    product.sockets ? `Compatible sockets: ${product.sockets.join(", ")}` : ""
  ].filter(Boolean).join(" · ") || "PC component";
}

const componentProducts = Object.entries(pcParts).flatMap(([partType, part]) => (
  part.products
    .filter((product) => product.price > 0)
    .map((product) => ({
      id: product.id,
      category: partCategoryIds[partType] || partType,
      brand: product.brand,
      model: product.model,
      price: product.price,
      details: getProductDetails(product)
    }))
));

export const products = [...componentProducts, ...peripheralProducts];

export function getLocalProducts(filters = {}) {
  const search = (filters.search || "").trim().toLowerCase();
  return products.filter((product) => (
    product.price > 0
    && (!filters.category || filters.category === "all" || product.category === filters.category)
    && (!filters.brand || filters.brand === "all" || product.brand === filters.brand)
    && (!search || `${product.brand} ${product.model} ${product.details}`.toLowerCase().includes(search))
    && (!Number.isFinite(filters.maxPrice) || product.price <= filters.maxPrice)
  ));
}
