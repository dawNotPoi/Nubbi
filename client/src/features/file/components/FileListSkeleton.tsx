const rows = Array.from({ length: 7 }, (_, index) => index);

export function FileListSkeleton() {
  return (
    <ul aria-label="正在加载文件" className="m-0 list-none p-0">
      {rows.map((row) => (
        <li className="file-list-grid file-row" key={row}>
          <span />
          <span className="h-3 w-2/3 animate-pulse rounded-compact bg-skeleton" />
          <span className="h-3 w-1/2 animate-pulse rounded-compact bg-skeleton" />
          <span className="h-3 w-1/2 animate-pulse rounded-compact bg-skeleton" />
          <span />
        </li>
      ))}
    </ul>
  );
}
