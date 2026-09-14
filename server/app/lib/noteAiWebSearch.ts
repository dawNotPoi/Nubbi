import env from "@/lib/env";

export type NoteAiWebSource = {
  type: "web";
  title: string;
  url: string;
  snippet: string;
};

type RawSearchResult = {
  title?: unknown;
  url?: unknown;
  link?: unknown;
  href?: unknown;
  snippet?: unknown;
  description?: unknown;
  content?: unknown;
};

const SEARCH_RESULT_LIMIT = 5;

const normalizeProvider = () =>
  (env.WEB_SEARCH_PROVIDER || "").trim().toLowerCase();

const normalizeResults = (results: RawSearchResult[]): NoteAiWebSource[] => {
  const seen = new Set<string>();
  const normalized: NoteAiWebSource[] = [];

  for (const item of results) {
    const url =
      typeof item.url === "string"
        ? item.url
        : typeof item.link === "string"
          ? item.link
          : typeof item.href === "string"
            ? item.href
            : "";
    const trimmedUrl = url.trim();

    if (!trimmedUrl || seen.has(trimmedUrl)) continue;
    seen.add(trimmedUrl);

    const title =
      typeof item.title === "string" && item.title.trim()
        ? item.title.trim()
        : trimmedUrl;
    const snippet =
      typeof item.snippet === "string"
        ? item.snippet
        : typeof item.description === "string"
          ? item.description
          : typeof item.content === "string"
            ? item.content
            : "";

    normalized.push({
      type: "web",
      title,
      url: trimmedUrl,
      snippet: snippet.replace(/\s+/g, " ").trim().slice(0, 360),
    });

    if (normalized.length >= SEARCH_RESULT_LIMIT) break;
  }

  return normalized;
};

const ensureSearchConfigured = () => {
  const provider = normalizeProvider();

  if (!provider) {
    throw Object.assign(new Error("Web search provider is not configured"), {
      status: 400,
    });
  }

  if (provider !== "searxng" && !env.WEB_SEARCH_API_KEY?.trim()) {
    throw Object.assign(new Error("Web search API key is not configured"), {
      status: 400,
    });
  }

  if (provider === "searxng" && !env.WEB_SEARCH_BASE_URL?.trim()) {
    throw Object.assign(new Error("SearXNG base URL is not configured"), {
      status: 400,
    });
  }

  return provider;
};

const ensureOk = async (response: Response) => {
  if (response.ok) return;

  const text = await response.text();
  throw new Error(text || `Web search request failed with ${response.status}`);
};

const searchWithTavily = async (query: string) => {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: env.WEB_SEARCH_API_KEY,
      query,
      max_results: SEARCH_RESULT_LIMIT,
      search_depth: "basic",
      include_answer: false,
      include_raw_content: false,
    }),
  });

  await ensureOk(response);
  const payload = await response.json();
  return normalizeResults(Array.isArray(payload?.results) ? payload.results : []);
};

const searchWithBrave = async (query: string) => {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(SEARCH_RESULT_LIMIT));

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": env.WEB_SEARCH_API_KEY || "",
    },
  });

  await ensureOk(response);
  const payload = await response.json();
  return normalizeResults(
    Array.isArray(payload?.web?.results) ? payload.web.results : [],
  );
};

const searchWithSerpApi = async (query: string) => {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", env.WEB_SEARCH_API_KEY || "");
  url.searchParams.set("num", String(SEARCH_RESULT_LIMIT));

  const response = await fetch(url);
  await ensureOk(response);
  const payload = await response.json();
  return normalizeResults(
    Array.isArray(payload?.organic_results) ? payload.organic_results : [],
  );
};

const searchWithSearxng = async (query: string) => {
  const url = new URL(env.WEB_SEARCH_BASE_URL || "");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("language", "auto");

  const response = await fetch(url);
  await ensureOk(response);
  const payload = await response.json();
  return normalizeResults(Array.isArray(payload?.results) ? payload.results : []);
};

export const searchWeb = async (query: string): Promise<NoteAiWebSource[]> => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const provider = ensureSearchConfigured();

  switch (provider) {
    case "tavily":
      return searchWithTavily(trimmedQuery);
    case "brave":
      return searchWithBrave(trimmedQuery);
    case "serpapi":
      return searchWithSerpApi(trimmedQuery);
    case "searxng":
      return searchWithSearxng(trimmedQuery);
    default:
      throw Object.assign(new Error(`Unsupported web search provider: ${provider}`), {
        status: 400,
      });
  }
};
