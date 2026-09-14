import { Post, SearchPost, searchPosts } from "@/api/post";
import { debounceWrapper } from "@/utils/common";
import clsx from "clsx";
import { useAtom } from "jotai";
import { atomWithMutation } from "jotai-tanstack-query";
import { useEffect, useMemo, useState } from "react";
import { FaSearch } from "react-icons/fa";
import { RiLoader4Line } from "react-icons/ri";
import ItemBase from "./ItemBase";

const filterAtom = atomWithMutation(() => ({
  mutationKey: ["filterNotes"],
  mutationFn: async ({ title }: { title: string }) => searchPosts(title),
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
  onChange?: (post: Post) => void;
  selectedId?: string | null;
}) => {
  const [searchValue, setSearchValue] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [{ mutate, data }] = useAtom(filterAtom);
  const notes: SearchPost[] = hasSearched ? data?.data || [] : [];

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
          <FaSearch className="shrink-0 text-[12px]" />
          <input
            className="flex-1 bg-transparent outline-none placeholder:text-neutral-400"
            type="text"
            placeholder="Search pages..."
            value={searchValue}
            onChange={(event) => {
              setSearchValue(event.target.value);
            }}
          />
          {isSearching && (
            <RiLoader4Line className="shrink-0 animate-spin text-sm text-neutral-400" />
          )}
        </div>
      </header>
      <main className="max-h-[280px] overflow-y-auto p-2">
        {isSearching ? (
          <div className="px-3 py-8 text-center text-sm text-neutral-400" />
        ) : notes.length > 0 ? (
          <div className="space-y-1">
            {notes.map((note) => (
              <ItemBase
                key={note._id}
                post={note}
                pathLabel={note.pathLabel}
                selected={note._id === selectedId}
                onClick={onChange}
              />
            ))}
          </div>
        ) : (
          <div className="px-3 py-8 text-center text-sm text-neutral-400">
            没有找到匹配的页面
          </div>
        )}
      </main>
    </div>
  );
};
