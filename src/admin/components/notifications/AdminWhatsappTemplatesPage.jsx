import { useState, useEffect, useCallback } from "react";
import { adminNotificationApi } from "../../services/notificationApi.js";
import { MessageCircle, RefreshCw, Settings2, Loader2, Plus } from "lucide-react";
import {
  PageToolbar,
  Alert,
  LoadingBlock,
  EmptyBlock,
  PaginationBar,
  TableActionBtn,
  tableScrollShell,
  fieldClass,
  btnPrimary,
  btnOutline,
  FormSection,
  Field,
} from "./notificationsShared";
import {
  WhatsappTemplateConfigFields,
  FORM_INITIAL_TEMPLATE,
  rowToForm,
} from "./whatsappTemplateFormShared";

const PAGE_SIZE = 50;

const STATUS_STYLES = {
  APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
  REJECTED: "bg-red-50 text-red-800 border-red-200",
  PAUSED: "bg-stone-100 text-stone-700 border-stone-200",
  DISABLED: "bg-stone-100 text-stone-500 border-stone-200",
  UNKNOWN: "bg-stone-50 text-stone-600 border-stone-200",
};

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function StatusBadge({ status }) {
  const key = String(status || "UNKNOWN").toUpperCase();
  const cls = STATUS_STYLES[key] || STATUS_STYLES.UNKNOWN;
  return (
    <span className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${cls}`}>
      {key}
    </span>
  );
}

export default function AdminWhatsappTemplatesPage() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modules, setModules] = useState({});

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(FORM_INITIAL_TEMPLATE);

  const [configOpen, setConfigOpen] = useState(false);
  const [configRow, setConfigRow] = useState(null);
  const [configForm, setConfigForm] = useState(FORM_INITIAL_TEMPLATE);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    adminNotificationApi
      .listWhatsappModules()
      .then((data) => setModules(data?.modules ?? data?.data?.modules ?? {}))
      .catch(() => setModules({}));
  }, []);

  const loadPage = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      setError("");
      try {
        const params = { page: pageNum, limit: PAGE_SIZE };
        if (statusFilter) params.status = statusFilter;
        if (search.trim()) params.search = search.trim();
        const data = await adminNotificationApi.listWhatsappTemplates(params);
        const items = data?.list ?? data?.data?.list ?? [];
        const tot = data?.total ?? data?.data?.total ?? 0;
        setList(Array.isArray(items) ? items : []);
        setTotal(Number(tot) || 0);
        setPage(data?.page ?? data?.data?.page ?? pageNum);
      } catch (e) {
        setError(e?.message || "Failed to load WhatsApp templates");
        setList([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, search],
  );

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  const handleSync = async () => {
    setSyncing(true);
    setError("");
    setSuccess("");
    try {
      const data = await adminNotificationApi.syncWhatsappTemplates();
      const synced = data?.synced ?? data?.data?.synced ?? 0;
      const linked = data?.linkedFromEnv ?? data?.data?.linkedFromEnv ?? 0;
      setSuccess(`Synced ${synced} template(s) from Meta. Linked ${linked} from env.`);
      await loadPage(page);
    } catch (e) {
      setError(e?.message || "Sync failed. Check META_WHATSAPP_BUSINESS_ACCOUNT_ID in backend .env");
    } finally {
      setSyncing(false);
    }
  };

  const handleSeedEnv = async () => {
    setSyncing(true);
    setError("");
    setSuccess("");
    try {
      const data = await adminNotificationApi.seedWhatsappEnvMappings();
      const linked = data?.linkedFromEnv ?? data?.data?.linkedFromEnv ?? 0;
      setSuccess(`Linked ${linked} template key(s) from .env mappings.`);
      await loadPage(page);
    } catch (e) {
      setError(e?.message || "Failed to apply env mappings");
    } finally {
      setSyncing(false);
    }
  };

  const openCreate = () => {
    setCreateForm(FORM_INITIAL_TEMPLATE);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setCreateForm(FORM_INITIAL_TEMPLATE);
  };

  const openConfig = (row) => {
    setConfigRow(row);
    setConfigForm(rowToForm(row));
    setConfigOpen(true);
  };

  const closeConfig = () => {
    setConfigOpen(false);
    setConfigRow(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const name = String(createForm.name || "").trim().toLowerCase().replace(/\s+/g, "_");
      if (!name || !createForm.bodyText?.trim()) {
        setError("Template name and body are required");
        setSubmitting(false);
        return;
      }
      await adminNotificationApi.createWhatsappTemplateOnMeta({
        name,
        language: createForm.language,
        category: createForm.category,
        module: createForm.module,
        bodyText: createForm.bodyText.trim(),
        variableSlots: createForm.variableSlots,
        headerConfig: createForm.headerConfig,
        footerText: createForm.footerText,
        buttons: createForm.buttons,
        templateKey: createForm.templateKey || undefined,
        attachedEventKeys: createForm.attachedEventKeys,
      });
      setSuccess("Template submitted to Meta (PENDING). Configure stays saved in DB.");
      closeCreate();
      await loadPage(1);
    } catch (err) {
      setError(err?.message || "Failed to create template");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (!configRow?._id) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await adminNotificationApi.updateWhatsappTemplateConfig(configRow._id, {
        module: configForm.module,
        bodyText: configForm.bodyText,
        variableSlots: configForm.variableSlots,
        headerConfig: configForm.headerConfig,
        footerText: configForm.footerText,
        buttons: configForm.buttons,
        attachedEventKeys: configForm.attachedEventKeys,
        templateKey: configForm.templateKey || null,
      });
      setSuccess("Template configuration saved. Sends use this mapping when event fires.");
      closeConfig();
      await loadPage(page);
    } catch (err) {
      setError(err?.message || "Failed to save configuration");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-w-0 p-2 sm:p-3">
      <PageToolbar
        icon={MessageCircle}
        title="WhatsApp templates"
        subtitle="Full WhatsApp builder — header media, body variables, footer, URL/call buttons. Module-based & fully dynamic."
        accentClass="text-emerald-600"
      >
        <button type="button" onClick={openCreate} className={btnOutline}>
          <Plus className="mr-1 inline h-3.5 w-3.5" />
          Create template
        </button>
        <button type="button" disabled={syncing} onClick={handleSeedEnv} className={btnOutline}>
          Link from env
        </button>
        <button type="button" disabled={syncing} onClick={handleSync} className={btnPrimary}>
          {syncing ? (
            <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 inline h-3.5 w-3.5" />
          )}
          Sync from Meta
        </button>
      </PageToolbar>

      {error ? <Alert>{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <div className="mb-2 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-white p-2 shadow-sm">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-stone-500">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={fieldClass}>
            <option value="">All</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div className="min-w-48 flex-1">
          <label className="mb-1 block text-[10px] font-semibold uppercase text-stone-500">Search</label>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Template name or key…"
            className={fieldClass}
          />
        </div>
        <button type="button" onClick={() => loadPage(1)} className={btnOutline}>
          Apply
        </button>
      </div>

      {loading ? (
        <LoadingBlock />
      ) : list.length === 0 ? (
        <EmptyBlock message="No templates yet. Create one or sync from Meta." />
      ) : (
        <div className={tableScrollShell}>
          <table className="w-full min-w-[900px] border-collapse text-left text-[11px]">
            <thead className="sticky top-0 z-10 bg-canvas-muted text-[10px] font-semibold uppercase tracking-wide text-stone-600">
              <tr>
                <th className="px-2 py-2">Meta name</th>
                <th className="px-2 py-2">Module</th>
                <th className="px-2 py-2">Events</th>
                <th className="px-2 py-2">Header</th>
                <th className="px-2 py-2">Buttons</th>
                <th className="px-2 py-2">Variables</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2 text-center">Config</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((row) => (
                <tr key={row._id} className="hover:bg-canvas-muted/50">
                  <td className="px-2 py-2">
                    <span className="font-mono text-[10px] text-stone-800">{row.metaTemplateName}</span>
                    <p className="text-[9px] text-stone-500">{row.language}</p>
                  </td>
                  <td className="px-2 py-2 capitalize text-stone-600">{row.module || "order"}</td>
                  <td className="px-2 py-2">
                    {row.templateKey ? (
                      <span className="rounded bg-brand-50 px-1 py-0.5 text-[9px] font-medium text-brand-800">
                        ★ {row.templateKey}
                      </span>
                    ) : null}
                    {(row.attachedEventKeys || []).map((k) => (
                      <span
                        key={k}
                        className="ml-0.5 rounded bg-stone-100 px-1 py-0.5 text-[9px] text-stone-600"
                      >
                        {k}
                      </span>
                    ))}
                    {!row.templateKey && !(row.attachedEventKeys || []).length ? (
                      <span className="text-stone-400">—</span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-[9px] capitalize text-stone-600">
                    {row.headerConfig?.format && row.headerConfig.format !== "NONE"
                      ? row.headerConfig.format.toLowerCase()
                      : row.headerType || "—"}
                  </td>
                  <td className="px-2 py-2 text-[9px] text-stone-600">
                    {(row.buttons || []).length || "—"}
                  </td>
                  <td className="px-2 py-2 text-[9px] text-stone-600">
                    {(row.variableSlots || []).length > 0
                      ? row.variableSlots
                          .sort((a, b) => a.slot - b.slot)
                          .map((s) => `{{${s.slot}}}→${s.variableKey}`)
                          .join(", ")
                      : "—"}
                  </td>
                  <td className="px-2 py-2">
                    <StatusBadge status={row.status} />
                    {row.rejectedReason ? (
                      <p className="mt-0.5 max-w-[8rem] truncate text-[8px] text-red-600" title={row.rejectedReason}>
                        {row.rejectedReason}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <TableActionBtn title="Configure module, variables & events" onClick={() => openConfig(row)}>
                      <Settings2 className="h-3.5 w-3.5" />
                    </TableActionBtn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PaginationBar page={page} totalPages={totalPages} disabled={loading} onPage={(p) => loadPage(p)} />

      {createOpen ? (
        <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-border bg-white p-4 shadow-xl">
            <h3 className="text-sm font-semibold text-stone-900">Create WhatsApp template</h3>
            <p className="mt-1 text-[11px] text-stone-500">
              Build like WhatsApp — header media, body vars, footer, link/call buttons. Submitted to Meta for review.
            </p>
            <form onSubmit={handleCreate} className="mt-3 space-y-3">
              <FormSection title="Meta details">
                <Field label="Template name" required>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="order_confirmation_v2"
                    className={fieldClass}
                    required
                  />
                </Field>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="Language">
                    <select
                      value={createForm.language}
                      onChange={(e) => setCreateForm((f) => ({ ...f, language: e.target.value }))}
                      className={fieldClass}
                    >
                      <option value="en">en</option>
                      <option value="en_US">en_US</option>
                    </select>
                  </Field>
                  <Field label="Category">
                    <select
                      value={createForm.category}
                      onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}
                      className={fieldClass}
                    >
                      <option value="UTILITY">UTILITY</option>
                      <option value="MARKETING">MARKETING</option>
                      <option value="AUTHENTICATION">AUTHENTICATION</option>
                    </select>
                  </Field>
                </div>
              </FormSection>

              <WhatsappTemplateConfigFields form={createForm} setForm={setCreateForm} modules={modules} />

              <div className="flex justify-end gap-2 border-t border-border pt-3">
                <button type="button" onClick={closeCreate} className={btnOutline} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className={btnPrimary} disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit to Meta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {configOpen && configRow ? (
        <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-border bg-white p-4 shadow-xl">
            <h3 className="text-sm font-semibold text-stone-900">Configure template</h3>
            <p className="mt-1 font-mono text-[11px] text-stone-600">{configRow.metaTemplateName}</p>
            {configRow.rejectedReason ? (
              <p className="mt-1 text-[10px] text-red-600">Rejected: {configRow.rejectedReason}</p>
            ) : null}
            <form onSubmit={handleSaveConfig} className="mt-3 space-y-3">
              <WhatsappTemplateConfigFields
                form={configForm}
                setForm={setConfigForm}
                modules={modules}
                readOnlyMeta
              />
              <div className="flex justify-end gap-2 border-t border-border pt-3">
                <button type="button" onClick={closeConfig} className={btnOutline} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className={btnPrimary} disabled={submitting}>
                  {submitting ? "Saving…" : "Save configuration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
