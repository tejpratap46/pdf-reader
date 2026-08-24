export interface SearchMatchRect {
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  width: number; // percentage (0 - 100)
  height: number; // percentage (0 - 100)
}

export interface SearchMatch {
  id: string;
  globalIndex: number; // 0-based across the document
  pageNumber: number; // 1-based page number
  rects: SearchMatchRect[]; // Visual bounding boxes on the page
  snippet: string; // Context snippet around the match
  text: string; // Matched text string
  paragraphIndex?: number; // For web mode
}

export interface PageTextItem {
  str: string;
  charStart: number;
  charEnd: number;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
}

export interface PageTextData {
  pageNumber: number;
  fullText: string;
  items: PageTextItem[];
}

export interface SearchOptions {
  matchCase: boolean;
  wholeWord: boolean;
}
