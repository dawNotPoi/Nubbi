import { ApiRequestError } from "@/api/request";

const RETRY_DELAYS = [1000, 2000, 4000];
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

const abortableDelay = (duration: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, duration);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });

const isRetryable = (error: unknown) => {
  if (error instanceof ApiRequestError) {
    return [408, 429].includes(error.status) || error.status >= 500;
  }
  return error instanceof TypeError;
};

const runWithTimeout = async <T>(
  operation: (signal: AbortSignal) => Promise<T>,
  outerSignal: AbortSignal,
) => {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  outerSignal.addEventListener("abort", abort, { once: true });
  const timer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  try {
    return await operation(controller.signal);
  } catch (error) {
    if (timedOut) {
      throw new ApiRequestError("分片上传超时", 408, "UPLOAD_TIMEOUT");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
    outerSignal.removeEventListener("abort", abort);
  }
};

export const uploadWithRetry = async <T>(
  operation: (signal: AbortSignal) => Promise<T>,
  signal: AbortSignal,
) => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await runWithTimeout(operation, signal);
    } catch (error) {
      if (
        signal.aborted ||
        attempt >= RETRY_DELAYS.length ||
        !isRetryable(error)
      ) {
        throw error;
      }
      const jitter = Math.round(Math.random() * 250);
      await abortableDelay(RETRY_DELAYS[attempt] + jitter, signal);
    }
  }
};
