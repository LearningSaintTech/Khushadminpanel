import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { moduleAccessApi } from "../../apis/ModuleAccessapi";
import {
  getSubAdminById,
  getSubAdminModuleAccess,
  setSubAdminModuleAccess,
} from "../../apis/subadminapi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  alertDanger,
  alertSuccess,
  btnOutline,
  btnPrimary,
  FormSection,
  formPageWrap,
  formStickyFooter,
  formToolbar,
} from "./subadminShared";

export default function SubadminUserModuleAccessPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(ap("subadmin"));
  };

  const [availableModules, setAvailableModules] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  const [subadminName, setSubadminName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const [meta, byUser, profile] = await Promise.all([
        moduleAccessApi.getMeta(),
        getSubAdminModuleAccess(id),
        getSubAdminById(id),
      ]);
      setAvailableModules(meta?.availableModules || []);
      setSelectedModules(byUser?.data?.allowedModules || byUser?.allowedModules || []);
      setSubadminName(profile?.data?.name || "");
    } catch (e) {
      setError(e?.message || "Failed to load module access");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const toggleModule = (moduleKey) => {
    setSelectedModules((prev) =>
      prev.includes(moduleKey) ? prev.filter((m) => m !== moduleKey) : [...prev, moduleKey],
    );
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await setSubAdminModuleAccess(id, selectedModules);
      setSuccess("Module access updated successfully.");
    } catch (e) {
      setError(e?.message || "Failed to save module access");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={formPageWrap}>
      <div className={formToolbar}>
        <button type="button" onClick={goBack} className={btnOutline} title="Back">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </button>
        <div className="mr-auto min-w-0">
          <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">
            User module access
          </h1>
          {subadminName ? (
            <p className="truncate text-[10px] text-stone-500">{subadminName}</p>
          ) : null}
        </div>
        <button type="button" onClick={() => navigate(ap("subadmin"))} className={btnOutline}>
          Close
        </button>
      </div>

      {error ? <div className={alertDanger}>{error}</div> : null}
      {success ? <div className={alertSuccess}>{success}</div> : null}

      <FormSection
        title="Allowed modules"
        hint={
          loading
            ? "Loading…"
            : `${selectedModules.length} of ${availableModules.length} selected — overrides role defaults for this user`
        }
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[11px] text-stone-500">
            <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
            Loading…
          </div>
        ) : availableModules.length === 0 ? (
          <p className="py-6 text-center text-[11px] text-stone-500">No modules available.</p>
        ) : (
          <>
            <div className="mb-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedModules([...availableModules])}
                className={btnOutline}
              >
                Select all
              </button>
              <button type="button" onClick={() => setSelectedModules([])} className={btnOutline}>
                Clear
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {availableModules.map((moduleKey) => (
                <label
                  key={moduleKey}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-canvas-muted/30 px-2.5 py-2 transition hover:bg-white"
                >
                  <input
                    type="checkbox"
                    checked={selectedModules.includes(moduleKey)}
                    onChange={() => toggleModule(moduleKey)}
                    className="h-3.5 w-3.5 rounded border-border accent-brand-600"
                  />
                  <span className="text-[11px] font-medium text-stone-800">{moduleKey}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </FormSection>

      <div className={formStickyFooter}>
        <button type="button" onClick={goBack} className={btnOutline}>
          Cancel
        </button>
        <button type="button" disabled={saving || loading} onClick={save} className={btnPrimary}>
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            <>
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Save access
            </>
          )}
        </button>
      </div>
    </div>
  );
}
