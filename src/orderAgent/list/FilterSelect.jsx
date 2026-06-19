import { inputClass } from "../orderAgentShared";

/**
 * Styled <select> for list filters (status, payment, provider, etc.).
 * Supports flat `options` or grouped `optionGroups`: [{ label, options: [...] }]
 */
export default function FilterSelect({
  label,
  value,
  onChange,
  disabled = false,
  options = [],
  optionGroups = null,
  id,
}) {
  const selectId = id || `filter-${label?.replace(/\s+/g, "-").toLowerCase()}`;
  const groups = Array.isArray(optionGroups) && optionGroups.length > 0 ? optionGroups : null;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={selectId} className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} w-full disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {groups
          ? groups.map((group) => (
              <optgroup key={group.label || "default"} label={group.label || ""}>
                {group.options.map((opt) => (
                  <option key={opt.value || `all-${group.label}-${opt.label}`} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
            ))
          : options.map((opt) => (
              <option key={opt.value || `all-${opt.label}`} value={opt.value}>
                {opt.label}
              </option>
            ))}
      </select>
    </div>
  );
}
