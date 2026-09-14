export function NoteLibrarySkeleton() {
  return (
    <div>
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          className="grid h-11 animate-pulse grid-cols-[40px_minmax(280px,1fr)_minmax(180px,28vw)_132px] items-center border-b border-[#efefed]"
          key={index}
        >
          <div className="mx-auto size-3 rounded bg-[#e6e4e1]" />
          <div className="h-3 w-44 rounded bg-[#e6e4e1]" />
          <div className="h-3 w-20 rounded bg-[#e6e4e1]" />
          <div />
        </div>
      ))}
    </div>
  );
}
