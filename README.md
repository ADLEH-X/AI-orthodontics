# Ortho Papers 🦷✨

> **Latest published research in Artificial Intelligence & Orthodontics**  
> High-end editorial research feed with **SCImago Journal Quartiles (Q1–Q4)**, direct real-time **NCBI PubMed E-Utilities**, and **Google Gemini Free-Tier** clinical summaries.

[![Live Web App](https://img.shields.io/badge/Live%20App-GitHub%20Pages-0F766E?style=for-the-badge)](https://adleh-x.github.io/AI-orthodontics/)
[![SCImago SJR](https://img.shields.io/badge/Quartiles-SCImago%20Q1--Q4-emerald?style=for-the-badge)](https://www.scimagojr.com)
[![NCBI PubMed](https://img.shields.io/badge/Literature-NCBI%20PubMed%20Live-0284c7?style=for-the-badge)](https://pubmed.ncbi.nlm.nih.gov)
[![Google Gemini](https://img.shields.io/badge/AI%20Summaries-Gemini%20Free%20Tier-f59e0b?style=for-the-badge)](https://aistudio.google.com)

---

## 🌟 Highlights

- **Live Multi-Source Literature Fetcher:** Queries **NCBI PubMed E-Utilities** (`esearch` + `efetch` XML) in real time (`sort=date`) and cross-references **Europe PMC** to retrieve newly indexed peer-reviewed orthodontic AI studies and emerging preprints.
- **SCImago Journal Rank (SJR) Quartile Badges:** Every paper displays its verified journal quartile (`Q1` Emerald, `Q2` Teal-Blue, `Q3` Amber, `Q4` Rose, or `Unranked`/`Preprint` Slate) with its SJR score. Clicking any badge opens the **SCImago Popover** with H-Index, publisher, and subject category breakdown.
- **✨ AI Clinical Summaries (Planned for Gemini Free Tier):**
  - **4-Part Structured Card:** *Aim*, *Method & Sample*, *Key Finding*, and a highlighted *Clinical Takeaway*.
  - **Batch Pacing & Local Cache:** Batches 4 papers per request and caches permanently in `localStorage` so refreshing the feed never wastes free-tier quota (15 RPM / 1,500 RPD).
  - **Zero-Key Fallback:** Works out-of-the-box using deterministic clinical abstract synthesis even before an API key is configured.
- **Eye-Comfort Reading Interface:** Switch between **Paper (Warm Off-White)**, **Sepia Study**, and **Midnight Slate** themes, customize text size, toggle serif/sans typography, or dim read papers.
- **Academic Export:** Bookmark papers to your personal **★ Saved List** and export in **.RIS** (Zotero / EndNote), **.BibTeX**, or **.CSV** (with Quartiles and AI Takeaways).

---

## 🚀 Live Demo & Local Usage

### 1. Web App
Open the live deployment directly in any desktop or mobile browser:  
👉 **[https://adleh-x.github.io/AI-orthodontics/](https://adleh-x.github.io/AI-orthodontics/)**

### 2. Run Locally
You can double-click **`Launch Ortho Papers.bat`** or run:

```bash
# Clone the repository
git clone https://github.com/ADLEH-X/AI-orthodontics.git
cd AI-orthodontics

# Start local server
node server.js --open
```

Or simply open `index.html` directly in any web browser without any build tools.

---

## 📁 Repository Structure

```
AI-orthodontics/
├── index.html               # Main editorial web application shell
├── styles.css               # Luxury editorial typography & eye-comfort color system
├── server.js                # Zero-dependency local Node HTTP server
├── Launch Ortho Papers.bat  # 1-Click Windows desktop launcher
├── package.json             # NPM package manifest
└── js/
    ├── journals-sjr.js      # SCImago (SJR) journal quartile & OpenAlex lookup engine
    ├── nlp-summarizer.js    # Gemini Free-Tier batch client & clinical abstract parser
    ├── api-feed.js          # Direct NCBI PubMed XML & Europe PMC live fetcher
    └── app.js               # Application state, filters, popovers & citation export
```

---

## 📄 License
MIT © 2026 [ADLEH-X](https://github.com/ADLEH-X)
