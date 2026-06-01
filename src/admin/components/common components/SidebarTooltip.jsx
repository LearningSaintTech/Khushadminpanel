import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Tooltip for collapsed sidebar — portaled + fixed so scroll area does not clip it. */
export default function SidebarTooltip({ label, show, lightMode = false, children }) {
  const triggerRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      top: rect.top + rect.height / 2,
      left: rect.right + 8,
    });
  }, []);

  const showTip = useCallback(() => {
    updatePosition();
    setVisible(true);
  }, [updatePosition]);

  const hideTip = useCallback(() => {
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [visible, updatePosition]);

  if (!show || !label) return children;

  const tooltipEl = visible ? (
    <div
      role="tooltip"
      style={{
        position: "fixed",
        top: coords.top,
        left: coords.left,
        transform: "translateY(-50%)",
        zIndex: 9999,
      }}
      className={`pointer-events-none whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-medium shadow-lg ${
        lightMode
          ? "border border-slate-200 bg-white text-slate-800"
          : "border border-violet-900/50 bg-[#1a0a2e] text-white"
      }`}
    >
      {label}
    </div>
  ) : null;

  return (
    <>
      <div
        ref={triggerRef}
        className="w-full"
        onMouseEnter={showTip}
        onMouseLeave={hideTip}
        onFocus={showTip}
        onBlur={hideTip}
      >
        {children}
      </div>
      {tooltipEl && createPortal(tooltipEl, document.body)}
    </>
  );
}
