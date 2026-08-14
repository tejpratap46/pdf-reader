import { useState, useEffect, useCallback, useRef } from "react";

export interface UseResizableSidebarOptions {
  storageKeyPrefix?: string;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  collapseThreshold?: number;
  defaultOpen?: boolean;
  side?: "left" | "right";
}

export interface ResizableSidebarState {
  width: number;
  isOpen: boolean;
  isDragging: boolean;
  setIsOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  toggleOpen: () => void;
  setWidth: (width: number) => void;
  resetWidth: () => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleTouchStart: (e: React.TouchEvent) => void;
}

export function useResizableSidebar(options: UseResizableSidebarOptions = {}): ResizableSidebarState {
  const {
    storageKeyPrefix = "folio_sidebar",
    defaultWidth = 320,
    minWidth = 240,
    maxWidth = 720,
    collapseThreshold = 140,
    defaultOpen = true,
    side = "left",
  } = options;

  const widthKey = `${storageKeyPrefix}_width`;
  const openKey = `${storageKeyPrefix}_open`;

  // Initialize width from localStorage if available
  const [width, setWidthState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(widthKey);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return defaultWidth;
  });

  // Initialize open state from localStorage
  const [isOpen, setIsOpenState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(openKey);
      if (saved !== null) {
        return saved === "true";
      }
    } catch {
      // ignore
    }
    return defaultOpen;
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragInfoRef = useRef<{
    startX: number;
    startWidth: number;
    currentWidth: number;
    lastIsOpen: boolean;
  }>({
    startX: 0,
    startWidth: width,
    currentWidth: width,
    lastIsOpen: isOpen,
  });

  // Persist open state
  const setIsOpen = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      setIsOpenState((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        try {
          localStorage.setItem(openKey, String(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [openKey]
  );

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, [setIsOpen]);

  // Persist width state
  const setWidth = useCallback(
    (w: number) => {
      const clamped = Math.max(minWidth, Math.min(maxWidth, w));
      setWidthState(clamped);
      try {
        localStorage.setItem(widthKey, String(clamped));
      } catch {
        // ignore
      }
    },
    [minWidth, maxWidth, widthKey]
  );

  const resetWidth = useCallback(() => {
    setWidth(defaultWidth);
  }, [setWidth, defaultWidth]);

  // Start dragging handler
  const startDragging = useCallback(
    (clientX: number) => {
      setIsDragging(true);
      dragInfoRef.current = {
        startX: clientX,
        startWidth: width,
        currentWidth: width,
        lastIsOpen: isOpen,
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width, isOpen]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only handle left click
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      startDragging(e.clientX);
    },
    [startDragging]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      startDragging(touch.clientX);
    },
    [startDragging]
  );

  // Global mousemove and mouseup listeners when dragging
  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragInfoRef.current.startX;
      const effectiveDelta = side === "right" ? -deltaX : deltaX;
      const proposedWidth = dragInfoRef.current.startWidth + effectiveDelta;
      const maxAllowed = Math.min(maxWidth, window.innerWidth * 0.75);

      if (proposedWidth < collapseThreshold) {
        // Snap close indication
        dragInfoRef.current.currentWidth = proposedWidth;
        setIsOpenState(false);
      } else {
        // Keep open and clamp width
        setIsOpenState(true);
        const clamped = Math.max(minWidth, Math.min(maxAllowed, proposedWidth));
        dragInfoRef.current.currentWidth = clamped;
        setWidthState(clamped);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragInfoRef.current.startX;
      const effectiveDelta = side === "right" ? -deltaX : deltaX;
      const proposedWidth = dragInfoRef.current.startWidth + effectiveDelta;
      const maxAllowed = Math.min(maxWidth, window.innerWidth * 0.75);

      if (proposedWidth < collapseThreshold) {
        dragInfoRef.current.currentWidth = proposedWidth;
        setIsOpenState(false);
      } else {
        setIsOpenState(true);
        const clamped = Math.max(minWidth, Math.min(maxAllowed, proposedWidth));
        dragInfoRef.current.currentWidth = clamped;
        setWidthState(clamped);
      }
    };

    const stopDragging = () => {
      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      const finalWidth = dragInfoRef.current.currentWidth;
      if (finalWidth < collapseThreshold) {
        setIsOpen(false);
      } else {
        const clamped = Math.max(minWidth, Math.min(maxWidth, finalWidth));
        setWidth(clamped);
        setIsOpen(true);
      }
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseup", stopDragging);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", stopDragging);
    window.addEventListener("touchcancel", stopDragging);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stopDragging);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", stopDragging);
      window.removeEventListener("touchcancel", stopDragging);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, minWidth, maxWidth, collapseThreshold, setIsOpen, setWidth, side]);

  return {
    width,
    isOpen,
    isDragging,
    setIsOpen,
    toggleOpen,
    setWidth,
    resetWidth,
    handleMouseDown,
    handleTouchStart,
  };
}
