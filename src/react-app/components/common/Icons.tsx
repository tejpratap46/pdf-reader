import { FC } from "react";

export const Ico: FC<{ d: string; size?: number }> = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export const IcoUpload    = () => <Ico size={28} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />;
export const IcoPlay      = () => <Ico d="M5 3l14 9-14 9V3z" />;
export const IcoPause     = () => <Ico d="M6 4h4v16H6zM14 4h4v16h-4z" />;
export const IcoStop      = () => <Ico d="M6 6h12v12H6z" />;
export const IcoChevL     = () => <Ico d="M15 18l-6-6 6-6" />;
export const IcoChevR     = () => <Ico d="M9 18l6-6-6-6" />;
export const IcoZoomIn    = () => <Ico d="M11 5a6 6 0 1 0 0 12A6 6 0 0 0 11 5zm10 10l-3-3M11 8v6M8 11h6" />;
export const IcoZoomOut   = () => <Ico d="M11 5a6 6 0 1 0 0 12A6 6 0 0 0 11 5zm10 10l-3-3M8 11h6" />;
export const IcoVolume    = () => <Ico d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />;
export const IcoArrowR    = () => <Ico d="M5 12h14M15 6l6 6-6 6M19 4v16" />;
export const IcoPanel     = () => <Ico d="M3 3h18v18H3zM9 3v18" />;
export const IcoFile      = () => <Ico d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6" />;
export const IcoSun       = () => <Ico d="M12 3v1M12 20v1M4.22 4.22l.7.7M18.36 18.36l.7.7M3 12h1M20 12h1M4.22 19.78l.7-.7M18.36 5.64l.7-.7M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z" />;
export const IcoMoon      = () => <Ico d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />;
export const IcoMonitor   = () => <Ico d="M2 3h20v14H2zM8 21h8M12 17v4" />;
export const IcoCheck     = () => <Ico size={14} d="M20 6L9 17l-5-5" />;
export const IcoGlobe     = () => <Ico d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />;
export const IcoLoader    = () => <Ico d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />;
export const IcoX         = () => <Ico size={14} d="M18 6L6 18M6 6l12 12" />;
export const IcoDownload  = () => <Ico size={14} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />;
export const IcoEdit      = () => <Ico size={14} d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />;

export const IcoScrollMode = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="3" width="12" height="5" rx="1" />
    <rect x="6" y="10" width="12" height="5" rx="1" />
    <rect x="6" y="17" width="12" height="4" rx="1" />
  </svg>
);

export const IcoSingleMode = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <line x1="9" y1="7" x2="15" y2="7" />
    <line x1="9" y1="11" x2="15" y2="11" />
  </svg>
);

/* PDF Editor Icons */
export const IcoSave        = () => <Ico size={18} d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8" />;
export const IcoRotateCw    = () => <Ico size={18} d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />;
export const IcoTrash       = () => <Ico size={18} d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />;
export const IcoPlus        = () => <Ico size={18} d="M12 5v14M5 12h14" />;
export const IcoCopy        = () => <Ico size={18} d="M8 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2m-6 12h8a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z" />;
export const IcoMoveUp      = () => <Ico size={18} d="M12 19V5M5 12l7-7 7 7" />;
export const IcoMoveDown    = () => <Ico size={18} d="M12 5v14M5 12l7 7 7-7" />;
export const IcoText        = () => <Ico size={18} d="M4 7V4h16v3M9 20h6M12 4v16" />;
export const IcoPen         = () => <Ico size={18} d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />;
export const IcoHighlighter = () => <Ico size={18} d="M9 11l-6 6v3h3l6-6m-3-3l6-6 4 4-6 6m-4-4l4 4" />;
export const IcoStamp       = () => <Ico size={18} d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />;
export const IcoImage       = () => <Ico size={18} d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm11.5 6l-5-5L4 20" />;
export const IcoSignature   = () => <Ico size={18} d="M16 3l4 4L8 19H4v-4L16 3z" />;
export const IcoPages       = () => <Ico size={18} d="M4 6h16M4 12h16M4 18h16" />;
export const IcoUndo        = () => <Ico size={18} d="M3 7v6h6M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />;
