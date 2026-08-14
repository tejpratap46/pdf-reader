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
  isItalic?: boolean;
  backgroundColor?: string; // background whiteout cover color (e.g. '#ffffff')
  width?: number; // percentage (0-100)
  height?: number; // percentage (0-100)
  fontFamily?: string;
  isOriginalEdit?: boolean; // true if this text item replaced original PDF text
}

export interface OriginalTextSelectionInfo {
  text: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  width: number; // percentage (0-100)
  height: number; // percentage (0-100)
  fontSize: number;
  color: string;
  isBold: boolean;
  isItalic?: boolean;
  backgroundColor?: string;
  fontFamily?: string;
  clientRect: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };
}

export interface ImageItem {
  id: string;
  dataUrl: string;
  isPng: boolean;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  width: number; // percentage of page width
  height: number; // percentage of page height
  rotation?: number; // degrees (0-360 or -180 to 180)
  lockAspectRatio?: boolean; // keep aspect ratio when resizing
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
