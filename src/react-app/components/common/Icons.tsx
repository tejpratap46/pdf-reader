import { FC } from "react";

export const Ico: FC<{ d: string; size?: number }> = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export const IcoUpload    = ({ size = 28 }: { size?: number } = {}) => <Ico size={size} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />;
export const IcoPlay      = ({ size = 16 }: { size?: number } = {}) => <Ico size={size} d="M5 3l14 9-14 9V3z" />;
export const IcoPause     = ({ size = 16 }: { size?: number } = {}) => <Ico size={size} d="M6 4h4v16H6zM14 4h4v16h-4z" />;
export const IcoStop      = ({ size = 16 }: { size?: number } = {}) => <Ico size={size} d="M6 6h12v12H6z" />;
export const IcoChevL     = ({ size = 16 }: { size?: number } = {}) => <Ico size={size} d="M15 18l-6-6 6-6" />;
export const IcoChevR     = ({ size = 16 }: { size?: number } = {}) => <Ico size={size} d="M9 18l6-6-6-6" />;
export const IcoZoomIn    = ({ size = 16 }: { size?: number } = {}) => <Ico size={size} d="M11 5a6 6 0 1 0 0 12A6 6 0 0 0 11 5zm10 10l-3-3M11 8v6M8 11h6" />;
export const IcoZoomOut   = ({ size = 16 }: { size?: number } = {}) => <Ico size={size} d="M11 5a6 6 0 1 0 0 12A6 6 0 0 0 11 5zm10 10l-3-3M8 11h6" />;
export const IcoVolume    = ({ size = 16 }: { size?: number } = {}) => <Ico size={size} d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />;
export const IcoArrowR    = ({ size = 16 }: { size?: number } = {}) => <Ico size={size} d="M5 12h14M15 6l6 6-6 6M19 4v16" />;
export const IcoPanel     = ({ size = 16 }: { size?: number } = {}) => <Ico size={size} d="M3 3h18v18H3zM9 3v18" />;
export const IcoFile      = ({ size = 16 }: { size?: number } = {}) => <Ico size={size} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6" />;
export const IcoSun       = ({ size = 16 }: { size?: number } = {}) => <Ico size={size} d="M12 3v1M12 20v1M4.22 4.22l.7.7M18.36 18.36l.7.7M3 12h1M20 12h1M4.22 19.78l.7-.7M18.36 5.64l.7-.7M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z" />;
export const IcoMoon      = ({ size = 16 }: { size?: number } = {}) => <Ico size={size} d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />;
export const IcoMonitor   = ({ size = 16 }: { size?: number } = {}) => <Ico size={size} d="M2 3h20v14H2zM8 21h8M12 17v4" />;
export const IcoCheck     = ({ size = 14 }: { size?: number } = {}) => <Ico size={size} d="M20 6L9 17l-5-5" />;
export const IcoGlobe     = ({ size = 16 }: { size?: number } = {}) => <Ico size={size} d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />;
export const IcoLoader    = ({ size = 16 }: { size?: number } = {}) => <Ico size={size} d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />;
export const IcoX         = ({ size = 14 }: { size?: number } = {}) => <Ico size={size} d="M18 6L6 18M6 6l12 12" />;
export const IcoDownload  = ({ size = 14 }: { size?: number } = {}) => <Ico size={size} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />;
export const IcoEdit      = ({ size = 14 }: { size?: number } = {}) => <Ico size={size} d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />;

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

/* Markdown & AI Icons */
export const IcoMarkdown = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M6 16V8l3.5 4.5L13 8v8" />
    <path d="M18 12l-2.5 3-2.5-3" />
    <path d="M15.5 8v7" />
  </svg>
);

export const IcoSparkles = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.912 4.673a2 2 0 0 0 1.088 1.088L19.673 10.673a1 1 0 0 1 0 1.854l-4.673 1.912a2 2 0 0 0-1.088 1.088L12 20.2a1 1 0 0 1-1.854 0l-1.912-4.673a2 2 0 0 0-1.088-1.088L2.473 12.527a1 1 0 0 1 0-1.854l4.673-1.912a2 2 0 0 0 1.088-1.088L10.146 3a1 1 0 0 1 1.854 0z" />
    <path d="M19 19l.75 1.75L21.5 21.5l-1.75.75L19 24l-.75-1.75L16.5 21.5l1.75-.75L19 19z" />
  </svg>
);

export const IcoCode = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

export const IcoEye = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IcoClipboard = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

export const IcoEyeOff = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export const IcoUser = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const IcoMail = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

export const IcoLock = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const IcoLogOut = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export const IcoAlertCircle = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export const IcoInfo = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

export const IcoGoogle = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.98 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);


