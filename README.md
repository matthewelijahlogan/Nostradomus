# NOSTRADOMUS

**Predictive Global Intelligence**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/matthewelijahlogan/Nostradomus)

NOSTRADOMUS is a probabilistic early-warning platform for global systemic risk. The Oracle produces explainable, calibrated forecasts from conventional evidence. The Codex is an optional, explicitly interpretive research layer for gematria and symbolic-pattern analysis.

## Local preview

```powershell
python -m http.server 8080 --directory public
```

Open `http://localhost:8080`.

## Render

`render.yaml` defines a static Render service. After this repository is pushed to GitHub, create a Render Blueprint from it; Render will publish the `public` directory.

## Product documentation

## Earth Outlook — phase one

The home page now includes 18 evidence-linked watch conditions spanning calamities
and societal triumphs. Filter and search conditions, inspect supporting reporting
and observations, follow connected systems, and save immutable evidence snapshots
in your browser. Outlook briefs and the personal chronicle can be downloaded as JSON.

This phase uses existing public-source endpoints and makes no paid model calls.
Keyword matches are reporting signals, not verified events or calibrated probabilities.
Conditions without matching observations explicitly show evidence gaps. The coverage
is a starting taxonomy, not an exhaustive inventory of everything that can happen.

Validate the evidence engine with `node scripts/test-outlook.js`.

## Intelligence gathering — phase two

`GET /api/intelligence` collects ten free public feeds: BBC World, Health, and
Science; WHO; UN News; NASA News and Earth Observatory; US Department of Energy;
Science/AAAS; and NOAA space-weather bulletins. The source observatory displays
feed availability, publication dates, attempts, and last successful retrievals.
Requests have 12-second timeouts, concurrent collections are shared, and results
are cached for 15 minutes. Last-successful entries are retained and marked during
outages within the running server process; they do not survive a server restart.

Evidence carries publication-age labels. Recent similar headlines from different
source families generate linked corroboration candidates. Headline wording also
flags potential supporting and counter-signals; neither feature verifies facts
or proves contradictory claims. BBC specialist feeds count as one family, as do
NASA feeds. These checks do not determine whether different publishers relied on
the same underlying source. US energy coverage is not globally representative.

Run `node scripts/test-intelligence.js` and `node scripts/test-outlook.js`.
The application makes no paid AI calls and requires no API keys for these feeds.

## Measurable forecasting — phase three

`GET /api/forecasts` computes four historical baselines: worldwide M7+ occurrence
within 30 days; worldwide M8+ occurrence within 90 days; world annual GDP growth
below zero; and world annual GDP growth above 3%. These are measurable event
definitions, not forecasts for all 18 watch conditions.

Earthquake probabilities use ten years of USGS observations and a Gamma-Poisson
rate model with a Jeffreys prior. A fixed fit excluding the last 730 days is scored
on non-overlapping holdout windows. Annual probabilities use World Bank WDI
history and a Beta(1,1) prior; the final 15 observed years are excluded from the
backtest fit. Live estimates refit the full observed record. The UI displays
exact resolution rules, source data, sample sizes, Brier scores, and test outcomes.

These baselines assume historical frequencies remain relevant. They are not
proven prospectively calibrated and do not incorporate current reporting. World
Bank backtests use revised observations rather than historical data vintages.
Earthquake probabilities describe global occurrence, not local danger or impact.
Annual growth above 3% is a narrowly defined economic outcome, not a broad measure
of societal flourishing. Insufficient or unavailable sources withhold models.

Model responses are cached for six hours and requests time out after 15 seconds.
Users can freeze and export up to 50 forecast records in browser storage; this
phase does not automatically resolve outcomes or create a shared server ledger.
Run `node scripts/test-forecasting.js` for model and failure checks.

The current product specification is in `Nostradomus Project Overview.txt`.
