"use client";

import { useId } from "react";
import { CloseIcon, SearchIcon } from "./icons";

export function SearchBox({
  value,
  onChange,
  label,
  placeholder,
  clearLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  clearLabel: string;
}) {
  const id = useId();
  return (
    <div className="relative flex-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-muted">
        <SearchIcon />
      </span>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="h-11 w-full rounded-md border border-field bg-surface pr-11 pl-10 text-base text-ink placeholder:text-ink-muted [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={clearLabel}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-ink-muted hover:text-ink"
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
}
