import { Note, SearchNote, searchNotes } from "@/api/note";
import {
  SidebarTreeItem,
  SidebarTreeState,
} from "@/component/SideBar/components";
import { debounceWrapper } from "@/utils/common";
import clsx from "clsx";
import { useAtom } from "jotai";
import { atomWithMutation } from "jotai-tanstack-query";
import { LoaderCircle, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const filterAtom = atomWithMutation(() => ({
  mutationKey: ["filterNotes"],
  mutationFn: async ({ title }: { title: string }) => searchNotes(title),
}));

const panelClassName = clsx(
  "w-[320px] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.12)]",
  "text-sm text-neutral-700",
);

const searchBoxClassName = clsx(
  "flex items-center gap-2 rounded-lg border border-transparent bg-neutral-100 px-3 py-2 text-neutral-500 transition-colors",
  "focus-within:border-neutral-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-neutral-200/80",
);

export const SearchNoteList = ({
  onChange,
  selectedId,
}: {
  onChange?: (note: Note) => void;
  selectedId?: string | null;
}) => {
  const [searchValue, setSearchValue] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [{ mutate, data }] = useAtom(filterAtom);
  const notes: SearchNote[] = hasSearched ? data?.data || [] : [];

  const debouncedSearch = useMemo(
    () =>
      debounceWrapper((title: string) => {
        mutate(
          { title },
          {
            onSettled: () => {
              setIsSearching(false);
            },
          },
        );
      }, 250),
    [mutate],
  );

  useEffect(() => {
    const trimmedValue = searchValue.trim();

    if (trimmedValue.length === 0) {
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    setHasSearched(true);
    setIsSearching(true);
    debouncedSearch(trimmedValue);
  }, [searchValue, debouncedSearch]);

  return (
    <div className={panelClassName}>
      <header className="border-b border-neutral-100 p-2">
        <div className={searchBoxClassName}>
          <Search className="shrink-0 text-[12px]" />
          <input
            className="flex-1 bg-transparent outline-none placeholder:text-neutral-400"
            onChange={(event) => {
              setSearchValue(event.target.value);
            }}
            placeholder="Search pages..."
            type="text"
            value={searchValue}
          />
          {isSearching ? (
            <LoaderCircle className="shrink-0 animate-spin text-sm text-neutral-400" />
          ) : null}
        </div>
      </header>
      <main className="max-h-[280px] overflow-y-auto p-2">
        {isSearching ? (
          <SidebarTreeState depth={0} rows={4} type="loading" />
        ) : notes.length > 0 ? (
          <div className="space-y-1">
            {notes.map((note) => (
              <SidebarTreeItem
                active={note._id === selectedId}
                key={note._id}
                onSelect={() => {
                  onChange?.(note);
                }}
                pathLabel={note.pathLabel}
                title={note.title || "Untitled"}
              />
            ))}
          </div>
        ) : (
          <SidebarTreeState
            depth={0}
            message={hasSearched ? "No matching pages" : "Type to search pages"}
            type="empty"
          />
        )}
      </main>
    </div>
  );
};
