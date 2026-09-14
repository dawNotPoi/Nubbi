import { useState } from "react";
import { FaSearch } from "react-icons/fa";
import NoteMenu from "..";

export const SearchNodeList = () => {
  const [searhValue, setSearchValue] = useState("");
  const List = () => {
    return <li>这是一个文件</li>;
  };
  return (
    <div className="w-[300px] relative  h-[400px] scrollbar-thumb-emerald-950 overflow-y-scroll">
      <div className="w-full absolute"></div>
      <header className="w-full my-2 px-2 ">
        <div className="border rounded-md text-gray-500  focus-within:ring-2 px-1 py-1 flex text-sm items-center gap-2">
          <FaSearch className="inline-block  " />
          <input
            className="flex-1 outline-none"
            type="search"
            value={searhValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
            }}
          ></input>
        </div>
      </header>
      <main className="px-2">
        <ul>
          <NoteMenu></NoteMenu>
        </ul>
      </main>
    </div>
  );
};
