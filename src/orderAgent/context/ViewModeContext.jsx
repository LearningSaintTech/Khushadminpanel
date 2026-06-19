import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export const VIEW_ORDER = "order";
export const VIEW_ITEM = "item";

const STORAGE_KEY = "orderAgent_viewMode";

const ViewModeContext = createContext({
  viewMode: VIEW_ITEM,
  setViewMode: () => {},
  isByOrder: false,
  isByItem: true,
});

function readStoredViewMode() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === VIEW_ORDER || stored === VIEW_ITEM) return stored;
  } catch {
    /* ignore */
  }
  return VIEW_ITEM;
}

export function ViewModeProvider({ children }) {
  const [viewMode, setViewModeState] = useState(readStoredViewMode);

  const setViewMode = useCallback((mode) => {
    const next = mode === VIEW_ORDER ? VIEW_ORDER : VIEW_ITEM;
    setViewModeState(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== STORAGE_KEY) return;
      const next = event.newValue;
      if (next === VIEW_ORDER || next === VIEW_ITEM) {
        setViewModeState(next);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({
      viewMode,
      setViewMode,
      isByOrder: viewMode === VIEW_ORDER,
      isByItem: viewMode === VIEW_ITEM,
    }),
    [viewMode, setViewMode],
  );

  return <ViewModeContext.Provider value={value}>{children}</ViewModeContext.Provider>;
}

export function useViewMode() {
  return useContext(ViewModeContext);
}
