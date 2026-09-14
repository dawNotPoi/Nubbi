export const debounceWrapper = <T extends (...args: any[]) => any>(
  fn: T,
  delay = 1000,
) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
};

export const debounceWithControls = <T extends (...args: any[]) => any>(
  fn: T,
  delay = 1000,
) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: Parameters<T> | undefined;
  let lastThis: ThisParameterType<T> | undefined;

  const debounced = function (
    this: ThisParameterType<T>,
    ...args: Parameters<T>
  ) {
    lastThis = this;
    lastArgs = args;
    if (timeoutId) clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      timeoutId = undefined;
      if (!lastArgs) return;
      fn.apply(lastThis, lastArgs);
      lastArgs = undefined;
      lastThis = undefined;
    }, delay);
  };

  debounced.flush = () => {
    if (!timeoutId || !lastArgs) return;

    clearTimeout(timeoutId);
    timeoutId = undefined;
    fn.apply(lastThis, lastArgs);
    lastArgs = undefined;
    lastThis = undefined;
  };

  debounced.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = undefined;
    lastArgs = undefined;
    lastThis = undefined;
  };

  return debounced;
};

// 格式化文件大小
export const formatFileSize = (bytes: number): string => {
  if (bytes == null || bytes === undefined) return "--";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// 格式化持续时间
export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}小时${minutes % 60}分钟`;
  } else if (minutes > 0) {
    return `${minutes}分钟${seconds % 60}秒`;
  } else {
    return `${seconds}秒`;
  }
};
