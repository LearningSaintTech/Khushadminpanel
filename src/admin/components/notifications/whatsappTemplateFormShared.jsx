import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Trash2, Image, Link2, Phone } from "lucide-react";
import { adminNotificationApi } from "../../services/notificationApi.js";
import { Field, FormSection, fieldClass } from "./notificationsShared";
import { WhatsappTemplatePreview } from "./whatsappTemplatePreview.jsx";

export const HEADER_FORMATS = [
  { id: "NONE", label: "No header" },
  { id: "TEXT", label: "Text header" },
  { id: "IMAGE", label: "Image header" },
  { id: "VIDEO", label: "Video header" },
  { id: "DOCUMENT", label: "Document header" },
];

export const BUTTON_TYPES = [
  { id: "URL", label: "URL / link button" },
  { id: "PHONE_NUMBER", label: "Call button" },
  { id: "QUICK_REPLY", label: "Quick reply" },
];

export const FORM_INITIAL_TEMPLATE = {
  name: "",
  language: "en",
  category: "UTILITY",
  module: "order",
  templateKey: "",
  attachedEventKeys: [],
  bodyText: "",
  variableSlots: [],
  footerText: "",
  headerConfig: {
    format: "NONE",
    text: "",
    variableKey: "",
    mediaSampleUrl: "",
    documentFilename: "document.pdf",
  },
  buttons: [],
};

/** Parse {{1}}, {{3}}, {{2}} from body — any order. */
export function extractBodySlots(bodyText = "") {
  const matches = String(bodyText).match(/\{\{(\d+)\}\}/g) || [];
  const slots = [...new Set(matches.map((m) => parseInt(m.replace(/\D/g, ""), 10)))];
  return slots.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
}

export function slotsToMapping(variableSlots = []) {
  const map = new Map();
  for (const s of variableSlots || []) {
    if (s?.slot > 0 && s?.variableKey) map.set(s.slot, s.variableKey);
  }
  return map;
}

export function mappingToSlots(slotMap) {
  return [...slotMap.entries()]
    .filter(([, key]) => key)
    .map(([slot, variableKey]) => ({ slot: Number(slot), variableKey }))
    .sort((a, b) => a.slot - b.slot);
}

/** Parse synced Meta components into form fields. */
export function parseComponentsToForm(components = []) {
  const list = Array.isArray(components) ? components : [];
  const header = list.find((c) => String(c?.type).toUpperCase() === "HEADER");
  const body = list.find((c) => String(c?.type).toUpperCase() === "BODY");
  const footer = list.find((c) => String(c?.type).toUpperCase() === "FOOTER");
  const buttonsComp = list.find((c) => String(c?.type).toUpperCase() === "BUTTONS");

  const headerConfig = {
    format: "NONE",
    text: "",
    variableKey: "",
    mediaSampleUrl: "",
    documentFilename: "document.pdf",
  };
  if (header) {
    const format = String(header.format || "TEXT").toUpperCase();
    headerConfig.format = format;
    if (format === "TEXT") headerConfig.text = header.text || "";
    else if (["IMAGE", "VIDEO", "DOCUMENT"].includes(format)) {
      headerConfig.mediaSampleUrl = header.example?.header_url?.[0] || "";
    }
  }

  const buttons = (buttonsComp?.buttons || []).map((btn, index) => ({
    index,
    type: String(btn?.type || "URL").toUpperCase(),
    text: btn?.text || "",
    url: btn?.url || "",
    variableKey: "",
    phoneNumber: btn?.phone_number || "",
    urlExample: Array.isArray(btn?.example) ? btn.example[0] : btn?.example || "",
  }));

  return {
    bodyText: body?.text || "",
    footerText: footer?.text || "",
    headerConfig,
    buttons,
  };
}

export function rowToForm(row) {
  const parsed = parseComponentsToForm(row?.components);
  return {
    name: row?.metaTemplateName || "",
    language: row?.language || "en",
    category: row?.category || "UTILITY",
    module: row?.module || "order",
    templateKey: row?.templateKey || "",
    attachedEventKeys: row?.attachedEventKeys || [],
    bodyText: row?.bodyText || parsed.bodyText || "",
    variableSlots: row?.variableSlots || [],
    footerText: row?.footerText ?? parsed.footerText ?? "",
    headerConfig: row?.headerConfig?.format ? row.headerConfig : parsed.headerConfig,
    buttons: row?.buttons?.length ? row.buttons : parsed.buttons,
  };
}

const REGISTER_INITIAL = {
  key: "",
  label: "",
  dataPath: "",
  sampleValue: "",
};

function VariableSelect({ value, onChange, variables, varsLoading, placeholder = "— Select variable —" }) {
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className={`${fieldClass} min-w-[10rem] flex-1`}
      disabled={varsLoading}
    >
      <option value="">{placeholder}</option>
      {variables.map((v) => (
        <option key={v.key} value={v.key}>
          {v.label} ({v.key}){v.module === "common" ? " · common" : ""}
        </option>
      ))}
    </select>
  );
}

export function WhatsappTemplateConfigFields({
  form,
  setForm,
  modules = {},
  readOnlyMeta = false,
  showPreview = true,
}) {
  const [variables, setVariables] = useState([]);
  const [varsLoading, setVarsLoading] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState(REGISTER_INITIAL);
  const [registerError, setRegisterError] = useState("");

  const moduleId = form.module || "order";
  const moduleDef = modules[moduleId] || { label: moduleId, events: [] };
  const headerFormat = String(form.headerConfig?.format || "NONE").toUpperCase();

  const bodySlots = useMemo(() => extractBodySlots(form.bodyText), [form.bodyText]);
  const slotMap = useMemo(() => slotsToMapping(form.variableSlots), [form.variableSlots]);

  const loadVariables = useCallback(async () => {
    setVarsLoading(true);
    try {
      const data = await adminNotificationApi.listWhatsappVariables({ module: moduleId });
      const list = data?.list ?? data?.data?.list ?? [];
      setVariables(Array.isArray(list) ? list : []);
    } catch {
      setVariables([]);
    } finally {
      setVarsLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    loadVariables();
  }, [loadVariables]);

  const setHeader = (patch) => {
    setForm((f) => ({
      ...f,
      headerConfig: { ...FORM_INITIAL_TEMPLATE.headerConfig, ...f.headerConfig, ...patch },
    }));
  };

  const setSlotVariable = (slot, variableKey) => {
    const next = new Map(slotMap);
    if (variableKey) next.set(slot, variableKey);
    else next.delete(slot);
    setForm((f) => ({ ...f, variableSlots: mappingToSlots(next) }));
  };

  const toggleEvent = (eventKey) => {
    const current = new Set(form.attachedEventKeys || []);
    if (current.has(eventKey)) current.delete(eventKey);
    else current.add(eventKey);
    setForm((f) => ({
      ...f,
      attachedEventKeys: [...current],
      templateKey: f.templateKey === eventKey && !current.has(eventKey) ? "" : f.templateKey,
    }));
  };

  const setPrimaryEvent = (eventKey) => {
    setForm((f) => ({
      ...f,
      templateKey: eventKey,
      attachedEventKeys: (f.attachedEventKeys || []).filter((k) => k !== eventKey),
    }));
  };

  const addButton = () => {
    if ((form.buttons || []).length >= 3) return;
    setForm((f) => ({
      ...f,
      buttons: [
        ...(f.buttons || []),
        {
          index: (f.buttons || []).length,
          type: "URL",
          text: "",
          url: "",
          variableKey: "",
          phoneNumber: "",
          urlExample: "",
        },
      ],
    }));
  };

  const updateButton = (idx, patch) => {
    setForm((f) => ({
      ...f,
      buttons: (f.buttons || []).map((b, i) => (i === idx ? { ...b, ...patch } : b)),
    }));
  };

  const removeButton = (idx) => {
    setForm((f) => ({
      ...f,
      buttons: (f.buttons || []).filter((_, i) => i !== idx).map((b, i) => ({ ...b, index: i })),
    }));
  };

  const handleRegister = async () => {
    setRegisterError("");
    try {
      await adminNotificationApi.registerWhatsappVariable({
        module: moduleId,
        key: registerForm.key.trim(),
        label: registerForm.label.trim() || registerForm.key.trim(),
        dataPath: registerForm.dataPath.trim() || registerForm.key.trim(),
        sampleValue: registerForm.sampleValue.trim() || "—",
      });
      setRegisterOpen(false);
      setRegisterForm(REGISTER_INITIAL);
      await loadVariables();
    } catch (e) {
      setRegisterError(e?.message || "Failed to register variable");
    }
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
      <div className="space-y-3 min-w-0">
        <FormSection
          title="Module & events"
          hint="Module loads its variables. Common vars (name, media URL) work everywhere."
        >
          <Field label="Module">
            <select
              value={moduleId}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  module: e.target.value,
                  variableSlots: [],
                  attachedEventKeys: [],
                  templateKey: "",
                }))
              }
              className={fieldClass}
              disabled={readOnlyMeta}
            >
              {Object.entries(modules).map(([id, m]) => (
                <option key={id} value={id}>
                  {m.label || id}
                </option>
              ))}
            </select>
          </Field>

          {moduleDef.events?.length > 0 ? (
            <Field label="Attach to events" hint="★ = primary event fired by code.">
              <div className="flex flex-wrap gap-1.5">
                {moduleDef.events.map((ev) => {
                  const isPrimary = form.templateKey === ev;
                  const isAttached = (form.attachedEventKeys || []).includes(ev);
                  return (
                    <div key={ev} className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => setPrimaryEvent(isPrimary ? "" : ev)}
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${
                          isPrimary
                            ? "border-brand-500 bg-brand-50 text-brand-800"
                            : "border-border bg-white text-stone-600 hover:bg-canvas-muted"
                        }`}
                      >
                        ★ {ev.replace(/_/g, " ")}
                      </button>
                      {!isPrimary ? (
                        <button
                          type="button"
                          onClick={() => toggleEvent(ev)}
                          className={`rounded-md border px-1.5 py-0.5 text-[9px] ${
                            isAttached
                              ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                              : "border-stone-200 text-stone-400"
                          }`}
                        >
                          {isAttached ? "✓ alt" : "+ alt"}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Field>
          ) : (
            <Field label="Custom primary event key">
              <input
                type="text"
                value={form.templateKey || ""}
                onChange={(e) => setForm((f) => ({ ...f, templateKey: e.target.value }))}
                placeholder="MY_CUSTOM_EVENT"
                className={fieldClass}
              />
            </Field>
          )}
        </FormSection>

        <FormSection
          title="Header (media / text)"
          hint="Image, video, or document headers use a module variable URL at send time."
        >
          <Field label="Header type">
            <select
              value={headerFormat}
              onChange={(e) => setHeader({ format: e.target.value })}
              className={fieldClass}
              disabled={readOnlyMeta}
            >
              {HEADER_FORMATS.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.label}
                </option>
              ))}
            </select>
          </Field>

          {headerFormat === "TEXT" ? (
            <>
              <Field label="Header text" hint="Use {{1}} for dynamic text, then map variable below.">
                <input
                  type="text"
                  value={form.headerConfig?.text || ""}
                  onChange={(e) => setHeader({ text: e.target.value })}
                  placeholder="Order {{1}} update"
                  className={fieldClass}
                  readOnly={readOnlyMeta}
                />
              </Field>
              {extractBodySlots(form.headerConfig?.text).length > 0 ? (
                <Field label="Header variable ({{1}})">
                  <VariableSelect
                    value={form.headerConfig?.variableKey}
                    onChange={(v) => setHeader({ variableKey: v })}
                    variables={variables}
                    varsLoading={varsLoading}
                  />
                </Field>
              ) : null}
            </>
          ) : null}

          {["IMAGE", "VIDEO", "DOCUMENT"].includes(headerFormat) ? (
            <>
              <Field
                label="Sample media URL (for Meta approval)"
                hint="Public HTTPS URL used when submitting template to Meta."
              >
                <input
                  type="url"
                  value={form.headerConfig?.mediaSampleUrl || ""}
                  onChange={(e) => setHeader({ mediaSampleUrl: e.target.value })}
                  placeholder="https://cdn.example.com/banner.jpg"
                  className={fieldClass}
                  readOnly={readOnlyMeta}
                />
              </Field>
              <Field label="Dynamic media variable (at send)" hint="Maps to imageUrl, invoiceUrl, mediaUrl, etc.">
                <VariableSelect
                  value={form.headerConfig?.variableKey}
                  onChange={(v) => setHeader({ variableKey: v })}
                  variables={variables}
                  varsLoading={varsLoading}
                />
              </Field>
              {headerFormat === "DOCUMENT" ? (
                <Field label="Document filename">
                  <input
                    type="text"
                    value={form.headerConfig?.documentFilename || "document.pdf"}
                    onChange={(e) => setHeader({ documentFilename: e.target.value })}
                    className={fieldClass}
                  />
                </Field>
              ) : null}
            </>
          ) : null}
        </FormSection>

        <FormSection
          title="Body & variables"
          hint="Use {{1}}, {{2}}… in any order. Map each slot to a module variable."
        >
          <Field label="Body text" required>
            <textarea
              value={form.bodyText || ""}
              onChange={(e) => setForm((f) => ({ ...f, bodyText: e.target.value }))}
              rows={4}
              className={`${fieldClass} min-h-[5rem] resize-y font-mono text-[10px]`}
              placeholder="Hello {{1}}, order {{2}} is confirmed."
              required={!readOnlyMeta}
              readOnly={readOnlyMeta}
            />
          </Field>

          {bodySlots.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-border bg-canvas-muted/40 p-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase text-stone-500">Body variable mapping</p>
                <button
                  type="button"
                  onClick={() => setRegisterOpen((o) => !o)}
                  className="text-[10px] font-medium text-brand-700 hover:underline"
                >
                  + Register variable
                </button>
              </div>
              {bodySlots.map((slot) => (
                <div key={slot} className="flex flex-wrap items-center gap-2">
                  <span className="w-12 shrink-0 font-mono text-[11px] font-bold text-brand-700">
                    {`{{${slot}}}`}
                  </span>
                  <VariableSelect
                    value={slotMap.get(slot)}
                    onChange={(v) => setSlotVariable(slot, v)}
                    variables={variables}
                    varsLoading={varsLoading}
                  />
                  {slotMap.get(slot) ? (
                    <span className="text-[9px] text-stone-500">
                      → data.{variables.find((v) => v.key === slotMap.get(slot))?.dataPath || slotMap.get(slot)}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-stone-500">Add {"{{1}}"}, {"{{2}}"}… in the body to map variables.</p>
          )}

          {registerOpen ? (
            <div className="rounded-lg border border-brand-200 bg-brand-50/30 p-2.5 space-y-2">
              <p className="text-[10px] font-semibold text-brand-800">Register variable in {moduleDef.label}</p>
              {registerError ? <p className="text-[10px] text-red-600">{registerError}</p> : null}
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  placeholder="key e.g. trackingCode"
                  value={registerForm.key}
                  onChange={(e) => setRegisterForm((r) => ({ ...r, key: e.target.value }))}
                  className={fieldClass}
                />
                <input
                  placeholder="Label"
                  value={registerForm.label}
                  onChange={(e) => setRegisterForm((r) => ({ ...r, label: e.target.value }))}
                  className={fieldClass}
                />
                <input
                  placeholder="dataPath (notification data field)"
                  value={registerForm.dataPath}
                  onChange={(e) => setRegisterForm((r) => ({ ...r, dataPath: e.target.value }))}
                  className={fieldClass}
                />
                <input
                  placeholder="Sample for Meta"
                  value={registerForm.sampleValue}
                  onChange={(e) => setRegisterForm((r) => ({ ...r, sampleValue: e.target.value }))}
                  className={fieldClass}
                />
              </div>
              <button
                type="button"
                onClick={handleRegister}
                className="rounded-lg bg-brand-600 px-2.5 py-1 text-[10px] font-medium text-white"
              >
                Save variable
              </button>
            </div>
          ) : null}
        </FormSection>

        <FormSection title="Footer" hint="Optional static footer (max 60 chars recommended).">
          <input
            type="text"
            value={form.footerText || ""}
            onChange={(e) => setForm((f) => ({ ...f, footerText: e.target.value }))}
            placeholder="Khush Pehno — reply STOP to opt out"
            className={fieldClass}
            maxLength={60}
            readOnly={readOnlyMeta}
          />
        </FormSection>

        <FormSection
          title="Buttons (links / call / quick reply)"
          hint="Up to 3 buttons. URL buttons: use {{1}} in URL and map dynamic suffix variable."
        >
          <div className="space-y-2">
            {(form.buttons || []).map((btn, idx) => (
              <div key={idx} className="rounded-lg border border-border bg-white p-2 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold text-stone-600">
                    {btn.type === "PHONE_NUMBER" ? (
                      <Phone className="mr-1 inline h-3 w-3" />
                    ) : btn.type === "URL" ? (
                      <Link2 className="mr-1 inline h-3 w-3" />
                    ) : null}
                    Button {idx + 1}
                  </span>
                  {!readOnlyMeta ? (
                    <button type="button" onClick={() => removeButton(idx)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    value={btn.type || "URL"}
                    onChange={(e) => updateButton(idx, { type: e.target.value })}
                    className={fieldClass}
                    disabled={readOnlyMeta}
                  >
                    {BUTTON_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Button label"
                    value={btn.text || ""}
                    onChange={(e) => updateButton(idx, { text: e.target.value })}
                    className={fieldClass}
                    maxLength={25}
                    readOnly={readOnlyMeta}
                  />
                  {btn.type === "URL" ? (
                    <>
                      <input
                        placeholder="URL https://site.com/path/{{1}}"
                        value={btn.url || ""}
                        onChange={(e) => updateButton(idx, { url: e.target.value })}
                        className={`${fieldClass} sm:col-span-2`}
                        readOnly={readOnlyMeta}
                      />
                      {btn.url?.includes("{{1}}") ? (
                        <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
                          <span className="text-[9px] text-stone-500">Dynamic {"{{1}}"} →</span>
                          <VariableSelect
                            value={btn.variableKey}
                            onChange={(v) => updateButton(idx, { variableKey: v })}
                            variables={variables}
                            varsLoading={varsLoading}
                          />
                        </div>
                      ) : null}
                    </>
                  ) : null}
                  {btn.type === "PHONE_NUMBER" ? (
                    <input
                      placeholder="+911234567890"
                      value={btn.phoneNumber || ""}
                      onChange={(e) => updateButton(idx, { phoneNumber: e.target.value })}
                      className={`${fieldClass} sm:col-span-2`}
                      readOnly={readOnlyMeta}
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          {!readOnlyMeta && (form.buttons || []).length < 3 ? (
            <button
              type="button"
              onClick={addButton}
              className="mt-2 flex items-center gap-1 text-[10px] font-medium text-brand-700 hover:underline"
            >
              <Plus className="h-3 w-3" />
              Add button
            </button>
          ) : null}
        </FormSection>
      </div>

      {showPreview ? (
        <div className="lg:sticky lg:top-4 lg:self-start">
          <p className="mb-2 text-[10px] font-semibold uppercase text-stone-500">Live preview</p>
          <WhatsappTemplatePreview form={form} variables={variables} />
        </div>
      ) : null}
    </div>
  );
}
