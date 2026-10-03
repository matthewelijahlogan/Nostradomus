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

The current product specification is in `Nostradomus Project Overview.txt`.
