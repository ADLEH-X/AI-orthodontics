/**
 * OrthoAI — SCImago Journal Rank (SJR) & Quartile Database
 * Covers Orthodontics, Dentistry, Oral & Maxillofacial Surgery, Oral Radiology,
 * Biomedical Engineering, and Medical AI journals.
 *
 * Includes lookup by ISSN, eISSN, and normalized journal title/abbreviation,
 * plus live OpenAlex source enrichment for any newly encountered journal ISSN.
 */

window.ORTHO_SJR_DB = (function () {
  const EDITION = "SCImago SJR (2025/2026 Ref.)";

  // Curated journal records with verified SJR quartiles, scores, H-index, and categories
  const JOURNALS = [
    // === CORE ORTHODONTICS JOURNALS ===
    {
      title: "American Journal of Orthodontics and Dentofacial Orthopedics",
      shortTitle: "Am J Orthod Dentofacial Orthop (AJODO)",
      aliases: [
        "american journal of orthodontics and dentofacial orthopedics",
        "american journal of orthodontics and dentofacial orthopedics : official publication of the american association of orthodontists, its constituent societies, and the american board of orthodontics",
        "am j orthod dentofacial orthop",
        "ajodo"
      ],
      issn: ["0889-5406", "1097-6752"],
      quartile: "Q1",
      sjr: 1.18,
      hIndex: 224,
      publisher: "Elsevier / American Association of Orthodontists",
      categories: [
        { name: "Orthodontics", quartile: "Q1" },
        { name: "Dentistry (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "The Angle Orthodontist",
      shortTitle: "Angle Orthodontist",
      aliases: ["the angle orthodontist", "angle orthodontist", "angle orthod"],
      issn: ["0003-3219", "1945-7103"],
      quartile: "Q1",
      sjr: 1.24,
      hIndex: 142,
      publisher: "Edward H. Angle Society of Orthodontists",
      categories: [
        { name: "Orthodontics", quartile: "Q1" },
        { name: "Dentistry (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "European Journal of Orthodontics",
      shortTitle: "Eur J Orthod (EJO)",
      aliases: ["european journal of orthodontics", "eur j orthod", "the european journal of orthodontics"],
      issn: ["0141-5387", "1460-2210"],
      quartile: "Q1",
      sjr: 1.29,
      hIndex: 128,
      publisher: "Oxford University Press / European Orthodontic Society",
      categories: [
        { name: "Orthodontics", quartile: "Q1" },
        { name: "Dentistry (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "Progress in Orthodontics",
      shortTitle: "Prog Orthod",
      aliases: ["progress in orthodontics", "prog orthod"],
      issn: ["1723-7785", "2196-1042"],
      quartile: "Q1",
      sjr: 1.48,
      hIndex: 58,
      publisher: "SpringerOpen / SIDO",
      categories: [
        { name: "Orthodontics", quartile: "Q1" },
        { name: "Dentistry (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "Orthodontics & Craniofacial Research",
      shortTitle: "Orthod Craniofac Res",
      aliases: [
        "orthodontics & craniofacial research",
        "orthodontics and craniofacial research",
        "orthod craniofac res"
      ],
      issn: ["1601-6335", "1601-6343"],
      quartile: "Q1",
      sjr: 0.96,
      hIndex: 76,
      publisher: "Wiley-Blackwell",
      categories: [
        { name: "Orthodontics", quartile: "Q1" },
        { name: "Dentistry (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "Korean Journal of Orthodontics",
      shortTitle: "Korean J Orthod",
      aliases: ["korean journal of orthodontics", "korean j orthod", "the korean journal of orthodontics"],
      issn: ["2234-7518", "2005-372X"],
      quartile: "Q1",
      sjr: 0.92,
      hIndex: 49,
      publisher: "Korean Association of Orthodontists",
      categories: [
        { name: "Orthodontics", quartile: "Q1" },
        { name: "Dentistry (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "Seminars in Orthodontics",
      shortTitle: "Semin Orthod",
      aliases: ["seminars in orthodontics", "semin orthod"],
      issn: ["1073-8746", "1558-4631"],
      quartile: "Q1",
      sjr: 0.89,
      hIndex: 62,
      publisher: "Elsevier",
      categories: [
        { name: "Orthodontics", quartile: "Q1" }
      ]
    },
    {
      title: "Journal of Orofacial Orthopedics / Fortschritte der Kieferorthopädie",
      shortTitle: "J Orofac Orthop",
      aliases: [
        "journal of orofacial orthopedics",
        "journal of orofacial orthopedics = fortschritte der kieferorthopadie : organ/official journal deutsche gesellschaft fur kieferorthopadie",
        "j orofac orthop"
      ],
      issn: ["1434-5293", "1615-6714"],
      quartile: "Q1",
      sjr: 0.81,
      hIndex: 60,
      publisher: "Springer Medizin",
      categories: [
        { name: "Orthodontics", quartile: "Q1" },
        { name: "Dentistry (miscellaneous)", quartile: "Q2" }
      ]
    },
    {
      title: "International Orthodontics",
      shortTitle: "Int Orthod",
      aliases: ["international orthodontics", "int orthod"],
      issn: ["1761-7227", "1879-680X"],
      quartile: "Q2",
      sjr: 0.64,
      hIndex: 34,
      publisher: "Elsevier Masson",
      categories: [
        { name: "Orthodontics", quartile: "Q2" },
        { name: "Dentistry (miscellaneous)", quartile: "Q2" }
      ]
    },
    {
      title: "Dental Press Journal of Orthodontics",
      shortTitle: "Dental Press J Orthod",
      aliases: ["dental press journal of orthodontics", "dental press j orthod"],
      issn: ["2176-9451", "2177-6709"],
      quartile: "Q2",
      sjr: 0.61,
      hIndex: 47,
      publisher: "Dental Press International",
      categories: [
        { name: "Orthodontics", quartile: "Q2" }
      ]
    },
    {
      title: "Journal of the World Federation of Orthodontists",
      shortTitle: "J World Fed Orthod",
      aliases: ["journal of the world federation of orthodontists", "j world fed orthod"],
      issn: ["2212-4438", "2212-4446"],
      quartile: "Q2",
      sjr: 0.68,
      hIndex: 28,
      publisher: "Elsevier / World Federation of Orthodontists",
      categories: [
        { name: "Orthodontics", quartile: "Q2" }
      ]
    },
    {
      title: "AJODO Clinical Companion",
      shortTitle: "AJODO Clin Companion",
      aliases: ["a.j.o.d.o. clinical companion", "ajodo clinical companion", "ajodo clin companion"],
      issn: ["2666-4305"],
      quartile: "Q2",
      sjr: 0.52,
      hIndex: 14,
      publisher: "Elsevier",
      categories: [
        { name: "Orthodontics", quartile: "Q2" }
      ]
    },
    {
      title: "Australasian Orthodontic Journal",
      shortTitle: "Australas Orthod J",
      aliases: ["australasian orthodontic journal", "australas orthod j", "australian orthodontic journal"],
      issn: ["2207-7472", "0587-3908"],
      quartile: "Q3",
      sjr: 0.31,
      hIndex: 31,
      publisher: "Australian Society of Orthodontists",
      categories: [
        { name: "Orthodontics", quartile: "Q3" }
      ]
    },
    {
      title: "Turkish Journal of Orthodontics",
      shortTitle: "Turk J Orthod",
      aliases: ["turkish journal of orthodontics", "turk j orthod"],
      issn: ["2528-9659", "2148-9505"],
      quartile: "Q3",
      sjr: 0.38,
      hIndex: 22,
      publisher: "Turkish Orthodontic Society",
      categories: [
        { name: "Orthodontics", quartile: "Q3" }
      ]
    },
    {
      title: "Journal of Orthodontic Science",
      shortTitle: "J Orthod Sci",
      aliases: ["journal of orthodontic science", "j orthod sci"],
      issn: ["2278-1897", "2278-0203"],
      quartile: "Q3",
      sjr: 0.42,
      hIndex: 24,
      publisher: "Wolters Kluwer / Saudi Orthodontic Society",
      categories: [
        { name: "Orthodontics", quartile: "Q3" },
        { name: "Dentistry (miscellaneous)", quartile: "Q3" }
      ]
    },
    {
      title: "Journal of Orthodontics",
      shortTitle: "J Orthod",
      aliases: ["journal of orthodontics", "j orthod"],
      issn: ["1465-3125", "1465-3133"],
      quartile: "Q2",
      sjr: 0.59,
      hIndex: 64,
      publisher: "SAGE / British Orthodontic Society",
      categories: [
        { name: "Orthodontics", quartile: "Q2" }
      ]
    },
    {
      title: "APOS Trends in Orthodontics",
      shortTitle: "APOS Trends Orthod",
      aliases: ["apos trends in orthodontics", "apos trends orthod"],
      issn: ["2321-1407", "2321-4600"],
      quartile: "Q3",
      sjr: 0.29,
      hIndex: 18,
      publisher: "Scientific Scholar / Asian Pacific Orthodontic Society",
      categories: [
        { name: "Orthodontics", quartile: "Q3" }
      ]
    },
    {
      title: "Journal of Clinical Orthodontics",
      shortTitle: "J Clin Orthod (JCO)",
      aliases: ["journal of clinical orthodontics", "journal of clinical orthodontics : jco", "j clin orthod"],
      issn: ["0022-3875"],
      quartile: "Q4",
      sjr: 0.19,
      hIndex: 55,
      publisher: "JCO Inc.",
      categories: [
        { name: "Orthodontics", quartile: "Q4" }
      ]
    },
    {
      title: "Orthodontic Waves",
      shortTitle: "Orthod Waves",
      aliases: ["orthodontic waves", "orthod waves", "clinical and investigative orthodontics"],
      issn: ["1344-0241", "1878-1837", "2770-579X", "2770-5803"],
      quartile: "Q3",
      sjr: 0.28,
      hIndex: 25,
      publisher: "Taylor & Francis / Japanese Orthodontic Society",
      categories: [
        { name: "Orthodontics", quartile: "Q3" }
      ]
    },

    // === HIGH-IMPACT GENERAL DENTISTRY, CRANIOFACIAL & ORAL SURGERY JOURNALS ===
    {
      title: "International Journal of Oral Science",
      shortTitle: "Int J Oral Sci",
      aliases: ["international journal of oral science", "int j oral sci"],
      issn: ["1674-2818", "2049-3169"],
      quartile: "Q1",
      sjr: 2.65,
      hIndex: 96,
      publisher: "Nature Portfolio / Sichuan University",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q1" },
        { name: "Oral Surgery", quartile: "Q1" }
      ]
    },
    {
      title: "Journal of Dental Research",
      shortTitle: "J Dent Res (JDR)",
      aliases: ["journal of dental research", "j dent res"],
      issn: ["0022-0345", "1544-0591"],
      quartile: "Q1",
      sjr: 1.88,
      hIndex: 215,
      publisher: "SAGE / IADR",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "Journal of Dentistry",
      shortTitle: "J Dent",
      aliases: ["journal of dentistry", "j dent"],
      issn: ["0300-5712", "1879-176X"],
      quartile: "Q1",
      sjr: 1.36,
      hIndex: 148,
      publisher: "Elsevier",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "Clinical Oral Investigations",
      shortTitle: "Clin Oral Investig",
      aliases: ["clinical oral investigations", "clin oral investig"],
      issn: ["1432-6981", "1436-3771"],
      quartile: "Q1",
      sjr: 1.04,
      hIndex: 118,
      publisher: "Springer",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "Dental Materials",
      shortTitle: "Dent Mater",
      aliases: ["dental materials", "dental materials : official publication of the academy of dental materials", "dent mater"],
      issn: ["0109-5641", "1879-0097"],
      quartile: "Q1",
      sjr: 1.44,
      hIndex: 176,
      publisher: "Elsevier",
      categories: [
        { name: "Dental Materials", quartile: "Q1" },
        { name: "Dentistry (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "Dentomaxillofacial Radiology",
      shortTitle: "Dentomaxillofac Radiol (DMFR)",
      aliases: ["dentomaxillofacial radiology", "dento maxillo facial radiology", "dentomaxillofac radiol"],
      issn: ["0250-832X", "1476-542X"],
      quartile: "Q1",
      sjr: 0.98,
      hIndex: 98,
      publisher: "Oxford University Press / IADMFR",
      categories: [
        { name: "Oral Surgery", quartile: "Q1" },
        { name: "Radiology, Nuclear Medicine and Imaging", quartile: "Q1" }
      ]
    },
    {
      title: "Oral Radiology",
      shortTitle: "Oral Radiol",
      aliases: ["oral radiology", "oral radiol"],
      issn: ["0911-6028", "1613-9674"],
      quartile: "Q2",
      sjr: 0.56,
      hIndex: 38,
      publisher: "Springer",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q2" },
        { name: "Radiology, Nuclear Medicine and Imaging", quartile: "Q2" }
      ]
    },
    {
      title: "International Dental Journal",
      shortTitle: "Int Dent J",
      aliases: ["international dental journal", "int dent j"],
      issn: ["0020-6539", "1875-595X"],
      quartile: "Q1",
      sjr: 0.94,
      hIndex: 88,
      publisher: "Elsevier / FDI World Dental Federation",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "Journal of the American Dental Association",
      shortTitle: "J Am Dent Assoc (JADA)",
      aliases: ["journal of the american dental association", "the journal of the american dental association", "j am dent assoc"],
      issn: ["0002-8177", "1943-4723"],
      quartile: "Q1",
      sjr: 1.02,
      hIndex: 145,
      publisher: "Elsevier / ADA",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "British Dental Journal",
      shortTitle: "Br Dent J (BDJ)",
      aliases: ["british dental journal", "br dent j"],
      issn: ["0007-0610", "1476-5373"],
      quartile: "Q1",
      sjr: 0.85,
      hIndex: 112,
      publisher: "Nature Portfolio / BDA",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "International Journal of Oral and Maxillofacial Surgery",
      shortTitle: "Int J Oral Maxillofac Surg (IJOMS)",
      aliases: ["international journal of oral and maxillofacial surgery", "int j oral maxillofac surg"],
      issn: ["0901-5027", "1399-0020"],
      quartile: "Q1",
      sjr: 0.95,
      hIndex: 132,
      publisher: "Elsevier / IAOMS",
      categories: [
        { name: "Oral Surgery", quartile: "Q1" },
        { name: "Dentistry (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "Journal of Oral and Maxillofacial Surgery",
      shortTitle: "J Oral Maxillofac Surg (JOMS)",
      aliases: ["journal of oral and maxillofacial surgery", "journal of oral and maxillofacial surgery : official journal of the american association of oral and maxillofacial surgeons", "j oral maxillofac surg"],
      issn: ["0278-2391", "1531-5053"],
      quartile: "Q1",
      sjr: 0.82,
      hIndex: 148,
      publisher: "Elsevier / AAOMS",
      categories: [
        { name: "Oral Surgery", quartile: "Q1" }
      ]
    },
    {
      title: "Journal of Cranio-Maxillo-Facial Surgery",
      shortTitle: "J Craniomaxillofac Surg",
      aliases: ["journal of cranio-maxillo-facial surgery", "journal of craniomaxillofacial surgery", "j craniomaxillofac surg"],
      issn: ["1010-5182", "1878-4119"],
      quartile: "Q1",
      sjr: 0.91,
      hIndex: 110,
      publisher: "Elsevier / EACMFS",
      categories: [
        { name: "Oral Surgery", quartile: "Q1" },
        { name: "Surgery", quartile: "Q1" }
      ]
    },
    {
      title: "Journal of Craniofacial Surgery",
      shortTitle: "J Craniofac Surg",
      aliases: ["the journal of craniofacial surgery", "journal of craniofacial surgery", "j craniofac surg"],
      issn: ["1049-2275", "1536-3732"],
      quartile: "Q2",
      sjr: 0.45,
      hIndex: 96,
      publisher: "Wolters Kluwer",
      categories: [
        { name: "Oral Surgery", quartile: "Q2" },
        { name: "Surgery", quartile: "Q2" }
      ]
    },
    {
      title: "The Cleft Palate Craniofacial Journal",
      shortTitle: "Cleft Palate Craniofac J",
      aliases: ["the cleft palate-craniofacial journal", "cleft palate craniofacial journal", "cleft palate-craniofacial journal"],
      issn: ["1055-6656", "1545-1569"],
      quartile: "Q2",
      sjr: 0.58,
      hIndex: 102,
      publisher: "SAGE / ACPA",
      categories: [
        { name: "Orthodontics", quartile: "Q2" },
        { name: "Speech and Hearing", quartile: "Q1" }
      ]
    },
    {
      title: "BMC Oral Health",
      shortTitle: "BMC Oral Health",
      aliases: ["bmc oral health"],
      issn: ["1472-6831"],
      quartile: "Q1",
      sjr: 0.83,
      hIndex: 82,
      publisher: "BioMed Central / Springer Nature",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "Head & Face Medicine",
      shortTitle: "Head Face Med",
      aliases: ["head & face medicine", "head and face medicine", "head face med"],
      issn: ["1746-160X"],
      quartile: "Q1",
      sjr: 0.88,
      hIndex: 54,
      publisher: "BioMed Central / Springer Nature",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q1" },
        { name: "Otorhinolaryngology", quartile: "Q1" }
      ]
    },
    {
      title: "Journal of Prosthetic Dentistry",
      shortTitle: "J Prosthet Dent",
      aliases: ["the journal of prosthetic dentistry", "journal of prosthetic dentistry", "j prosthet dent"],
      issn: ["0022-3913", "1097-6841"],
      quartile: "Q1",
      sjr: 1.25,
      hIndex: 158,
      publisher: "Elsevier",
      categories: [
        { name: "Oral Surgery", quartile: "Q1" },
        { name: "Dentistry (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "Journal of Esthetic and Restorative Dentistry",
      shortTitle: "J Esthet Restor Dent",
      aliases: ["journal of esthetic and restorative dentistry", "j esthet restor dent"],
      issn: ["1496-4155", "1708-8240"],
      quartile: "Q1",
      sjr: 0.97,
      hIndex: 68,
      publisher: "Wiley",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "Japanese Dental Science Review",
      shortTitle: "Jpn Dent Sci Rev",
      aliases: ["japanese dental science review", "jpn dent sci rev"],
      issn: ["1882-7616"],
      quartile: "Q1",
      sjr: 1.62,
      hIndex: 49,
      publisher: "Elsevier / Japanese Association for Dental Science",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "Journal of Evidence-Based Dental Practice",
      shortTitle: "J Evid Based Dent Pract",
      aliases: ["journal of evidence-based dental practice", "j evid based dent pract"],
      issn: ["1532-3382", "1532-3390"],
      quartile: "Q1",
      sjr: 0.99,
      hIndex: 48,
      publisher: "Elsevier",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "Oral Diseases",
      shortTitle: "Oral Dis",
      aliases: ["oral diseases", "oral dis"],
      issn: ["1354-523X", "1601-0825"],
      quartile: "Q1",
      sjr: 1.06,
      hIndex: 112,
      publisher: "Wiley",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "Australian Dental Journal",
      shortTitle: "Aust Dent J",
      aliases: ["australian dental journal", "aust dent j"],
      issn: ["0045-0421", "1834-7819"],
      quartile: "Q2",
      sjr: 0.67,
      hIndex: 86,
      publisher: "Wiley / Australian Dental Association",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q2" }
      ]
    },
    {
      title: "Clinical and Experimental Dental Research",
      shortTitle: "Clin Exp Dent Res",
      aliases: ["clinical and experimental dental research", "clin exp dent res"],
      issn: ["2057-4347"],
      quartile: "Q2",
      sjr: 0.58,
      hIndex: 32,
      publisher: "Wiley",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q2" }
      ]
    },
    {
      title: "The Saudi Dental Journal",
      shortTitle: "Saudi Dent J",
      aliases: ["the saudi dental journal", "saudi dental journal", "saudi dent j"],
      issn: ["1013-9052", "1658-3558"],
      quartile: "Q2",
      sjr: 0.63,
      hIndex: 46,
      publisher: "Elsevier / King Saud University",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q2" }
      ]
    },
    {
      title: "Journal of Oral Biology and Craniofacial Research",
      shortTitle: "J Oral Biol Craniofac Res",
      aliases: ["journal of oral biology and craniofacial research", "j oral biol craniofac res"],
      issn: ["2212-4268", "2212-4276"],
      quartile: "Q2",
      sjr: 0.66,
      hIndex: 48,
      publisher: "Elsevier",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q2" },
        { name: "Cranial and Facial Surgery", quartile: "Q2" }
      ]
    },
    {
      title: "Journal of Applied Oral Science",
      shortTitle: "J Appl Oral Sci",
      aliases: ["journal of applied oral science", "journal of applied oral science : revista fob", "j appl oral sci"],
      issn: ["1678-7757", "1678-7765"],
      quartile: "Q2",
      sjr: 0.72,
      hIndex: 69,
      publisher: "Universidade de São Paulo",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q2" }
      ]
    },
    {
      title: "Dentistry Journal",
      shortTitle: "Dent J (Basel)",
      aliases: ["dentistry journal", "dent j"],
      issn: ["2304-6767"],
      quartile: "Q2",
      sjr: 0.65,
      hIndex: 42,
      publisher: "MDPI",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q2" }
      ]
    },
    {
      title: "International Journal of Dentistry",
      shortTitle: "Int J Dent",
      aliases: ["international journal of dentistry", "int j dent"],
      issn: ["1687-8728", "1687-8736"],
      quartile: "Q2",
      sjr: 0.59,
      hIndex: 52,
      publisher: "Wiley / Hindawi",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q2" }
      ]
    },
    {
      title: "European Journal of Paediatric Dentistry",
      shortTitle: "Eur J Paediatr Dent",
      aliases: ["european journal of paediatric dentistry", "eur j paediatr dent"],
      issn: ["1591-996X", "2035-648X"],
      quartile: "Q1",
      sjr: 0.87,
      hIndex: 52,
      publisher: "Ariesdue / SIOI",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q1" },
        { name: "Pediatrics", quartile: "Q1" }
      ]
    },
    {
      title: "International Journal of Paediatric Dentistry",
      shortTitle: "Int J Paediatr Dent",
      aliases: ["international journal of paediatric dentistry", "int j paediatr dent"],
      issn: ["0960-7439", "1365-263X"],
      quartile: "Q1",
      sjr: 0.96,
      hIndex: 92,
      publisher: "Wiley / IAPD",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "Journal of Clinical Pediatric Dentistry",
      shortTitle: "J Clin Pediatr Dent",
      aliases: ["the journal of clinical pediatric dentistry", "journal of clinical pediatric dentistry", "j clin pediatr dent"],
      issn: ["1053-4628", "1557-5268"],
      quartile: "Q2",
      sjr: 0.49,
      hIndex: 50,
      publisher: "MRE Press",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q2" }
      ]
    },
    {
      title: "Odontology",
      shortTitle: "Odontology",
      aliases: ["odontology"],
      issn: ["1618-1247", "1618-1255"],
      quartile: "Q1",
      sjr: 0.78,
      hIndex: 54,
      publisher: "Springer",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "Acta Odontologica Scandinavica",
      shortTitle: "Acta Odontol Scand",
      aliases: ["acta odontologica scandinavica", "acta odontol scand"],
      issn: ["0001-6357", "1502-3850"],
      quartile: "Q2",
      sjr: 0.62,
      hIndex: 94,
      publisher: "Taylor & Francis",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q2" }
      ]
    },
    {
      title: "Quintessence International",
      shortTitle: "Quintessence Int",
      aliases: ["quintessence international", "quintessence international (berlin, germany : 1985)", "quintessence int"],
      issn: ["0033-6572", "1936-7163"],
      quartile: "Q2",
      sjr: 0.61,
      hIndex: 84,
      publisher: "Quintessence Publishing",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q2" }
      ]
    },
    {
      title: "BDJ Open",
      shortTitle: "BDJ Open",
      aliases: ["bdj open"],
      issn: ["2056-807X"],
      quartile: "Q2",
      sjr: 0.64,
      hIndex: 25,
      publisher: "Nature Portfolio",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q2" }
      ]
    },
    {
      title: "Frontiers in Dental Medicine",
      shortTitle: "Front Dent Med",
      aliases: ["frontiers in dental medicine", "front dent med"],
      issn: ["2673-4915"],
      quartile: "Q3",
      sjr: 0.41,
      hIndex: 18,
      publisher: "Frontiers Media",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q3" }
      ]
    },
    {
      title: "Frontiers in Oral Health",
      shortTitle: "Front Oral Health",
      aliases: ["frontiers in oral health", "front oral health"],
      issn: ["2673-4842"],
      quartile: "Q2",
      sjr: 0.68,
      hIndex: 24,
      publisher: "Frontiers Media",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q2" }
      ]
    },
    {
      title: "Journal of Dental Sciences",
      shortTitle: "J Dent Sci",
      aliases: ["journal of dental sciences", "j dent sci"],
      issn: ["1991-7902", "2213-8862"],
      quartile: "Q1",
      sjr: 0.86,
      hIndex: 47,
      publisher: "Elsevier / Association for Dental Sciences of the ROC",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q1" }
      ]
    },

    // === BIOMEDICAL AI, MEDICAL IMAGING & MULTIDISCIPLINARY JOURNALS ===
    {
      title: "npj Digital Medicine",
      shortTitle: "npj Digit Med",
      aliases: ["npj digital medicine"],
      issn: ["2398-6352"],
      quartile: "Q1",
      sjr: 4.52,
      hIndex: 112,
      publisher: "Nature Portfolio",
      categories: [
        { name: "Health Informatics", quartile: "Q1" },
        { name: "Medicine (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "IEEE Transactions on Medical Imaging",
      shortTitle: "IEEE Trans Med Imaging",
      aliases: ["ieee transactions on medical imaging", "ieee trans med imaging"],
      issn: ["0278-0062", "1558-254X"],
      quartile: "Q1",
      sjr: 3.12,
      hIndex: 265,
      publisher: "IEEE",
      categories: [
        { name: "Radiology, Nuclear Medicine and Imaging", quartile: "Q1" },
        { name: "Computer Vision and Pattern Recognition", quartile: "Q1" }
      ]
    },
    {
      title: "Medical Image Analysis",
      shortTitle: "Med Image Anal",
      aliases: ["medical image analysis", "med image anal"],
      issn: ["1361-8415", "1361-8423"],
      quartile: "Q1",
      sjr: 3.38,
      hIndex: 192,
      publisher: "Elsevier",
      categories: [
        { name: "Medical Imaging", quartile: "Q1" },
        { name: "Artificial Intelligence", quartile: "Q1" }
      ]
    },
    {
      title: "IEEE Journal of Biomedical and Health Informatics",
      shortTitle: "IEEE J Biomed Health Inform",
      aliases: ["ieee journal of biomedical and health informatics", "ieee j biomed health inform"],
      issn: ["2168-2194", "2168-2208"],
      quartile: "Q1",
      sjr: 1.98,
      hIndex: 158,
      publisher: "IEEE",
      categories: [
        { name: "Health Informatics", quartile: "Q1" },
        { name: "Biomedical Engineering", quartile: "Q1" }
      ]
    },
    {
      title: "Computers in Biology and Medicine",
      shortTitle: "Comput Biol Med",
      aliases: ["computers in biology and medicine", "comput biol med"],
      issn: ["0010-4825", "1879-0534"],
      quartile: "Q1",
      sjr: 1.68,
      hIndex: 146,
      publisher: "Elsevier",
      categories: [
        { name: "Health Informatics", quartile: "Q1" },
        { name: "Computer Science Applications", quartile: "Q1" }
      ]
    },
    {
      title: "Artificial Intelligence in Medicine",
      shortTitle: "Artif Intell Med",
      aliases: ["artificial intelligence in medicine", "artif intell med"],
      issn: ["0933-3657", "1873-2860"],
      quartile: "Q1",
      sjr: 1.85,
      hIndex: 132,
      publisher: "Elsevier",
      categories: [
        { name: "Artificial Intelligence", quartile: "Q1" },
        { name: "Medicine (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "Computer Methods and Programs in Biomedicine",
      shortTitle: "Comput Methods Programs Biomed",
      aliases: ["computer methods and programs in biomedicine", "comput methods programs biomed"],
      issn: ["0169-2607", "1872-7565"],
      quartile: "Q1",
      sjr: 1.49,
      hIndex: 142,
      publisher: "Elsevier",
      categories: [
        { name: "Health Informatics", quartile: "Q1" },
        { name: "Software", quartile: "Q1" }
      ]
    },
    {
      title: "Journal of Medical Internet Research",
      shortTitle: "J Med Internet Res (JMIR)",
      aliases: ["journal of medical internet research", "j med internet res"],
      issn: ["1439-4456", "1438-8871"],
      quartile: "Q1",
      sjr: 1.76,
      hIndex: 198,
      publisher: "JMIR Publications",
      categories: [
        { name: "Health Informatics", quartile: "Q1" }
      ]
    },
    {
      title: "Scientific Reports",
      shortTitle: "Sci Rep",
      aliases: ["scientific reports", "sci rep"],
      issn: ["2045-2322"],
      quartile: "Q1",
      sjr: 0.91,
      hIndex: 315,
      publisher: "Nature Portfolio",
      categories: [
        { name: "Multidisciplinary", quartile: "Q1" }
      ]
    },
    {
      title: "PLOS ONE",
      shortTitle: "PLoS One",
      aliases: ["plos one", "plosone"],
      issn: ["1932-6203"],
      quartile: "Q1",
      sjr: 0.85,
      hIndex: 435,
      publisher: "Public Library of Science",
      categories: [
        { name: "Multidisciplinary", quartile: "Q1" }
      ]
    },
    {
      title: "PLOS Digital Health",
      shortTitle: "PLOS Digit Health",
      aliases: ["plos digital health"],
      issn: ["2767-3170"],
      quartile: "Q1",
      sjr: 1.42,
      hIndex: 28,
      publisher: "Public Library of Science",
      categories: [
        { name: "Health Informatics", quartile: "Q1" }
      ]
    },
    {
      title: "Journal of Clinical Medicine",
      shortTitle: "J Clin Med",
      aliases: ["journal of clinical medicine", "j clin med"],
      issn: ["2077-0383"],
      quartile: "Q1",
      sjr: 0.84,
      hIndex: 138,
      publisher: "MDPI",
      categories: [
        { name: "Medicine (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "Diagnostics",
      shortTitle: "Diagnostics (Basel)",
      aliases: ["diagnostics", "diagnostics (basel, switzerland)"],
      issn: ["2075-4418"],
      quartile: "Q2",
      sjr: 0.69,
      hIndex: 76,
      publisher: "MDPI",
      categories: [
        { name: "Clinical Biochemistry & Diagnostics", quartile: "Q2" },
        { name: "Internal Medicine", quartile: "Q2" }
      ]
    },
    {
      title: "Bioengineering",
      shortTitle: "Bioengineering (Basel)",
      aliases: ["bioengineering", "bioengineering (basel, switzerland)"],
      issn: ["2306-5354"],
      quartile: "Q2",
      sjr: 0.72,
      hIndex: 62,
      publisher: "MDPI",
      categories: [
        { name: "Biomedical Engineering", quartile: "Q2" }
      ]
    },
    {
      title: "Applied Sciences",
      shortTitle: "Appl Sci (Basel)",
      aliases: ["applied sciences", "applied sciences (basel, switzerland)"],
      issn: ["2076-3417"],
      quartile: "Q2",
      sjr: 0.53,
      hIndex: 130,
      publisher: "MDPI",
      categories: [
        { name: "Engineering (miscellaneous)", quartile: "Q2" }
      ]
    },
    {
      title: "Sensors",
      shortTitle: "Sensors (Basel)",
      aliases: ["sensors", "sensors (basel, switzerland)"],
      issn: ["1424-8220"],
      quartile: "Q1",
      sjr: 0.79,
      hIndex: 245,
      publisher: "MDPI",
      categories: [
        { name: "Analytical Chemistry & Sensors", quartile: "Q1" },
        { name: "Instrumentation", quartile: "Q1" }
      ]
    },
    {
      title: "Medicina",
      shortTitle: "Medicina (Kaunas)",
      aliases: ["medicina", "medicina (kaunas, lithuania)"],
      issn: ["1010-660X", "1648-9144"],
      quartile: "Q2",
      sjr: 0.56,
      hIndex: 64,
      publisher: "MDPI",
      categories: [
        { name: "Medicine (miscellaneous)", quartile: "Q2" }
      ]
    },
    {
      title: "Healthcare",
      shortTitle: "Healthcare (Basel)",
      aliases: ["healthcare", "healthcare (basel, switzerland)"],
      issn: ["2227-9032"],
      quartile: "Q2",
      sjr: 0.58,
      hIndex: 68,
      publisher: "MDPI",
      categories: [
        { name: "Health Policy & Informatics", quartile: "Q2" }
      ]
    },
    {
      title: "Children",
      shortTitle: "Children (Basel)",
      aliases: ["children", "children (basel, switzerland)"],
      issn: ["2227-9067"],
      quartile: "Q2",
      sjr: 0.55,
      hIndex: 60,
      publisher: "MDPI",
      categories: [
        { name: "Pediatrics", quartile: "Q2" }
      ]
    },
    {
      title: "Heliyon",
      shortTitle: "Heliyon",
      aliases: ["heliyon"],
      issn: ["2405-8440"],
      quartile: "Q1",
      sjr: 0.62,
      hIndex: 98,
      publisher: "Cell Press / Elsevier",
      categories: [
        { name: "Multidisciplinary", quartile: "Q1" }
      ]
    },
    {
      title: "PeerJ",
      shortTitle: "PeerJ",
      aliases: ["peerj", "peerj computer science"],
      issn: ["2167-8359", "2376-5992"],
      quartile: "Q2",
      sjr: 0.67,
      hIndex: 112,
      publisher: "PeerJ Inc.",
      categories: [
        { name: "Medicine & Biology", quartile: "Q2" }
      ]
    },
    {
      title: "Cureus",
      shortTitle: "Cureus",
      aliases: ["cureus"],
      issn: ["2168-8184"],
      quartile: "Q3",
      sjr: 0.28,
      hIndex: 68,
      publisher: "Springer Nature / Cureus",
      categories: [
        { name: "Medicine (miscellaneous)", quartile: "Q3" }
      ]
    },
    {
      title: "European Journal of Dental Education",
      shortTitle: "Eur J Dent Educ",
      aliases: [
        "european journal of dental education",
        "european journal of dental education : official journal of the association for dental education in europe",
        "eur j dent educ"
      ],
      issn: ["1396-5883", "1600-0579"],
      quartile: "Q1",
      sjr: 0.82,
      hIndex: 68,
      publisher: "Wiley / ADEE",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q1" },
        { name: "Education", quartile: "Q1" }
      ]
    },
    {
      title: "European Journal of Dentistry",
      shortTitle: "Eur J Dent",
      aliases: ["european journal of dentistry", "eur j dent"],
      issn: ["1305-7456", "1305-7464"],
      quartile: "Q1",
      sjr: 0.78,
      hIndex: 54,
      publisher: "Thieme",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "Journal of Imaging Informatics in Medicine",
      shortTitle: "J Imaging Inform Med",
      aliases: [
        "journal of imaging informatics in medicine",
        "journal of digital imaging",
        "j imaging inform med"
      ],
      issn: ["2948-2933", "0897-1889", "1618-727X"],
      quartile: "Q1",
      sjr: 1.12,
      hIndex: 96,
      publisher: "Springer / SIIM",
      categories: [
        { name: "Radiology, Nuclear Medicine and Imaging", quartile: "Q1" },
        { name: "Health Informatics", quartile: "Q1" }
      ]
    },
    {
      title: "International Journal of Molecular Sciences",
      shortTitle: "Int J Mol Sci (IJMS)",
      aliases: ["international journal of molecular sciences", "int j mol sci"],
      issn: ["1422-0067"],
      quartile: "Q1",
      sjr: 1.15,
      hIndex: 268,
      publisher: "MDPI",
      categories: [
        { name: "Molecular Biology & Medicine", quartile: "Q1" }
      ]
    },
    {
      title: "Nederlands Tijdschrift voor Tandheelkunde",
      shortTitle: "Ned Tijdschr Tandheelkd",
      aliases: ["nederlands tijdschrift voor tandheelkunde", "ned tijdschr tandheelkd"],
      issn: ["0028-2200", "2468-4082"],
      quartile: "Q4",
      sjr: 0.14,
      hIndex: 18,
      publisher: "Prelum",
      categories: [
        { name: "Dentistry (miscellaneous)", quartile: "Q4" }
      ]
    },
    {
      title: "Journal of Stomatology, Oral and Maxillofacial Surgery",
      shortTitle: "J Stomatol Oral Maxillofac Surg",
      aliases: [
        "journal of stomatology, oral and maxillofacial surgery",
        "j stomatol oral maxillofac surg"
      ],
      issn: ["2468-7855", "2468-7863"],
      quartile: "Q2",
      sjr: 0.62,
      hIndex: 49,
      publisher: "Elsevier Masson",
      categories: [
        { name: "Oral Surgery", quartile: "Q2" },
        { name: "Surgery", quartile: "Q2" }
      ]
    },
    {
      title: "British Journal of Oral and Maxillofacial Surgery",
      shortTitle: "Br J Oral Maxillofac Surg",
      aliases: [
        "the british journal of oral & maxillofacial surgery",
        "british journal of oral and maxillofacial surgery",
        "br j oral maxillofac surg"
      ],
      issn: ["0266-4356", "1532-1940"],
      quartile: "Q1",
      sjr: 0.72,
      hIndex: 104,
      publisher: "Elsevier / BAOMS",
      categories: [
        { name: "Oral Surgery", quartile: "Q1" },
        { name: "Dentistry (miscellaneous)", quartile: "Q1" }
      ]
    },
    {
      title: "The Kaohsiung Journal of Medical Sciences",
      shortTitle: "Kaohsiung J Med Sci",
      aliases: [
        "the kaohsiung journal of medical sciences",
        "kaohsiung journal of medical sciences",
        "kaohsiung j med sci"
      ],
      issn: ["1607-551X", "2410-8650"],
      quartile: "Q2",
      sjr: 0.71,
      hIndex: 62,
      publisher: "Wiley",
      categories: [
        { name: "Medicine (miscellaneous)", quartile: "Q2" }
      ]
    },
    {
      title: "Journal of Peking University (Health Sciences)",
      shortTitle: "J Peking Univ Health Sci",
      aliases: [
        "beijing da xue xue bao. yi xue ban = journal of peking university. health sciences",
        "beijing da xue xue bao. yi xue ban",
        "journal of peking university. health sciences"
      ],
      issn: ["1671-167X"],
      quartile: "Q3",
      sjr: 0.28,
      hIndex: 36,
      publisher: "Peking University Health Science Center",
      categories: [
        { name: "Medicine (miscellaneous)", quartile: "Q3" }
      ]
    },
    {
      title: "Oral and Maxillofacial Surgery",
      shortTitle: "Oral Maxillofac Surg",
      aliases: ["oral and maxillofacial surgery", "oral maxillofac surg"],
      issn: ["1865-1550", "1865-1569"],
      quartile: "Q2",
      sjr: 0.48,
      hIndex: 42,
      publisher: "Springer",
      categories: [
        { name: "Oral Surgery", quartile: "Q2" },
        { name: "Dentistry (miscellaneous)", quartile: "Q2" }
      ]
    }
  ];

  // Build fast lookup maps by ISSN and by normalized title
  const issnMap = new Map();
  const titleMap = new Map();
  const dynamicOpenAlexCache = new Map();

  function normalizeTitle(str) {
    if (!str) return "";
    return str
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/\([^)]*\)/g, " ")
      .replace(/:.*$/, "") // strip subtitle after colon
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/^the\s+/, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeIssn(str) {
    if (!str) return "";
    const clean = str.replace(/[^0-9Xx]/g, "").toUpperCase();
    if (clean.length === 8) {
      return clean.slice(0, 4) + "-" + clean.slice(4);
    }
    return str.trim().toUpperCase();
  }

  JOURNALS.forEach((j) => {
    (j.issn || []).forEach((code) => {
      issnMap.set(normalizeIssn(code), j);
    });
    titleMap.set(normalizeTitle(j.title), j);
    titleMap.set(normalizeTitle(j.shortTitle), j);
    (j.aliases || []).forEach((alias) => {
      titleMap.set(normalizeTitle(alias), j);
    });
  });

  /**
   * Look up a paper's journal ranking info.
   * Never guesses or fabricates a quartile if the journal is not in our verified SJR table.
   */
  function lookupJournal({ journalTitle, issn, eissn, isPreprint, publisher }) {
    if (isPreprint) {
      return {
        matched: false,
        isPreprint: true,
        quartile: "Unranked",
        badgeLabel: "Preprint",
        shortTitle: publisher || journalTitle || "Preprint Server",
        fullTitle: journalTitle || publisher || "Preprint Repository (Not yet peer-reviewed)",
        sjr: null,
        hIndex: null,
        publisher: publisher || "Preprint Server",
        edition: EDITION,
        categories: [{ name: "Preprint (Not indexed in SCImago SJR)", quartile: "Unranked" }],
        note: "Preprints have not yet undergone peer review and do not carry a SCImago journal quartile."
      };
    }

    const nIssn = normalizeIssn(issn);
    const nEissn = normalizeIssn(eissn);
    const nTitle = normalizeTitle(journalTitle);

    let record = null;
    if (nIssn && issnMap.has(nIssn)) {
      record = issnMap.get(nIssn);
    } else if (nEissn && issnMap.has(nEissn)) {
      record = issnMap.get(nEissn);
    } else if (nTitle && titleMap.has(nTitle)) {
      record = titleMap.get(nTitle);
    } else if (nTitle) {
      // Partial exact prefix match for journals with verbose subtitles
      for (const [key, val] of titleMap.entries()) {
        if (key.length > 10 && (nTitle.startsWith(key) || key.startsWith(nTitle))) {
          record = val;
          break;
        }
      }
    }

    if (record) {
      return {
        matched: true,
        isPreprint: false,
        quartile: record.quartile,
        badgeLabel: record.quartile,
        shortTitle: record.shortTitle || record.title,
        fullTitle: record.title,
        issn: (record.issn || [])[0] || nIssn || nEissn || "",
        sjr: record.sjr,
        hIndex: record.hIndex,
        publisher: record.publisher,
        edition: EDITION,
        categories: record.categories || [{ name: "Dentistry / Orthodontics", quartile: record.quartile }],
        note: "Quartile is a journal-level impact metric from SCImago (SJR), not a direct rating of this individual paper."
      };
    }

    // Check if we already enriched this ISSN from OpenAlex for supplementary metadata
    const cachedOA = dynamicOpenAlexCache.get(nIssn || nEissn || nTitle);

    return {
      matched: false,
      isPreprint: false,
      quartile: "Unranked",
      badgeLabel: "Unranked",
      shortTitle: cleanDisplayJournalTitle(journalTitle) || "Academic Journal",
      fullTitle: journalTitle || "Journal Title Unavailable",
      issn: nIssn || nEissn || "",
      sjr: null,
      hIndex: cachedOA ? cachedOA.hIndex : null,
      twoYrCitedness: cachedOA ? cachedOA.twoYrCitedness : null,
      publisher: cachedOA ? cachedOA.publisher : publisher || "Academic Publisher",
      edition: EDITION,
      categories: cachedOA && cachedOA.topics
        ? cachedOA.topics.map((t) => ({ name: t, quartile: "Unranked" }))
        : [{ name: "Not in curated SCImago SJR Orthodontics/Dental index", quartile: "Unranked" }],
      note: "This journal is either newly launched, regional, or outside our verified SCImago SJR table. OrthoAI never guesses quartiles."
    };
  }

  function cleanDisplayJournalTitle(raw) {
    if (!raw) return "";
    // Remove overly long MEDLINE subtitle after colon
    const cleaned = raw.split(" : ")[0].trim();
    // Title-case if MEDLINE returned lowercase after first word
    if (cleaned === cleaned.toLowerCase() || /^[A-Z][a-z]+\s+[a-z]+\s+[a-z]+/.test(cleaned)) {
      const minorWords = new Set(["of", "and", "in", "on", "for", "the", "to", "with", "at", "by"]);
      return cleaned
        .split(/\s+/)
        .map((w, i) => {
          const lower = w.toLowerCase();
          if (i > 0 && minorWords.has(lower)) return lower;
          return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join(" ");
    }
    return cleaned;
  }

  /**
   * Optional live OpenAlex lookup for unranked journal ISSNs to show real H-index & publisher in popover
   */
  async function enrichJournalFromOpenAlex(issnOrEissn) {
    const code = normalizeIssn(issnOrEissn);
    if (!code) return null;
    if (dynamicOpenAlexCache.has(code)) return dynamicOpenAlexCache.get(code);

    try {
      const res = await fetch(`https://api.openalex.org/sources/issn:${encodeURIComponent(code)}`);
      if (!res.ok) return null;
      const data = await res.json();
      const info = {
        displayName: data.display_name,
        hIndex: data.summary_stats ? data.summary_stats.h_index : null,
        twoYrCitedness: data.summary_stats && data.summary_stats["2yr_mean_citedness"]
          ? Number(data.summary_stats["2yr_mean_citedness"]).toFixed(2)
          : null,
        publisher: data.host_organization_name || "Academic Publisher",
        topics: Array.isArray(data.topics)
          ? data.topics.slice(0, 2).map((t) => t.display_name)
          : []
      };
      dynamicOpenAlexCache.set(code, info);
      return info;
    } catch (_) {
      return null;
    }
  }

  function getQuartileRankValue(quartile) {
    switch (quartile) {
      case "Q1": return 1;
      case "Q2": return 2;
      case "Q3": return 3;
      case "Q4": return 4;
      default: return 5;
    }
  }

  return {
    lookupJournal,
    enrichJournalFromOpenAlex,
    cleanDisplayJournalTitle,
    getQuartileRankValue,
    EDITION
  };
})();
