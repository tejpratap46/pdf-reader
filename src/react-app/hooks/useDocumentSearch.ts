import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { SearchMatch, SearchMatchRect, PageTextData, PageTextItem, SearchOptions } from "../types/search";
import { SourceMode } from "../types/reader";

interface UseDocumentSearchProps {
  sourceMode: SourceMode;
  pdfDoc: any;
  pdfBytes: Uint8Array | null;
  totalPages: number;
  currentPage: number;
  paragraphs: string[];
  onNavigateToPage?: (pageNum: number) => void;
}

export function useDocumentSearch({
  sourceMode,
  pdfDoc,
  pdfBytes,
  totalPages,
  currentPage,
  paragraphs,
  onNavigateToPage,
}: UseDocumentSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [options, setOptions] = useState<SearchOptions>({
    matchCase: false,
    wholeWord: false,
  });
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);

  // In-memory cache for extracted text content per page
  const pageTextCacheRef = useRef<Map<number, PageTextData>>(new Map());
  // In-flight promises to avoid duplicate extractions
  const pendingExtractionRef = useRef<Map<number, Promise<PageTextData | null>>>(new Map());
  // Abort controller for active search run
  const searchAbortControllerRef = useRef<AbortController | null>(null);

  // Clear cache when document changes
  useEffect(() => {
    pageTextCacheRef.current.clear();
    pendingExtractionRef.current.clear();
    setMatches([]);
    setActiveMatchIndex(-1);
    setIsSearching(false);
  }, [pdfBytes, sourceMode]);

  // Extract PageTextData for a single PDF page
  const extractPdfPageText = useCallback(
    async (doc: any, pageNum: number): Promise<PageTextData | null> => {
      if (!doc || pageNum < 1 || pageNum > doc.numPages) return null;

      if (pageTextCacheRef.current.has(pageNum)) {
        return pageTextCacheRef.current.get(pageNum)!;
      }

      if (pendingExtractionRef.current.has(pageNum)) {
        return pendingExtractionRef.current.get(pageNum)!;
      }

      const promise = (async () => {
        try {
          const page = await doc.getPage(pageNum);
          const vp = page.getViewport({ scale: 1, rotation: 0 });
          const textContent = await page.getTextContent();
          const rawItems = (textContent?.items || []) as any[];

          const pageItems: PageTextItem[] = [];
          let fullText = "";

          for (const item of rawItems) {
            if (typeof item.str !== "string" || !item.str) continue;

            const str = item.str;
            const tx = item.transform[4];
            const ty = item.transform[5];
            const [vx, vy] = vp.convertToViewportPoint(tx, ty);

            const pdfFontSize = Math.round(
              Math.hypot(item.transform[2], item.transform[3]) ||
              Math.hypot(item.transform[0], item.transform[1]) ||
              12
            );

            const fontHeight = pdfFontSize;
            const itemWidth =
              typeof item.width === "number" && item.width > 0
                ? item.width
                : str.length * pdfFontSize * 0.55;
            const fontAscent = fontHeight * 0.8;

            const xPct = Math.max(0, Math.min(100, (vx / vp.width) * 100));
            const yPct = Math.max(0, Math.min(100, ((vy - fontAscent) / vp.height) * 100));
            const wPct = Math.max(0.1, Math.min(100 - xPct, (itemWidth / vp.width) * 100));
            const hPct = Math.max(0.1, Math.min(100 - yPct, (fontHeight / vp.height) * 100));

            // Check if space should be inserted between items
            if (pageItems.length > 0) {
              const prev = pageItems[pageItems.length - 1];
              if (!prev.str.endsWith(" ") && !str.startsWith(" ")) {
                if (
                  Math.abs(yPct - prev.yPct) > 0.8 ||
                  xPct - (prev.xPct + prev.wPct) > 0.4
                ) {
                  fullText += " ";
                }
              }
            }

            const charStart = fullText.length;
            fullText += str;
            const charEnd = fullText.length;

            pageItems.push({
              str,
              charStart,
              charEnd,
              xPct,
              yPct,
              wPct,
              hPct,
            });

            if (item.hasEOL) {
              fullText += " ";
            }
          }

          const pageData: PageTextData = {
            pageNumber: pageNum,
            fullText,
            items: pageItems,
          };

          pageTextCacheRef.current.set(pageNum, pageData);
          return pageData;
        } catch (err) {
          console.warn(`Failed to extract text for search on page ${pageNum}:`, err);
          return null;
        } finally {
          pendingExtractionRef.current.delete(pageNum);
        }
      })();

      pendingExtractionRef.current.set(pageNum, promise);
      return promise;
    },
    []
  );

  // Perform search across the document
  const performSearch = useCallback(
    async (query: string, searchOptions: SearchOptions) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setMatches([]);
        setActiveMatchIndex(-1);
        setIsSearching(false);
        return;
      }

      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort();
      }
      const abortController = new AbortController();
      searchAbortControllerRef.current = abortController;

      setIsSearching(true);

      try {
        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pattern = searchOptions.wholeWord ? `\\b${escaped}\\b` : escaped;
        const flags = searchOptions.matchCase ? "g" : "gi";
        const regex = new RegExp(pattern, flags);

        const allMatches: SearchMatch[] = [];

        if (sourceMode === "pdf" && pdfDoc) {
          const numPages = totalPages || pdfDoc.numPages || 0;

          // Search pages sequentially or in small batches
          for (let pNum = 1; pNum <= numPages; pNum++) {
            if (abortController.signal.aborted) return;

            const pageData = await extractPdfPageText(pdfDoc, pNum);
            if (abortController.signal.aborted) return;
            if (!pageData || !pageData.fullText) continue;

            regex.lastIndex = 0;
            let matchResult: RegExpExecArray | null;

            while ((matchResult = regex.exec(pageData.fullText)) !== null) {
              const matchStart = matchResult.index;
              const matchEnd = matchResult.index + matchResult[0].length;
              const matchText = matchResult[0];

              // Intersect match range with page text items to produce highlight rects
              const rects: SearchMatchRect[] = [];
              for (const item of pageData.items) {
                if (item.charEnd <= matchStart || item.charStart >= matchEnd) continue;

                const overlapStart = Math.max(matchStart, item.charStart);
                const overlapEnd = Math.min(matchEnd, item.charEnd);
                const itemLen = item.charEnd - item.charStart;
                if (itemLen <= 0) continue;

                const localStart = overlapStart - item.charStart;
                const localEnd = overlapEnd - item.charStart;
                const startFrac = localStart / itemLen;
                const widthFrac = (localEnd - localStart) / itemLen;

                const rectX = item.xPct + startFrac * item.wPct;
                const rectW = Math.max(0.1, widthFrac * item.wPct);
                const rectY = item.yPct;
                const rectH = item.hPct;

                rects.push({
                  x: rectX,
                  y: rectY,
                  width: rectW,
                  height: rectH,
                });
              }

              const snippetStart = Math.max(0, matchStart - 35);
              const snippetEnd = Math.min(pageData.fullText.length, matchEnd + 35);
              const snippet = pageData.fullText.slice(snippetStart, snippetEnd).replace(/\s+/g, " ");

              allMatches.push({
                id: `match-${pNum}-${matchStart}-${allMatches.length}`,
                globalIndex: allMatches.length,
                pageNumber: pNum,
                rects: rects.length > 0 ? rects : [{ x: 5, y: 5, width: 20, height: 2 }],
                snippet,
                text: matchText,
              });

              if (matchResult[0].length === 0) {
                regex.lastIndex++;
              }
            }
          }
        } else if (sourceMode === "web" && paragraphs.length > 0) {
          // Web mode search through paragraphs
          for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
            if (abortController.signal.aborted) return;
            const paraText = paragraphs[pIdx] || "";
            regex.lastIndex = 0;
            let matchResult: RegExpExecArray | null;

            while ((matchResult = regex.exec(paraText)) !== null) {
              const matchStart = matchResult.index;
              const matchEnd = matchResult.index + matchResult[0].length;
              const matchText = matchResult[0];

              const snippetStart = Math.max(0, matchStart - 30);
              const snippetEnd = Math.min(paraText.length, matchEnd + 30);
              const snippet = paraText.slice(snippetStart, snippetEnd).replace(/\s+/g, " ");

              allMatches.push({
                id: `web-match-${pIdx}-${matchStart}-${allMatches.length}`,
                globalIndex: allMatches.length,
                pageNumber: 1,
                paragraphIndex: pIdx,
                rects: [],
                snippet,
                text: matchText,
              });

              if (matchResult[0].length === 0) {
                regex.lastIndex++;
              }
            }
          }
        }

        if (abortController.signal.aborted) return;

        setMatches(allMatches);

        if (allMatches.length > 0) {
          // Pick the first match on or after current page, or fallback to index 0
          const initialIndex = allMatches.findIndex((m) => m.pageNumber >= currentPage);
          const targetIndex = initialIndex !== -1 ? initialIndex : 0;
          setActiveMatchIndex(targetIndex);
        } else {
          setActiveMatchIndex(-1);
        }
      } catch (err) {
        console.error("Search execution error:", err);
      } finally {
        if (!abortController.signal.aborted) {
          setIsSearching(false);
        }
      }
    },
    [sourceMode, pdfDoc, totalPages, paragraphs, currentPage, extractPdfPageText]
  );

  // Trigger search when query or options change with a brief debounce
  useEffect(() => {
    if (!isOpen || !searchQuery.trim()) {
      setMatches([]);
      setActiveMatchIndex(-1);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(searchQuery, options);
    }, 120);

    return () => clearTimeout(timer);
  }, [searchQuery, options, isOpen, performSearch]);

  // Navigate to match
  const goToMatch = useCallback(
    (index: number) => {
      if (matches.length === 0) return;
      const validIndex = ((index % matches.length) + matches.length) % matches.length;
      setActiveMatchIndex(validIndex);

      const targetMatch = matches[validIndex];
      if (targetMatch) {
        if (sourceMode === "pdf" && onNavigateToPage) {
          onNavigateToPage(targetMatch.pageNumber);
        }

        // Smooth scroll to match element in DOM
        setTimeout(() => {
          const matchEl = document.getElementById(`search-match-${targetMatch.globalIndex}`);
          if (matchEl) {
            matchEl.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 80);
      }
    },
    [matches, sourceMode, onNavigateToPage]
  );

  const goToNextMatch = useCallback(() => {
    if (matches.length === 0) return;
    goToMatch(activeMatchIndex + 1);
  }, [matches, activeMatchIndex, goToMatch]);

  const goToPrevMatch = useCallback(() => {
    if (matches.length === 0) return;
    goToMatch(activeMatchIndex - 1);
  }, [matches, activeMatchIndex, goToMatch]);

  const openSearch = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleSearch = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const setMatchCase = useCallback((valOrFn: boolean | ((prev: boolean) => boolean)) => {
    setOptions((prev) => ({
      ...prev,
      matchCase: typeof valOrFn === "function" ? valOrFn(prev.matchCase) : valOrFn,
    }));
  }, []);

  const setWholeWord = useCallback((valOrFn: boolean | ((prev: boolean) => boolean)) => {
    setOptions((prev) => ({
      ...prev,
      wholeWord: typeof valOrFn === "function" ? valOrFn(prev.wholeWord) : valOrFn,
    }));
  }, []);

  // Map of matches by pageNumber for O(1) page lookups
  const pageMatchesMap = useMemo(() => {
    const map = new Map<number, SearchMatch[]>();
    for (const match of matches) {
      const list = map.get(match.pageNumber) || [];
      list.push(match);
      map.set(match.pageNumber, list);
    }
    return map;
  }, [matches]);

  const getPageMatches = useCallback(
    (pageNum: number): SearchMatch[] => {
      return pageMatchesMap.get(pageNum) || [];
    },
    [pageMatchesMap]
  );

  return {
    isOpen,
    openSearch,
    closeSearch,
    toggleSearch,
    searchQuery,
    setSearchQuery,
    isSearching,
    options,
    setMatchCase,
    setWholeWord,
    matches,
    totalMatches: matches.length,
    activeMatchIndex,
    activeMatch: activeMatchIndex >= 0 && activeMatchIndex < matches.length ? matches[activeMatchIndex] : null,
    goToMatch,
    goToNextMatch,
    goToPrevMatch,
    getPageMatches,
  };
}
