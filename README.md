# Rigwise — PC Part Recommender

Choose between a custom PC configurator, curated example builds and a shop for individual PC parts.

## Website

**[Open the Rigwise website](https://drkanurag.github.io/PC_PART_RECOMMENDER/)**

If the site has not been published yet, open **Settings → Pages** in this repository and select **Deploy from a branch**, branch **`main`**, folder **`/ (root)`**. GitHub Pages will publish the site at the link above.

## Choosing a build

The home page leads to three focused options. All internal pages, component steps, shopping categories and build recommendations open in the same browser tab.

- **Custom PC build:** Select a processor, motherboard, RAM, storage, graphics card, power supply, case, and cooler. Component steps update in the current tab; selections and budget are saved in your browser.
- **Recommended PC builds:** Choose an example parts list at a popular budget tier, review its estimated total and components, or open the custom builder with the same budget.
- **Shop PC parts:** Browse the full component catalog across paginated results, including cabinets, case fans, controllers, CPU coolers, graphics cards, headsets, SSDs, keyboards, monitors, motherboards, mice, mouse pads, power supplies, prebuilt PCs, processors and RAM. Filter by category, brand, search and price range; compare retailer searches and add parts to a quantity-editable, browser-saved demo cart. Catalog and sample-product prices are estimates.

Custom build options are filtered using the local catalogue for CPU sockets, RAM generation, case size, graphics, cooler fit, and estimated PSU wattage. The catalog prices are planning estimates. With the live-price service configured, use **Refresh selected prices** or **Refresh this build's prices** to request current Indian Google Shopping offers from multiple retailers. The lowest returned offer updates the selected part and build total; up to five offers can be compared. Offers remain available in the current tab for up to one hour while moving between component steps. Refreshing makes a fresh provider search (one search per priced component), so it uses the provider's monthly quota; the site does not poll in the background. Results can still be out of stock or for a different variant. Verify the exact model, seller, delivery charges and compatibility before buying.

The cart is a demo list stored in the visitor's browser. It does not reserve stock, create orders, accept payments or send cart data to a backend.

## Modular services

The frontend is a static site hosted by GitHub Pages. Its browser-side service clients live under [`js/services/`](./js/services/), and the three backend APIs have separate Cloudflare Worker entry points and deployment configurations. They can be deployed independently; the website does not need a backend server just to open.

| Service | Worker/config | Responsibility |
| --- | --- | --- |
| Catalog | [`services/catalog/worker.js`](./services/catalog/worker.js), [`services/catalog/wrangler.toml`](./services/catalog/wrangler.toml); client: [`js/services/catalog-service.js`](./js/services/catalog-service.js) | List and filter component catalog products. Its product data is sourced from the shared [`js/services/catalog-data.js`](./js/services/catalog-data.js) module. |
| Recommendations | [`services/recommendations/worker.js`](./services/recommendations/worker.js), [`services/recommendations/wrangler.toml`](./services/recommendations/wrangler.toml); client: [`js/services/recommendation-service.js`](./js/services/recommendation-service.js) | Serve curated builds and budget recommendations from [`js/services/recommendation-data.js`](./js/services/recommendation-data.js). |
| Live pricing | [`price-api/worker.js`](./price-api/worker.js), [`price-api/wrangler.toml`](./price-api/wrangler.toml); client: [`js/services/pricing-service.js`](./js/services/pricing-service.js) and [`js/live-prices.js`](./js/live-prices.js) | Query Google Shopping via SerpApi, validate retailer offers, cache results in Cloudflare KV, and limit searches. The API key stays in a Cloudflare secret. |
| Demo cart | [`js/services/cart-service.js`](./js/services/cart-service.js) | Save and edit the no-checkout cart in the visitor's browser; it is not a remote service. |

This is separation by API responsibility and deployment, not by separate repositories or databases: the catalog and recommendation Workers import their data from the shared frontend modules in this repository. Empty endpoint settings keep the static site functional using those bundled data modules. Set the catalog and recommendations Worker URLs in [`js/service-config.js`](./js/service-config.js). Set the pricing Worker URL in [`js/price-config.js`](./js/price-config.js) (or the `pricing` setting in `service-config.js`). Publish those config changes with the site.

The Pages site and Cloudflare Workers are deployed separately. A successful Pages deployment does not deploy the Workers; deploy only the services you want to enable.

The browser cart is deliberately local-only for this demo. Making it a remote order/cart service would require user accounts, a database, stock/price validation, privacy controls and a checkout provider; those are not implemented.

## Live retailer prices

The site is hosted as a static GitHub Pages site, so it cannot safely call a private price API directly. A small Cloudflare Worker in [`price-api/`](./price-api/) keeps the SerpApi key on the server; the key must never be committed or placed in browser code. SerpApi's Google Shopping API returns retailer offers for India. Its current free tier allows 250 searches/month; check [SerpApi pricing](https://serpapi.com/pricing) before enabling it, since higher usage is paid.

To connect live pricing:

1. Create a SerpApi account and copy its API key.
2. Create the Cloudflare KV namespace from the repository root:

   ```powershell
   npx wrangler kv namespace create PRICE_DATA --config price-api/wrangler.toml
   ```

   Copy the namespace ID printed by Wrangler into the `id` property under `[[kv_namespaces]]` in [`price-api/wrangler.toml`](./price-api/wrangler.toml). The ID belongs to your Cloudflare account, so it should not be copied from another deployment.
3. Confirm `ALLOWED_ORIGIN` in `price-api/wrangler.toml` matches the website origin exactly (`https://drkanurak.github.io` for the project Pages URL). Deploy the Worker and add the API key as a Cloudflare secret:

   ```powershell
   npx wrangler deploy --config price-api/wrangler.toml
   npx wrangler secret put SERPAPI_API_KEY --config price-api/wrangler.toml
   ```

4. Copy the deployed Worker URL (for example, `https://rigwise-live-prices.<your-account>.workers.dev`) into `js/price-config.js` as `window.RIGWISE_PRICE_API_URL`. Publish the updated file to GitHub Pages.
5. Check `https://<your-price-worker>.workers.dev/health` reports `"configured": true`, then use a page's refresh button to confirm offers are returned.

The Worker limits uncached searches to 24 per client IP per hour; one full build refresh generally uses six to eight searches. The displayed results are indicative Google Shopping listings, not a guaranteed quote or confirmation of stock. Keep the SerpApi key in Cloudflare secrets only; never paste it into this repository or the browser.

### Deploy catalog and recommendations independently

For each Worker, run its command from the repository root. The included `ALLOWED_ORIGIN` value matches the GitHub Pages origin; change it only if the site will be served from a different origin. After deployment, set each Worker URL in the matching property in `js/service-config.js`, then publish that config change:

```powershell
npx wrangler deploy --config services/catalog/wrangler.toml
npx wrangler deploy --config services/recommendations/wrangler.toml
```

Check each Worker at `https://<worker-url>/health`; it should return `"status":"ok"`. Set `catalog` to the catalog Worker URL and `recommendations` to the recommendations Worker URL. Deploying either Worker does not require deploying the other services. The demo cart remains browser-local.

## Pages

- [Home and build choices](./index.html)
- [Build choice window](./build-options.html)
- [Custom configurator](./custom-build.html)
- [Budget build recommendations](./recommended-builds.html)
- [Shop individual PC parts](./shop-parts.html)

The hosted frontend updates when changes to the `main` branch are published by GitHub Pages. Live retailer prices require the separately deployed Cloudflare Worker and a configured API key.
