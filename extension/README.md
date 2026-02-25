# RankPilot Chrome Extension

Instant SEO + AI Search score for any webpage, right from your browser toolbar.

## 📦 Installation (Developer Mode)

1. Open Chrome and go to: `chrome://extensions/`
2. Toggle **"Developer mode"** ON (top-right corner)
3. Click **"Load unpacked"**
4. Select this folder: `SEO/extension/`
5. The ◆ RankPilot icon will appear in your toolbar

## 🔧 Configuration

Open `popup.js` and update line 3 to point to your deployed RankPilot site:

```js
const RANKPILOT_URL = 'https://your-deployed-rankpilot-site.com';
```

If running locally, use:
```js
const RANKPILOT_URL = 'file:///C:/Users/Nipun Magotra/Downloads/SEO/index.html';
```

## ✨ Features

- **SEO Score** ring — Meta, Headings, Content, Technical
- **AI Score** ring — Schema, Content Depth, Q&A Headings, Freshness
- **Per-category badges** at a glance
- **5 top issue highlights** with pass/warn/fail icons
- **"View Full Report"** button → opens full RankPilot audit for the current page
