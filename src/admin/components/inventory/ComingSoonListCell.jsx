import { useEffect, useState } from "react";
import {
  launchDateToApiValue,
  launchDateToInputValue,
} from "../../utils/buildItemCreateFormData";

/**
 * Inline coming-soon + launch date editor for item listing tables.
 */
export default function ComingSoonListCell({ item, onSave, compact = false }) {
  const [isComingSoon, setIsComingSoon] = useState(Boolean(item?.isComingSoon));
  const [launchDate, setLaunchDate] = useState(launchDateToInputValue(item?.launchDate));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setIsComingSoon(Boolean(item?.isComingSoon));
    setLaunchDate(launchDateToInputValue(item?.launchDate));
  }, [item?._id, item?.isComingSoon, item?.launchDate]);

  const dirty =
    Boolean(item?.isComingSoon) !== isComingSoon ||
    launchDateToInputValue(item?.launchDate) !== launchDate;

  const handleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!item?._id || saving) return;
    setSaving(true);
    try {
      await onSave(item._id, {
        isComingSoon,
        launchDate: launchDateToApiValue(launchDate),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`flex flex-col gap-1.5 min-w-[10.5rem] ${compact ? "text-[10px]" : "text-xs"}`}
      onClick={(e) => e.stopPropagation()}
    >
      <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isComingSoon}
          onChange={(e) => setIsComingSoon(e.target.checked)}
          className="rounded border-border"
        />
        <span className={`font-medium ${isComingSoon ? "text-amber-800" : "text-stone-600"}`}>
          Coming soon
        </span>
      </label>
      <input
        type="date"
        value={launchDate}
        onChange={(e) => setLaunchDate(e.target.value)}
        className={`w-full rounded border border-black/20 bg-white px-1.5 py-1 ${
          compact ? "text-[10px]" : "text-xs"
        }`}
        title="Launch date"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={!dirty || saving}
        className={`self-start rounded border px-2 py-0.5 font-medium transition-colors disabled:opacity-40 ${
          compact ? "text-[10px]" : "text-xs"
        } border-amber-200 text-amber-900 hover:bg-amber-600 hover:text-white`}
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
