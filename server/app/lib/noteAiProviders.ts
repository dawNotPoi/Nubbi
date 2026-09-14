export type NoteAiProvider =
  | "openai"
  | "openai-compatible"
  | "anthropic"
  | "gemini";

export type NoteAiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type NoteAiStreamParams = {
  provider: NoteAiProvider;
  baseURL?: string;
  model: string;
  apiKey: string;
  messages: NoteAiChatMessage[];
  signal?: AbortSignal;
  onDelta: (delta: string) => void;
};

export type NoteAiModel = {
  id: string;
  name: string;
  ownedBy?: string;
};

export type NoteAiListModelsParams = {
  provider: NoteAiProvider;
  baseURL?: string;
  apiKey: string;
};

const OPENAI_BASE_URL = "https://api.openai.com/v1";
const ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";
const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

const getBaseURL = (provider: NoteAiProvider, customBaseURL?: string) => {
  if (customBaseURL?.trim()) return customBaseURL.trim().replace(/\/$/, "");

  switch (provider) {
    case "openai":
      return OPENAI_BASE_URL;
    case "anthropic":
      return ANTHROPIC_BASE_URL;
    case "gemini":
      return GEMINI_BASE_URL;
    default:
      return OPENAI_BASE_URL;
  }
};

const readStream = async (
  stream: ReadableStream<Uint8Array>,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
) => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      if (signal?.aborted) {
        throw new Error("Stream aborted");
      }

      const { done, value } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value, { stream: true }));
    }

    const lastChunk = decoder.decode();
    if (lastChunk) onChunk(lastChunk);
  } finally {
    reader.releaseLock();
  }
};

const parseSseStream = async (
  response: Response,
  onEvent: (event: { event: string; data: string }) => void,
  signal?: AbortSignal,
) => {
  if (!response.body) {
    throw new Error("Provider response body is empty");
  }

  let buffer = "";

  const processRawEvent = (rawEvent: string) => {
    const lines = rawEvent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

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
    onEvent({ event: eventName, data: dataLines.join("\n") });
  };

  await readStream(
    response.body,
    (chunk) => {
      buffer += chunk.replace(/\r\n/g, "\n");

      while (buffer.includes("\n\n")) {
        const separatorIndex = buffer.indexOf("\n\n");
        const rawEvent = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        processRawEvent(rawEvent);
      }
    },
    signal,
  );

  if (buffer.trim()) {
    processRawEvent(buffer);
  }
};

const ensureOk = async (response: Response) => {
  if (response.ok) return;

  const text = await response.text();
  throw new Error(text || `Provider request failed with ${response.status}`);
};

const normalizeModels = (models: NoteAiModel[]) => {
  const modelMap = new Map<string, NoteAiModel>();

  for (const model of models) {
    const id = model.id.trim();
    if (!id || modelMap.has(id)) continue;
    modelMap.set(id, {
      ...model,
      id,
      name: model.name?.trim() || id,
    });
  }

  return Array.from(modelMap.values()).sort((a, b) =>
    a.id.localeCompare(b.id),
  );
};

const listOpenAiLikeModels = async ({
  provider,
  baseURL,
  apiKey,
}: NoteAiListModelsParams) => {
  const response = await fetch(`${getBaseURL(provider, baseURL)}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  await ensureOk(response);

  const payload = await response.json();
  const data = Array.isArray(payload?.data) ? payload.data : [];

  return normalizeModels(
    data
      .map((item: any) => ({
        id: typeof item?.id === "string" ? item.id : "",
        name: typeof item?.id === "string" ? item.id : "",
        ownedBy:
          typeof item?.owned_by === "string"
            ? item.owned_by
            : typeof item?.ownedBy === "string"
              ? item.ownedBy
              : undefined,
      }))
      .filter((item: NoteAiModel) => item.id),
  );
};

const listAnthropicModels = async ({
  baseURL,
  apiKey,
}: NoteAiListModelsParams) => {
  const response = await fetch(`${getBaseURL("anthropic", baseURL)}/models`, {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
  });

  await ensureOk(response);

  const payload = await response.json();
  const data = Array.isArray(payload?.data) ? payload.data : [];

  return normalizeModels(
    data
      .map((item: any) => ({
        id: typeof item?.id === "string" ? item.id : "",
        name:
          typeof item?.display_name === "string"
            ? item.display_name
            : typeof item?.id === "string"
              ? item.id
              : "",
      }))
      .filter((item: NoteAiModel) => item.id),
  );
};

const listGeminiModels = async ({ baseURL, apiKey }: NoteAiListModelsParams) => {
  const response = await fetch(
    `${getBaseURL("gemini", baseURL)}?key=${encodeURIComponent(apiKey)}`,
  );

  await ensureOk(response);

  const payload = await response.json();
  const data = Array.isArray(payload?.models) ? payload.models : [];

  return normalizeModels(
    data
      .filter((item: any) => {
        if (!Array.isArray(item?.supportedGenerationMethods)) return true;
        return item.supportedGenerationMethods.some((method: unknown) =>
          ["generateContent", "streamGenerateContent"].includes(String(method)),
        );
      })
      .map((item: any) => {
        const rawName = typeof item?.name === "string" ? item.name : "";
        const id = rawName.replace(/^models\//, "");

        return {
          id,
          name:
            typeof item?.displayName === "string" ? item.displayName : id || rawName,
        };
      })
      .filter((item: NoteAiModel) => item.id),
  );
};

const streamOpenAiLike = async ({
  provider,
  baseURL,
  model,
  apiKey,
  messages,
  signal,
  onDelta,
}: NoteAiStreamParams) => {
  const response = await fetch(
    `${getBaseURL(provider, baseURL)}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages,
      }),
      signal,
    },
  );

  await ensureOk(response);

  await parseSseStream(
    response,
    ({ data }) => {
      if (data === "[DONE]") return;

      const payload = JSON.parse(data);
      const delta = payload?.choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta) {
        onDelta(delta);
      }
    },
    signal,
  );
};

const streamAnthropic = async ({
  baseURL,
  model,
  apiKey,
  messages,
  signal,
  onDelta,
}: NoteAiStreamParams) => {
  const systemMessage =
    messages.find((item) => item.role === "system")?.content || "";
  const anthropicMessages = messages
    .filter((item) => item.role !== "system")
    .map((item) => ({
      role: item.role,
      content: item.content,
    }));

  const response = await fetch(`${getBaseURL("anthropic", baseURL)}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      stream: true,
      system: systemMessage,
      messages: anthropicMessages,
    }),
    signal,
  });

  await ensureOk(response);

  await parseSseStream(
    response,
    ({ event, data }) => {
      if (event === "ping") return;

      const payload = JSON.parse(data);
      const delta = payload?.delta?.text;
      if (typeof delta === "string" && delta) {
        onDelta(delta);
      }
    },
    signal,
  );
};

const streamGemini = async ({
  baseURL,
  model,
  apiKey,
  messages,
  signal,
  onDelta,
}: NoteAiStreamParams) => {
  const systemInstruction = messages
    .filter((item) => item.role === "system")
    .map((item) => item.content)
    .join("\n\n");
  const mappedMessages = messages.map((item) => ({
    role: item.role === "assistant" ? "model" : "user",
    parts: [{ text: item.content }],
  })).filter((item, index) => messages[index].role !== "system");

  const response = await fetch(
    `${getBaseURL("gemini", baseURL)}/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(
      apiKey,
    )}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(systemInstruction
          ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
          : {}),
        contents: mappedMessages,
      }),
      signal,
    },
  );

  await ensureOk(response);

  await parseSseStream(
    response,
    ({ data }) => {
      const payload = JSON.parse(data);
      const parts = payload?.candidates?.[0]?.content?.parts;
      if (!Array.isArray(parts)) return;

      for (const part of parts) {
        if (typeof part?.text === "string" && part.text) {
          onDelta(part.text);
        }
      }
    },
    signal,
  );
};

export const streamProviderResponse = async (params: NoteAiStreamParams) => {
  switch (params.provider) {
    case "openai":
    case "openai-compatible":
      return streamOpenAiLike(params);
    case "anthropic":
      return streamAnthropic(params);
    case "gemini":
      return streamGemini(params);
    default:
      throw new Error(`Unsupported provider: ${params.provider}`);
  }
};

export const listProviderModels = async (params: NoteAiListModelsParams) => {
  switch (params.provider) {
    case "openai":
    case "openai-compatible":
      return listOpenAiLikeModels(params);
    case "anthropic":
      return listAnthropicModels(params);
    case "gemini":
      return listGeminiModels(params);
    default:
      throw new Error(`Unsupported provider: ${params.provider}`);
  }
};
