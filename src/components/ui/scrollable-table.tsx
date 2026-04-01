"use client";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Wraps a table (or any wide content) and renders a sticky horizontal
 * scrollbar pinned to the bottom of the viewport. The scrollbar is
 * always visible so users know the table is scrollable.
 */
export function ScrollableTable({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);
  const syncing = useRef(false);

  // Measure scroll dimensions
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    function measure() {
      setScrollWidth(el!.scrollWidth);
      setClientWidth(el!.clientWidth);
    }
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const mo = new MutationObserver(measure);
    mo.observe(el, { childList: true, subtree: true });

    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  const syncFromContent = useCallback(() => {
    if (syncing.current || !barRef.current || !contentRef.current) return;
    syncing.current = true;
    barRef.current.scrollLeft = contentRef.current.scrollLeft;
    requestAnimationFrame(() => {
      syncing.current = false;
    });
  }, []);

  const syncFromBar = useCallback(() => {
    if (syncing.current || !contentRef.current || !barRef.current) return;
    syncing.current = true;
    contentRef.current.scrollLeft = barRef.current.scrollLeft;
    requestAnimationFrame(() => {
      syncing.current = false;
    });
  }, []);

  const hasOverflow = scrollWidth > clientWidth + 1;

  return (
    <div className={cn("relative", className)}>
      {/* Table content — hide native scrollbar, we provide our own */}
      <div
        ref={contentRef}
        className="overflow-x-auto scrollbar-hide"
        onScroll={syncFromContent}
      >
        {children}
      </div>

      {/* Sticky scrollbar — always visible at bottom of viewport */}
      <div
        ref={barRef}
        className="sticky-scrollbar sticky bottom-0 z-10 overflow-x-auto border-t border-border/40 bg-muted/60 backdrop-blur-sm"
        onScroll={syncFromBar}
      >
        <div
          style={{
            width: hasOverflow ? scrollWidth : "100%",
            height: 1,
          }}
        />
      </div>
    </div>
  );
}
