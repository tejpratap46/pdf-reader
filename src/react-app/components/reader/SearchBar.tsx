import { FC, useEffect, useRef, KeyboardEvent } from "react";
import { useDark } from "../../hooks/useTheme";
import { SearchOptions } from "../../types/search";
import {
  IcoSearch,
  IcoChevL,
  IcoChevR,
  IcoX,
  IcoLoader,
} from "../common/Icons";

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  isSearching: boolean;
  options: SearchOptions;
  onToggleMatchCase: () => void;
  onToggleWholeWord: () => void;
  activeMatchIndex: number;
  totalMatches: number;
  onNextMatch: () => void;
  onPrevMatch: () => void;
}

export const SearchBar: FC<SearchBarProps> = ({
  isOpen,
  onClose,
  query,
  onQueryChange,
  isSearching,
  options,
  onToggleMatchCase,
  onToggleWholeWord,
  activeMatchIndex,
  totalMatches,
  onNextMatch,
  onPrevMatch,
}) => {
  const d = useDark();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus and select input text whenever search is opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        onPrevMatch();
      } else {
        onNextMatch();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="absolute top-3 right-4 z-40 flex items-center gap-1.5 p-1.5 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-200 select-none animate-in fade-in slide-in-from-top-2"
      style={{
        background: d ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.96)",
        borderColor: d ? "rgba(245, 158, 11, 0.35)" : "#fde68a",
        boxShadow: d
          ? "0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5)"
          : "0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)",
      }}
    >
      {/* Search Icon & Input */}
      <div className="relative flex items-center">
        <span
          className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors"
          style={{ color: query ? "#f59e0b" : d ? "#64748b" : "#94a3b8" }}
        >
          <IcoSearch size={15} />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Find in document..."
          className="w-48 sm:w-56 text-xs pl-8 pr-7 py-1.5 rounded-lg focus:outline-none transition-all"
          style={{
            background: d ? "#1e293b" : "#f1f5f9",
            color: d ? "#f8fafc" : "#0f172a",
            border: `1px solid ${d ? "#334155" : "#e2e8f0"}`,
          }}
        />
        {query && (
          <button
            onClick={() => {
              onQueryChange("");
              inputRef.current?.focus();
            }}
            title="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-500/20 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <IcoX size={12} />
          </button>
        )}
      </div>

      {/* Match counter badge */}
      {query.trim() && (
        <div className="flex items-center px-2 py-0.5 text-[11px] font-mono whitespace-nowrap">
          {isSearching ? (
            <span className="flex items-center gap-1 text-amber-500 font-medium">
              <span className="animate-spin">
                <IcoLoader size={12} />
              </span>
              <span>Searching...</span>
            </span>
          ) : totalMatches > 0 ? (
            <span
              className="font-medium"
              style={{ color: d ? "#cbd5e1" : "#475569" }}
            >
              <strong className="text-amber-500 font-bold">
                {activeMatchIndex + 1}
              </strong>
              <span className="opacity-60 mx-1">/</span>
              <span>{totalMatches}</span>
            </span>
          ) : (
            <span className="text-red-500 font-medium text-[10px]">No results</span>
          )}
        </div>
      )}

      {/* Navigation Buttons: Previous / Next */}
      <div className="flex items-center gap-0.5 border-l pl-1.5" style={{ borderColor: d ? "#334155" : "#e2e8f0" }}>
        <button
          onClick={onPrevMatch}
          disabled={totalMatches === 0}
          title="Previous match (Shift+Enter)"
          className="p-1 rounded-md transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            color: d ? "#cbd5e1" : "#475569",
          }}
          onMouseEnter={(e) => {
            if (totalMatches > 0)
              (e.currentTarget as HTMLElement).style.background = d ? "#334155" : "#e2e8f0";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <IcoChevL size={15} />
        </button>
        <button
          onClick={onNextMatch}
          disabled={totalMatches === 0}
          title="Next match (Enter)"
          className="p-1 rounded-md transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            color: d ? "#cbd5e1" : "#475569",
          }}
          onMouseEnter={(e) => {
            if (totalMatches > 0)
              (e.currentTarget as HTMLElement).style.background = d ? "#334155" : "#e2e8f0";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <IcoChevR size={15} />
        </button>
      </div>

      {/* Options: Match Case (Aa) & Whole Word (W) */}
      <div className="flex items-center gap-1 border-l pl-1.5" style={{ borderColor: d ? "#334155" : "#e2e8f0" }}>
        <button
          onClick={onToggleMatchCase}
          title="Match Case (Case Sensitive)"
          className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer border"
          style={{
            background: options.matchCase
              ? "rgba(245, 158, 11, 0.2)"
              : "transparent",
            borderColor: options.matchCase
              ? "#f59e0b"
              : d
              ? "#334155"
              : "#e2e8f0",
            color: options.matchCase
              ? "#f59e0b"
              : d
              ? "#94a3b8"
              : "#64748b",
          }}
        >
          Aa
        </button>
        <button
          onClick={onToggleWholeWord}
          title="Match Whole Word"
          className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer border"
          style={{
            background: options.wholeWord
              ? "rgba(245, 158, 11, 0.2)"
              : "transparent",
            borderColor: options.wholeWord
              ? "#f59e0b"
              : d
              ? "#334155"
              : "#e2e8f0",
            color: options.wholeWord
              ? "#f59e0b"
              : d
              ? "#94a3b8"
              : "#64748b",
          }}
        >
          [W]
        </button>
      </div>

      {/* Close Button */}
      <div className="border-l pl-1" style={{ borderColor: d ? "#334155" : "#e2e8f0" }}>
        <button
          onClick={onClose}
          title="Close search (Esc)"
          className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-500/20 transition-colors cursor-pointer"
        >
          <IcoX size={15} />
        </button>
      </div>
    </div>
  );
};
