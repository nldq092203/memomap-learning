"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { X, GripVertical, Minus } from "lucide-react";
import { getNextFloatingWindowZIndex } from "@/lib/utils/z-index-manager";

type ResizeDirection = "right" | "bottom" | "bottom-right";

type FloatingWindowProps = {
  id: string;
  title: string;
  persistKey: string;
  defaultWidth?: number;
  defaultHeight?: number;
  defaultX?: number;
  defaultY?: number;
  minWidth?: number;
  minHeight?: number;
  className?: string;
  children: React.ReactNode;
  forceZIndex?: number;
  onClose?: () => void;
};

type LayoutState = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const SNAP_THRESHOLD = 20;
const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 360;
const DEFAULT_X = 80;
const DEFAULT_Y = 80;
const STORAGE_PREFIX = "floating-window:";
const DOCKED_WIDTH = 260;
const DOCKED_HEIGHT = 70;

function getViewportSize() {
  if (typeof window === "undefined") {
    return { width: 0, height: 0 };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function clampAndSnapPosition(
  x: number,
  y: number,
  width: number,
  height: number
): Pick<LayoutState, "x" | "y"> {
  const { width: vw, height: vh } = getViewportSize();
  if (!vw || !vh) {
    return { x, y };
  }

  const maxX = Math.max(vw - width, 0);
  const maxY = Math.max(vh - height, 0);

  let nextX = Math.min(Math.max(0, x), maxX);
  let nextY = Math.min(Math.max(0, y), maxY);

  if (Math.abs(nextX - 0) <= SNAP_THRESHOLD) {
    nextX = 0;
  } else if (Math.abs(maxX - nextX) <= SNAP_THRESHOLD) {
    nextX = maxX;
  }

  if (Math.abs(nextY - 0) <= SNAP_THRESHOLD) {
    nextY = 0;
  } else if (Math.abs(maxY - nextY) <= SNAP_THRESHOLD) {
    nextY = maxY;
  }

  return { x: nextX, y: nextY };
}

function clampAndSnapSize(
  x: number,
  y: number,
  width: number,
  height: number,
  minWidth: number,
  minHeight: number
): Pick<LayoutState, "width" | "height"> {
  const { width: vw, height: vh } = getViewportSize();
  if (!vw || !vh) {
    return {
      width: Math.max(width, minWidth),
      height: Math.max(height, minHeight),
    };
  }

  const maxWidth = Math.max(vw - x, minWidth);
  const maxHeight = Math.max(vh - y, minHeight);

  let nextWidth = Math.min(Math.max(width, minWidth), maxWidth);
  let nextHeight = Math.min(Math.max(height, minHeight), maxHeight);

  const rightGap = vw - (x + nextWidth);
  if (Math.abs(rightGap) <= SNAP_THRESHOLD) {
    nextWidth = vw - x;
  }

  const bottomGap = vh - (y + nextHeight);
  if (Math.abs(bottomGap) <= SNAP_THRESHOLD) {
    nextHeight = vh - y;
  }

  return { width: nextWidth, height: nextHeight };
}

function constrainLayout(
  layout: LayoutState,
  minWidth: number,
  minHeight: number
): LayoutState {
  const size = clampAndSnapSize(
    layout.x,
    layout.y,
    layout.width,
    layout.height,
    minWidth,
    minHeight
  );
  const position = clampAndSnapPosition(
    layout.x,
    layout.y,
    size.width,
    size.height
  );
  return {
    x: position.x,
    y: position.y,
    width: size.width,
    height: size.height,
  };
}

function disableGlobalTextSelection() {
  if (typeof document === "undefined") return;
  const bodyStyle = document.body
    .style as CSSStyleDeclaration & { webkitUserSelect?: string };
  bodyStyle.userSelect = "none";
  if (bodyStyle.webkitUserSelect !== undefined) {
    bodyStyle.webkitUserSelect = "none";
  }
}

function enableGlobalTextSelection() {
  if (typeof document === "undefined") return;
  const bodyStyle = document.body
    .style as CSSStyleDeclaration & { webkitUserSelect?: string };
  bodyStyle.userSelect = "";
  if (bodyStyle.webkitUserSelect !== undefined) {
    bodyStyle.webkitUserSelect = "";
  }
}

export const FloatingWindow: React.FC<FloatingWindowProps> = ({
  id,
  title,
  persistKey,
  defaultWidth = DEFAULT_WIDTH,
  defaultHeight = DEFAULT_HEIGHT,
  defaultX = DEFAULT_X,
  defaultY = DEFAULT_Y,
  minWidth = 320,
  minHeight = 200,
  className,
  children,
  forceZIndex,
  onClose,
}) => {
  const [mounted, setMounted] = React.useState(false);
  const [portalContainer, setPortalContainer] =
    React.useState<HTMLElement | null>(null);

  const [position, setPosition] = React.useState<{ x: number; y: number }>({
    x: defaultX,
    y: defaultY,
  });
  const [size, setSize] = React.useState<{ width: number; height: number }>({
    width: defaultWidth,
    height: defaultHeight,
  });

  const [isDragging, setIsDragging] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState(false);
  const [resizeDirection, setResizeDirection] =
    React.useState<ResizeDirection | null>(null);
  const [zIndex, setZIndex] = React.useState<number>(() =>
    forceZIndex ?? getNextFloatingWindowZIndex()
  );
  const [isDocked, setIsDocked] = React.useState(false);
  const [activePointerId, setActivePointerId] = React.useState<number | null>(
    null
  );

  const positionRef = React.useRef(position);
  const sizeRef = React.useRef(size);
  const dockedPositionRef = React.useRef<{ x: number; y: number } | null>(null);
  const dockedSizeRef = React.useRef<{ width: number; height: number } | null>(
    null
  );
  const dragStateRef = React.useRef<{
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);
  const hasInitializedLayout = React.useRef(false);

  React.useEffect(() => {
    positionRef.current = position;
  }, [position]);

  React.useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  React.useEffect(() => {
    setMounted(true);
    if (typeof document !== "undefined") {
      setPortalContainer(document.body);
    }
  }, []);

  const persistLayout = React.useCallback(() => {
    if (!persistKey || typeof window === "undefined") return;
    const layout: LayoutState = {
      x: positionRef.current.x,
      y: positionRef.current.y,
      width: sizeRef.current.width,
      height: sizeRef.current.height,
    };
    try {
      window.localStorage.setItem(
        `${STORAGE_PREFIX}${persistKey}`,
        JSON.stringify(layout)
      );
    } catch {
      // ignore
    }
  }, [persistKey]);

  React.useEffect(() => {
    if (!persistKey || typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem(
        `${STORAGE_PREFIX}${persistKey}`
      );
      if (!stored) return;
      const parsed = JSON.parse(stored) as Partial<LayoutState> | null;
      if (!parsed) return;

      const layout: LayoutState = {
        x: typeof parsed.x === "number" ? parsed.x : defaultX,
        y: typeof parsed.y === "number" ? parsed.y : defaultY,
        width:
          typeof parsed.width === "number" ? parsed.width : defaultWidth,
        height:
          typeof parsed.height === "number" ? parsed.height : defaultHeight,
      };

      const constrained = constrainLayout(layout, minWidth, minHeight);
      setPosition({ x: constrained.x, y: constrained.y });
      setSize({
        width: constrained.width,
        height: constrained.height,
      });
      hasInitializedLayout.current = true;
    } catch {
      // ignore
    }
  }, [
    persistKey,
    defaultX,
    defaultY,
    defaultWidth,
    defaultHeight,
    minWidth,
    minHeight,
  ]);

  // Ensure initial layout fits within the current viewport,
  // especially important on smaller mobile screens.
  React.useEffect(() => {
    if (hasInitializedLayout.current) return;

    const layout: LayoutState = {
      x: defaultX,
      y: defaultY,
      width: defaultWidth,
      height: defaultHeight,
    };
    const constrained = constrainLayout(layout, minWidth, minHeight);
    setPosition({ x: constrained.x, y: constrained.y });
    setSize({
      width: constrained.width,
      height: constrained.height,
    });
    hasInitializedLayout.current = true;
  }, [defaultX, defaultY, defaultWidth, defaultHeight, minWidth, minHeight]);

  React.useEffect(() => {
    if (!isDragging && !isResizing) return;
    if (typeof window === "undefined") return;

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragStateRef.current) return;
      if (activePointerId != null && event.pointerId !== activePointerId) {
        return;
      }

      const deltaX = event.clientX - dragStateRef.current.startClientX;
      const deltaY = event.clientY - dragStateRef.current.startClientY;

      if (isDragging) {
        const rawX = dragStateRef.current.startX + deltaX;
        const rawY = dragStateRef.current.startY + deltaY;
        const next = clampAndSnapPosition(
          rawX,
          rawY,
          sizeRef.current.width,
          sizeRef.current.height
        );
        setPosition(next);
      } else if (isResizing && resizeDirection) {
        let rawWidth = dragStateRef.current.startWidth;
        let rawHeight = dragStateRef.current.startHeight;

        if (resizeDirection === "right" || resizeDirection === "bottom-right") {
          rawWidth = dragStateRef.current.startWidth + deltaX;
        }
        if (resizeDirection === "bottom" || resizeDirection === "bottom-right") {
          rawHeight = dragStateRef.current.startHeight + deltaY;
        }

        const nextSize = clampAndSnapSize(
          positionRef.current.x,
          positionRef.current.y,
          rawWidth,
          rawHeight,
          minWidth,
          minHeight
        );
        setSize(nextSize);
      }
    };

    const finishInteraction = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection(null);
      dragStateRef.current = null;
      setActivePointerId(null);
      enableGlobalTextSelection();
      persistLayout();
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (activePointerId != null && event.pointerId !== activePointerId) {
        return;
      }
      finishInteraction();
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (activePointerId != null && event.pointerId !== activePointerId) {
        return;
      }
      finishInteraction();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [
    isDragging,
    isResizing,
    resizeDirection,
    minWidth,
    minHeight,
    persistLayout,
    activePointerId,
  ]);

  const handleActivate = React.useCallback(() => {
    if (forceZIndex != null) return;
    setZIndex(getNextFloatingWindowZIndex());
  }, [forceZIndex]);

  const handleHeaderPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    handleActivate();
    setIsDragging(true);
    disableGlobalTextSelection();
    setActivePointerId(event.pointerId);

    dragStateRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: positionRef.current.x,
      startY: positionRef.current.y,
      startWidth: sizeRef.current.width,
      startHeight: sizeRef.current.height,
    };
  };

  const handleToggleDock = React.useCallback(() => {
    const { width: vw, height: vh } = getViewportSize();
    if (!vw || !vh) return;

    // If already docked, restore previous position and size (if any)
    if (dockedPositionRef.current && dockedSizeRef.current) {
      const prevPos = dockedPositionRef.current;
      const prevSize = dockedSizeRef.current;
      dockedPositionRef.current = null;
      dockedSizeRef.current = null;
      setIsDocked(false);

      const layout: LayoutState = {
        x: prevPos.x,
        y: prevPos.y,
        width: prevSize.width,
        height: prevSize.height,
      };
      const constrained = constrainLayout(layout, minWidth, minHeight);
      setPosition({ x: constrained.x, y: constrained.y });
      setSize({
        width: constrained.width,
        height: constrained.height,
      });
      return;
    }

    // Save current position and size for restore
    dockedPositionRef.current = { ...positionRef.current };
    dockedSizeRef.current = { ...sizeRef.current };

    // Dock to bottom-right with compact "title-only" size
    const width = Math.max(
      minWidth,
      Math.min(DOCKED_WIDTH, vw)
    );
    const height = Math.min(DOCKED_HEIGHT, vh);
    const margin = 16;
    const targetX = Math.max(vw - width - margin, 0);
    const targetY = Math.max(vh - height - margin, 0);

    const docked = clampAndSnapPosition(targetX, targetY, width, height);
    setPosition(docked);
    setSize({ width, height });
    setIsDocked(true);
  }, [minWidth, minHeight]);

  const handleResizePointerDown = (
    event: React.PointerEvent,
    direction: ResizeDirection
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    handleActivate();
    setIsResizing(true);
    setResizeDirection(direction);
    disableGlobalTextSelection();
    setActivePointerId(event.pointerId);

    dragStateRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: positionRef.current.x,
      startY: positionRef.current.y,
      startWidth: sizeRef.current.width,
      startHeight: sizeRef.current.height,
    };
  };

  if (!mounted || !portalContainer) {
    return null;
  }

  const style: React.CSSProperties = {
    position: "fixed",
    left: position.x,
    top: position.y,
    width: Math.min(size.width, getViewportSize().width || size.width),
    height: Math.min(size.height, getViewportSize().height || size.height),
    zIndex: forceZIndex ?? zIndex,
  };

  return createPortal(
    <div
      id={id}
      style={style}
      onPointerDown={handleActivate}
      className={`pointer-events-auto ${className ?? ""}`}
    >
      <Card className="relative flex h-full flex-col overflow-hidden rounded-2xl md:rounded-3xl border border-white/30 bg-white/15 shadow-[0_16px_40px_rgba(15,23,42,0.5)] md:shadow-[0_22px_60px_rgba(15,23,42,0.55)] backdrop-blur-2xl backdrop-saturate-150 text-sm md:text-base">
        <CardHeader
          className={`flex cursor-grab select-none items-center justify-between gap-2 border-b border-white/20 bg-white/5 px-2.5 md:px-3 py-1.5 ${
            isDocked ? "h-10" : ""
          }`}
          style={{ touchAction: "none" }}
          onPointerDown={handleHeaderPointerDown}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-5 w-5 md:h-6 md:w-6 flex-none items-center justify-center rounded-full bg-primary/10 text-primary shadow-sm">
              <GripVertical className="h-3 w-3 md:h-3.5 md:w-3.5" />
            </span>
            {isDocked ? (
              <CardTitle className="flex min-w-0 items-center truncate text-[11px] md:text-[12px] font-semibold tracking-wide text-primary leading-none">
                <span className="truncate">{title}</span>
              </CardTitle>
            ) : (
              <CardTitle className="truncate text-[10px] md:text-[11px] font-semibold uppercase tracking-wide text-primary/90">
                <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary/15 px-2.5 md:px-3 py-0.5 md:py-1 text-[11px] md:text-[13px] font-semibold uppercase tracking-wide text-primary shadow-sm">
                  <span className="truncate">{title}</span>
                </span>
              </CardTitle>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Dock window"
              onClick={handleToggleDock}
              onPointerDown={(event) => event.stopPropagation()}
              className="inline-flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-full text-xs text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
            >
              <Minus className="h-3 w-3 md:h-3.5 md:w-3.5" />
            </button>
            {onClose && (
              <button
                type="button"
                aria-label="Close window"
                onClick={onClose}
                onPointerDown={(event) => event.stopPropagation()}
                className="inline-flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-full text-xs text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
              >
                <X className="h-3 w-3 md:h-3.5 md:w-3.5" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="relative flex-1 overflow-auto p-2.5 md:p-3 text-foreground">
          {children}
        </CardContent>

        <div
          className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize rounded-tl-md border-l border-t border-border/70 bg-background/60"
          style={{ touchAction: "none" }}
          onPointerDown={(event) => handleResizePointerDown(event, "bottom-right")}
        />
        <div
          className="absolute bottom-0 left-2 right-4 h-1.5 cursor-s-resize bg-transparent hover:bg-muted/60"
          style={{ touchAction: "none" }}
          onPointerDown={(event) => handleResizePointerDown(event, "bottom")}
        />
        <div
          className="absolute bottom-4 right-0 top-2 w-1.5 cursor-e-resize bg-transparent hover:bg-muted/60"
          style={{ touchAction: "none" }}
          onPointerDown={(event) => handleResizePointerDown(event, "right")}
        />
      </Card>
    </div>,
    portalContainer
  );
};
