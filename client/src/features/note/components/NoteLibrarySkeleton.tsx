export function NoteLibrarySkeleton() {
  return (
    <div>
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          className="grid min-h-16 animate-pulse grid-cols-[36px_minmax(0,1fr)_36px] items-center border-b border-border-row md:h-11 md:min-h-0 md:grid-cols-[40px_minmax(280px,1fr)_minmax(180px,28vw)_132px]"
          key={index}
        >
          <div className="mx-auto size-3 rounded bg-[#e6e4e1]" />
          <div className="h-3 w-3/5 rounded bg-skeleton md:w-44" />
          <div className="hidden h-3 w-20 rounded bg-skeleton md:block" />
          <div />
        </div>
      ))}
    </div>
  );
}
