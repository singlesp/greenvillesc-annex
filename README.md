# Greenville Annexation Cost Calculator

A static website that shows a Greenville County, SC property owner how their
yearly costs would change if their property were annexed into the City of
Greenville: property tax by component, vehicle tax, stormwater and sanitation
fees, water, sewer, trash, electricity, sales tax and business license.

It is an unofficial estimate and is not affiliated with the City of Greenville
or Greenville County.

## How it works

- Plain HTML, CSS and JavaScript. No build step, no dependencies, no tracking.
- Address and parcel lookups go straight from the visitor's browser to
  Greenville County's public GIS services. Owner names are never requested.
- If the county service is down, every value can be typed in by hand.

| File | What it holds |
| --- | --- |
| `index.html`, `css/style.css` | The page |
| `js/data.js` | Every rate and fee, with its source. Edit this to update numbers. |
| `js/millage-snapshot.js` | Millage for every county tax district (Auditor's 2026 sheet) |
| `js/calc.js` | The cost model (pure functions) |
| `js/lookup.js` | County GIS address / parcel / district lookup |
| `js/app.js` | Form handling and rendering |

## Run locally

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765.

## Publish on GitHub Pages

In the repository on GitHub: Settings → Pages → Build and deployment →
Source "Deploy from a branch", branch `main`, folder `/ (root)`.

## Keeping it current

- **Each fall:** replace `js/millage-snapshot.js` with the County Auditor's new
  millage sheet, including the school operations / debt split printed at the
  bottom of the sheet.
- **Each January:** Greenville Water, MetroConnects and ReWa rates in `js/data.js`.
- **Each July:** City of Greenville stormwater, sewer and solid waste fees.
- **Each May:** City business license rates and class list.
- Update `asOf` in `js/data.js` whenever you change a rate.

## Known limits

- The 5% Duke Energy franchise fee is inferred from city budget figures, not
  read from the franchise ordinance.
- The owner-occupied sales-tax credit (about $120 per $100,000 of value) comes
  from the city's published examples; no tax bill has shown it yet.
- County stormwater amounts come from the county's billing policy and 2023-24
  tax notices.
- Private trash hauler prices are a placeholder the visitor should overwrite.
- Whether Greater Greenville Sanitation charges and small special-district
  levies end exactly at annexation is assumed from how city tax districts
  appear on the Auditor's sheet.
