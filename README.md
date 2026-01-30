<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1tBcWIqr_VaNP9w1BXfGh6OjdBxy5e2vV

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `VITE_FRED_API_KEY` in [.env.local](.env.local) to your FRED API key (optional but recommended for higher limits)
3. Set the `VITE_OPENAI_API_KEY` in [.env.local](.env.local) if you want AI analysis via ChatGPT
4. Run the app:
   `npm run dev`
