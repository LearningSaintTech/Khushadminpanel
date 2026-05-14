import { useEffect, useRef, useState } from "react";

/**
 * Normalizes list endpoints used by admin `getAllInventoryCodes` and designer meta routes.
 * Each row: `{ code, name, isActive? }` → `{ value: code, label: name }`.
 */
export function normalizeInventoryCodeOptionsResponse(res) {
  const root = res?.data ?? res ?? {};
  const payload = root?.data ?? root;
  const list =
    payload?.items ||
    payload?.inventoryCodes ||
    payload?.codes ||
    payload?.data ||
    (Array.isArray(payload) ? payload : []);

  if (!Array.isArray(list)) return [];

  return list
    .filter((row) => row?.isActive !== false)
    .map((row) => ({
      value: String(row?.code || row?.name || "").trim(),
      label: String(row?.name || row?.code || "").trim(),
    }))
    .filter((row) => row.value.length > 0)
    .filter(
      (row, idx, arr) => arr.findIndex((x) => x.value === row.value) === idx,
    );
}

/** Searchable picker: list rows show `label (value)`; optional `buttonDisplay` for the closed control. */
export function SearchableInventoryCodeSelect({
  label,
  required,
  value,
  onChange,
  options,
  loading,
  placeholder,
  allowCustom = false,
  buttonDisplay,
}) {
  const wrapperRef = useRef(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const normalizedSearch = search.trim().toLowerCase();
  const filtered = normalizedSearch
    ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(normalizedSearch) ||
          opt.value.toLowerCase().includes(normalizedSearch),
      )
    : options;

  useEffect(() => {
    const onDocClick = (e) => {
      if (!wrapperRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-0.5 block text-xs font-semibold text-gray-700">
        {label}
      </label>
      <div className="space-y-1">
        <input
          className="w-full rounded-xl border-2 border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          placeholder={loading ? "Loading options..." : "Search options..."}
          value={search}
          onChange={(e) => {
            const next = e.target.value;
            setSearch(next);
            if (allowCustom) onChange(next);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          disabled={loading}
        />
        <input type="hidden" value={value || ""} required={required} readOnly />
        <button
          type="button"
          onClick={() => setOpen((s) => !s)}
          className="w-full rounded-xl border-2 border-gray-300 bg-white px-3 py-2 text-left text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-gray-50"
          disabled={loading}
        >
          {buttonDisplay != null && String(buttonDisplay).trim() !== ""
            ? buttonDisplay
            : value || placeholder}
        </button>
        {open && !loading ? (
          <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border-2 border-gray-200 bg-white shadow-lg">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="w-full border-b border-gray-100 px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
            >
              {placeholder}
            </button>
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-500">
                No matching options
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setSearch("");
                    setOpen(false);
                  }}
                  className="w-full border-b border-gray-100 px-3 py-2 text-left text-sm hover:bg-indigo-50"
                >
                  {opt.label} ({opt.value})
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
