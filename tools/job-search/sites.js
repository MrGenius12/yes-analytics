// Site configuration for Job Search Launcher.
// Each site turns a common query into that site's own search URL.
//
// query = {
//   keywords: "Data Analyst",
//   country:  "IE" | "GB" | "UA" | "US" | ... ,
//   countryName: "Ireland",
//   city: "Dublin" | "",
//   period: "1h" | "24h" | "3d" | "7d" | "30d" | "any",
//   newest: true | false,
//   workType: "any" | "remote" | "hybrid" | "onsite"
// }
//
// supports: which filters the site can apply from the URL.
// verified: URL format checked live in a browser (false = known format, not yet re-checked).

const enc = encodeURIComponent;

function slug(s) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9Ѐ-ӿ]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function locationText(q) {
  return q.city ? `${q.city}, ${q.countryName}` : q.countryName;
}

const PERIOD_SECONDS = { "1h": 3600, "24h": 86400, "3d": 259200, "7d": 604800, "30d": 2592000 };
const PERIOD_DAYS = { "1h": 1, "24h": 1, "3d": 3, "7d": 7, "30d": 30 };

// Pick the smallest allowed value that is >= requested days, so we never hide jobs the user asked for.
// If the site cannot go that far back, return null and skip the filter.
function nearestDays(period, allowed) {
  const d = PERIOD_DAYS[period];
  if (!d) return null;
  return allowed.find((a) => a >= d) ?? null;
}

const INDEED_DOMAINS = {
  IE: "ie.indeed.com", GB: "uk.indeed.com", US: "www.indeed.com", DE: "de.indeed.com",
  PL: "pl.indeed.com", NL: "nl.indeed.com", FR: "fr.indeed.com", ES: "es.indeed.com",
  IT: "it.indeed.com", PT: "pt.indeed.com", CA: "ca.indeed.com", AU: "au.indeed.com",
};

// Glassdoor searches a city only by its internal location ID (the "IC..." part of the URL).
// IDs taken from Glassdoor's own location autocomplete.
const GLASSDOOR_CITIES = {
  IE: { dublin: 2739035, cork: 4325638, galway: 2732982, limerick: 2724553, waterford: 4326205, wexford: 2712304,
        kilkenny: 2709494, athlone: 2725344, sligo: 4323787, drogheda: 2727871, dundalk: 2727578, letterkenny: 2717657,
        ennis: 2713252, tralee: 2738317, carlow: 2704469, naas: 2749126, navan: 2708951, shannon: 4326816 },
  GB: { belfast: 3304415, london: 2671300, manchester: 2691218, birmingham: 3376957, leeds: 3414359, glasgow: 3298888,
        edinburgh: 3312271, bristol: 3280589, liverpool: 3380289, cambridge: 2662516, oxford: 3380454, reading: 2675152,
        newcastle: 3414475, sheffield: 3414736, nottingham: 3527944, cardiff: 3300986 },
  US: { "new-york": 1132348, "san-francisco": 1147401, chicago: 1128808, boston: 1154532, seattle: 1150505,
        austin: 1139761, "los-angeles": 1146821 },
};

// Irish counties, plus common towns mapped to their county.
const IE_TOWN_COUNTY = {
  athlone: "westmeath", mullingar: "westmeath", drogheda: "louth", dundalk: "louth", letterkenny: "donegal",
  ennis: "clare", shannon: "clare", tralee: "kerry", killarney: "kerry", naas: "kildare", newbridge: "kildare",
  maynooth: "kildare", navan: "meath", gorey: "wexford", enniscorthy: "wexford", courtown: "wexford",
  bray: "wicklow", arklow: "wicklow", swords: "dublin", tallaght: "dublin", tullamore: "offaly",
  portlaoise: "laois", castlebar: "mayo", ballina: "mayo", clonmel: "tipperary", nenagh: "tipperary",
  thurles: "tipperary", dungarvan: "waterford", mallow: "cork", cobh: "cork",
};
function ieCounty(city) {
  if (!city) return null;
  const c = slug(city).replace(/^(co|county)-/, "");
  return IE_TOWN_COUNTY[c] || c;
}

// PublicJobs.ie county filter IDs (the "Location" facet on publicjobs.tal.net).
const PUBLICJOBS_COUNTY = {
  dublin: 681904, galway: 681905, limerick: 681911, cork: 675105, waterford: 681960, donegal: 675106,
  kildare: 681907, kerry: 681906, sligo: 681958, offaly: 681918, tipperary: 681959, longford: 681912,
  carlow: 675102, westmeath: 681965, kilkenny: 681908, louth: 681913, meath: 681915, mayo: 681914,
  roscommon: 681938, wicklow: 682295, clare: 675104, leitrim: 681910, monaghan: 681917, wexford: 682294,
  laois: 681909, cavan: 675103,
};

// Ukrainian cities: each site spells them differently (checked live on each site).
//            key            Work.ua path      Robota.ua path     DOU city param
const UA_CITIES = {
  kyiv:             { workua: "kyiv",            robota: "kyiv",            dou: "Київ" },
  lviv:             { workua: "lviv",            robota: "lviv",            dou: "Львів" },
  kharkiv:          { workua: "kharkiv",         robota: "kharkiv",         dou: "Харків" },
  odesa:            { workua: "odesa",           robota: "odessa",          dou: "Одеса" },
  dnipro:           { workua: "dnipro",          robota: "dnipro",          dou: "Дніпро" },
  zaporizhzhia:     { workua: "zaporizhzhya",    robota: "zaporizhia",      dou: "Запоріжжя" },
  vinnytsia:        { workua: "vinnytsya",       robota: "vinnytsia",       dou: "Вінниця" },
  "ivano-frankivsk":{ workua: "ivano-frankivsk", robota: "ivano-frankivsk", dou: "Івано-Франківськ" },
  ternopil:         { workua: "ternopil",        robota: "ternopil",        dou: "Тернопіль" },
  uzhhorod:         { workua: "uzhhorod",        robota: "uzhhorod",        dou: "Ужгород" },
  chernivtsi:       { workua: "chernivtsi_cv",   robota: "chernivtsi",      dou: "Чернівці" },
  poltava:          { workua: "poltava",         robota: "poltava",         dou: "Полтава" },
  rivne:            { workua: "rivne",           robota: "rivne",           dou: "Рівне" },
  lutsk:            { workua: "lutsk",           robota: "lutsk",           dou: "Луцьк" },
  khmelnytskyi:     { workua: "khmelnytskyi",    robota: "khmelnytskyi",    dou: "Хмельницький" },
  cherkasy:         { workua: "cherkasy",        robota: "cherkasy",        dou: "Черкаси" },
  zhytomyr:         { workua: "zhytomyr",        robota: "zhitomir",        dou: "Житомир" },
  mykolaiv:         { workua: "mykolaiv_nk",     robota: "mykolaiv",        dou: "Миколаїв" },
};
// Other spellings people type (Russian-style, Ukrainian Cyrillic) -> key above.
const UA_CITY_ALIASES = {
  kiev: "kyiv", lvov: "lviv", kharkov: "kharkiv", odessa: "odesa", dnepr: "dnipro", dnipropetrovsk: "dnipro",
  zaporizhia: "zaporizhzhia", zaporozhye: "zaporizhzhia", zaporizhzhya: "zaporizhzhia", vinnitsa: "vinnytsia",
  vinnytsya: "vinnytsia", uzhgorod: "uzhhorod", chernovtsy: "chernivtsi", zhitomir: "zhytomyr", nikolaev: "mykolaiv",
  khmelnitsky: "khmelnytskyi", khmelnytskyy: "khmelnytskyi", cherkassy: "cherkasy",
};
for (const [k, v] of Object.entries(UA_CITIES)) UA_CITY_ALIASES[slug(v.dou)] = k;
function uaCity(city) {
  if (!city) return null;
  const c = slug(city);
  return UA_CITIES[c] || UA_CITIES[UA_CITY_ALIASES[c]] || null;
}

const SITES = [
  // ---------- Global ----------
  {
    id: "linkedin",
    name: "LinkedIn",
    countries: "*",
    supports: { period: true, newest: false, workType: false },
    verified: true,
    // Nov 2026: LinkedIn's classic search still applies the date filter from a link,
    // but now ignores sorting (sortBy) and work type (f_WT). Both are still sent,
    // in case LinkedIn brings them back.
    note: "Opens the classic search with the date filter, instead of the new AI search. LinkedIn no longer sorts by most recent or filters by work type.",
    build(q) {
      const p = new URLSearchParams();
      p.set("keywords", q.keywords);
      p.set("location", locationText(q));
      if (PERIOD_SECONDS[q.period]) p.set("f_TPR", "r" + PERIOD_SECONDS[q.period]);
      if (q.newest) p.set("sortBy", "DD");
      const wt = { onsite: "1", remote: "2", hybrid: "3" }[q.workType];
      if (wt) p.set("f_WT", wt);
      p.set("skipRedirect", "true");
      p.set("origin", "JOB_SEARCH_PAGE_JOB_FILTER");
      return "https://www.linkedin.com/jobs/search/?" + p.toString();
    },
  },
  {
    id: "indeed",
    name: "Indeed",
    countries: Object.keys(INDEED_DOMAINS),
    supports: { period: true, newest: true, workType: false },
    verified: false,
    build(q) {
      const host = INDEED_DOMAINS[q.country] || "www.indeed.com";
      const p = new URLSearchParams();
      p.set("q", q.keywords);
      p.set("l", q.city || q.countryName);
      const days = nearestDays(q.period, [1, 3, 7, 14]);
      if (days) p.set("fromage", String(days));
      if (q.newest) p.set("sort", "date");
      return `https://${host}/jobs?` + p.toString();
    },
  },
  {
    id: "glassdoor",
    name: "Glassdoor",
    countries: ["IE", "GB", "US"],
    supports: { period: true, newest: true, workType: false },
    supportsCity: (q) => !q.city || !!(GLASSDOOR_CITIES[q.country] || {})[slug(q.city)],
    verified: true,
    note: "Main cities are supported. Other cities fall back to the whole country.",
    build(q) {
      // Glassdoor keeps sort and date filters only on its SEO-style URL, where the
      // positions of the location and keyword text are encoded in the path.
      const host = { IE: "www.glassdoor.ie", GB: "www.glassdoor.co.uk", US: "www.glassdoor.com" }[q.country];
      const cityId = q.city ? (GLASSDOOR_CITIES[q.country] || {})[slug(q.city)] : null;
      const loc = cityId ? slug(q.city) : slug(q.countryName);
      const kw = slug(q.keywords);
      const k0 = loc.length + 1;
      const ic = cityId ? `_IC${cityId}` : "";
      const path = `${loc}-${kw}-jobs-SRCH_IL.0,${loc.length}${ic}_KO${k0},${k0 + kw.length}.htm`;
      const p = new URLSearchParams();
      if (q.newest) p.set("sortBy", "date_desc");
      const days = nearestDays(q.period, [1, 3, 7, 14, 30]);
      if (days) p.set("fromAge", String(days));
      const qs = p.toString();
      return `https://${host}/Job/${path}` + (qs ? `?${qs}` : "");
    },
  },

  // ---------- Ireland ----------
  {
    id: "irishjobs",
    name: "IrishJobs.ie",
    countries: ["IE"],
    supports: { period: true, newest: true, workType: false },
    verified: true,
    build(q) {
      let url = `https://www.irishjobs.ie/jobs/${slug(q.keywords)}`;
      if (q.city) url += `/in-${slug(q.city)}`;
      const p = new URLSearchParams();
      const days = nearestDays(q.period, [1, 3, 7, 14]);
      if (days) p.set("postedWithin", String(days));
      if (q.newest) p.set("sort", "2");
      const qs = p.toString();
      return qs ? `${url}?${qs}` : url;
    },
  },
  {
    id: "jobsie",
    name: "Jobs.ie",
    countries: ["IE"],
    supports: { period: true, newest: true, workType: false },
    verified: true,
    build(q) {
      let url = `https://www.jobs.ie/jobs/${slug(q.keywords)}`;
      if (q.city) url += `/in-${slug(q.city)}`;
      const p = new URLSearchParams();
      const days = nearestDays(q.period, [1, 3, 7, 14]);
      if (days) p.set("postedWithin", String(days));
      if (q.newest) p.set("sort", "2");
      const qs = p.toString();
      return qs ? `${url}?${qs}` : url;
    },
  },

  {
    id: "jobsireland",
    name: "JobsIreland.ie (gov)",
    countries: ["IE"],
    supports: { period: true, newest: false, workType: false },
    verified: true,
    note: "Government job portal (Department of Social Protection).",
    build(q) {
      const p = new URLSearchParams();
      p.set("what", q.keywords);
      if (q.city) p.set("where", q.city);
      const map = { "1h": "TODAY", "24h": "TODAY", "3d": "3DAYSAGO", "7d": "THIS_WEEK" };
      if (map[q.period]) p.set("RECENCY", map[q.period]);
      return "https://jobsireland.ie/search-jobs/description?" + p.toString().replace(/\+/g, "%20");
    },
  },
  {
    id: "recruitireland",
    name: "Recruit Ireland",
    countries: ["IE"],
    supports: { period: false, newest: false, workType: false },
    verified: true,
    build(q) {
      const p = new URLSearchParams();
      p.set("query", q.keywords);
      if (q.city) p.set("location", q.city);
      return "https://www.recruitireland.com/search/jobs?" + p.toString();
    },
  },
  {
    id: "publicjobs",
    name: "PublicJobs.ie",
    countries: ["IE"],
    supports: { period: false, newest: false, workType: false },
    supportsCity: (q) => !q.city || !!PUBLICJOBS_COUNTY[ieCounty(q.city)],
    verified: true,
    note: "Public sector jobs. The city is matched to its county. Try broader words like 'analyst'.",
    build(q) {
      const p = new URLSearchParams();
      p.set("ftq", q.keywords);
      const county = PUBLICJOBS_COUNTY[ieCounty(q.city)];
      if (county) p.set("f_Item_Opportunity_217740_lk", String(county));
      return "https://publicjobs.tal.net/vx/lang-en-GB/mobile-0/appcentre-ext/brand-4/candidate/jobboard/vacancy/3/adv?" + p.toString().replace(/\+/g, "%20");
    },
  },
  {
    id: "careerjet",
    name: "Careerjet.ie",
    countries: ["IE"],
    supports: { period: true, newest: true, workType: false },
    verified: true,
    note: "Aggregator of many Irish sites.",
    build(q) {
      const p = new URLSearchParams();
      p.set("s", q.keywords);
      p.set("l", q.city || "Ireland");
      if (q.newest) p.set("sort", "date");
      const days = nearestDays(q.period, [1, 7, 30]);
      if (days) p.set("nw", String(days));
      return "https://www.careerjet.ie/jobs?" + p.toString();
    },
  },

  // ---------- United Kingdom ----------
  {
    id: "reed",
    name: "Reed",
    countries: ["GB"],
    supports: { period: true, newest: false, workType: false },
    verified: true,
    note: "Reed has no 'newest first' sorting in links.",
    build(q) {
      let url = `https://www.reed.co.uk/jobs/${slug(q.keywords)}-jobs`;
      if (q.city) url += `-in-${slug(q.city)}`;
      const p = new URLSearchParams();
      const map = { "1h": "today", "24h": "today", "3d": "lastthreedays", "7d": "lastweek" }; // max is two weeks, so "30d" = no filter
      if (map[q.period]) p.set("dateCreatedOffSet", map[q.period]);
      const qs = p.toString();
      return qs ? `${url}?${qs}` : url;
    },
  },
  {
    id: "totaljobs",
    name: "Totaljobs",
    countries: ["GB"],
    supports: { period: false, newest: true, workType: false },
    verified: true,
    note: "Newest first by default. Totaljobs' own date filter currently breaks the page (ERR_HTTP2_PROTOCOL_ERROR), so it is not used.",
    build(q) {
      // postedWithin=age_N is the site's own format, but any request with it is reset by the server
      // (checked Nov 2026, even when clicking the filter on totaljobs.com). Re-enable when that is fixed:
      // const days = nearestDays(q.period, [1, 7, 30]); url += `?postedWithin=age_${days}`
      let url = `https://www.totaljobs.com/jobs/${slug(q.keywords)}`;
      if (q.city) url += `/in-${slug(q.city)}`;
      return url;
    },
  },
  {
    id: "cvlibrary",
    name: "CV-Library",
    countries: ["GB"],
    supports: { period: true, newest: true, workType: false },
    verified: true,
    build(q) {
      let url = `https://www.cv-library.co.uk/${slug(q.keywords)}-jobs`;
      if (q.city) url += `-in-${slug(q.city)}`;
      const p = new URLSearchParams();
      const days = nearestDays(q.period, [1, 2, 3, 7, 15, 30]);
      if (days) p.set("posted", String(days));
      if (q.newest) p.set("order", "-posted");
      const qs = p.toString();
      return qs ? `${url}?${qs}` : url;
    },
  },

  // ---------- Ukraine ----------
  {
    id: "workua",
    name: "Work.ua",
    countries: ["UA"],
    supports: { period: true, newest: true, workType: false },
    supportsCity: (q) => !q.city || !!uaCity(q.city),
    verified: true,
    note: "Newest first by default. Main cities are supported, other cities search all of Ukraine.",
    build(q) {
      const kw = q.keywords.trim().toLowerCase().replace(/\s+/g, "+");
      // An unknown city slug would be glued onto the keywords by Work.ua, so only known cities are used.
      const c = uaCity(q.city);
      const city = c ? c.workua + "-" : "";
      let url = `https://www.work.ua/jobs-${city}${encodeURIComponent(kw).replace(/%2B/g, "+")}/`;
      // Work.ua period codes: 122 = 1 day, 123 = 7 days, 124 = 14 days, 125 = 30 days
      const days = nearestDays(q.period, [1, 7, 14, 30]);
      const code = { 1: 122, 7: 123, 14: 124, 30: 125 }[days];
      if (code) url += `?days=${code}`;
      return url;
    },
  },
  {
    id: "robotaua",
    name: "Robota.ua",
    countries: ["UA"],
    supports: { period: false, newest: true, workType: true },
    supportsWorkType: (q) => q.workType === "any" || q.workType === "remote",
    supportsCity: (q) => !q.city || q.workType === "remote" || !!uaCity(q.city),
    verified: true,
    note: "Newest first ('Нові') by default. Remote searches all of Ukraine.",
    build(q) {
      if (q.workType === "remote") return `https://robota.ua/zapros/${slug(q.keywords)}/ukraine/params;scheduleIds=3`;
      const c = uaCity(q.city);
      return `https://robota.ua/zapros/${slug(q.keywords)}/${c ? c.robota : "ukraine"}`;
    },
  },
  {
    id: "djinni",
    name: "Djinni (IT)",
    countries: ["UA"],
    supports: { period: false, newest: true, workType: true },
    supportsWorkType: (q) => q.workType !== "hybrid",
    supportsCity: (q) => !q.city,
    verified: true,
    note: "IT jobs only. Searches job titles, newest first by default.",
    build(q) {
      const p = new URLSearchParams();
      p.set("all_keywords", q.keywords);
      p.set("search_type", "title-only");
      if (q.workType === "remote") p.set("employment", "remote");
      if (q.workType === "onsite") p.set("employment", "office");
      return "https://djinni.co/jobs/?" + p.toString();
    },
  },
  {
    id: "dou",
    name: "DOU (IT)",
    countries: ["UA"],
    supports: { period: false, newest: true, workType: true },
    supportsWorkType: (q) => q.workType === "any" || q.workType === "remote",
    supportsCity: (q) => !q.city || q.workType === "remote" || !!uaCity(q.city),
    verified: true,
    note: "IT jobs only. Newest first by default.",
    build(q) {
      let url = "https://jobs.dou.ua/vacancies/?search=" + encodeURIComponent(q.keywords).replace(/%20/g, "+");
      if (q.workType === "remote") return url + "&remote";
      const c = uaCity(q.city);
      if (c) url += "&city=" + encodeURIComponent(c.dou);
      return url;
    },
  },
];

const COUNTRIES = [
  { code: "IE", name: "Ireland" },
  { code: "GB", name: "United Kingdom" },
  { code: "UA", name: "Ukraine" },
  { code: "US", name: "United States" },
  { code: "DE", name: "Germany" },
  { code: "PL", name: "Poland" },
  { code: "NL", name: "Netherlands" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "PT", name: "Portugal" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
];

// Common job titles across all sectors, for the keywords suggestions
// (recent searches are shown first, then this list in alphabetical order).
const JOB_TITLES = [
  ".NET Developer",
  "Account Executive",
  "Account Manager",
  "Accountant",
  "Accounts Payable",
  "Accounts Receivable",
  "Administrative Assistant",
  "Administrator",
  "AI Engineer",
  "AML Analyst",
  "Analytics Engineer",
  "Android Developer",
  "Apprenticeship",
  "Architect",
  "Area Manager",
  "Assistant Accountant",
  "Assistant Manager",
  "Auditor",
  "Automation Engineer",
  "Backend Developer",
  "Bank Teller",
  "Barista",
  "Barrister",
  "Bartender",
  "Beautician",
  "BI Analyst",
  "Bookkeeper",
  "Branch Manager",
  "Brand Manager",
  "Business Analyst",
  "Business Development Manager",
  "Business Development Representative",
  "Business Intelligence Developer",
  "Buyer",
  "CAD Technician",
  "Call Centre Agent",
  "Care Assistant",
  "Carer",
  "Carpenter",
  "Cashier",
  "Chef",
  "Chemical Engineer",
  "Childcare Worker",
  "Civil Engineer",
  "Civil Servant",
  "Cleaner",
  "Clerical Officer",
  "Cloud Engineer",
  "Commis Chef",
  "Communications Officer",
  "Compliance Officer",
  "Construction Manager",
  "Contact Centre",
  "Content Writer",
  "Cook",
  "Copywriter",
  "Courier",
  "Credit Controller",
  "Customer Service Advisor",
  "Customer Service Representative",
  "Customer Success Manager",
  "Customer Support",
  "Cyber Security Analyst",
  "Data Analyst",
  "Data Engineer",
  "Data Entry",
  "Data Scientist",
  "Database Administrator",
  "Delivery Driver",
  "Dental Nurse",
  "Dentist",
  "DevOps Engineer",
  "Digital Marketing Executive",
  "Dispatcher",
  "Doctor",
  "Early Years Educator",
  "Electrical Engineer",
  "Electrician",
  "Estate Agent",
  "Event Coordinator",
  "Executive Assistant",
  "Executive Officer",
  "Facilities Manager",
  "Farm Worker",
  "Field Sales",
  "Field Service Engineer",
  "Finance Manager",
  "Financial Accountant",
  "Financial Analyst",
  "Financial Controller",
  "Firefighter",
  "Fitness Instructor",
  "Fleet Manager",
  "Forklift Driver",
  "Front Desk",
  "Frontend Developer",
  "Full Stack Developer",
  "Fund Accountant",
  "Fund Administrator",
  "Garda",
  "Gardener",
  "General Manager",
  "GP",
  "Graduate",
  "Graduate Programme",
  "Graphic Designer",
  "Hairdresser",
  "Health and Safety Officer",
  "Healthcare Assistant",
  "Help Desk",
  "HGV Driver",
  "Hotel Manager",
  "Housekeeping",
  "HR Administrator",
  "HR Advisor",
  "HR Generalist",
  "HR Manager",
  "HVAC Technician",
  "Insights Analyst",
  "Insurance Claims Handler",
  "Internship",
  "Interpreter",
  "Inventory Controller",
  "Investment Analyst",
  "iOS Developer",
  "IT Manager",
  "IT Support",
  "Java Developer",
  "JavaScript Developer",
  "Key Account Manager",
  "Kitchen Porter",
  "Labourer",
  "Landscaper",
  "Learning and Development",
  "Lecturer",
  "Legal Assistant",
  "Legal Secretary",
  "Logistics Coordinator",
  "Logistics Manager",
  "Machine Learning Engineer",
  "Machine Operator",
  "Maintenance Technician",
  "Management Accountant",
  "Manufacturing Technician",
  "Marketing Analyst",
  "Marketing Assistant",
  "Marketing Executive",
  "Marketing Manager",
  "Mechanic",
  "Mechanical Engineer",
  "Medical Scientist",
  "Medical Secretary",
  "Merchandiser",
  "Mobile Developer",
  "Mortgage Advisor",
  "Network Engineer",
  "Nurse",
  "Occupational Therapist",
  "Office Administrator",
  "Office Manager",
  "Operations Manager",
  "Painter",
  "Paralegal",
  "Paramedic",
  "Part Time",
  "Payroll Administrator",
  "Payroll Specialist",
  "Personal Assistant",
  "Personal Trainer",
  "Pharmacist",
  "Pharmacy Technician",
  "Photographer",
  "PHP Developer",
  "Physiotherapist",
  "Picker Packer",
  "Plant Manager",
  "Plumber",
  "Policy Officer",
  "Power BI Developer",
  "PPC Specialist",
  "PR Executive",
  "Primary Teacher",
  "Process Engineer",
  "Procurement Specialist",
  "Product Analyst",
  "Product Designer",
  "Product Manager",
  "Production Manager",
  "Production Operative",
  "Program Manager",
  "Project Engineer",
  "Project Manager",
  "Property Manager",
  "Psychologist",
  "Purchasing Manager",
  "Python Developer",
  "QA Engineer",
  "Quality Engineer",
  "Quality Inspector",
  "Quantity Surveyor",
  "Radiographer",
  "Real Estate Agent",
  "Receptionist",
  "Recruiter",
  "Recruitment Consultant",
  "Regional Manager",
  "Remote",
  "Reporting Analyst",
  "Researcher",
  "Restaurant Manager",
  "Retail Assistant",
  "Risk Analyst",
  "Room Attendant",
  "Sales Assistant",
  "Sales Executive",
  "Sales Manager",
  "Sales Representative",
  "Scrum Master",
  "Secondary Teacher",
  "Secretary",
  "Security Engineer",
  "Security Officer",
  "SEO Specialist",
  "Shift Manager",
  "Shop Assistant",
  "Site Engineer",
  "Site Manager",
  "Site Reliability Engineer",
  "Social Care Worker",
  "Social Media Manager",
  "Social Worker",
  "Software Developer",
  "Software Engineer",
  "Solicitor",
  "Solutions Architect",
  "Sous Chef",
  "Special Needs Assistant",
  "Speech and Language Therapist",
  "SQL Developer",
  "Staff Nurse",
  "Store Associate",
  "Store Manager",
  "Structural Engineer",
  "Supervisor",
  "Supply Chain Analyst",
  "Supply Chain Manager",
  "Support Worker",
  "Systems Administrator",
  "Talent Acquisition",
  "Tax Accountant",
  "Teacher",
  "Teaching Assistant",
  "Team Leader",
  "Technical Support Engineer",
  "Telesales",
  "Temporary",
  "Test Analyst",
  "Trainer",
  "Translator",
  "Transport Manager",
  "Tutor",
  "UI Designer",
  "Underwriter",
  "UX Designer",
  "Validation Engineer",
  "Van Driver",
  "Veterinary Nurse",
  "Video Editor",
  "Visual Merchandiser",
  "Volunteer",
  "Waiter",
  "Waitress",
  "Warehouse Manager",
  "Warehouse Operative",
  "Welder",
];

// City suggestions for the City field, per country.
const CITY_SUGGESTIONS = {
  IE: ["Dublin", "Cork", "Galway", "Limerick", "Waterford", "Kilkenny", "Wexford", "Sligo", "Athlone", "Drogheda",
       "Dundalk", "Letterkenny", "Ennis", "Shannon", "Tralee", "Killarney", "Carlow", "Naas", "Newbridge", "Maynooth",
       "Navan", "Mullingar", "Gorey", "Enniscorthy", "Courtown", "Bray", "Arklow", "Swords", "Tallaght", "Tullamore",
       "Portlaoise", "Castlebar", "Ballina", "Clonmel", "Nenagh", "Thurles", "Dungarvan", "Mallow", "Cobh",
       "Kildare", "Meath", "Wicklow", "Louth", "Mayo", "Kerry", "Clare", "Donegal", "Tipperary", "Offaly", "Laois",
       "Westmeath", "Longford", "Roscommon", "Leitrim", "Cavan", "Monaghan"],
  GB: ["London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Edinburgh", "Bristol", "Liverpool", "Cambridge",
       "Oxford", "Reading", "Newcastle", "Sheffield", "Nottingham", "Cardiff", "Belfast", "Leicester", "Southampton",
       "Brighton", "Milton Keynes", "Aberdeen"],
  UA: ["Kyiv", "Lviv", "Kharkiv", "Odesa", "Dnipro", "Zaporizhzhia", "Vinnytsia", "Ivano-Frankivsk", "Ternopil",
       "Uzhhorod", "Chernivtsi", "Poltava", "Rivne", "Lutsk", "Khmelnytskyi", "Cherkasy", "Zhytomyr", "Mykolaiv"],
  US: ["New York", "San Francisco", "Los Angeles", "Chicago", "Boston", "Seattle", "Austin", "Washington",
       "Atlanta", "Denver", "Dallas", "Houston", "Miami"],
  DE: ["Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne", "Stuttgart", "Düsseldorf"],
  PL: ["Warsaw", "Krakow", "Wroclaw", "Gdansk", "Poznan", "Lodz", "Katowice"],
  NL: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven"],
  FR: ["Paris", "Lyon", "Marseille", "Toulouse", "Lille", "Nice"],
  ES: ["Madrid", "Barcelona", "Valencia", "Seville", "Malaga"],
  IT: ["Milan", "Rome", "Turin", "Bologna", "Florence"],
  PT: ["Lisbon", "Porto", "Braga"],
  CA: ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"],
  AU: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"],
};

function sitesForCountry(code) {
  return SITES.filter((s) => s.countries === "*" || s.countries.includes(code));
}

// Allow use from Node (tests) and from the browser.
if (typeof module !== "undefined") module.exports = { SITES, COUNTRIES, CITY_SUGGESTIONS, JOB_TITLES, sitesForCountry, slug };
