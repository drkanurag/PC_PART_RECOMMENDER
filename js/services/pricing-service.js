export function makeProductQuery(product, categoryLabel) {
  return window.RigwiseLivePrices.makeQuery(categoryLabel, product.brand, product.model);
}

export async function findOffers(product, categoryLabel) {
  const query = makeProductQuery(product, categoryLabel);
  const cached = window.RigwiseLivePrices.getCached(query);
  if (cached?.length) {
    return cached;
  }
  const result = await window.RigwiseLivePrices.refresh([{ id: product.id, query }]);
  const part = result.results.find((entry) => entry.id === product.id);
  if (part?.error) {
    throw new Error(part.error);
  }
  return part?.offers || [];
}
