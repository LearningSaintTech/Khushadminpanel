/** WhatsApp-style template preview (approximate). */

function resolveVarLabel(variables, key) {
  if (!key) return "";
  const v = variables.find((x) => x.key === key);
  return v ? `${v.label}` : key;
}

function sampleValue(variables, key) {
  if (!key) return "…";
  const v = variables.find((x) => x.key === key);
  return v?.sampleValue && v.sampleValue !== "—" ? v.sampleValue : "…";
}

function fillBody(bodyText, variableSlots, variables) {
  let text = bodyText || "";
  const sorted = [...(variableSlots || [])].sort((a, b) => a.slot - b.slot);
  for (const { slot, variableKey } of sorted) {
    const sample = sampleValue(variables, variableKey);
    text = text.replace(new RegExp(`\\{\\{${slot}\\}\\}`, "g"), sample);
  }
  return text.replace(/\{\{\d+\}\}/g, "…");
}

export function WhatsappTemplatePreview({ form, variables = [] }) {
  const headerFormat = String(form.headerConfig?.format || "NONE").toUpperCase();
  const body = fillBody(form.bodyText, form.variableSlots, variables);
  const footer = form.footerText || "";
  const buttons = (form.buttons || []).filter((b) => b?.text?.trim());

  return (
    <div className="mx-auto max-w-xs rounded-2xl border border-stone-200 bg-[#e5ddd5] p-3 shadow-inner">
      <div className="rounded-xl bg-white shadow-sm overflow-hidden">
        {headerFormat !== "NONE" ? (
          <div className="border-b border-stone-100 bg-stone-50">
            {headerFormat === "TEXT" ? (
              <p className="px-3 py-2 text-[11px] font-semibold text-stone-800">
                {form.headerConfig?.variableKey
                  ? sampleValue(variables, form.headerConfig.variableKey)
                  : form.headerConfig?.text || "Header"}
              </p>
            ) : (
              <div className="flex h-28 items-center justify-center bg-stone-200 text-[10px] text-stone-500">
                {headerFormat === "IMAGE" && "🖼 Image header"}
                {headerFormat === "VIDEO" && "▶ Video header"}
                {headerFormat === "DOCUMENT" && "📄 Document header"}
                {form.headerConfig?.variableKey ? (
                  <span className="ml-1 text-[9px]">
                    ({resolveVarLabel(variables, form.headerConfig.variableKey)})
                  </span>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        <div className="px-3 py-2.5">
          <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-stone-800">{body || "Body text…"}</p>
          {footer ? (
            <p className="mt-2 text-[9px] text-stone-400">{footer}</p>
          ) : null}
        </div>

        {buttons.length > 0 ? (
          <div className="border-t border-stone-100">
            {buttons.map((btn, i) => (
              <div
                key={i}
                className="border-t border-stone-100 px-3 py-2 text-center text-[11px] font-medium text-[#00a5f4] first:border-t-0"
              >
                {btn.type === "PHONE_NUMBER" ? "📞 " : "🔗 "}
                {btn.text}
                {btn.type === "URL" && btn.variableKey ? (
                  <span className="block text-[8px] font-normal text-stone-400">
                    +{sampleValue(variables, btn.variableKey)}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-center text-[9px] text-stone-500">Preview with sample variable values</p>
    </div>
  );
}
