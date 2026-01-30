# US Stock Risk Index

This repo contains an MVP implementation for the **US Stock Risk Index** as a static site
that reads the latest risk score from `data/latest-risk-score.json`.

## Updating data

This version is API-free to keep deployment simple and deterministic. To refresh the dashboard:

1. Update `data/latest-risk-score.json` with the latest readings, sub-scores, and weights.
2. Ensure `updatedAt` and `timezone` are set so the UI can display the current timestamp.

## Serving the site locally

```
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

If you are previewing `index.html` directly (without a server), the page will fall back to
the embedded sample data and still render the gauge and cards.

## Disclaimer

This project is for informational purposes only and does not constitute investment advice.
