export interface PdfEditorProps {
  pdfFileBytes: Uint8Array;
  fileName: string;
  onClose: () => void;
  onSave: (newPdfBytes: Uint8Array, newFileName?: string) => void;
  isDark: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export interface DrawStroke {
  id: string;
  points: Point[];
  color: string;
  size: number;
  opacity: number;
}

export interface TextItem {
  id: string;
  text: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  fontSize: number;
  color: string;
  isBold: boolean;
}

export interface ImageItem {
  id: string;
  dataUrl: string;
  isPng: boolean;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  width: number; // percentage of page width
  height: number; // percentage of page height
}

export interface StampItem {
  id: string;
  text: string;
  color: string;
  opacity: number;
  rotation: number; // degrees
}

export interface PageState {
  id: string;
  originalIndex: number | null; // null if newly added blank page
  rotation: number; // 0, 90, 180, 270
  width: number;
  height: number;
  strokes: DrawStroke[];
  texts: TextItem[];
  images: ImageItem[];
  stamps: StampItem[];
}

export type TabMode = "pages" | "text" | "draw" | "stamps" | "images";
