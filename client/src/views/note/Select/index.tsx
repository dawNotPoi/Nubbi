import Popover from "@/component/UI/Popover";
import clsx from "clsx";
import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type SelectOption = {
  value: string;
  label?: string;
  className: string;
};

type SelectMode = "single" | "multiple";

const PRESET_TAG_STYLES = [
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-orange-100 text-orange-700",
  "bg-cyan-100 text-cyan-700",
  "bg-lime-100 text-lime-700",
];

const CREATED_TAG_STYLE = "bg-sky-100 text-sky-700";

const createOption = (value: string, index: number): SelectOption => ({
  value,
  label: value,
  className: PRESET_TAG_STYLES[index % PRESET_TAG_STYLES.length],
});

const normalizeValues = (
  value: string | string[] | undefined,
  mode: SelectMode,
) => {
  if (mode === "multiple") return Array.isArray(value) ? value : [];
  if (Array.isArray(value)) return value[0] ? [value[0]] : [];
  return value ? [value] : [];
};

const mergeDisplayOptions = (
  defaultOptions: SelectOption[],
  selectedValues: string[],
): SelectOption[] => {
  const map = new Map(defaultOptions.map((option) => [option.value, option]));
  selectedValues.forEach((item) => {
    if (!map.has(item)) {
      map.set(item, {
        value: item,
        label: item,
        className: CREATED_TAG_STYLE,
      });
    }
  });
  return Array.from(map.values());
};

function OptionTag({
  option,
  removable,
  onRemove,
}: {
  option: SelectOption;
  removable?: boolean;
  onRemove?: () => void;
}) {
  return (
    <span
      className={clsx(
        "inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium",
        option.className,
      )}
    >
      <span className="truncate">{option.label ?? option.value}</span>
      {removable ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove?.();
          }}
          className="flex size-4 items-center justify-center rounded-sm hover:bg-black/5"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </span>
  );
}

export function Select({
  value,
  mode = "multiple",
  className,
  onChange,
  options = [],
  placeholder = "Empty",
  creatable = false,
}: {
  className?: string;
  value?: string | string[];
  mode?: SelectMode;
  onChange?: (value: string | string[]) => void;
  options?: string[];
  placeholder?: string;
  creatable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHighlightedIndex(0);
      return;
    }
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  const selectedValues = useMemo(
    () => normalizeValues(value, mode),
    [mode, value],
  );

  const defaultOptions = useMemo(
    () => options.map((item, index) => createOption(item, index)),
    [options],
  );

  const displayOptions = useMemo(
    () => mergeDisplayOptions(defaultOptions, selectedValues),
    [defaultOptions, selectedValues],
  );

  const filteredOptions = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return displayOptions;
    return displayOptions.filter((option) => {
      const label = (option.label ?? option.value).toLowerCase();
      return (
        label.includes(keyword) || option.value.toLowerCase().includes(keyword)
      );
    });
  }, [displayOptions, query]);

  const emitChange = (nextValues: string[]) => {
    if (mode === "multiple") {
      onChange?.(nextValues);
      return;
    }
    onChange?.(nextValues[0] ?? "");
  };

  const removeLastValue = () => {
    if (!selectedValues.length) return;
    emitChange(selectedValues.slice(0, -1));
  };

  const toggleValue = (nextValue: string) => {
    if (mode === "multiple") {
      const nextValues = selectedValues.includes(nextValue)
        ? selectedValues.filter((item) => item !== nextValue)
        : [...selectedValues, nextValue];
      emitChange(nextValues);
      return;
    }

    emitChange([nextValue]);
    setOpen(false);
  };

  const createValue = query.trim();
  const keyboardItemsCount =
    filteredOptions.length + (creatable && createValue ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    if (keyboardItemsCount <= 0) {
      setHighlightedIndex(0);
      return;
    }
    setHighlightedIndex((current) =>
      Math.min(Math.max(current, 0), keyboardItemsCount - 1),
    );
  }, [createValue, creatable, filteredOptions.length, keyboardItemsCount, open]);

  const handleCreate = () => {
    if (!createValue) return;
    if (mode === "multiple") {
      if (!selectedValues.includes(createValue)) {
        emitChange([...selectedValues, createValue]);
      }
      setQuery("");
      return;
    }

    emitChange([createValue]);
    setOpen(false);
  };

  const triggerContent = open ? (
    <div className="flex min-h-9 items-center gap-2">
      <div className="flex flex-1 flex-wrap items-center gap-1.5">
        {selectedValues.map((item) => {
          const option = displayOptions.find(
            (candidate) => candidate.value === item,
          ) ?? {
            value: item,
            label: item,
            className: CREATED_TAG_STYLE,
          };
          return (
            <OptionTag
              key={item}
              option={option}
              removable
              onRemove={() => {
                emitChange(
                  selectedValues.filter((valueItem) => valueItem !== item),
                );
              }}
            />
          );
        })}
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlightedIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
            }
            if (
              (event.key === "Backspace" || event.key === "Delete") &&
              !query &&
              selectedValues.length
            ) {
              event.preventDefault();
              removeLastValue();
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              if (!keyboardItemsCount) return;
              setHighlightedIndex((current) =>
                current >= keyboardItemsCount - 1 ? 0 : current + 1,
              );
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              if (!keyboardItemsCount) return;
              setHighlightedIndex((current) =>
                current <= 0 ? keyboardItemsCount - 1 : current - 1,
              );
            }
            if (event.key === "Enter") {
              event.preventDefault();
              if (!keyboardItemsCount) return;
              if (highlightedIndex < filteredOptions.length) {
                toggleValue(filteredOptions[highlightedIndex].value);
                return;
              }
              if (creatable && createValue) {
                handleCreate();
              }
            }
          }}
          placeholder={selectedValues.length ? undefined : placeholder}
          className="min-w-[24px] flex-1 border-none bg-transparent py-1 text-sm text-stone-700 outline-none"
        />
      </div>
    </div>
  ) : (
    <div className="flex min-h-9 items-center gap-2">
      <div className="flex flex-1 flex-wrap items-center gap-1.5">
        {selectedValues.length ? (
          selectedValues.map((item) => {
            const option = displayOptions.find(
              (candidate) => candidate.value === item,
            ) ?? {
              value: item,
              label: item,
              className: CREATED_TAG_STYLE,
            };
            return (
              <OptionTag
                key={item}
                option={option}
                removable
                onRemove={() => {
                  emitChange(
                    selectedValues.filter((valueItem) => valueItem !== item),
                  );
                }}
              />
            );
          })
        ) : (
          <span className="text-sm text-stone-400">{placeholder}</span>
        )}
      </div>
    </div>
  );

  return (
    <Popover
      open={open}
      onClickOutside={() => setOpen(false)}
      offset={8}
      matchTriggerWidth
      className="border-none bg-transparent shadow-none"
      trigger={
        <div
          onClick={() => setOpen(true)}
          className={clsx(
            "w-full rounded-lg border border-transparent px-2 py-1.5 transition",
            open
              ? "border-stone-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
              : "hover:bg-stone-50",
            className,
          )}
        >
          {triggerContent}
        </div>
      }
    >
      <div className="w-full rounded-xl border border-stone-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="space-y-1">
          {filteredOptions.length ? (
            filteredOptions.map((option, index) => {
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleValue(option.value)}
                  onMouseEnter={() => {
                    setHighlightedIndex(index);
                  }}
                  className={clsx(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-stone-700 transition",
                    highlightedIndex === index
                      ? "bg-stone-100"
                      : "hover:bg-stone-50",
                  )}
                >
                  <OptionTag option={option} />
                </button>
              );
            })
          ) : (
            <div className="rounded-lg px-3 py-4 text-sm text-stone-400">
              No matching options
            </div>
          )}
        </div>

        {creatable && createValue ? (
          <div className="mt-3 border-t border-stone-100 pt-3">
            <button
              type="button"
              onClick={handleCreate}
              onMouseEnter={() => {
                setHighlightedIndex(filteredOptions.length);
              }}
              className={clsx(
                "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-stone-700 transition hover:bg-sky-50",
                highlightedIndex === filteredOptions.length && "bg-sky-50",
              )}
            >
              <span className="rounded-md bg-sky-100 px-2 py-1 text-[12px] font-medium text-sky-700">
                Create
              </span>
              <span className="truncate">{`'${createValue}'`}</span>
            </button>
          </div>
        ) : null}
      </div>
    </Popover>
  );
}
