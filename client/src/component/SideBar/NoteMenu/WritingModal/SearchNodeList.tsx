import { Post, searchPosts } from "@/api/post";
import { useAtom } from "jotai";
import { atomWithMutation } from "jotai-tanstack-query";
import { useState } from "react";
import { FaSearch } from "react-icons/fa";
import ItemBase from "./ItemBase";
const filterAtom = atomWithMutation(() => ({
  mutationKey: ["filterNotes"],
  mutationFn: async ({ title }: { title: string }) => {
    return searchPosts(title);
  },
}));
export const SearchNoteList = ({
  onChange,
}: {
  onChange?: (post: Post) => void;
}) => {
  const [searchValue, setSearchValue] = useState("");
  const [{ mutate, data }] = useAtom(filterAtom);
  const Notes = data?.data || [];

  const FilterMenu = ({ Notes }: { Notes: Post[] }) => {
    //两种模式,有filterValue时显示搜索结果,无filterValue时显示所有文章,层级显示
    return (
      <div>
        {Notes.map((note) => {
          return <ItemBase onClick={onChange} key={note._id} post={note} />;
        })}
      </div>
    );
  };

  const RenderList = () => {
    // if (searchValue.length == 0) {
    //   return <div>树级菜单</div>;
    // }
    if (Notes.length > 0) {
      return <FilterMenu Notes={Notes} />;
    } else {
      return (
        <div>
          <span className="text-zinc-400">No Results</span>
        </div>
      );
    }
  };
  return (
    <div className="w-[300px] relative scrollbar-thumb-emerald-950 max-h-[300px] overflow-y-auto">
      <div className="w-full absolute"></div>
      <header className="w-full my-2 px-2 ">
        <div className="border rounded-md text-gray-500  focus-within:ring-2 px-1 py-1 flex text-sm items-center gap-2">
          <FaSearch className="inline-block" />
          <input
            className="flex-1 outline-none"
            type="search"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              mutate({ title: e.target.value });
            }}
          ></input>
        </div>
      </header>
      <main className="p-2">
        <RenderList />
      </main>
    </div>
  );
};
