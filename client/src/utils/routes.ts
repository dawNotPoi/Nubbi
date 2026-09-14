export const routes = {
  home: "/home",
  login: "/login",
  meetings: "/meetings",
  file: "/file",
  noteLib: "/note-lib",
  note: (id: string) => `/note/${id}`,
};

export const isSafeInternalPath = (path?: string | null): path is string => {
  return !!path && path.startsWith("/") && !path.startsWith("//");
};

export const resolveReturnTo = (
  candidates: Array<string | null | undefined>,
  fallback = routes.home,
) => {
  return candidates.find(isSafeInternalPath) ?? fallback;
};
