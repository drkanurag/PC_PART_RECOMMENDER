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

Frontend features are split into browser-side service modules under [`js/services/`](./js/services/). Catalog, recommendations and prices can each be deployed and scaled as an independent Cloudflare Worker; their URLs are set in [`js/service-config.js`](./js/service-config.js). Empty URLs keep the site usable with its bundled sample catalog and recommendations. Deploy only the services you want to run remotely.

| Service | Worker/config | Responsibility |
| --- | --- | --- |
| Catalog | [`services/catalog/`](./services/catalog/) | Search and filter individual component listings |
| Recommendations | [`services/recommendations/`](./services/recommendations/) | Serve curated budget builds and budget recommendations |
| Pricing | [`price-api/`](./price-api/) | Fetch Indian retailer offers through SerpApi and cache results |
| Demo cart | [`js/services/cart-service.js`](./js/services/cart-service.js) | Save and edit the no-checkout cart locally in the visitor's browser |

The browser cart is deliberately local-only for this demo. Making it a remote order/cart service would require user accounts, a database, stock/price validation, privacy controls and a checkout provider; those are not implemented.

## Live retailer prices

The site is hosted as a static GitHub Pages site, so it cannot safely call a private price API directly. A small Cloudflare Worker in [`price-api/`](./price-api/) keeps the SerpApi key on the server; the key must never be committed or placed in browser code. SerpApi's Google Shopping API returns retailer offers for India. Its current free tier allows 250 searches/month; check [SerpApi pricing](https://serpapi.com/pricing) before enabling it, since higher usage is paid.

To connect live pricing:

1. Create a SerpApi account and copy its API key.
2. From the repository root, deploy the Worker once. Wrangler will create and bind its KV cache; then store the API key as a Cloudflare secret:

   ```powershell
   npx wrangler deploy --config price-api/wrangler.toml
   npx wrangler secret put SERPAPI_API_KEY --config price-api/wrangler.toml
   ```

3. Set `ALLOWED_ORIGIN` in `price-api/wrangler.toml` to the exact origin serving the website, deploy again, then copy the deployed Worker origin (for example, `https://rigwise-live-prices.<your-account>.workers.dev`) into the `pricing` field in `js/service-config.js`.
4. Publish the updated site to GitHub Pages. Open the Worker health check at `/health` and use a page's refresh button to confirm that offers are returned.

The Worker limits uncached searches to 24 per client IP per hour; one full build refresh generally uses six to eight searches. The displayed results are indicative Google Shopping listings, not a guaranteed quote or confirmation of stock. Keep the SerpApi key in Cloudflare secrets only; never paste it into this repository or the browser.

### Deploy catalog and recommendations independently

For each Worker, run these commands from the repository root. Set `ALLOWED_ORIGIN` in that service's `wrangler.toml` to the deployed website's exact origin, deploy, then set that Worker URL in the matching property in `js/service-config.js`:

```powershell
npx wrangler deploy --config services/catalog/wrangler.toml
npx wrangler deploy --config services/recommendations/wrangler.toml
```

Set `catalog` to the catalog Worker URL and `recommendations` to the recommendations Worker URL. Deploying either Worker does not require deploying the other services. The demo cart remains browser-local.

## Pages

- [Home and build choices](./index.html)
- [Build choice window](./build-options.html)
- [Custom configurator](./custom-build.html)
- [Budget build recommendations](./recommended-builds.html)
- [Shop individual PC parts](./shop-parts.html)

The hosted frontend updates when changes to the `main` branch are published by GitHub Pages. Live retailer prices require the separately deployed Cloudflare Worker and a configured API key.
