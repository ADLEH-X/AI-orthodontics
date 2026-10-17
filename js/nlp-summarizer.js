/**
 * OrthoAI — Gemini Free-Tier Summary Engine & Clinical Abstract Synthesizer
 *
 * Designed specifically around Google Gemini's Free Tier (15 RPM / 1,500 RPD):
 * 1. Persistent localStorage cache by paper ID so no paper is ever summarized twice unless requested.
 * 2. Smart multi-paper JSON batching (summarizes up to 4 papers in a single API call, reducing RPM usage by 75%).
 * 3. Automatic rate-limit pacer & model fallback (gemini-2.5-flash -> gemini-2.0-flash -> gemini-1.5-flash).
 * 4. Instant Extractive Clinical Abstract Parser when no API key is configured yet (never invents facts;
 *    clearly states "No abstract available" if the publisher omitted the abstract).
 */

window.ORTHO_AI_SUMMARIZER = (function () {
  const CACHE_KEY = "orthoai_ai_summaries_v2";
  const API_KEY_STORAGE = "orthoai_gemini_api_key";
  const MODEL_STORAGE = "orthoai_gemini_model";
  const QUOTA_STORAGE = "orthoai_gemini_quota_stats";

  // Optional local key from git-ignored config.js or localStorage
  const DEFAULT_API_KEY = window.ORTHO_CONFIG?.GEMINI_KEY || "";
  const DEFAULT_MODEL = "gemini-3.8-flash";
  const FALLBACK_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest"
  ];

  // Load cached summaries from localStorage
  let summaryCache = {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) summaryCache = JSON.parse(raw) || {};
  } catch (_) {
    summaryCache = {};
  }

  // Track Free Tier usage (15 RPM, 1500 RPD)
  let requestTimestamps = [];

  function saveCache() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(summaryCache));
    } catch (_) {
      // If storage quota exceeded, trim oldest entries
      const keys = Object.keys(summaryCache);
      if (keys.length > 150) {
        keys.slice(0, 50).forEach((k) => delete summaryCache[k]);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(summaryCache));
        } catch (_) {}
      }
    }
  }

  // Server-side proxy (Vercel /api/gemini) keeps the key private on the host.
  const PROXY_SENTINEL = "__server_proxy__";
  const PROXY_URL = "/api/gemini";
  let proxyAvailable = false;

  // Probe once at load: if the host exposes a configured proxy, no browser key is needed.
  if (typeof fetch === "function" && /^https?:/.test(location.protocol)) {
    fetch(PROXY_URL, { method: "GET" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j && j.configured) {
          proxyAvailable = true;
          window.dispatchEvent(new CustomEvent("orthoai-proxy-ready"));
        }
      })
      .catch(() => {});
  }

  function getApiKey() {
    const stored = (localStorage.getItem(API_KEY_STORAGE) || "").trim();
    return stored || DEFAULT_API_KEY || (proxyAvailable ? PROXY_SENTINEL : "");
  }

  function setApiKey(key) {
    const clean = (key || "").trim();
    if (clean) {
      localStorage.setItem(API_KEY_STORAGE, clean);
    } else {
      localStorage.removeItem(API_KEY_STORAGE);
    }
  }

  function getPreferredModel() {
    const stored = localStorage.getItem(MODEL_STORAGE);
    if (stored && FALLBACK_MODELS.includes(stored)) return stored;
    return DEFAULT_MODEL;
  }

  function setPreferredModel(model) {
    if (model) localStorage.setItem(MODEL_STORAGE, model);
  }

  function recordApiCall() {
    const now = Date.now();
    requestTimestamps.push(now);
    requestTimestamps = requestTimestamps.filter((t) => now - t < 60000);

    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const raw = JSON.parse(localStorage.getItem(QUOTA_STORAGE) || "{}");
      const count = raw.date === todayStr ? (raw.count || 0) + 1 : 1;
      localStorage.setItem(QUOTA_STORAGE, JSON.stringify({ date: todayStr, count }));
    } catch (_) {}
  }

  function getQuotaStats() {
    const now = Date.now();
    requestTimestamps = requestTimestamps.filter((t) => now - t < 60000);
    let todayCount = 0;
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const raw = JSON.parse(localStorage.getItem(QUOTA_STORAGE) || "{}");
      if (raw.date === todayStr) todayCount = raw.count || 0;
    } catch (_) {}

    return {
      rpmUsed: requestTimestamps.length,
      rpmLimit: 15,
      rpdUsed: todayCount,
      rpdLimit: 1500,
      cachedSummariesCount: Object.keys(summaryCache).length
    };
  }

  /**
   * Clean HTML tags and entities from raw abstracts
   */
  function stripHtml(html) {
    if (!html) return "";
    return html
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Deterministic Clinical Extractive Summary from Title + Abstract.
   * Used instantaneously before Gemini finishes or when no API key is configured.
   * Never hallucinates: if no abstract exists, returns hasAbstract: false.
   */
  function generateExtractiveSummary(paper) {
    const rawAbstract = stripHtml(paper.abstractText || "");
    if (!rawAbstract || rawAbstract.length < 40) {
      return {
        hasAbstract: false,
        source: "none",
        aim: null,
        method: null,
        finding: null,
        takeaway: null
      };
    }

    // Split into clean sentences while protecting common abbreviations (e.g., et al., Fig., Dr., vs., mm, p < 0.05)
    const protectedText = rawAbstract
      .replace(/\bet al\./gi, "et al")
      .replace(/\bvs\./gi, "vs")
      .replace(/\be\.g\./gi, "eg")
      .replace(/\bi\.e\./gi, "ie")
      .replace(/\bFig\./gi, "Fig")
      .replace(/(\d)\.(\d)/g, "$1__DOT__$2");

    const rawSentences = protectedText
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.replace(/__DOT__/g, ".").trim())
      .filter((s) => s.length > 18);

    const cleanLabel = (s) =>
      s
        .replace(/^abstract\*?\s*/i, "")
        .replace(
          /^(background and objectives?|background|objectives?|aims?|purpose|introduction|materials? and methods?|methods?|methodology|study design|patients and methods|results?|findings?|conclusions?|clinical significance|discussion|summary)\s*[:.\-]?\s*/i,
          ""
        )
        .trim();

    const clampSentence = (s, maxLen = 195) => {
      if (!s) return "";
      const cleaned = cleanLabel(s);
      if (cleaned.length <= maxLen) return cleaned;
      return cleaned.slice(0, maxLen - 1).replace(/\s+\S*$/, "") + "…";
    };

    // 1. Identify AIM sentence
    let aimSent =
      rawSentences.find((s) =>
        /\b(aim(ed|s)?|objective|purpose|this study (evaluated|investigated|assessed|developed|proposed|compared|examined|explored)|this (systematic |scoping |narrative )?review|we aimed|to evaluate|to develop|to investigate|to assess|to compare)\b/i.test(
          s
        )
      ) || rawSentences[0];

    // 2. Identify METHOD & SAMPLE sentence
    let methodSent = rawSentences.find(
      (s, idx) =>
        idx > 0 &&
        s !== aimSent &&
        /\b(dataset|sample|patients|subjects|radiographs|cephalograms|cbct|scans|images|models?|neural network|cnn|u-net|yolo|resnet|random forest|xgboost|llm|chatgpt|search(ed)?|pubmed|databases?|inclusion criteria|retrospective|prospective|cross-sectional|trained|validated)\b/i.test(
          s
        )
    );
    if (!methodSent && rawSentences.length > 1) {
      methodSent = rawSentences[1];
    }

    // 3. Identify KEY FINDING sentence
    let findingIdx = rawSentences.findIndex(
      (s) =>
        s !== aimSent &&
        s !== methodSent &&
        /\b(accuracy|auc|sensitivity|specificity|dice|iou|mean error|mm|%|p\s*[<=>]|outperformed|achieved|demonstrated|revealed|showed|significant(ly)?|correlation|r\s*=|icc|f1-score|precision)\b/i.test(
          s
        )
    );
    if (findingIdx === -1) {
      findingIdx = rawSentences.findIndex(
        (s) => s !== aimSent && s !== methodSent && /\b(results?|found|showed|indicated|included)\b/i.test(s)
      );
    }
    let findingSent = findingIdx !== -1 ? rawSentences[findingIdx] : rawSentences[Math.min(2, rawSentences.length - 1)];
    if (findingSent && cleanLabel(findingSent).length < 48 && findingIdx !== -1 && rawSentences[findingIdx + 1]) {
      findingSent = `${cleanLabel(findingSent)} ${cleanLabel(rawSentences[findingIdx + 1])}`;
    }

    // 4. Identify CLINICAL TAKEAWAY sentence
    let takeawaySent =
      [...rawSentences]
        .reverse()
        .find(
          (s) =>
            s !== aimSent &&
            s !== findingSent &&
            /\b(conclu(sion|ded|des)|clinical(ly)?|orthodontist|workflow|chairside|diagnostic|decision-making|treatment planning|promising|reliable|can assist|potential to|recommended|caution)\b/i.test(
              s
            )
        ) || rawSentences[rawSentences.length - 1];

    return {
      hasAbstract: true,
      source: "extractive",
      model: "Structured Abstract Parser",
      aim: clampSentence(aimSent, 190),
      method: clampSentence(methodSent || "Evaluated using the study design and cohort described in the abstract.", 190),
      finding: clampSentence(findingSent || "Refer to the expanded abstract for detailed quantitative metrics.", 195),
      takeaway: clampSentence(takeawaySent, 195)
    };
  }

  /**
   * Return the best currently available summary for a paper (Gemini cache -> Extractive)
   */
  function getImmediateSummary(paper) {
    if (!paper) return null;
    const cached = summaryCache[paper.id];
    if (cached && cached.aim) {
      return cached;
    }
    return generateExtractiveSummary(paper);
  }

  /**
   * Call Google Gemini API (with automatic model fallback on rate-limit or model unavailability)
   */
  async function callGeminiJson(promptText, isArraySchema = false) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("NO_API_KEY");
    }

    const preferred = getPreferredModel();
    const modelsToTry = [preferred, ...FALLBACK_MODELS.filter((m) => m !== preferred)];
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        recordApiCall();
        const useProxy = apiKey === PROXY_SENTINEL;
        const url = useProxy
          ? PROXY_URL
          : `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
              model
            )}:generateContent?key=${encodeURIComponent(apiKey)}`;

        const body = {
          contents: [
            {
              role: "user",
              parts: [{ text: promptText }]
            }
          ],
          generationConfig: {
            temperature: 0.15,
            maxOutputTokens: isArraySchema ? 4096 : 1536,
            responseMimeType: "application/json"
          }
        };
        if (useProxy) body.model = model;

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          const errMsg = (errJson.error && errJson.error.message) || `HTTP ${response.status}`;
          if (response.status === 400 && /API_KEY_INVALID|key not valid/i.test(errMsg)) {
            throw new Error("INVALID_API_KEY: " + errMsg);
          }
          if (response.status === 402 || /prepayment credits are depleted/i.test(errMsg)) {
            throw new Error("CREDITS_DEPLETED: " + errMsg);
          }
          lastError = new Error(`${model}: ${errMsg}`);
          continue;
        }

        const data = await response.json();
        const parts = (data?.candidates?.[0]?.content?.parts || []).filter(
          (p) => !p.thought && typeof p.text === "string" && p.text.trim()
        );
        const textOut = parts.length ? parts[parts.length - 1].text : "";
        if (!textOut) {
          lastError = new Error("Empty response from Gemini");
          continue;
        }

        const parsed = JSON.parse(textOut);
        return { parsed, modelUsed: model };
      } catch (err) {
        if (
          String(err.message).startsWith("INVALID_API_KEY") ||
          String(err.message).startsWith("CREDITS_DEPLETED")
        ) {
          throw err;
        }
        lastError = err;
      }
    }

    throw lastError || new Error("Gemini API request failed");
  }

  /**
   * Generate or regenerate a single paper summary using Gemini Free Tier
   */
  async function summarizeSingleWithGemini(paper, forceRegenerate = false) {
    if (!paper || !paper.abstractText || stripHtml(paper.abstractText).length < 40) {
      return generateExtractiveSummary(paper);
    }

    if (!forceRegenerate && summaryCache[paper.id] && summaryCache[paper.id].source === "gemini") {
      return summaryCache[paper.id];
    }

    const cleanAbs = stripHtml(paper.abstractText).slice(0, 3500);
    const prompt = `You are an expert academic orthodontic clinical researcher. Summarize the following scientific paper strictly from its provided title and abstract. Do NOT invent any numbers or facts not in the text.
Return a JSON object with exactly these 4 string keys (each value MUST be a single concise sentence under 28 words):
- "aim": The primary objective of the study.
- "method": The sample size, imaging/clinical modality, and AI/ML model or review method used.
- "finding": The main quantitative result (include accuracy, error in mm, AUC, or key comparison if stated).
- "takeaway": A plain-language clinical takeaway for a practicing orthodontist.

Title: ${paper.title}
Journal: ${paper.journalTitle || ""}
Abstract: ${cleanAbs}`;

    const { parsed, modelUsed } = await callGeminiJson(prompt, false);
    const item = Array.isArray(parsed) ? parsed[0] : parsed;

    if (!item || !item.aim) {
      throw new Error("Unexpected JSON structure from Gemini");
    }

    const result = {
      hasAbstract: true,
      source: "gemini",
      model: modelUsed,
      updatedAt: new Date().toISOString(),
      aim: String(item.aim).trim(),
      method: String(item.method || "").trim(),
      finding: String(item.finding || "").trim(),
      takeaway: String(item.takeaway || "").trim()
    };

    summaryCache[paper.id] = result;
    saveCache();
    return result;
  }

  /**
   * Batch-summarize multiple papers in a subtle background queue designed for Gemini Free Tier.
   * Groups up to 4 papers per single request so 20 papers only require 5 requests!
   */
  let activeQueuePromise = null;

  async function summarizeBatchQueue(papers, onPaperUpdated) {
    const apiKey = getApiKey();
    if (!apiKey) return;

    // Filter to papers that have an abstract and aren't already cached by Gemini
    const pending = (papers || []).filter(
      (p) =>
        p &&
        p.abstractText &&
        stripHtml(p.abstractText).length >= 40 &&
        (!summaryCache[p.id] || summaryCache[p.id].source !== "gemini")
    );

    if (pending.length === 0) return;

    // Process in chunks of 4 papers per API call (max 16 papers per auto-run to preserve free tier)
    const toProcess = pending.slice(0, 16);
    const chunkSize = 4;

    if (activeQueuePromise) return activeQueuePromise;

    activeQueuePromise = (async () => {
      try {
        for (let i = 0; i < toProcess.length; i += chunkSize) {
          if (!getApiKey()) break; // Key was removed mid-queue
          const chunk = toProcess.slice(i, i + chunkSize);

          const payloadItems = chunk.map((p) => ({
            id: p.id,
            title: p.title,
            abstract: stripHtml(p.abstractText).slice(0, 1800)
          }));

          const prompt = `You are an expert orthodontic clinical researcher. Summarize each of the following ${
            chunk.length
          } scientific papers strictly from its provided title and abstract. Never invent facts.
Return a JSON array of objects where each object has:
- "id": exact paper id provided
- "aim": 1 concise sentence (max 25 words) stating the study objective
- "method": 1 concise sentence (max 25 words) stating sample, modality, and AI method
- "finding": 1 concise sentence (max 28 words) with key quantitative findings
- "takeaway": 1 plain-language clinical takeaway sentence for an orthodontist

Papers JSON:
${JSON.stringify(payloadItems)}`;

          try {
            const { parsed, modelUsed } = await callGeminiJson(prompt, true);
            const list = Array.isArray(parsed) ? parsed : parsed?.papers || [];
            list.forEach((item) => {
              if (item && item.id && item.aim) {
                const summaryObj = {
                  hasAbstract: true,
                  source: "gemini",
                  model: modelUsed,
                  updatedAt: new Date().toISOString(),
                  aim: String(item.aim).trim(),
                  method: String(item.method || "").trim(),
                  finding: String(item.finding || "").trim(),
                  takeaway: String(item.takeaway || "").trim()
                };
                summaryCache[item.id] = summaryObj;
                if (typeof onPaperUpdated === "function") {
                  onPaperUpdated(item.id, summaryObj);
                }
              }
            });
            saveCache();
          } catch (batchErr) {
            console.warn("Gemini batch chunk skipped:", batchErr.message);
            if (
              String(batchErr.message).includes("INVALID_API_KEY") ||
              String(batchErr.message).includes("CREDITS_DEPLETED")
            ) {
              break;
            }
          }

          // Respect Gemini Free Tier 15 RPM limit (wait 4.3 seconds between batch requests)
          if (i + chunkSize < toProcess.length) {
            await new Promise((r) => setTimeout(r, 4300));
          }
        }
      } finally {
        activeQueuePromise = null;
      }
    })();

    return activeQueuePromise;
  }

  /**
   * Verify a Gemini API key with a tiny test prompt
   */
  async function verifyApiKey(candidateKey) {
    const previousKey = getApiKey();
    try {
      setApiKey(candidateKey);
      const { modelUsed } = await callGeminiJson(
        'Return a JSON object: {"status": "ok"}',
        false
      );
      return { ok: true, model: modelUsed };
    } catch (err) {
      setApiKey(previousKey);
      return { ok: false, error: err.message };
    }
  }

  return {
    getApiKey,
    setApiKey,
    getPreferredModel,
    setPreferredModel,
    getQuotaStats,
    getImmediateSummary,
    summarizeSingleWithGemini,
    summarizeBatchQueue,
    verifyApiKey,
    stripHtml
  };
})();
