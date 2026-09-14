import clsx from "clsx";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AiOutlineClose } from "react-icons/ai";

type OptionType = string;

export function Select({
  defaultValue,
  className,
  onChange,
  Options,
}: {
  className?: string;
  defaultValue?: any[];
  onChange?: (value: any[]) => void;
  Options?: OptionType[];
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<any[]>(() => {
    if (!defaultValue) return [];
    return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
  });
  const [options, setOptions] = useState<OptionType[]>(
    Options || ["tag1", "tag2"]
  );
  const [postion, setPostion] = useState(null);
  const selectRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const optionClickHandler = useCallback(
    (target: string) => {
      if (!value.includes(target))
        setValue((v) => {
          const res = [...v, target];
          onChange?.(res);
          return res;
        });
      setOpen(false);
    },
    [value]
  );
  const tagCloseHandler = useCallback((option: OptionType) => {
    setValue((v) => {
      const res = v.filter((item) => item !== option);
      onChange?.(res);
      return res;
    });
  }, []);

  const OptionsContainer = () => {
    return (
      <div className="w-full p-1  z-50  border bg-white rounded-b-md">
        <header className=" text-[12px] px-2 text-gray-500">
          选择一个选项或创建一个
        </header>
        <main className="text-[13px] py-1">
          {options.map((option) => {
            return (
              <div
                key={option}
                onClick={() => {
                  optionClickHandler(option);
                }}
                className="cursor-pointer hover:bg-gray-100 rounded-md p-1 flex items-center"
              >
                <span className="bg-red-200 flex items-center h-5 py-0.5 px-1 rounded-sm">
                  {option}
                </span>
                <div className="flex-1"></div>
                <span className="hover:bg-gray-200 h-5 flex items-center py-0.5  px-1 size-auto rounded-sm">
                  <AiOutlineClose />
                </span>
              </div>
            );
          })}
        </main>
      </div>
    );
  };

  return (
    <div
      className="size-full rounded-md"
      onMouseMove={(e) => e.stopPropagation()}
      ref={selectRef}
    >
      <div
        onClick={() => setOpen(true)}
        className={clsx(
          "p-2 py-2 h-full cursor-pointer relative flex items-center ",
          className,
          open && "border shadow-md bg-normalGray/40"
        )}
      >
        {value.map((item) => {
          return (
            <div
              key={item}
              className="mr-1 h-full text-[12px] rounded-sm inline-flex items-center  px-2 pr-0.5 bg-rose-300"
            >
              <span className="text-nowrap text-ellipsis max-w-[100px] overflow-hidden">
                {options.find((option) => option === item) || item}
              </span>
              <div className="hover:bg-black/5 h-full w-6 flex items-center justify-center rounded-sm cursor-pointer ">
                <AiOutlineClose className="w-fit" />
              </div>
            </div>
          );
        })}
      </div>
      {/* Option */}
      {open && createPortal(<OptionsContainer />, document.body)}
    </div>
  );
}
