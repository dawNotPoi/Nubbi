import post from "@/models/post";

export type NoteAiSource = {
  type: "note";
  postId: string;
  title: string;
  snippet: string;
};

type PostCandidate = {
  _id: unknown;
  title?: string;
  content?: string;
  meta?: Record<string, unknown>;
  updatedAt?: string | Date;
};

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .split(/[\s,.;:!?，。；：！？/\\()[\]{}"'`|+-]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 1);

const countTerm = (value: string, term: string) => {
  if (!value) return 0;

  let count = 0;
  let startIndex = 0;

  while (startIndex < value.length) {
    const index = value.indexOf(term, startIndex);
    if (index === -1) break;
    count += 1;
    startIndex = index + term.length;
  }

  return count;
};

const buildSnippet = (content: string, terms: string[]) => {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const firstMatchedIndex = terms.reduce((currentMin, term) => {
    const index = normalized.toLowerCase().indexOf(term);
    if (index === -1) return currentMin;
    if (currentMin === -1) return index;
    return Math.min(currentMin, index);
  }, -1);

  if (firstMatchedIndex === -1) {
    return normalized.slice(0, 220);
  }

  const start = Math.max(0, firstMatchedIndex - 60);
  const end = Math.min(normalized.length, firstMatchedIndex + 180);
  return normalized.slice(start, end);
};

const scorePost = (candidate: PostCandidate, query: string, terms: string[]) => {
  const title = String(candidate.title || "");
  const content = String(candidate.content || "");
  const meta = candidate.meta || {};
  const tags = Array.isArray(meta.tags) ? meta.tags.join(" ") : "";
  const type = String(meta.type || "");
  const status = String(meta.status || "");

  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();
  const tagsLower = tags.toLowerCase();
  const typeLower = type.toLowerCase();
  const statusLower = status.toLowerCase();

  let score = 0;

  if (query && titleLower.includes(query)) score += 30;
  if (query && contentLower.includes(query)) score += 12;

  for (const term of terms) {
    score += countTerm(titleLower, term) * 10;
    score += Math.min(3, countTerm(contentLower, term)) * 3;
    score += countTerm(tagsLower, term) * 5;
    score += countTerm(typeLower, term) * 3;
    score += countTerm(statusLower, term) * 2;
  }

  return score;
};

export const findRelevantNotes = async (
  userId: string,
  query: string,
): Promise<NoteAiSource[]> => {
  const trimmedQuery = query.trim().toLowerCase();
  const terms = tokenize(trimmedQuery);

  if (!trimmedQuery) return [];

  const posts = (await post
    .find({ userId })
    .select("title content meta updatedAt")
    .lean()) as PostCandidate[];

  const ranked = posts
    .map((candidate) => ({
      candidate,
      score: scorePost(candidate, trimmedQuery, terms),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;

      const leftTime = new Date(left.candidate.updatedAt || 0).getTime();
      const rightTime = new Date(right.candidate.updatedAt || 0).getTime();
      return rightTime - leftTime;
    })
    .slice(0, 5);

  return ranked.map(({ candidate }) => ({
    type: "note",
    postId: String(candidate._id),
    title: String(candidate.title || "Untitled Note"),
    snippet: buildSnippet(String(candidate.content || ""), terms),
  }));
};
