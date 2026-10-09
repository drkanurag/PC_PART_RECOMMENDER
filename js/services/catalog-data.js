import { pcParts } from "./parts-data.js";

export const categories = [
  { id: "accessories", label: "Accessories" },
  { id: "case", label: "Cabinets" },
  { id: "fans", label: "Case Fans" },
  { id: "controller", label: "Controller" },
  { id: "cooler", label: "CPU Cooler" },
  { id: "graphics", label: "Graphic Cards" },
  { id: "headset", label: "Headset" },
  { id: "storage", label: "Internal SSD" },
  { id: "keyboard", label: "Keyboard" },
  { id: "monitor", label: "Monitor" },
  { id: "motherboard", label: "Motherboard" },
  { id: "mouse", label: "Mouse" },
  { id: "mouse-pad", label: "Mouse Pad" },
  { id: "power", label: "Power Supply" },
  { id: "prebuilt", label: "PreBuilt" },
  { id: "processor", label: "Processor" },
  { id: "memory", label: "RAM" },
  { id: "taxable", label: "Taxable" }
];

const peripheralProducts = [
  { id: "intel-arc-b580", category: "graphics", brand: "Intel", model: "Arc B580 · 12 GB", price: 26000, details: "12 GB graphics memory" },
  { id: "amd-rx7600", category: "graphics", brand: "Sapphire", model: "Radeon RX 7600 · 8 GB", price: 27500, details: "8 GB graphics memory" },
  { id: "amd-rx9060xt", category: "graphics", brand: "Sapphire", model: "Radeon RX 9060 XT · 16 GB", price: 42000, details: "16 GB graphics memory" },
  { id: "nvidia-5060", category: "graphics", brand: "MSI", model: "GeForce RTX 5060 · 8 GB", price: 33000, details: "8 GB graphics memory" },
  { id: "nvidia-5070", category: "graphics", brand: "Gigabyte", model: "GeForce RTX 5070 · 12 GB", price: 65000, details: "12 GB graphics memory" },
  { id: "nvidia-5070ti", category: "graphics", brand: "MSI", model: "GeForce RTX 5070 Ti · 16 GB", price: 94000, details: "16 GB graphics memory" },
  { id: "amd-5600g", category: "processor", brand: "AMD", model: "Ryzen 5 5600G · 6-core APU", price: 10500, details: "AM4 · DDR4 · integrated graphics" },
  { id: "amd-5600", category: "processor", brand: "AMD", model: "Ryzen 5 5600 · 6-core", price: 9500, details: "AM4 · DDR4" },
  { id: "amd-7600", category: "processor", brand: "AMD", model: "Ryzen 5 7600 · 6-core", price: 19000, details: "AM5 · DDR5 · integrated graphics" },
  { id: "amd-7500f", category: "processor", brand: "AMD", model: "Ryzen 5 7500F · 6-core", price: 15500, details: "AM5 · DDR5" },
  { id: "amd-7800x3d", category: "processor", brand: "AMD", model: "Ryzen 7 7800X3D · 8-core", price: 38000, details: "AM5 · DDR5" },
  { id: "intel-12400", category: "processor", brand: "Intel", model: "Core i5-12400 · 6-core", price: 12500, details: "LGA1700 · DDR4 · integrated graphics" },
  { id: "intel-245k", category: "processor", brand: "Intel", model: "Core Ultra 5 245K · 14-core", price: 30000, details: "LGA1851 · DDR5 · integrated graphics" },
  { id: "msi-b550m", category: "motherboard", brand: "MSI", model: "B550M PRO-VDH WIFI", price: 8500, details: "AM4 · DDR4 · mATX" },
  { id: "gigabyte-b550m", category: "motherboard", brand: "Gigabyte", model: "B550M DS3H", price: 7500, details: "AM4 · DDR4 · mATX" },
  { id: "asrock-b650m", category: "motherboard", brand: "ASRock", model: "B650M-HDV/M.2", price: 10500, details: "AM5 · DDR5 · mATX" },
  { id: "msi-b650m", category: "motherboard", brand: "MSI", model: "PRO B650M-A WIFI", price: 14500, details: "AM5 · DDR5 · mATX" },
  { id: "msi-b760-ddr5", category: "motherboard", brand: "MSI", model: "PRO B760M-A WIFI", price: 15000, details: "LGA1700 · DDR5 · mATX" },
  { id: "msi-b860m", category: "motherboard", brand: "MSI", model: "PRO B860M-A WIFI", price: 21000, details: "LGA1851 · DDR5 · mATX" },
  { id: "kingston-ddr4-16", category: "memory", brand: "Kingston", model: "FURY Beast · 16 GB DDR4", price: 3400, details: "2 × 8 GB kit" },
  { id: "crucial-ddr4-32", category: "memory", brand: "Crucial", model: "Pro · 32 GB DDR4", price: 6200, details: "2 × 16 GB kit" },
  { id: "kingston-ddr5-16", category: "memory", brand: "Kingston", model: "FURY Beast · 16 GB DDR5", price: 4800, details: "2 × 8 GB kit" },
  { id: "kingston-ddr5-32", category: "memory", brand: "Kingston", model: "FURY Beast · 32 GB DDR5", price: 8500, details: "2 × 16 GB kit" },
  { id: "gskill-ddr5-32", category: "memory", brand: "G.Skill", model: "Flare X5 · 32 GB DDR5", price: 9000, details: "2 × 16 GB kit" },
  { id: "gskill-ddr5-64", category: "memory", brand: "G.Skill", model: "Trident Z5 Neo · 64 GB DDR5", price: 18000, details: "2 × 32 GB kit" },
  { id: "kingston-nv3-500", category: "storage", brand: "Kingston", model: "NV3 · 500 GB NVMe SSD", price: 3100, details: "M.2 NVMe solid-state drive" },
  { id: "kingston-nv3-1tb", category: "storage", brand: "Kingston", model: "NV3 · 1 TB NVMe SSD", price: 5200, details: "M.2 NVMe solid-state drive" },
  { id: "wd-sn580-1tb", category: "storage", brand: "WD", model: "Blue SN580 · 1 TB NVMe SSD", price: 5600, details: "M.2 NVMe solid-state drive" },
  { id: "wd-sn580-2tb", category: "storage", brand: "WD", model: "Blue SN580 · 2 TB NVMe SSD", price: 10300, details: "M.2 NVMe solid-state drive" },
  { id: "samsung-990pro-2tb", category: "storage", brand: "Samsung", model: "990 PRO · 2 TB NVMe SSD", price: 17500, details: "M.2 NVMe solid-state drive" },
  { id: "ant-ice110", category: "case", brand: "Ant Esports", model: "ICE-110 · mATX mesh case", price: 3200, details: "mATX · mesh front" },
  { id: "deepcool-matrexx40", category: "case", brand: "DeepCool", model: "Matrexx 40 3FS · mATX case", price: 4800, details: "mATX · included case fans" },
  { id: "ant-ice300", category: "case", brand: "Ant Esports", model: "ICE-300 · ATX mid-tower case", price: 4800, details: "ATX mid-tower" },
  { id: "deepcool-cc560", category: "case", brand: "DeepCool", model: "CC560 V2 · ATX case", price: 6200, details: "ATX mid-tower · airflow design" },
  { id: "corsair-3000d", category: "case", brand: "Corsair", model: "3000D Airflow · ATX case", price: 7900, details: "ATX mid-tower · airflow design" },
  { id: "deepcool-pk550d", category: "power", brand: "DeepCool", model: "PK550D · 550 W Bronze PSU", price: 3800, details: "550 W · 80+ Bronze" },
  { id: "corsair-cv550", category: "power", brand: "Corsair", model: "CV550 · 550 W Bronze PSU", price: 4200, details: "550 W · 80+ Bronze" },
  { id: "msi-mag650bn", category: "power", brand: "MSI", model: "MAG A650BN · 650 W Bronze PSU", price: 5400, details: "650 W · 80+ Bronze" },
  { id: "corsair-rm750e", category: "power", brand: "Corsair", model: "RM750e · 750 W Gold PSU", price: 9500, details: "750 W · 80+ Gold" },
  { id: "msi-mag850gl", category: "power", brand: "MSI", model: "MAG A850GL PCIE5 · 850 W Gold PSU", price: 10500, details: "850 W · 80+ Gold" },
  { id: "stock-cooler", category: "cooler", brand: "Included", model: "Processor boxed cooler", price: 0, details: "Use the processor's bundled cooler" },
  { id: "deepcool-ag400", category: "cooler", brand: "DeepCool", model: "AG400 · 120 mm tower cooler", price: 2400, details: "Air cooler · 120 mm fan" },
  { id: "coolermaster-hyper212", category: "cooler", brand: "Cooler Master", model: "Hyper 212 Spectrum V3", price: 3400, details: "Air cooler · tower design" },
  { id: "monitor-acer-24", category: "monitor", brand: "Acer", model: "Nitro VG240Y · 23.8 in IPS", price: 9500, details: "1080p · 100 Hz" },
  { id: "monitor-lg-27", category: "monitor", brand: "LG", model: "27MR400 · 27 in IPS", price: 12500, details: "1080p · 100 Hz" },
  { id: "keyboard-logitech-k120", category: "keyboard", brand: "Logitech", model: "K120 wired keyboard", price: 650, details: "Full-size wired keyboard" },
  { id: "keyboard-ant-mk1000", category: "keyboard", brand: "Ant Esports", model: "MK1000 wired gaming keyboard", price: 1300, details: "Full-size gaming keyboard" },
  { id: "mouse-logitech-g102", category: "mouse", brand: "Logitech", model: "G102 LIGHTSYNC gaming mouse", price: 1500, details: "Wired optical gaming mouse" },
  { id: "mouse-razer-deathadder", category: "mouse", brand: "Razer", model: "DeathAdder Essential", price: 1200, details: "Wired ergonomic gaming mouse" },
  { id: "fan-ant-120", category: "fans", brand: "Ant Esports", model: "120 mm case fan", price: 350, details: "120 mm chassis fan" },
  { id: "fan-deepcool-fc120", category: "fans", brand: "DeepCool", model: "FC120 · 120 mm ARGB fan", price: 900, details: "120 mm ARGB chassis fan" },
  { id: "accessory-logitech-z120", category: "accessories", brand: "Logitech", model: "Z120 USB stereo speakers", price: 1600, details: "Representative catalog estimate · USB-powered speakers" },
  { id: "accessory-logitech-c270", category: "accessories", brand: "Logitech", model: "C270 HD webcam", price: 2200, details: "Representative catalog estimate · 720p USB webcam" },
  { id: "accessory-tp-link-archer-t2u", category: "accessories", brand: "TP-Link", model: "Archer T2U Nano Wi-Fi adapter", price: 900, details: "Representative catalog estimate · USB Wi-Fi adapter" },
  { id: "controller-ant-gp300", category: "controller", brand: "Ant Esports", model: "GP300 wired gamepad", price: 1100, details: "Representative catalog estimate · wired PC controller" },
  { id: "controller-logitech-f310", category: "controller", brand: "Logitech", model: "F310 wired gamepad", price: 2200, details: "Representative catalog estimate · wired PC controller" },
  { id: "headset-cosmic-byte-g2050", category: "headset", brand: "Cosmic Byte", model: "G2050 7.1 gaming headset", price: 1600, details: "Representative catalog estimate · wired over-ear headset" },
  { id: "headset-logitech-g335", category: "headset", brand: "Logitech", model: "G335 wired gaming headset", price: 5900, details: "Representative catalog estimate · wired over-ear headset" },
  { id: "mouse-pad-logitech-g240", category: "mouse-pad", brand: "Logitech", model: "G240 cloth gaming mouse pad", price: 1100, details: "Representative catalog estimate · cloth surface" },
  { id: "mouse-pad-ant-mp280", category: "mouse-pad", brand: "Ant Esports", model: "MP280 extended gaming mouse pad", price: 700, details: "Representative catalog estimate · extended desk mat" },
  { id: "prebuilt-entry", category: "prebuilt", brand: "Rigwise", model: "Entry 1080p desktop PC", price: 49900, details: "Representative estimate · Ryzen 5 5600G integrated graphics · verify final configuration" },
  { id: "prebuilt-performance", category: "prebuilt", brand: "Rigwise", model: "Performance 1080p gaming PC", price: 84900, details: "Representative estimate · Ryzen 5 5600 and RTX 4060 · verify final configuration" },
  { id: "prebuilt-creator", category: "prebuilt", brand: "Rigwise", model: "Creator 1440p desktop PC", price: 149900, details: "Representative estimate · Ryzen 7 and RTX 4070-class graphics · verify final configuration" }
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
      category: partCategoryIds[partType],
      brand: product.brand,
      model: product.model,
      price: product.price,
      details: getProductDetails(product)
    }))
));

const additionalProducts = peripheralProducts.filter((product) => product.category !== "graphics"
  && product.category !== "processor"
  && product.category !== "motherboard"
  && product.category !== "memory"
  && product.category !== "storage"
  && product.category !== "case"
  && product.category !== "power"
  && product.category !== "cooler");

export const products = [...componentProducts, ...additionalProducts];

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
