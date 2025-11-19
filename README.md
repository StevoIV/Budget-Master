<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/temp/1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Try the newest build

To explore the autosave, analytics, and enhanced folder management updates that
were recently merged:

1. Start the development server with `npm run dev` (or `npm run build && npm run
   preview` if you prefer to test the production bundle).
2. Open the printed local URL (typically `http://localhost:5173`) in your
   browser.
3. Create or open a budgeting sheet, make a few edits, and observe the new
   autosave status indicator in the header. Try closing or refreshing the tab to
   see the unsaved-changes guard in action.
4. Navigate back to the folder dashboard to use the search, sorting, and bulk
   actions, then review the new historical analytics panel beneath the folder
   list.

Any time you want to reset your workspace and retest, you can clear the app's
local storage from your browser dev tools and refresh the page.
