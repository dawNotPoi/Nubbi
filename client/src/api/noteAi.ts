import request, { Get, authorizedFetch } from "./request";

type ApiResponse<T> = {
  code: 0 | 1;
  data: T;
  message: string;
};

export type NoteAiProvider =
  | "openai"
  | "openai-compatible"
  | "anthropic"
  | "gemini";

export type NoteAiConfig = {
  provider: NoteAiProvider;
  baseURL: string;
  model: string;
  enableWeb: boolean;
  enableKnowledgeBase: boolean;
  hasApiKey: boolean;
};

export type NoteAiModel = {
  id: string;
  name: string;
  ownedBy?: string;
};

export type NoteAiSession = {
  _id: string;
  userId: string;
  title: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
};

export type NoteAiSource = {
  postId: string;
  title: string;
  snippet: string;
};

export type NoteAiMessage = {
  _id: string;
  sessionId: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  sources: NoteAiSource[];
  status: "completed" | "streaming" | "failed";
  createdAt: string;
  updatedAt: string;
};

export type SaveNoteAiConfigInput = {
  provider: NoteAiProvider;
  baseURL: string;
  model: string;
  apiKey?: string;
  enableWeb: boolean;
  enableKnowledgeBase: boolean;
};

export type FetchNoteAiModelsInput = {
  provider: NoteAiProvider;
  baseURL: string;
  apiKey?: string;
};

export type StreamNoteAiChatInput = {
  sessionId?: string;
  message: string;
  enableWeb?: boolean;
  enableKnowledgeBase?: boolean;
};

type StreamHandlers = {
  onSession?: (payload: { sessionId: string; title: string }) => void;
  onSources?: (payload: {
    messageId: string;
    sources: NoteAiSource[];
    webAccessRequested: boolean;
  }) => void;
  onDelta?: (payload: { delta: string }) => void;
  onDone?: (payload: {
    message: NoteAiMessage;
    sources: NoteAiSource[];
    webAccessRequested: boolean;
  }) => void;
  onError?: (payload: { message: string }) => void;
};

export async function getNoteAiConfig() {
  const response = await Get<NoteAiConfig>("note-ai/config");
  return response.data;
}

export async function saveNoteAiConfig(input: SaveNoteAiConfigInput) {
  const response = await request<NoteAiConfig>("note-ai/config", input, "put");
  return response.data;
}

export async function fetchNoteAiModels(input: FetchNoteAiModelsInput) {
  const response = await request<NoteAiModel[]>("note-ai/models", input);
  return response.data;
}

export async function getNoteAiSessions() {
  const response = await Get<NoteAiSession[]>("note-ai/sessions");
  return response.data;
}

export async function createNoteAiSession() {
  const response = await request<NoteAiSession>("note-ai/sessions");
  return response.data;
}

export async function deleteNoteAiSession(sessionId: string) {
  const response = await authorizedFetch(`/note-ai/sessions/${sessionId}`, {
    method: "DELETE",
  });
  return (await response.json()) as ApiResponse<null>;
}

export async function getNoteAiMessages(sessionId: string) {
  const response = await Get<NoteAiMessage[]>(
    `note-ai/sessions/${sessionId}/messages`,
  );
  return response.data;
}

const processSseEvent = (rawEvent: string, handlers: StreamHandlers) => {
  const lines = rawEvent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return;

  let eventName = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (dataLines.length === 0) return;

  const payload = JSON.parse(dataLines.join("\n"));

  switch (eventName) {
    case "session":
      handlers.onSession?.(payload);
      return;
    case "sources":
      handlers.onSources?.(payload);
      return;
    case "delta":
      handlers.onDelta?.(payload);
      return;
    case "done":
      handlers.onDone?.(payload);
      return;
    case "error":
      handlers.onError?.(payload);
      return;
    default:
      return;
  }
};

export async function streamNoteAiChat(
  input: StreamNoteAiChatInput,
  handlers: StreamHandlers,
  signal?: AbortSignal,
) {
  const response = await authorizedFetch("/note-ai/chat/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
    signal,
  });

  if (!response.ok) {
    let nextMessage = "Failed to start AI stream";

    try {
      const payload = (await response.json()) as ApiResponse<null>;
      nextMessage = payload.message || nextMessage;
    } catch {
      const text = await response.text();
      if (text) nextMessage = text;
    }

    throw new Error(nextMessage);
  }

  if (!response.body) {
    throw new Error("Streaming response body is empty");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

      while (buffer.includes("\n\n")) {
        const separatorIndex = buffer.indexOf("\n\n");
        const rawEvent = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        processSseEvent(rawEvent, handlers);
      }
    }

    const tail = decoder.decode();
    if (tail) {
      buffer += tail.replace(/\r\n/g, "\n");
    }

    if (buffer.trim()) {
      processSseEvent(buffer, handlers);
    }
  } finally {
    reader.releaseLock();
  }
}
