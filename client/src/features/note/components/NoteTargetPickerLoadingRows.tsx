export function NoteTargetPickerLoadingRows() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          className="flex h-9 animate-pulse items-center gap-2 rounded-md px-2"
          key={index}
        >
          <div className="size-4 rounded bg-[#e7e5e1]" />
          <div className="h-3 w-36 rounded bg-[#e7e5e1]" />
        </div>
      ))}
    </div>
  );
}
