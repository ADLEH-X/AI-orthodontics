/**
 * OrthoAI Journal Feed — Main Application Controller
 * Handles live feed refresh, quartile filtering, SCImago popover inspection,
 * Gemini Free-Tier AI summary orchestration, reading comfort settings,
 * and citation export (RIS / BibTeX / CSV / AMA).
 */

(function () {
  const STORAGE_KEYS = {
    SEEN_IDS: "orthoai_seen_paper_ids_v3",
    NEW_IDS: "orthoai_current_new_ids_v3",
    READ_IDS: "orthoai_read_paper_ids_v1",
    SAVED_PAPERS: "orthoai_saved_papers_v1",
    CACHED_FEED: "orthoai_cached_feed_v3",
    LAST_UPDATED: "orthoai_last_updated_v3",
    PREFS: "orthoai_reader_prefs_v1"
  };

  // Application State
  const state = {
    papers: [],
    savedPapersMap: new Map(),
    seenIds: new Set(),
    newIds: new Set(),
    readIds: new Set(),
    collapsedSummaryIds: new Set(),
    loading: false,
    lastUpdatedIso: null,

    // Active Filters
    activeTab: "all", // "all" | "unread" | "saved"
    selectedQuartiles: new Set(), // empty = All quartiles; otherwise set of "Q1", "Q2", "Q3", "Q4", "Unranked"
    selectedTopic: "All",
    timeRangeDays: "all", // "all" | "7" | "30" | "90" | "365"
    sortBy: "newest", // "newest" | "quartile" | "sjr" | "cited"
    searchQuery: "",

    // Reader Comfort Preferences
    prefs: {
      theme: "paper", // "paper" | "sepia" | "midnight"
      textSize: "default", // "compact" | "default" | "relaxed" | "large"
      fontStyle: "serif", // "serif" | "sans"
      width: "focused", // "focused" | "wide"
      dimRead: true,
      showAiSummaries: true,
      includePreprints: true
    }
  };

  // Load persisted state from localStorage
  function loadPersistedState() {
    try {
      const seen = JSON.parse(localStorage.getItem(STORAGE_KEYS.SEEN_IDS) || "[]");
      state.seenIds = new Set(seen);

      const newArr = JSON.parse(localStorage.getItem(STORAGE_KEYS.NEW_IDS) || "[]");
      state.newIds = new Set(newArr);

      const read = JSON.parse(localStorage.getItem(STORAGE_KEYS.READ_IDS) || "[]");
      state.readIds = new Set(read);

      const savedArr = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_PAPERS) || "[]");
      savedArr.forEach((p) => {
        if (p && p.id) state.savedPapersMap.set(p.id, p);
      });

      const cachedFeed = JSON.parse(localStorage.getItem(STORAGE_KEYS.CACHED_FEED) || "[]");
      if (Array.isArray(cachedFeed) && cachedFeed.length > 0) {
        state.papers = cachedFeed;
      }

      state.lastUpdatedIso = localStorage.getItem(STORAGE_KEYS.LAST_UPDATED) || null;

      const savedPrefs = JSON.parse(localStorage.getItem(STORAGE_KEYS.PREFS) || "{}");
      state.prefs = { ...state.prefs, ...savedPrefs };
    } catch (e) {
      console.warn("Could not restore persisted state:", e);
    }
  }

  function savePrefs() {
    try {
      localStorage.setItem(STORAGE_KEYS.PREFS, JSON.stringify(state.prefs));
    } catch (_) {}
  }

  function saveSeenAndNew() {
    try {
      localStorage.setItem(STORAGE_KEYS.SEEN_IDS, JSON.stringify([...state.seenIds]));
      localStorage.setItem(STORAGE_KEYS.NEW_IDS, JSON.stringify([...state.newIds]));
    } catch (_) {}
  }

  function saveReadIds() {
    try {
      localStorage.setItem(STORAGE_KEYS.READ_IDS, JSON.stringify([...state.readIds]));
    } catch (_) {}
  }

  function saveSavedPapers() {
    try {
      localStorage.setItem(
        STORAGE_KEYS.SAVED_PAPERS,
        JSON.stringify([...state.savedPapersMap.values()])
      );
    } catch (_) {}
  }

  // Apply Reader Comfort Preferences to DOM
  function applyPrefsToDom() {
    const docEl = document.documentElement;
    docEl.setAttribute("data-theme", state.prefs.theme);
    docEl.setAttribute("data-text-size", state.prefs.textSize);
    docEl.setAttribute("data-font-style", state.prefs.fontStyle);
    docEl.setAttribute("data-width", state.prefs.width);
    document.body.setAttribute("data-dim-read", state.prefs.dimRead ? "true" : "false");

    // Update Global AI Summary toggle button
    const aiToggleBtn = document.getElementById("btnToggleGlobalAi");
    if (aiToggleBtn) {
      aiToggleBtn.classList.toggle("active", state.prefs.showAiSummaries);
      const labelSpan = aiToggleBtn.querySelector(".ai-toggle-text");
      if (labelSpan) {
        labelSpan.textContent = state.prefs.showAiSummaries ? "Summaries: On" : "Summaries: Off";
      }
    }

    // Update Gemini API key status indicator dot
    const keyDot = document.getElementById("geminiStatusDot");
    const hasKey = Boolean(window.ORTHO_AI_SUMMARIZER.getApiKey());
    if (keyDot) {
      keyDot.classList.toggle("connected", hasKey);
    }

    // Sync active buttons inside Reader Comfort modal
    document.querySelectorAll("[data-pref-key]").forEach((btn) => {
      const k = btn.getAttribute("data-pref-key");
      const v = btn.getAttribute("data-pref-val");
      btn.classList.toggle("active", String(state.prefs[k]) === String(v));
    });
  }

  // Format date nicely (e.g., "14 Oct 2026")
  function formatPubDate(dateStr) {
    if (!dateStr) return "Recent";
    const parts = dateStr.split("-");
    const year = parts[0];
    const monthIdx = parts[1] ? parseInt(parts[1], 10) - 1 : 0;
    const day = parts[2] ? parseInt(parts[2], 10) : null;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mName = months[monthIdx] || "";
    if (day && mName) return `${day} ${mName} ${year}`;
    if (mName) return `${mName} ${year}`;
    return year;
  }

  function formatTimeTimestamp(isoStr) {
    if (!isoStr) return "Never";
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (_) {
      return "Just now";
    }
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Show Toast Notification
  function showToast(message) {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const el = document.createElement("div");
    el.className = "toast-item";
    el.innerHTML = `<span>✦</span> <span>${escapeHtml(message)}</span>`;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(8px)";
      el.style.transition = "all 0.2s ease";
      setTimeout(() => el.remove(), 220);
    }, 3400);
  }

  /**
   * Core Live Refresh Handler
   */
  async function refreshFeed(isInitialAutoLoad = false) {
    if (state.loading) return;
    state.loading = true;

    const refreshBtn = document.getElementById("btnRefreshFeed");
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.classList.add("loading");
      const span = refreshBtn.querySelector(".refresh-btn-label");
      if (span) span.textContent = "Updating…";
    }

    if (state.papers.length === 0) {
      renderSkeletonFeed();
    }

    try {
      const fetchedPapers = await window.ORTHO_FEED_API.fetchLivePapers({
        pageSize: 85,
        includePreprints: state.prefs.includePreprints
      });

      if (fetchedPapers && fetchedPapers.length > 0) {
        const hadSeenBefore = state.seenIds.size > 0;
        let newlyDiscoveredCount = 0;
        const freshNewIds = new Set();

        fetchedPapers.forEach((p) => {
          if (!state.seenIds.has(p.id)) {
            newlyDiscoveredCount++;
            freshNewIds.add(p.id);
            state.seenIds.add(p.id);
          } else if (state.newIds.has(p.id) && isInitialAutoLoad) {
            freshNewIds.add(p.id);
          }
        });

        // If this was the very first launch ever, highlight the 8 most recent papers as NEW
        if (!hadSeenBefore) {
          fetchedPapers.slice(0, 8).forEach((p) => freshNewIds.add(p.id));
          newlyDiscoveredCount = Math.min(8, fetchedPapers.length);
        }

        state.newIds = freshNewIds;
        state.papers = fetchedPapers;
        state.lastUpdatedIso = new Date().toISOString();

        saveSeenAndNew();
        try {
          localStorage.setItem(STORAGE_KEYS.CACHED_FEED, JSON.stringify(state.papers));
          localStorage.setItem(STORAGE_KEYS.LAST_UPDATED, state.lastUpdatedIso);
        } catch (_) {}

        renderAll();

        if (!isInitialAutoLoad) {
          if (newlyDiscoveredCount > 0) {
            showToast(`Feed refreshed · ${newlyDiscoveredCount} new paper${newlyDiscoveredCount === 1 ? "" : "s"} found`);
          } else {
            showToast(`You're up to date · Checked ${fetchedPapers.length} recent papers`);
          }
        }

        // Trigger Gemini Free-Tier background batch queue if API key is configured
        triggerGeminiBatchForVisible();
      }
    } catch (err) {
      console.warn("Live fetch error, using cached or fallback dataset:", err);
      if (state.papers.length === 0) {
        state.papers = window.ORTHO_FEED_API.getOfflineFallbackPapers();
        state.papers.forEach((p) => state.newIds.add(p.id));
        renderAll();
      }
      showToast("Offline mode · Showing locally cached Orthodontics & AI papers");
    } finally {
      state.loading = false;
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.classList.remove("loading");
        const span = refreshBtn.querySelector(".refresh-btn-label");
        if (span) span.textContent = "Refresh";
      }
    }
  }

  /**
   * Queue visible papers for Gemini Free-Tier batch summarization when an API key is present
   */
  function triggerGeminiBatchForVisible() {
    if (!state.prefs.showAiSummaries || !window.ORTHO_AI_SUMMARIZER.getApiKey()) return;
    const filtered = getFilteredAndSortedPapers();
    window.ORTHO_AI_SUMMARIZER.summarizeBatchQueue(filtered.slice(0, 12), (paperId, summaryObj) => {
      updateCardSummaryDom(paperId, summaryObj);
    });
  }

  /**
   * Filter & Sort Pipeline
   */
  function getBasePoolForTab() {
    if (state.activeTab === "saved") {
      return [...state.savedPapersMap.values()];
    }
    if (state.activeTab === "unread") {
      return state.papers.filter((p) => !state.readIds.has(p.id));
    }
    return state.papers;
  }

  function getFilteredAndSortedPapers() {
    let list = getBasePoolForTab();

    // 1. Time Window Filter
    if (state.timeRangeDays !== "all") {
      const days = parseInt(state.timeRangeDays, 10);
      if (!isNaN(days)) {
        // Compute relative to newest paper date or system date
        const refTime = state.papers.length > 0
          ? Math.max(...state.papers.map((p) => new Date(p.pubDate || "2026-10-01").getTime()))
          : Date.now();
        const cutoff = refTime - days * 86400000;
        list = list.filter((p) => {
          const t = new Date(p.pubDate || "2026-01-01").getTime();
          return !isNaN(t) && t >= cutoff;
        });
      }
    }

    // 2. Topic Filter
    if (state.selectedTopic !== "All") {
      list = list.filter((p) => (p.topics || []).includes(state.selectedTopic));
    }

    // 3. Search Query Filter
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(q) ||
          (p.abstractText || "").toLowerCase().includes(q) ||
          (p.authors || "").toLowerCase().includes(q) ||
          (p.journalTitle || "").toLowerCase().includes(q) ||
          (p.journalFullTitle || "").toLowerCase().includes(q) ||
          (p.doi || "").toLowerCase().includes(q)
      );
    }

    // 4. Quartile Filter
    if (state.selectedQuartiles.size > 0) {
      list = list.filter((p) => state.selectedQuartiles.has(p.quartile || "Unranked"));
    }

    // 5. Sort
    const sorted = [...list];
    if (state.sortBy === "quartile") {
      sorted.sort((a, b) => {
        const qa = window.ORTHO_SJR_DB.getQuartileRankValue(a.quartile);
        const qb = window.ORTHO_SJR_DB.getQuartileRankValue(b.quartile);
        if (qa !== qb) return qa - qb;
        const sjrA = a.journalMetrics?.sjr || 0;
        const sjrB = b.journalMetrics?.sjr || 0;
        if (sjrB !== sjrA) return sjrB - sjrA;
        return (b.pubDate || "").localeCompare(a.pubDate || "");
      });
    } else if (state.sortBy === "sjr") {
      sorted.sort((a, b) => {
        const sjrA = a.journalMetrics?.sjr || 0;
        const sjrB = b.journalMetrics?.sjr || 0;
        if (sjrB !== sjrA) return sjrB - sjrA;
        return (b.pubDate || "").localeCompare(a.pubDate || "");
      });
    } else if (state.sortBy === "cited") {
      sorted.sort((a, b) => {
        if ((b.citedByCount || 0) !== (a.citedByCount || 0)) {
          return (b.citedByCount || 0) - (a.citedByCount || 0);
        }
        return (b.pubDate || "").localeCompare(a.pubDate || "");
      });
    } else {
      // newest first
      sorted.sort((a, b) => (b.pubDate || "").localeCompare(a.pubDate || ""));
    }

    return sorted;
  }

  /**
   * Render Skeleton Loading Placeholders
   */
  function renderSkeletonFeed() {
    const container = document.getElementById("feedListContainer");
    if (!container) return;
    container.innerHTML = [1, 2, 3]
      .map(
        () => `
      <div class="skeleton-card">
        <div class="ai-shimmer-line" style="width: 35%; height: 16px; margin-bottom: 14px;"></div>
        <div class="ai-shimmer-line" style="width: 90%; height: 24px; margin-bottom: 10px;"></div>
        <div class="ai-shimmer-line" style="width: 65%; height: 18px; margin-bottom: 18px;"></div>
        <div class="ai-shimmer-line" style="width: 100%; height: 90px; border-radius: 10px;"></div>
      </div>
    `
      )
      .join("");
  }

  /**
   * Render Header Telemetry, Tab Counts, and Quartile Pill Counts
   */
  function renderCountsAndTelemetry() {
    const lastUpdatedEl = document.getElementById("statusLastUpdated");
    if (lastUpdatedEl) {
      lastUpdatedEl.textContent = `Last updated: ${formatTimeTimestamp(state.lastUpdatedIso)}`;
    }

    const newBadgeEl = document.getElementById("statusNewCountBadge");
    if (newBadgeEl) {
      const n = state.newIds.size;
      if (n > 0) {
        newBadgeEl.style.display = "inline-flex";
        newBadgeEl.textContent = `● ${n} new paper${n === 1 ? "" : "s"}`;
      } else {
        newBadgeEl.style.display = "none";
      }
    }

    const totalCountEl = document.getElementById("statusTotalCount");
    if (totalCountEl) {
      totalCountEl.textContent = `${state.papers.length} papers indexed`;
    }

    // Masthead headline numbers
    const heroTotal = document.getElementById("heroStatTotal");
    const heroTop = document.getElementById("heroStatTop");
    const heroNew = document.getElementById("heroStatNew");
    if (heroTotal) heroTotal.textContent = state.papers.length || "–";
    if (heroTop) {
      heroTop.textContent = state.papers.length
        ? state.papers.filter((p) => p.quartile === "Q1" || p.quartile === "Q2").length
        : "–";
    }
    if (heroNew) heroNew.textContent = state.papers.length ? state.newIds.size : "–";

    // Tab counts
    const countAll = document.getElementById("tabCountAll");
    const countUnread = document.getElementById("tabCountUnread");
    const countSaved = document.getElementById("tabCountSaved");
    if (countAll) countAll.textContent = state.papers.length;
    if (countUnread) {
      countUnread.textContent = state.papers.filter((p) => !state.readIds.has(p.id)).length;
    }
    if (countSaved) countSaved.textContent = state.savedPapersMap.size;

    // Quartile counts in current tab pool
    const basePool = getBasePoolForTab();
    const qCounts = { Q1: 0, Q2: 0, Q3: 0, Q4: 0, Unranked: 0 };
    basePool.forEach((p) => {
      const q = p.quartile || "Unranked";
      qCounts[q] = (qCounts[q] || 0) + 1;
    });

    ["Q1", "Q2", "Q3", "Q4", "Unranked"].forEach((qKey) => {
      const el = document.getElementById(`qCount_${qKey}`);
      if (el) el.textContent = qCounts[qKey] || 0;
    });
    const elAllQ = document.getElementById("qCount_all");
    if (elAllQ) elAllQ.textContent = basePool.length;

    // Update active state on quartile filter buttons
    document.querySelectorAll(".q-filter-btn").forEach((btn) => {
      const q = btn.getAttribute("data-q");
      if (q === "all") {
        btn.classList.toggle("active", state.selectedQuartiles.size === 0);
      } else {
        btn.classList.toggle("active", state.selectedQuartiles.has(q));
      }
    });
  }

  /**
   * Build HTML for the ✨ AI Summary Panel inside a paper card
   */
  function buildAiSummaryHtml(paper) {
    if (!state.prefs.showAiSummaries) return "";

    const isCollapsed = state.collapsedSummaryIds.has(paper.id);
    const summary = window.ORTHO_AI_SUMMARIZER.getImmediateSummary(paper);

    if (!summary || !summary.hasAbstract) {
      return `
        <div class="ai-summary-panel" id="aiPanel_${escapeHtml(paper.id)}">
          <div class="ai-panel-header" style="margin-bottom:0;">
            <div class="ai-panel-title-group">
              <span class="ai-sparkle-label">AI Summary</span>
              <span class="ai-model-tag">No Abstract Provided</span>
            </div>
            <span style="font-size:0.77rem; color:var(--text-muted);">
              No abstract available from the publisher — open the full paper to verify details.
            </span>
          </div>
        </div>
      `;
    }

    const isGemini = summary.source === "gemini";
    const badgeText = isGemini ? `Gemini AI · ${summary.model || "Flash"}` : "Smart Abstract Synthesis";

    return `
      <div class="ai-summary-panel" id="aiPanel_${escapeHtml(paper.id)}">
        <div class="ai-panel-header">
          <div class="ai-panel-title-group">
            <span class="ai-sparkle-label">AI Summary</span>
            <span class="ai-model-tag">${escapeHtml(badgeText)}</span>
          </div>
          <div class="ai-panel-controls">
            <button type="button" class="ai-mini-btn" data-action="regenerate-ai" data-id="${escapeHtml(paper.id)}" title="Generate or refresh summary with Gemini Free Tier">
              ↻ ${isGemini ? "Regenerate" : "Enhance with Gemini"}
            </button>
            <button type="button" class="ai-mini-btn" data-action="copy-ai" data-id="${escapeHtml(paper.id)}" title="Copy structured summary">
              Copy
            </button>
            <button type="button" class="ai-mini-btn" data-action="toggle-ai" data-id="${escapeHtml(paper.id)}">
              ${isCollapsed ? "Show ▾" : "Hide ▴"}
            </button>
          </div>
        </div>
        ${
          isCollapsed
            ? ""
            : `
          <div class="ai-summary-grid">
            <div class="ai-row">
              <span class="ai-row-label">Aim</span>
              <span class="ai-row-text">${escapeHtml(summary.aim)}</span>
            </div>
            <div class="ai-row">
              <span class="ai-row-label">Method &amp; Sample</span>
              <span class="ai-row-text">${escapeHtml(summary.method)}</span>
            </div>
            <div class="ai-row">
              <span class="ai-row-label">Key Finding</span>
              <span class="ai-row-text">${escapeHtml(summary.finding)}</span>
            </div>
            <div class="ai-takeaway-box">
              <span class="ai-takeaway-label">Clinical Takeaway</span>
              <span class="ai-row-text">${escapeHtml(summary.takeaway)}</span>
            </div>
          </div>
          <div class="ai-panel-footer">
            <span>AI-generated strictly from the published abstract · Verify with the full paper.</span>
            ${
              !isGemini
                ? `<button type="button" class="link-btn-subtle" data-action="open-gemini-modal" style="font-size:0.7rem;">Configure Gemini Free Tier ↗</button>`
                : `<span>Cached locally</span>`
            }
          </div>
        `
        }
      </div>
    `;
  }

  function updateCardSummaryDom(paperId, summaryObj) {
    const paper = state.papers.find((p) => p.id === paperId) || state.savedPapersMap.get(paperId);
    if (!paper) return;
    const panel = document.getElementById(`aiPanel_${paperId}`);
    if (panel) {
      panel.outerHTML = buildAiSummaryHtml(paper);
    }
  }

  /**
   * Render Paper Cards List
   */
  function renderFeedList() {
    const container = document.getElementById("feedListContainer");
    if (!container) return;

    const papers = getFilteredAndSortedPapers();

    if (papers.length === 0) {
      container.innerHTML = `
        <div class="empty-state-box">
          <h3 style="margin:0 0 0.4rem; font-family:var(--font-serif); color:var(--text-primary);">No matching papers found</h3>
          <p style="margin:0 0 1rem; font-size:0.88rem;">
            ${
              state.activeTab === "saved"
                ? "Your Saved Reading List is currently empty. Click '☆ Save' on any paper to bookmark it for later."
                : "Try clearing a quartile or topic filter, or broadening your search terms."
            }
          </p>
          ${
            state.activeTab !== "saved"
              ? `<button type="button" class="card-action-btn primary-link" id="btnResetAllFilters">Reset Filters</button>`
              : ""
          }
        </div>
      `;
      const resetBtn = document.getElementById("btnResetAllFilters");
      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          state.selectedQuartiles.clear();
          state.selectedTopic = "All";
          state.timeRangeDays = "all";
          state.searchQuery = "";
          const searchInp = document.getElementById("searchInput");
          if (searchInp) searchInp.value = "";
          renderAll();
        });
      }
      return;
    }

    container.innerHTML = papers
      .map((paper, idx) => {
        const isNew = state.newIds.has(paper.id);
        const isRead = state.readIds.has(paper.id);
        const isSaved = state.savedPapersMap.has(paper.id);
        const q = paper.quartile || "Unranked";
        const badgeLabel = paper.journalMetrics?.badgeLabel || q;
        const sjrVal = paper.journalMetrics?.sjr;

        const cleanAbs = window.ORTHO_AI_SUMMARIZER.stripHtml(paper.abstractText || "");

        return `
        <article class="paper-card ${isRead ? "is-read" : ""}" data-id="${escapeHtml(paper.id)}" data-quartile="${escapeHtml(q)}">
          <!-- Left plate: running index + SCImago quartile numeral -->
          <aside class="card-plate">
            <span class="plate-index">№ ${String(idx + 1).padStart(2, "0")}</span>
            <button
              type="button"
              class="quartile-badge q-${escapeHtml(q)}"
              data-action="inspect-quartile"
              data-id="${escapeHtml(paper.id)}"
              title="Click for SCImago Journal Rank (SJR) details"
            >
              <span>${escapeHtml(badgeLabel)}</span>
              ${sjrVal ? `<span class="quartile-sjr-sub">SJR ${sjrVal.toFixed(2)}</span>` : ""}
            </button>
          </aside>

          <div class="card-body">
          <!-- 1. Journal, Date, PMID and NEW / OA tags -->
          <div class="card-meta-top">
            <div class="card-meta-left">
              <span
                class="card-journal-name"
                data-action="inspect-quartile"
                data-id="${escapeHtml(paper.id)}"
                title="${escapeHtml(paper.journalFullTitle)} — Click for journal quartile metrics"
              >
                ${escapeHtml(paper.journalTitle)}
              </span>

              <span class="meta-sep">·</span>
              <time class="card-pub-date" title="PubMed Indexed / Publication Date">${escapeHtml(formatPubDate(paper.pubDate))}</time>
              ${
                paper.pmid
                  ? `<span class="meta-sep">·</span><a href="https://pubmed.ncbi.nlm.nih.gov/${escapeHtml(paper.pmid)}/" target="_blank" rel="noopener noreferrer" style="font-family:var(--font-mono); font-size:0.72rem; color:var(--text-muted); text-decoration:underline; text-underline-offset:2px;" title="Verify directly on NCBI PubMed">PMID ${escapeHtml(paper.pmid)} ↗</a>`
                  : ""
              }
            </div>

            <div class="card-meta-right">
              ${
                isNew
                  ? `<span class="badge-new"><span class="badge-new-dot"></span>NEW</span>`
                  : ""
              }
              ${
                paper.isOpenAccess
                  ? `<span class="badge-oa" title="Free Open Access Full Text Available">Open Access</span>`
                  : ""
              }
              ${
                paper.citedByCount > 0
                  ? `<span class="study-type-chip" title="Citations recorded in Europe PMC">${paper.citedByCount} cit.</span>`
                  : ""
              }
            </div>
          </div>

          <!-- 2. Paper Title (Editorial Serif) -->
          <h2 class="card-title">
            <a href="${escapeHtml(paper.primaryUrl)}" target="_blank" rel="noopener noreferrer" data-action="mark-read-on-open" data-id="${escapeHtml(paper.id)}">
              ${escapeHtml(paper.title)}
            </a>
          </h2>

          <!-- 3. Authors & Study-Type Chip -->
          <div class="card-authors-row">
            <span>${escapeHtml(paper.authors)}</span>
            <span class="meta-sep">·</span>
            <span class="study-type-chip">${escapeHtml(paper.studyType)}</span>
          </div>

          <!-- 4. ✨ AI Summary Panel -->
          ${buildAiSummaryHtml(paper)}

          <!-- 5. Topic Tags -->
          <div class="card-tags-row">
            ${(paper.topics || [])
              .map(
                (t) =>
                  `<span class="card-topic-tag" data-action="filter-topic" data-topic="${escapeHtml(t)}">${escapeHtml(t)}</span>`
              )
              .join("")}
          </div>

          <!-- Expandable Full Abstract Drawer -->
          <div class="abstract-drawer" id="absDrawer_${escapeHtml(paper.id)}">
            <div style="font-size:0.74rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-muted); margin-bottom:0.35rem;">
              Published Abstract ${paper.pmid ? `· PMID: ${escapeHtml(paper.pmid)}` : ""} ${paper.doi ? `· DOI: ${escapeHtml(paper.doi)}` : ""}
            </div>
            <div>${cleanAbs ? escapeHtml(cleanAbs) : "No abstract text provided by the publisher."}</div>
          </div>

          <!-- 6. Actions Row -->
          <div class="card-actions-row">
            <div class="card-actions-left">
              <a
                href="${escapeHtml(paper.primaryUrl)}"
                target="_blank"
                rel="noopener noreferrer"
                class="card-action-btn primary-link"
                data-action="mark-read-on-open"
                data-id="${escapeHtml(paper.id)}"
              >
                <span>Open Paper ↗</span>
              </a>

              <button
                type="button"
                class="card-action-btn ${isSaved ? "saved" : ""}"
                data-action="toggle-save"
                data-id="${escapeHtml(paper.id)}"
              >
                <span>${isSaved ? "★ Saved" : "☆ Save"}</span>
              </button>

              <button
                type="button"
                class="card-action-btn"
                data-action="copy-citation"
                data-id="${escapeHtml(paper.id)}"
                title="Copy formatted academic citation"
              >
                <span>Copy Citation</span>
              </button>

              <button
                type="button"
                class="card-action-btn"
                data-action="toggle-abstract"
                data-id="${escapeHtml(paper.id)}"
              >
                <span>Show Abstract ▾</span>
              </button>
            </div>

            <div class="card-actions-right">
              <button
                type="button"
                class="card-action-btn"
                data-action="toggle-read"
                data-id="${escapeHtml(paper.id)}"
                title="Toggle read status"
              >
                <span>${isRead ? "✓ Read" : "Mark Read"}</span>
              </button>
            </div>
          </div>
          </div>
        </article>
      `;
      })
      .join("");
  }

  function renderTopicChips() {
    const row = document.getElementById("topicsFilterRow");
    if (!row) return;
    const topics = ["All", ...window.ORTHO_FEED_API.TOPIC_RULES.map((r) => r.id)];
    row.innerHTML = topics
      .map(
        (t) => `
      <button
        type="button"
        class="topic-chip ${state.selectedTopic === t ? "active" : ""}"
        data-topic="${escapeHtml(t)}"
      >
        ${t === "All" ? "All Topics" : escapeHtml(t)}
      </button>
    `
      )
      .join("");
  }

  function renderAll() {
    applyPrefsToDom();
    renderCountsAndTelemetry();
    renderTopicChips();
    renderFeedList();
  }

  /**
   * Interactive SCImago Quartile Popover Inspector
   */
  async function openQuartilePopover(paperId, anchorEl) {
    const paper = state.papers.find((p) => p.id === paperId) || state.savedPapersMap.get(paperId);
    if (!paper) return;

    const popover = document.getElementById("quartilePopover");
    if (!popover) return;

    const jm = paper.journalMetrics || {};
    const q = paper.quartile || "Unranked";

    const renderPopoverContent = (metrics) => {
      const catHtml = (metrics.categories || [])
        .map(
          (c) => `
        <div class="qp-cat-item">
          <span>${escapeHtml(c.name)}</span>
          <span class="quartile-badge q-${escapeHtml(c.quartile || q)}" style="padding:0.08rem 0.45rem; font-size:0.7rem;">
            ${escapeHtml(c.quartile || q)}
          </span>
        </div>
      `
        )
        .join("");

      popover.innerHTML = `
        <div class="qp-header">
          <div>
            <div style="margin-bottom:0.3rem;">
              <span class="quartile-badge q-${escapeHtml(q)}">${escapeHtml(metrics.badgeLabel || q)}</span>
              <span style="font-size:0.72rem; color:var(--text-muted); margin-left:0.35rem;">
                ${escapeHtml(metrics.edition || "SCImago SJR")}
              </span>
            </div>
            <div class="qp-journal-title">${escapeHtml(metrics.fullTitle || paper.journalFullTitle)}</div>
            <div style="font-size:0.74rem; color:var(--text-muted); margin-top:0.15rem;">
              ${escapeHtml(metrics.publisher || "Academic Publisher")}
              ${paper.issn ? ` · ISSN ${escapeHtml(paper.issn)}` : ""}
            </div>
          </div>
          <button type="button" class="qp-close" id="btnCloseQuartilePopover" aria-label="Close">✕</button>
        </div>

        <div class="qp-metrics-grid">
          <div class="qp-metric-box">
            <span class="qp-metric-label">Best Quartile</span>
            <span class="qp-metric-val">${escapeHtml(metrics.badgeLabel || q)}</span>
          </div>
          <div class="qp-metric-box">
            <span class="qp-metric-label">SJR Score</span>
            <span class="qp-metric-val">${metrics.sjr ? metrics.sjr.toFixed(2) : "N/A"}</span>
          </div>
          <div class="qp-metric-box">
            <span class="qp-metric-label">H-Index</span>
            <span class="qp-metric-val">${metrics.hIndex ? metrics.hIndex : "—"}</span>
          </div>
        </div>

        <div style="font-size:0.71rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-muted); margin-bottom:0.3rem;">
          Subject Category Breakdown
        </div>
        <div class="qp-cat-list">
          ${catHtml}
        </div>

        <div class="qp-note">
          ${escapeHtml(
            metrics.note ||
              "Quartile is a journal-level metric from SCImago (SJR), not a direct rating of this individual article."
          )}
        </div>
      `;

      const closeBtn = document.getElementById("btnCloseQuartilePopover");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => popover.classList.remove("open"));
      }
    };

    renderPopoverContent(jm);
    popover.classList.add("open");

    // Position popover near anchor element while keeping it within viewport bounds
    const rect = anchorEl.getBoundingClientRect();
    const popWidth = 340;
    let left = rect.left;
    if (left + popWidth > window.innerWidth - 16) {
      left = Math.max(12, window.innerWidth - popWidth - 16);
    }
    let top = rect.bottom + 8;
    if (top + 290 > window.innerHeight) {
      top = Math.max(12, rect.top - 280);
    }
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;

    // If unranked and has an ISSN, live-enrich H-Index and publisher from OpenAlex
    if (!jm.matched && !jm.isPreprint && (paper.issn || paper.eissn)) {
      const enriched = await window.ORTHO_SJR_DB.enrichJournalFromOpenAlex(paper.issn || paper.eissn);
      if (enriched && popover.classList.contains("open")) {
        jm.hIndex = enriched.hIndex;
        jm.publisher = enriched.publisher || jm.publisher;
        renderPopoverContent(jm);
      }
    }
  }

  /**
   * Format Academic Citation (AMA / Vancouver style)
   */
  function formatAmaCitation(paper) {
    const authors = paper.authors || "Authors";
    const title = paper.title || "Untitled";
    const journal = paper.journalTitle || "Journal";
    const year = paper.pubYear || (paper.pubDate || "").slice(0, 4);
    const vol = paper.volume ? `${paper.volume}` : "";
    const issue = paper.issue ? `(${paper.issue})` : "";
    const pages = paper.pages ? `:${paper.pages}` : "";
    const doiPart = paper.doi ? ` doi:${paper.doi}` : "";
    const qPart = paper.quartile && paper.quartile !== "Unranked" ? ` [${paper.quartile}]` : "";
    return `${authors}. ${title}. ${journal}${qPart}. ${year};${vol}${issue}${pages}.${doiPart}`;
  }

  /**
   * Export Saved or Current View Papers as RIS (EndNote/Zotero) or BibTeX or CSV
   */
  function exportCitationsFile(format = "ris") {
    const list =
      state.activeTab === "saved" && state.savedPapersMap.size > 0
        ? [...state.savedPapersMap.values()]
        : getFilteredAndSortedPapers();

    if (list.length === 0) {
      showToast("No papers to export");
      return;
    }

    let content = "";
    let filename = `Ortho-Papers-${new Date().toISOString().slice(0, 10)}`;
    let mime = "text/plain;charset=utf-8";

    if (format === "ris") {
      filename += ".ris";
      content = list
        .map((p) => {
          const lines = ["TY  - JOUR"];
          lines.push(`TI  - ${p.title}`);
          (p.authors || "")
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean)
            .forEach((au) => lines.push(`AU  - ${au}`));
          lines.push(`JO  - ${p.journalFullTitle || p.journalTitle}`);
          lines.push(`PY  - ${p.pubYear || (p.pubDate || "").slice(0, 4)}`);
          if (p.volume) lines.push(`VL  - ${p.volume}`);
          if (p.issue) lines.push(`IS  - ${p.issue}`);
          if (p.pages) lines.push(`SP  - ${p.pages}`);
          if (p.issn) lines.push(`SN  - ${p.issn}`);
          if (p.doi) lines.push(`DO  - ${p.doi}`);
          if (p.primaryUrl) lines.push(`UR  - ${p.primaryUrl}`);
          lines.push(`N1  - SCImago Quartile: ${p.quartile || "Unranked"}`);
          if (p.abstractText) {
            lines.push(`AB  - ${window.ORTHO_AI_SUMMARIZER.stripHtml(p.abstractText)}`);
          }
          lines.push("ER  - ");
          return lines.join("\r\n");
        })
        .join("\r\n\r\n");
    } else if (format === "bib") {
      filename += ".bib";
      content = list
        .map((p, idx) => {
          const firstAuth = (p.authors || "Author").split(/[\s,]+/)[0].replace(/[^a-zA-Z]/g, "");
          const key = `${firstAuth}${p.pubYear || "2026"}_${idx + 1}`;
          return `@article{${key},
  title = {${p.title}},
  author = {${(p.authors || "").replace(/,/g, " and")}},
  journal = {${p.journalFullTitle || p.journalTitle}},
  year = {${p.pubYear || "2026"}},
  volume = {${p.volume || ""}},
  pages = {${p.pages || ""}},
  doi = {${p.doi || ""}},
  note = {Quartile: ${p.quartile || "Unranked"}}
}`;
        })
        .join("\n\n");
    } else if (format === "csv") {
      filename += ".csv";
      mime = "text/csv;charset=utf-8";
      const escCsv = (v) => `"${String(v || "").replace(/"/g, '""')}"`;
      const header = ["Quartile", "SJR", "Publication Date", "Journal", "Title", "Authors", "Study Type", "Clinical Takeaway", "DOI", "URL"];
      const rows = list.map((p) => {
        const sum = window.ORTHO_AI_SUMMARIZER.getImmediateSummary(p);
        return [
          p.quartile,
          p.journalMetrics?.sjr || "",
          p.pubDate,
          p.journalTitle,
          p.title,
          p.authors,
          p.studyType,
          sum?.takeaway || "",
          p.doi,
          p.primaryUrl
        ]
          .map(escCsv)
          .join(",");
      });
      content = [header.join(","), ...rows].join("\r\n");
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showToast(`Exported ${list.length} papers as ${filename}`);
  }

  /**
   * Update Quota Meter inside the Gemini Free-Tier Studio Modal
   */
  function updateGeminiModalStats() {
    const stats = window.ORTHO_AI_SUMMARIZER.getQuotaStats();
    const box = document.getElementById("geminiQuotaStatsBox");
    if (!box) return;
    const hasKey = Boolean(window.ORTHO_AI_SUMMARIZER.getApiKey());

    box.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:0.35rem; font-weight:600; color:var(--text-primary);">
        <span>Gemini Free-Tier Pacer Status</span>
        <span style="color:${hasKey ? "var(--q1-color)" : "var(--text-muted)"};">
          ${hasKey ? "● Active & Connected" : "○ Using Instant Local Parser"}
        </span>
      </div>
      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:0.4rem; margin-top:0.45rem;">
        <div class="qp-metric-box">
          <span class="qp-metric-label">RPM (Last 60s)</span>
          <span class="qp-metric-val">${stats.rpmUsed} / ${stats.rpmLimit}</span>
        </div>
        <div class="qp-metric-box">
          <span class="qp-metric-label">Daily Requests</span>
          <span class="qp-metric-val">${stats.rpdUsed} / ${stats.rpdLimit}</span>
        </div>
        <div class="qp-metric-box">
          <span class="qp-metric-label">Cached Summaries</span>
          <span class="qp-metric-val">${stats.cachedSummariesCount}</span>
        </div>
      </div>
    `;
  }

  /**
   * Attach Event Listeners
   */
  function bindEvents() {
    // 1. Refresh Button
    const refreshBtn = document.getElementById("btnRefreshFeed");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => refreshFeed(false));
    }

    // 2. Mark All Seen Button
    const markSeenBtn = document.getElementById("btnMarkAllSeen");
    if (markSeenBtn) {
      markSeenBtn.addEventListener("click", () => {
        state.newIds.clear();
        saveSeenAndNew();
        renderAll();
        showToast("Cleared 'NEW' badges across current feed");
      });
    }

    // 3. Global AI Summary Toggle Button
    const globalAiBtn = document.getElementById("btnToggleGlobalAi");
    if (globalAiBtn) {
      globalAiBtn.addEventListener("click", () => {
        state.prefs.showAiSummaries = !state.prefs.showAiSummaries;
        savePrefs();
        renderAll();
      });
    }

    // 4. View Tabs (All / Unread / Saved)
    document.querySelectorAll(".view-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".view-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        state.activeTab = tab.getAttribute("data-tab") || "all";
        const exportBar = document.getElementById("savedExportBar");
        if (exportBar) {
          exportBar.style.display = state.activeTab === "saved" ? "flex" : "none";
        }
        renderAll();
      });
    });

    // 5. Quartile Filter Buttons (Multi-select + "All" reset)
    document.querySelectorAll(".q-filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const q = btn.getAttribute("data-q");
        if (q === "all") {
          state.selectedQuartiles.clear();
        } else {
          if (state.selectedQuartiles.has(q)) {
            state.selectedQuartiles.delete(q);
          } else {
            state.selectedQuartiles.add(q);
          }
        }
        renderAll();
      });
    });

    // 6. Time Range & Sort Selectors
    const timeSelect = document.getElementById("selectTimeRange");
    if (timeSelect) {
      timeSelect.addEventListener("change", (e) => {
        state.timeRangeDays = e.target.value;
        renderAll();
      });
    }

    const sortSelect = document.getElementById("selectSortBy");
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        state.sortBy = e.target.value;
        renderAll();
      });
    }

    // 7. Search Input
    const searchInput = document.getElementById("searchInput");
    const searchClear = document.getElementById("btnClearSearch");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        state.searchQuery = e.target.value;
        if (searchClear) {
          searchClear.classList.toggle("visible", state.searchQuery.length > 0);
        }
        renderFeedList();
      });
    }
    if (searchClear && searchInput) {
      searchClear.addEventListener("click", () => {
        state.searchQuery = "";
        searchInput.value = "";
        searchClear.classList.remove("visible");
        renderFeedList();
      });
    }

    // 8. Topic Chips Bar Delegation
    const topicsRow = document.getElementById("topicsFilterRow");
    if (topicsRow) {
      topicsRow.addEventListener("click", (e) => {
        const chip = e.target.closest(".topic-chip");
        if (!chip) return;
        state.selectedTopic = chip.getAttribute("data-topic") || "All";
        renderAll();
      });
    }

    // 9. Feed Card Actions Delegation
    const feedContainer = document.getElementById("feedListContainer");
    if (feedContainer) {
      feedContainer.addEventListener("click", async (e) => {
        const target = e.target.closest("[data-action]");
        if (!target) return;

        const action = target.getAttribute("data-action");
        const paperId = target.getAttribute("data-id");
        const paper = state.papers.find((p) => p.id === paperId) || state.savedPapersMap.get(paperId);

        if (action === "inspect-quartile") {
          e.stopPropagation();
          openQuartilePopover(paperId, target);
        } else if (action === "toggle-save" && paper) {
          if (state.savedPapersMap.has(paper.id)) {
            state.savedPapersMap.delete(paper.id);
            showToast("Removed from Saved Reading List");
          } else {
            state.savedPapersMap.set(paper.id, paper);
            showToast("Saved to your Reading List");
          }
          saveSavedPapers();
          renderAll();
        } else if (action === "copy-citation" && paper) {
          const cit = formatAmaCitation(paper);
          navigator.clipboard?.writeText(cit);
          showToast("Copied academic citation to clipboard");
        } else if (action === "toggle-abstract" && paper) {
          const drawer = document.getElementById(`absDrawer_${paper.id}`);
          if (drawer) {
            const isOpen = drawer.classList.toggle("open");
            target.innerHTML = `<span>${isOpen ? "Hide Abstract ▴" : "Show Abstract ▾"}</span>`;
          }
        } else if (action === "toggle-read" && paper) {
          if (state.readIds.has(paper.id)) {
            state.readIds.delete(paper.id);
          } else {
            state.readIds.add(paper.id);
            state.newIds.delete(paper.id);
          }
          saveReadIds();
          saveSeenAndNew();
          renderAll();
        } else if (action === "mark-read-on-open" && paper) {
          state.readIds.add(paper.id);
          state.newIds.delete(paper.id);
          saveReadIds();
          saveSeenAndNew();
          const cardEl = target.closest(".paper-card");
          if (cardEl) cardEl.classList.add("is-read");
          renderCountsAndTelemetry();
        } else if (action === "filter-topic") {
          const topic = target.getAttribute("data-topic");
          if (topic) {
            state.selectedTopic = topic;
            renderAll();
          }
        } else if (action === "toggle-ai" && paper) {
          if (state.collapsedSummaryIds.has(paper.id)) {
            state.collapsedSummaryIds.delete(paper.id);
          } else {
            state.collapsedSummaryIds.add(paper.id);
          }
          updateCardSummaryDom(paper.id);
        } else if (action === "copy-ai" && paper) {
          const sum = window.ORTHO_AI_SUMMARIZER.getImmediateSummary(paper);
          if (sum && sum.hasAbstract) {
            const text = `${paper.title} (${paper.journalTitle}, ${paper.quartile})\n• Aim: ${sum.aim}\n• Method & Sample: ${sum.method}\n• Key Finding: ${sum.finding}\n• Clinical Takeaway: ${sum.takeaway}`;
            navigator.clipboard?.writeText(text);
            showToast("Copied AI Summary to clipboard");
          }
        } else if (action === "regenerate-ai" && paper) {
          if (!window.ORTHO_AI_SUMMARIZER.getApiKey()) {
            openGeminiModal();
            showToast("Paste your free Google Gemini API key to generate LLM summaries");
            return;
          }
          const origText = target.textContent;
          target.textContent = "Generating…";
          target.disabled = true;
          try {
            const fresh = await window.ORTHO_AI_SUMMARIZER.summarizeSingleWithGemini(paper, true);
            updateCardSummaryDom(paper.id, fresh);
            showToast(`Updated summary with ${fresh.model}`);
          } catch (err) {
            const msg = String(err.message || "");
            if (msg.includes("CREDITS_DEPLETED")) {
              const localSum = window.ORTHO_AI_SUMMARIZER.getImmediateSummary(paper);
              updateCardSummaryDom(paper.id, localSum);
              showToast("AI Studio Prepay balance is $0 · Using Instant Clinical Synthesis (or create a Free-Tier key in a new project)");
            } else {
              showToast(`Gemini error: ${msg}`);
              target.textContent = origText;
              target.disabled = false;
            }
          }
        } else if (action === "open-gemini-modal") {
          openGeminiModal();
        }
      });
    }

    // Close Quartile Popover on outside click
    document.addEventListener("click", (e) => {
      const pop = document.getElementById("quartilePopover");
      if (
        pop &&
        pop.classList.contains("open") &&
        !pop.contains(e.target) &&
        !e.target.closest('[data-action="inspect-quartile"]')
      ) {
        pop.classList.remove("open");
      }
    });

    // 10. Reading Comfort Modal ('Aa')
    const btnComfort = document.getElementById("btnOpenComfortModal");
    const comfortModal = document.getElementById("comfortModalBackdrop");
    const btnCloseComfort = document.getElementById("btnCloseComfortModal");
    if (btnComfort && comfortModal) {
      btnComfort.addEventListener("click", () => comfortModal.classList.add("open"));
    }
    if (btnCloseComfort && comfortModal) {
      btnCloseComfort.addEventListener("click", () => comfortModal.classList.remove("open"));
    }
    if (comfortModal) {
      comfortModal.addEventListener("click", (e) => {
        if (e.target === comfortModal) comfortModal.classList.remove("open");
      });
    }

    document.querySelectorAll("[data-pref-key]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-pref-key");
        let val = btn.getAttribute("data-pref-val");
        if (val === "true") val = true;
        if (val === "false") val = false;
        state.prefs[key] = val;
        savePrefs();
        applyPrefsToDom();
      });
    });

    // 11. Gemini Free-Tier Studio Modal
    const btnGemini = document.getElementById("btnOpenGeminiModal");
    const geminiModal = document.getElementById("geminiModalBackdrop");
    const btnCloseGemini = document.getElementById("btnCloseGeminiModal");

    if (btnGemini) {
      btnGemini.addEventListener("click", openGeminiModal);
    }
    if (btnCloseGemini && geminiModal) {
      btnCloseGemini.addEventListener("click", () => geminiModal.classList.remove("open"));
    }
    if (geminiModal) {
      geminiModal.addEventListener("click", (e) => {
        if (e.target === geminiModal) geminiModal.classList.remove("open");
      });
    }

    const btnSaveGemini = document.getElementById("btnSaveGeminiKey");
    if (btnSaveGemini) {
      btnSaveGemini.addEventListener("click", async () => {
        const keyInput = document.getElementById("geminiApiKeyInput");
        const modelSel = document.getElementById("geminiModelSelect");
        const candidateKey = (keyInput?.value || "").trim();

        if (modelSel) {
          window.ORTHO_AI_SUMMARIZER.setPreferredModel(modelSel.value);
        }

        if (!candidateKey) {
          window.ORTHO_AI_SUMMARIZER.setApiKey("");
          applyPrefsToDom();
          updateGeminiModalStats();
          showToast("Cleared API key · Using Instant Local Synthesis");
          return;
        }

        btnSaveGemini.textContent = "Verifying Key…";
        btnSaveGemini.disabled = true;
        const check = await window.ORTHO_AI_SUMMARIZER.verifyApiKey(candidateKey);
        btnSaveGemini.textContent = "Save & Activate Free Tier";
        btnSaveGemini.disabled = false;

        if (check.ok) {
          window.ORTHO_AI_SUMMARIZER.setApiKey(candidateKey);
          applyPrefsToDom();
          updateGeminiModalStats();
          geminiModal?.classList.remove("open");
          showToast(`Gemini Free Tier connected (${check.model}) · Summarizing feed…`);
          triggerGeminiBatchForVisible();
        } else {
          showToast(`Could not verify key: ${check.error}`);
        }
      });
    }

    // 12. Export Buttons
    document.querySelectorAll("[data-export-format]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const fmt = btn.getAttribute("data-export-format");
        exportCitationsFile(fmt);
      });
    });

    // Keyboard shortcut '/' to focus search
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== searchInput && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        searchInput?.focus();
      } else if (e.key === "Escape") {
        document.getElementById("quartilePopover")?.classList.remove("open");
        comfortModal?.classList.remove("open");
        geminiModal?.classList.remove("open");
      }
    });
  }

  function openGeminiModal() {
    const geminiModal = document.getElementById("geminiModalBackdrop");
    const keyInput = document.getElementById("geminiApiKeyInput");
    const modelSel = document.getElementById("geminiModelSelect");
    if (keyInput) keyInput.value = window.ORTHO_AI_SUMMARIZER.getApiKey();
    if (modelSel) modelSel.value = window.ORTHO_AI_SUMMARIZER.getPreferredModel();
    updateGeminiModalStats();
    geminiModal?.classList.add("open");
  }

  /**
   * Interactive 3D Orthodontic Dental Arch Stage
   * Spring-damper physics on all 14 brackets + real-time Catmull-Rom archwire deflection
   * Works with mouse hover/move on desktop and touch/drag/tap on mobile phones.
   */
  function initInteractiveDentalArch() {
    const stage = document.getElementById("archInteractiveStage");
    const rig = document.getElementById("arch3dRig");
    const bracketsLayer = document.getElementById("archBracketsLayer");
    const wireGlow = document.getElementById("archWireGlow");
    const wireCore = document.getElementById("archWireCore");
    const forceGroup = document.getElementById("archForceVectors");
    const hudText = document.getElementById("archHudText");
    const pulseBtn = document.getElementById("btnArchPulseWave");

    if (!stage || !rig || !bracketsLayer || !wireGlow || !wireCore) return;

    // 14 brackets mapped to exact % coordinates on assets/ortho-arch.jpg
    const BRACKET_DATA = [
      { code: "#17", name: "R 2nd Molar", rx: "Buccal Tube · Torque −14° · Tip 0°", x: 31.0, y: 23.6, rot: -44, nx: -0.73, ny: -0.68 },
      { code: "#16", name: "R 1st Molar", rx: "Buccal Tube · Torque −14° · Offset 10°", x: 26.7, y: 29.0, rot: -50, nx: -0.79, ny: -0.61 },
      { code: "#15", name: "R 2nd Premolar", rx: "MBT 0.022″ · Torque −7° · Tip 0°", x: 23.3, y: 34.4, rot: -60, nx: -0.88, ny: -0.47 },
      { code: "#14", name: "R 1st Premolar", rx: "MBT 0.022″ · Torque −7° · Tip 0°", x: 21.1, y: 41.8, rot: -82, nx: -0.99, ny: -0.14 },
      { code: "#13", name: "R Canine", rx: "MBT 0.022″ · Torque −7° · Tip +8°", x: 21.7, y: 48.9, rot: 72, nx: -0.95, ny: 0.31 },
      { code: "#12", name: "R Lateral Incisor", rx: "MBT 0.022″ · Torque +10° · Tip +8°", x: 24.2, y: 53.5, rot: 54, nx: -0.81, ny: 0.59 },
      { code: "#11", name: "R Central Incisor", rx: "MBT 0.022″ · Torque +17° · Tip +4°", x: 27.9, y: 57.1, rot: 39, nx: -0.65, ny: 0.76 },
      { code: "#21", name: "L Central Incisor", rx: "MBT 0.022″ · Torque +17° · Tip +4°", x: 32.6, y: 59.7, rot: 26, nx: -0.45, ny: 0.89 },
      { code: "#22", name: "L Lateral Incisor", rx: "MBT 0.022″ · Torque +10° · Tip +8°", x: 38.2, y: 61.3, rot: 14, nx: -0.21, ny: 0.98 },
      { code: "#23", name: "L Canine", rx: "MBT 0.022″ · Torque −7° · Tip +8°", x: 44.9, y: 62.1, rot: 4, nx: 0.03, ny: 1.00 },
      { code: "#24", name: "L 1st Premolar", rx: "MBT 0.022″ · Torque −7° · Tip 0°", x: 52.9, y: 61.1, rot: -10, nx: 0.21, ny: 0.98 },
      { code: "#25", name: "L 2nd Premolar", rx: "MBT 0.022″ · Torque −7° · Tip 0°", x: 59.9, y: 58.6, rot: -21, nx: 0.41, ny: 0.91 },
      { code: "#26", name: "L 1st Molar", rx: "Buccal Tube · Torque −14° · Offset 10°", x: 67.9, y: 54.6, rot: -27, nx: 0.50, ny: 0.87 },
      { code: "#27", name: "L 2nd Molar", rx: "Buccal Tube · Torque −14° · Tip 0°", x: 76.6, y: 49.0, rot: -31, nx: 0.56, ny: 0.83 }
    ];

    const DISTAL_LEFT = { x: 36.4, y: 17.3 };
    const DISTAL_RIGHT = { x: 80.3, y: 46.8 };

    // Build bracket DOM nodes & physics state
    const brackets = BRACKET_DATA.map((item, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "arch-bracket-node";
      btn.style.left = `${item.x}%`;
      btn.style.top = `${item.y}%`;
      btn.setAttribute("aria-label", `${item.code} ${item.name} bracket`);
      btn.innerHTML = `
        <span class="arch-bracket-tag">${item.code} · ${item.name}</span>
        <span class="arch-bracket-hw" style="--b-rot:${item.rot}deg;"></span>
      `;
      bracketsLayer.appendChild(btn);

      const hwEl = btn.querySelector(".arch-bracket-hw");
      return {
        ...item,
        index: idx,
        el: btn,
        hwEl,
        dx: 0,
        dy: 0,
        vx: 0,
        vy: 0,
        tx: 0,
        ty: 0,
        scale: 1,
        vscale: 0,
        tscale: 1,
        rotOffset: 0
      };
    });

    let pointerActive = false;
    let pointerX = 50;
    let pointerY = 50;
    let activeIdx = -1;
    let animFrameId = null;

    function buildSplinePath(pts) {
      if (pts.length < 2) return "";
      let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2] || p2;
        const c1x = p1.x + (p2.x - p0.x) / 6;
        const c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6;
        const c2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
      }
      return d;
    }

    function updateTargetsFromPointer() {
      if (!pointerActive) {
        activeIdx = -1;
        brackets.forEach((b) => {
          b.tx = 0;
          b.ty = 0;
          b.tscale = 1;
          b.rotOffset = 0;
          b.el.classList.remove("is-active", "is-neighbor");
        });
        stage.classList.remove("is-interacting");
        return;
      }

      stage.classList.add("is-interacting");

      // Find nearest bracket to pointer
      let bestIdx = -1;
      let bestDist = Infinity;
      brackets.forEach((b, idx) => {
        const dist = Math.hypot(pointerX - b.x, pointerY - b.y);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = idx;
        }
      });

      const influenceRadius = 15.5;
      if (bestDist <= influenceRadius) {
        if (activeIdx !== bestIdx) {
          // Give the newly hovered/touched bracket a crisp spring kick
          const nb = brackets[bestIdx];
          nb.vx += nb.nx * 0.95;
          nb.vy += nb.ny * 0.95;
          nb.vscale += 0.22;
          activeIdx = bestIdx;
        }
      } else {
        activeIdx = -1;
      }

      brackets.forEach((b, idx) => {
        const dist = Math.hypot(pointerX - b.x, pointerY - b.y);
        const isPrimary = idx === activeIdx;
        const isNeighbor = activeIdx !== -1 && Math.abs(idx - activeIdx) === 1;

        b.el.classList.toggle("is-active", isPrimary);
        b.el.classList.toggle("is-neighbor", isNeighbor);

        if (dist < influenceRadius) {
          const falloff = Math.pow(1 - dist / influenceRadius, 1.6);
          const pullX = (pointerX - b.x) * 0.16 * falloff;
          const pullY = (pointerY - b.y) * 0.16 * falloff;
          const popOut = (isPrimary ? 2.35 : 1.35) * falloff;

          b.tx = b.nx * popOut + pullX;
          b.ty = b.ny * popOut + pullY;
          b.tscale = 1 + (isPrimary ? 0.48 : 0.24) * falloff;
          b.rotOffset = ((pointerX - b.x) * 1.4) * falloff;
        } else {
          b.tx = 0;
          b.ty = 0;
          b.tscale = 1;
          b.rotOffset = 0;
        }
      });

      if (activeIdx !== -1 && hudText) {
        const ab = brackets[activeIdx];
        const forceN = (1.1 + Math.hypot(ab.dx, ab.dy) * 0.45).toFixed(1);
        hudText.innerHTML = `<strong>${ab.code} ${ab.name}</strong> · ${ab.rx} · Force <strong>${forceN} N</strong>`;
      }
    }

    function stepPhysics() {
      const stiffness = 0.17;
      const damping = 0.76;
      let anyMoving = pointerActive;

      brackets.forEach((b) => {
        const ax = (b.tx - b.dx) * stiffness;
        const ay = (b.ty - b.dy) * stiffness;
        b.vx = (b.vx + ax) * damping;
        b.vy = (b.vy + ay) * damping;
        b.dx += b.vx;
        b.dy += b.vy;

        const ascale = (b.tscale - b.scale) * 0.2;
        b.vscale = (b.vscale + ascale) * 0.74;
        b.scale += b.vscale;

        if (
          Math.abs(b.dx) > 0.01 ||
          Math.abs(b.dy) > 0.01 ||
          Math.abs(b.vx) > 0.01 ||
          Math.abs(b.vy) > 0.01 ||
          Math.abs(b.scale - 1) > 0.005
        ) {
          anyMoving = true;
        } else if (!pointerActive) {
          b.dx = 0;
          b.dy = 0;
          b.scale = 1;
        }

        // Convert % displacement into pixel visual offset on the bracket hardware chip
        const pxX = b.dx * 4.4;
        const pxY = b.dy * 4.4;
        const dispMag = Math.hypot(b.dx, b.dy);
        const dynOpacity = Math.min(1, 0.28 + dispMag * 0.45);
        b.hwEl.style.setProperty("--b-dx", `${pxX.toFixed(2)}px`);
        b.hwEl.style.setProperty("--b-dy", `${pxY.toFixed(2)}px`);
        b.hwEl.style.setProperty("--b-scale", b.scale.toFixed(3));
        b.hwEl.style.setProperty("--b-rot", `${(b.rot + b.rotOffset).toFixed(1)}deg`);
        b.hwEl.style.setProperty("--b-opacity", dynOpacity.toFixed(2));
      });

      // Update continuous superelastic archwire spline through displaced bracket slots
      const wirePts = [
        DISTAL_LEFT,
        ...brackets.map((b) => ({ x: b.x + b.dx * 0.85, y: b.y + b.dy * 0.85 })),
        DISTAL_RIGHT
      ];
      const dPath = buildSplinePath(wirePts);
      wireGlow.setAttribute("d", dPath);
      wireCore.setAttribute("d", dPath);

      // Render biomechanical force vector line on active or displaced brackets
      if (forceGroup) {
        const linesHtml = brackets
          .filter((b) => Math.hypot(b.dx, b.dy) > 0.35)
          .map((b) => {
            const x1 = b.x;
            const y1 = b.y;
            const x2 = b.x + b.dx * 2.2 + b.nx * 1.4;
            const y2 = b.y + b.dy * 2.2 + b.ny * 1.4;
            return `<line class="arch-force-line" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" /><circle cx="${x2.toFixed(2)}" cy="${y2.toFixed(2)}" r="0.65" fill="var(--accent)" />`;
          })
          .join("");
        forceGroup.innerHTML = linesHtml;
      }

      if (anyMoving) {
        animFrameId = requestAnimationFrame(stepPhysics);
      } else {
        animFrameId = null;
      }
    }

    function ensurePhysicsLoop() {
      if (!animFrameId) {
        animFrameId = requestAnimationFrame(stepPhysics);
      }
    }

    // Trigger an orthodontic activation ripple wave across all 14 brackets
    function triggerArchWave(originIdx = 6) {
      stage.classList.add("is-interacting");
      brackets.forEach((b, idx) => {
        const distSteps = Math.abs(idx - originIdx);
        setTimeout(() => {
          b.vx += b.nx * 1.55;
          b.vy += b.ny * 1.55;
          b.vscale += 0.36;
          b.el.classList.add("is-active");
          if (hudText) {
            hudText.innerHTML = `<strong>${b.code} ${b.name}</strong> · Archwire Activation Wave · <strong>${b.rx}</strong>`;
          }
          ensurePhysicsLoop();
          setTimeout(() => {
            if (activeIdx !== idx) b.el.classList.remove("is-active");
          }, 260);
        }, distSteps * 48);
      });

      setTimeout(() => {
        if (!pointerActive) {
          stage.classList.remove("is-interacting");
          if (hudText) {
            hudText.textContent = "Hover or touch any bracket to flex the archwire";
          }
        }
      }, 900);
    }

    function handleStagePointer(clientX, clientY) {
      const rect = rig.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointerX = ((clientX - rect.left) / rect.width) * 100;
      pointerY = ((clientY - rect.top) / rect.height) * 100;
      pointerActive = true;

      // Subtle 3D tilt of the dental model toward the cursor/finger
      const normX = (pointerX - 50) / 50; // -1 .. 1
      const normY = (pointerY - 50) / 50; // -1 .. 1
      const rotY = (normX * 7.5).toFixed(2);
      const rotX = (-normY * 6.0).toFixed(2);
      rig.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.015)`;

      updateTargetsFromPointer();
      ensurePhysicsLoop();
    }

    function resetStagePointer() {
      pointerActive = false;
      rig.style.transform = "rotateX(0deg) rotateY(0deg) scale(1)";
      updateTargetsFromPointer();
      if (hudText) {
        hudText.textContent = "Hover or touch any bracket to flex the archwire";
      }
      ensurePhysicsLoop();
    }

    // Desktop mouse / pointer events
    rig.addEventListener("pointermove", (e) => {
      handleStagePointer(e.clientX, e.clientY);
    });

    rig.addEventListener("pointerdown", (e) => {
      handleStagePointer(e.clientX, e.clientY);
      if (activeIdx !== -1) {
        triggerArchWave(activeIdx);
      }
    });

    rig.addEventListener("pointerleave", () => {
      resetStagePointer();
    });

    // Mobile touch events (smooth finger scrubbing across brackets)
    rig.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches && e.touches[0]) {
          handleStagePointer(e.touches[0].clientX, e.touches[0].clientY);
        }
      },
      { passive: true }
    );

    rig.addEventListener(
      "touchmove",
      (e) => {
        if (e.touches && e.touches[0]) {
          handleStagePointer(e.touches[0].clientX, e.touches[0].clientY);
        }
      },
      { passive: true }
    );

    rig.addEventListener("touchend", () => {
      setTimeout(resetStagePointer, 650);
    });

    // Individual bracket click/tap
    brackets.forEach((b, idx) => {
      b.el.addEventListener("click", (e) => {
        e.stopPropagation();
        triggerArchWave(idx);
      });
    });

    if (pulseBtn) {
      pulseBtn.addEventListener("click", () => {
        triggerArchWave(7);
      });
    }

    // Initial render of archwire spline + subtle welcome wave on load
    stepPhysics();
    setTimeout(() => {
      triggerArchWave(7);
    }, 650);
  }

  // Initialize Application
  document.addEventListener("DOMContentLoaded", () => {
    loadPersistedState();
    bindEvents();
    initInteractiveDentalArch();
    renderAll();
    window.addEventListener("orthoai-proxy-ready", () => {
      applyPrefsToDom();
      renderFeedList();
      triggerGeminiBatchForVisible();
    });
    // Perform live fetch on startup to ensure latest published Orthodontics + AI literature
    refreshFeed(true);
  });
})();
