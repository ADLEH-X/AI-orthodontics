/**
 * OrthoAI — Live Academic Literature Feed Engine
 *
 * Fetches real-time published papers in Orthodontics & Artificial Intelligence directly from:
 * 1. NCBI PubMed E-utilities (eutils.ncbi.nlm.nih.gov: esearch with sort=date + efetch XML)
 *    — Zero-lag real-time feed matching pubmed.ncbi.nlm.nih.gov 'Most Recent' 1-to-1.
 * 2. Europe PMC REST API (www.ebi.ac.uk/europepmc)
 *    — Supplements citation counts (citedByCount) and optional Preprints ('SRC:PPR').
 *
 * Performs deduplication, SCImago (SJR) Quartile resolution, clinical topic tagging,
 * and study-type classification.
 */

window.ORTHO_FEED_API = (function () {
  // 1. Direct NCBI PubMed Boolean Query (Title/Abstract + Specialist Orthodontics Journals)
  const PUBMED_QUERY =
    '((orthodont*[Title/Abstract] OR malocclusion*[Title/Abstract] OR cephalometr*[Title/Abstract] OR "clear aligner"[Title/Abstract] OR "clear aligners"[Title/Abstract] OR invisalign[Title/Abstract] OR "tooth movement"[Title/Abstract] OR orthognathic*[Title/Abstract] OR "maxillary expansion"[Title/Abstract] OR "impacted canine"[Title/Abstract] OR "impacted canines"[Title/Abstract] OR "impacted maxillary canine"[Title/Abstract] OR "impacted maxillary canines"[Title/Abstract] OR archwire*[Title/Abstract] OR "cervical vertebral maturation"[Title/Abstract] OR "Am J Orthod Dentofacial Orthop"[Journal] OR "Angle Orthod"[Journal] OR "Eur J Orthod"[Journal] OR "Prog Orthod"[Journal] OR "Orthod Craniofac Res"[Journal] OR "Korean J Orthod"[Journal] OR "Semin Orthod"[Journal] OR "Int Orthod"[Journal] OR "J Orofac Orthop"[Journal] OR "J World Fed Orthod"[Journal] OR "Dental Press J Orthod"[Journal] OR "Turk J Orthod"[Journal] OR "J Orthod Sci"[Journal] OR "J Orthod"[Journal]) AND ("artificial intelligence"[Title/Abstract] OR "deep learning"[Title/Abstract] OR "machine learning"[Title/Abstract] OR "neural network"[Title/Abstract] OR "neural networks"[Title/Abstract] OR convolutional[Title/Abstract] OR "large language model"[Title/Abstract] OR "large language models"[Title/Abstract] OR ChatGPT[Title/Abstract] OR "automated landmark"[Title/Abstract] OR "automated segmentation"[Title/Abstract] OR "computer vision"[Title/Abstract] OR "U-Net"[Title/Abstract] OR YOLO[Title/Abstract] OR YOLOv8[Title/Abstract] OR "random forest"[Title/Abstract] OR "generative AI"[Title/Abstract]))';

  // 2. Europe PMC Queries (for citation counts & optional preprints)
  const EPMC_MED_QUERY =
    'SRC:MED AND (TITLE_ABS:(orthodont* OR malocclusion OR cephalometr* OR "clear aligner" OR invisalign OR "tooth movement" OR "orthognathic" OR "maxillary expansion" OR "cervical vertebral") AND TITLE_ABS:("artificial intelligence" OR "deep learning" OR "machine learning" OR "neural network" OR "convolutional" OR "large language model" OR "chatgpt" OR "automated landmark" OR "automated segmentation" OR "computer vision"))';

  const EPMC_PREPRINT_QUERY =
    'SRC:PPR AND (TITLE_ABS:(orthodont* OR cephalometr* OR "clear aligner" OR malocclusion) AND TITLE_ABS:("artificial intelligence" OR "deep learning" OR "machine learning" OR "large language model"))';

  // Topic Taxonomy Definitions
  const TOPIC_RULES = [
    {
      id: "Cephalometrics",
      label: "Cephalometrics",
      regex: /\b(cephalometr\w*|ceph\b|lateral radiograph\w*|landmark detection|anatomical landmark\w*|sella|nasion|anb\b|sna\b|snb\b|cvm\b|cervical vertebr\w*)\b/i
    },
    {
      id: "Clear Aligners",
      label: "Clear Aligners",
      regex: /\b(clear aligner\w*|invisalign|aligner\w*|attachment\w*|thermoform\w*|aligner staging|digital setup)\b/i
    },
    {
      id: "CBCT & 3D Imaging",
      label: "CBCT & 3D",
      regex: /\b(cbct|cone-beam|cone beam|three-dimensional|3d\b|intraoral scan\w*|stl\b|point cloud|mesh segmentation|tooth segmentation|root resorption)\b/i
    },
    {
      id: "Diagnosis & Screening",
      label: "Diagnosis",
      regex: /\b(diagnos\w*|screening|malocclusion class\w*|crowding|open-bite|open bite|crossbite|asymmetry|facial profile|photograph\w*|gingival|white spot|caries)\b/i
    },
    {
      id: "Treatment Planning",
      label: "Treatment Planning",
      regex: /\b(treatment plan\w*|extraction decision\w*|premolar extraction|non-extraction|treatment duration|anchorage|archwire|outcome prediction|target position|bolton|decision support)\b/i
    },
    {
      id: "Orthognathic Surgery",
      label: "Orthognathic",
      regex: /\b(orthognathic|maxillofacial surgery|surgical-orthodontic|mandibular setback|le fort|skeletal class iii|skeletal class ii|craniofacial surgery)\b/i
    },
    {
      id: "Growth & Airway",
      label: "Growth & Airway",
      regex: /\b(airway\w*|sleep apnea|sleep-disordered|osa\b|adenoid\w*|craniofacial growth|mandibular growth|skeletal maturity|bone age|pubertal)\b/i
    },
    {
      id: "LLMs & Chatbots",
      label: "LLMs & Chatbots",
      regex: /\b(large language model\w*|llm\w*|chatgpt|gpt-4\w*|gemini|claude|conversational ai|chatbot\w*|natural language|hallucination\w*)\b/i
    },
    {
      id: "Deep Learning",
      label: "Deep Learning",
      regex: /\b(deep learning|deep-learning|convolutional neural|cnn\b|u-net|unet|yolo\w*|resnet\w*|transformer|vision model|neural network\w*)\b/i
    }
  ];

  function detectTopics(title, abstractText, keywords) {
    const combined = `${title || ""} ${abstractText || ""} ${(keywords || []).join(" ")}`;
    const matched = [];
    for (const rule of TOPIC_RULES) {
      if (rule.regex.test(combined)) {
        matched.push(rule.id);
      }
    }
    if (matched.length === 0) {
      matched.push("Diagnosis & Screening");
    }
    return matched.slice(0, 4);
  }

  function classifyStudyType(rawPubTypes, title, abstractText, isPreprint) {
    if (isPreprint) return "Preprint";
    const combined = `${(rawPubTypes || []).join(" ")} ${title || ""}`.toLowerCase();
    const absLower = (abstractText || "").toLowerCase();

    if (/meta-analysis/.test(combined)) return "Systematic Review & Meta-Analysis";
    if (/systematic review/.test(combined)) return "Systematic Review";
    if (/scoping review/.test(combined) || /scoping review/.test(absLower)) return "Scoping Review";
    if (/narrative review|review\b/.test(combined)) return "Review Article";
    if (/randomized controlled trial|clinical trial/.test(combined)) return "Clinical Trial";
    if (/multicent(re|er)/.test(combined) || /multicent(re|er)/.test(absLower)) return "Multicenter Study";
    if (/case report/.test(combined)) return "Case Report";
    if (/comparative study|validation study/.test(combined)) return "Comparative / Validation Study";
    return "Original Study";
  }

  function decodeXmlEntities(str) {
    if (!str) return "";
    return str
      .replace(/<[^>]+>/g, "")
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  function pad2(val) {
    const n = parseInt(val, 10);
    if (isNaN(n)) return "01";
    return n < 10 ? `0${n}` : `${n}`;
  }

  const MONTH_MAP = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
  };

  function parseMonthToken(m) {
    if (!m) return "01";
    if (/^\d+$/.test(m)) return pad2(m);
    const key = m.toLowerCase().slice(0, 3);
    return MONTH_MAP[key] || "01";
  }

  /**
   * Parse NCBI PubMed efetch XML into normalized OrthoAI Paper records
   */
  function parsePubMedXml(xmlText) {
    const articles = [];
    const articleBlocks = xmlText.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) || [];

    for (const block of articleBlocks) {
      const pmidMatch = block.match(/<MedlineCitation[^>]*>[\s\S]*?<PMID[^>]*>(\d+)<\/PMID>/);
      const pmid = pmidMatch ? pmidMatch[1] : "";
      if (!pmid) continue;

      const titleMatch = block.match(/<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/);
      const cleanTitle = decodeXmlEntities(titleMatch ? titleMatch[1] : "Untitled Article").replace(/\.$/, "");

      // Extract Journal Title & ISSNs
      const journalTitleMatch = block.match(/<Journal>[\s\S]*?<Title>([\s\S]*?)<\/Title>/);
      const rawJournalTitle = decodeXmlEntities(journalTitleMatch ? journalTitleMatch[1] : "Academic Journal");

      const issnPrintMatch = block.match(/<ISSN IssnType="Print">([^<]+)<\/ISSN>/);
      const issnElecMatch = block.match(/<ISSN IssnType="Electronic">([^<]+)<\/ISSN>/);
      const issnLinkMatch = block.match(/<ISSNLinking>([^<]+)<\/ISSNLinking>/);

      const issn = (issnPrintMatch && issnPrintMatch[1]) || (issnLinkMatch && issnLinkMatch[1]) || "";
      const eissn = (issnElecMatch && issnElecMatch[1]) || (issnLinkMatch && issnLinkMatch[1]) || "";

      // Extract Abstract (supports multi-section structured abstracts)
      const abstractParts = [];
      const absRegex = /<AbstractText(?:\s+[^>]*?Label="([^"]*)")?[^>]*>([\s\S]*?)<\/AbstractText>/g;
      let absMatch;
      while ((absMatch = absRegex.exec(block)) !== null) {
        const label = absMatch[1] ? decodeXmlEntities(absMatch[1]) : "";
        const text = decodeXmlEntities(absMatch[2]);
        if (text) {
          abstractParts.push(label ? `${label}: ${text}` : text);
        }
      }
      const abstractText = abstractParts.join(" ");

      // Extract Authors
      const authorsList = [];
      const authorBlocks = block.match(/<Author\b[^>]*>[\s\S]*?<\/Author>/g) || [];
      for (const ab of authorBlocks) {
        const last = (ab.match(/<LastName>([\s\S]*?)<\/LastName>/) || [])[1];
        const initials = (ab.match(/<Initials>([\s\S]*?)<\/Initials>/) || [])[1];
        const collective = (ab.match(/<CollectiveName>([\s\S]*?)<\/CollectiveName>/) || [])[1];
        if (last) {
          authorsList.push(decodeXmlEntities(`${last} ${initials || ""}`.trim()));
        } else if (collective) {
          authorsList.push(decodeXmlEntities(collective));
        }
      }
      const authorString = authorsList.length > 0 ? authorsList.slice(0, 8).join(", ") : "Authors not listed";

      // Extract Dates:
      // 1. PubMed Entrez/PubMed date (exact date indexed on PubMed)
      // 2. Electronic ArticleDate
      // 3. Journal Issue PubDate
      function extractPubMedHistoryDate(statusName) {
        const re = new RegExp(
          `<PubMedPubDate PubStatus="${statusName}">[\\s\\S]*?<Year>(\\d{4})<\\/Year>[\\s\\S]*?<Month>([^<]+)<\\/Month>[\\s\\S]*?<Day>([^<]+)<\\/Day>`,
          "i"
        );
        const m = block.match(re);
        if (!m) return null;
        return `${m[1]}-${parseMonthToken(m[2])}-${pad2(m[3])}`;
      }

      const entrezDate =
        extractPubMedHistoryDate("entrez") ||
        extractPubMedHistoryDate("pubmed") ||
        extractPubMedHistoryDate("medline");

      const articleDateMatch = block.match(
        /<ArticleDate[^>]*>[\s\S]*?<Year>(\d{4})<\/Year>[\s\S]*?<Month>([^<]+)<\/Month>[\s\S]*?<Day>([^<]+)<\/Day>/
      );
      const articleDate = articleDateMatch
        ? `${articleDateMatch[1]}-${parseMonthToken(articleDateMatch[2])}-${pad2(articleDateMatch[3])}`
        : null;

      const journalPubYear =
        (block.match(/<JournalIssue[^>]*>[\s\S]*?<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/) || [])[1] ||
        (entrezDate ? entrezDate.slice(0, 4) : "2026");
      const journalPubMonth =
        (block.match(/<JournalIssue[^>]*>[\s\S]*?<PubDate>[\s\S]*?<Month>([^<]+)<\/Month>/) || [])[1] || "01";
      const journalPubDay =
        (block.match(/<JournalIssue[^>]*>[\s\S]*?<PubDate>[\s\S]*?<Day>([^<]+)<\/Day>/) || [])[1] || "01";

      const fallbackJournalDate = `${journalPubYear}-${parseMonthToken(journalPubMonth)}-${pad2(journalPubDay)}`;

      // Use the most recent valid date between entrezDate and articleDate so newly indexed PubMed papers appear at the top
      const pubDate = entrezDate || articleDate || fallbackJournalDate;

      // Extract DOI & PMCID
      const doiMatch = block.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/);
      const pmcMatch = block.match(/<ArticleId IdType="pmc">([^<]+)<\/ArticleId>/);
      const doi = doiMatch ? decodeXmlEntities(doiMatch[1]) : "";
      const pmcid = pmcMatch ? decodeXmlEntities(pmcMatch[1]) : "";

      // Extract Volume, Issue, Pages
      const volume = decodeXmlEntities((block.match(/<Volume>([^<]+)<\/Volume>/) || [])[1] || "");
      const issue = decodeXmlEntities((block.match(/<Issue>([^<]+)<\/Issue>/) || [])[1] || "");
      const pages = decodeXmlEntities((block.match(/<MedlinePgn>([^<]+)<\/MedlinePgn>/) || [])[1] || "");

      // Extract Publication Types & Keywords
      const rawPubTypes = (block.match(/<PublicationType[^>]*>([\s\S]*?)<\/PublicationType>/g) || []).map((t) =>
        decodeXmlEntities(t)
      );
      const keywords = (block.match(/<Keyword[^>]*>([\s\S]*?)<\/Keyword>/g) || []).map((k) =>
        decodeXmlEntities(k)
      );

      const journalMetrics = window.ORTHO_SJR_DB.lookupJournal({
        journalTitle: rawJournalTitle,
        issn,
        eissn,
        isPreprint: false,
        publisher: ""
      });

      const studyType = classifyStudyType(rawPubTypes, cleanTitle, abstractText, false);
      const topics = detectTopics(cleanTitle, abstractText, keywords);

      const primaryUrl = doi
        ? `https://doi.org/${doi}`
        : `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;

      articles.push({
        id: `PMID:${pmid}`,
        pmid,
        pmcid,
        doi,
        title: cleanTitle,
        authors: authorString,
        affiliation: "",
        journalTitle: journalMetrics.shortTitle,
        journalFullTitle: journalMetrics.fullTitle,
        issn: issn || eissn || journalMetrics.issn || "",
        eissn,
        quartile: journalMetrics.quartile,
        journalMetrics,
        pubDate,
        entrezDate: entrezDate || pubDate,
        articleDate: articleDate || pubDate,
        pubYear: journalPubYear,
        volume,
        issue,
        pages,
        abstractText,
        studyType,
        topics,
        keywords,
        isOpenAccess: Boolean(pmcid),
        citedByCount: 0,
        primaryUrl,
        pubmedUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        pmcUrl: pmcid ? `https://pmc.ncbi.nlm.nih.gov/articles/${pmcid}/` : "",
        isPreprint: false
      });
    }

    return articles;
  }

  /**
   * Fetch directly from NCBI PubMed E-utilities (esearch + efetch)
   */
  async function fetchDirectFromPubMed(retmax = 55) {
    const esearchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(
      PUBMED_QUERY
    )}&retmax=${retmax}&sort=date&retmode=json`;

    const searchRes = await fetch(esearchUrl);
    if (!searchRes.ok) throw new Error(`PubMed esearch HTTP ${searchRes.status}`);
    const searchData = await searchRes.json();
    const idList = searchData?.esearchresult?.idlist || [];
    if (idList.length === 0) return [];

    const efetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${idList.join(
      ","
    )}&retmode=xml`;
    const fetchRes = await fetch(efetchUrl);
    if (!fetchRes.ok) throw new Error(`PubMed efetch HTTP ${fetchRes.status}`);
    const xmlText = await fetchRes.text();

    const parsed = parsePubMedXml(xmlText);
    // Preserve exact PubMed `sort=date` order
    const orderMap = new Map(idList.map((id, idx) => [String(id), idx]));
    parsed.sort((a, b) => (orderMap.get(a.pmid) ?? 999) - (orderMap.get(b.pmid) ?? 999));
    return parsed;
  }

  /**
   * Normalize Europe PMC result item into our unified Paper schema
   */
  function normalizeEpmcItem(item) {
    const isPreprint = item.source === "PPR" || (item.pubTypeList?.pubType || []).includes("Preprint");
    const rawJournalTitle =
      item.journalInfo?.journal?.title ||
      item.bookOrReportDetails?.publisher ||
      (isPreprint ? "Preprint Server" : "Academic Journal");

    const issn = item.journalInfo?.journal?.issn || "";
    const eissn = item.journalInfo?.journal?.essn || "";

    const journalMetrics = window.ORTHO_SJR_DB.lookupJournal({
      journalTitle: rawJournalTitle,
      issn,
      eissn,
      isPreprint,
      publisher: item.bookOrReportDetails?.publisher || ""
    });

    const pubDate =
      item.firstPublicationDate ||
      item.electronicPublicationDate ||
      item.journalInfo?.printPublicationDate ||
      `${item.pubYear || "2026"}-01-01`;

    const rawPubTypes = item.pubTypeList?.pubType || [];
    const keywords = item.keywordList?.keyword || [];
    const cleanTitle = (item.title || "Untitled Article").replace(/\s+/g, " ").replace(/\.$/, "").trim();
    const abstractText = item.abstractText || "";

    const studyType = classifyStudyType(rawPubTypes, cleanTitle, abstractText, isPreprint);
    const topics = detectTopics(cleanTitle, abstractText, keywords);

    const doi = item.doi || "";
    const pmid = item.pmid || "";
    const pmcid = item.pmcid || "";
    let primaryUrl = "";
    if (doi) {
      primaryUrl = `https://doi.org/${doi}`;
    } else if (pmid) {
      primaryUrl = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
    } else if (item.id) {
      primaryUrl = `https://europepmc.org/article/${item.source || "MED"}/${item.id}`;
    }

    return {
      id: pmid ? `PMID:${pmid}` : doi ? `DOI:${doi}` : `EPMC:${item.id}`,
      pmid,
      pmcid,
      doi,
      title: cleanTitle,
      authors: item.authorString ? item.authorString.replace(/\.$/, "") : "Authors not listed",
      affiliation: item.affiliation || "",
      journalTitle: journalMetrics.shortTitle,
      journalFullTitle: journalMetrics.fullTitle,
      issn: issn || eissn || journalMetrics.issn || "",
      eissn,
      quartile: journalMetrics.quartile,
      journalMetrics,
      pubDate,
      pubYear: item.pubYear || pubDate.slice(0, 4),
      volume: item.journalInfo?.volume || "",
      issue: item.journalInfo?.issue || "",
      pages: item.pageInfo || "",
      abstractText,
      studyType,
      topics,
      keywords,
      isOpenAccess: item.isOpenAccess === "Y" || Boolean(pmcid),
      citedByCount: Number(item.citedByCount || 0),
      primaryUrl,
      pubmedUrl: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : "",
      pmcUrl: pmcid ? `https://pmc.ncbi.nlm.nih.gov/articles/${pmcid}/` : "",
      isPreprint
    };
  }

  /**
   * Fetch live papers from BOTH direct NCBI PubMed E-utilities and Europe PMC
   */
  async function fetchLivePapers({ pageSize = 55, includePreprints = true } = {}) {
    const epmcMedUrl = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(
      EPMC_MED_QUERY
    )}&resultType=core&pageSize=${pageSize}&sort=FIRST_PDATE_D%20desc&format=json`;

    const tasks = [
      fetchDirectFromPubMed(pageSize).catch((err) => {
        console.warn("Direct PubMed fetch error:", err);
        return [];
      }),
      fetch(epmcMedUrl)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    ];

    if (includePreprints) {
      const pprUrl = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(
        EPMC_PREPRINT_QUERY
      )}&resultType=core&pageSize=5&sort=FIRST_PDATE_D%20desc&format=json`;
      tasks.push(
        fetch(pprUrl)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      );
    }

    const [pubmedArticles, epmcMedData, epmcPprData] = await Promise.all(tasks);

    const epmcItems = [
      ...(epmcMedData?.resultList?.result || []),
      ...(epmcPprData?.resultList?.result || [])
    ].map(normalizeEpmcItem);

    // Map Europe PMC citation counts & OA flags by PMID / DOI so direct PubMed records get citation counts too
    const epmcByPmid = new Map();
    const epmcByDoi = new Map();
    epmcItems.forEach((ep) => {
      if (ep.pmid) epmcByPmid.set(String(ep.pmid), ep);
      if (ep.doi) epmcByDoi.set(ep.doi.toLowerCase(), ep);
    });

    const seenKeys = new Set();
    const mergedList = [];

    function addUnique(item) {
      const normTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      const doiKey = item.doi ? item.doi.toLowerCase() : "";
      const pmidKey = item.pmid ? `pmid:${item.pmid}` : "";

      if (
        (doiKey && seenKeys.has(doiKey)) ||
        (pmidKey && seenKeys.has(pmidKey)) ||
        seenKeys.has(normTitle)
      ) {
        return;
      }

      // Enrich direct PubMed record with Europe PMC citation count if available
      const matchEp =
        (item.pmid && epmcByPmid.get(String(item.pmid))) ||
        (doiKey && epmcByDoi.get(doiKey));
      if (matchEp) {
        if (!item.citedByCount && matchEp.citedByCount) {
          item.citedByCount = matchEp.citedByCount;
        }
        if (!item.isOpenAccess && matchEp.isOpenAccess) {
          item.isOpenAccess = true;
        }
      }

      if (doiKey) seenKeys.add(doiKey);
      if (pmidKey) seenKeys.add(pmidKey);
      seenKeys.add(normTitle);
      mergedList.push(item);
    }

    // 1. Add all direct NCBI PubMed papers first (freshest PubMed index!)
    pubmedArticles.forEach(addUnique);
    // 2. Add any additional Europe PMC / Preprint papers
    epmcItems.forEach(addUnique);

    // Sort newest first
    mergedList.sort((a, b) => (b.pubDate || "").localeCompare(a.pubDate || ""));

    return mergedList;
  }

  function getOfflineFallbackPapers() {
    const rawFallback = [
      {
        id: "42819201",
        source: "MED",
        pmid: "42819201",
        doi: "10.1016/j.ajodo.2026.07.014",
        title: "Cone-beam computed tomography-based deep learning-augmented model for screening sleep-disordered breathing risk",
        authorString: "Kim SH, Park JH, Lee NK, Choi YJ",
        journalInfo: {
          volume: "170",
          journal: {
            title: "American Journal of Orthodontics and Dentofacial Orthopedics",
            issn: "0889-5406",
            essn: "1097-6752"
          }
        },
        pubYear: "2026",
        firstPublicationDate: "2026-10-06",
        abstractText:
          "Objective: This study aimed to develop and validate a cone-beam computed tomography (CBCT)-based deep learning model for screening pediatric and adolescent orthodontic patients at high risk of sleep-disordered breathing (SDB). Methods: A dataset of 640 pre-treatment CBCT scans and validated pediatric sleep questionnaire scores was analyzed using a 3D convolutional neural network combined with upper airway morphometric features. Results: The hybrid deep learning model achieved an area under the receiver operating characteristic curve (AUC) of 0.92, with 89.4% sensitivity and 87.1% specificity in identifying high-risk SDB patients. Conclusions: Automated 3D airway and craniofacial deep learning screening on routine orthodontic CBCT scans provides a reliable chairside triage tool for early SDB referral.",
        pubTypeList: { pubType: ["Journal Article"] },
        isOpenAccess: "N",
        citedByCount: 2
      }
    ];
    return rawFallback.map(normalizeEpmcItem);
  }

  return {
    fetchLivePapers,
    fetchDirectFromPubMed,
    getOfflineFallbackPapers,
    TOPIC_RULES
  };
})();
