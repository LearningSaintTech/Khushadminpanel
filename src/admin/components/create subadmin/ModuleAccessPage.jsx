import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Loader2 } from "lucide-react";
import { moduleAccessApi } from "../../apis/ModuleAccessapi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import {
  alertDanger,
  alertSuccess,
  btnOutline,
  btnPrimary,
  FormSection,
  formPageWrap,
} from "./subadminShared";
import { ModuleAccessCheckboxGroups } from "./ModuleAccessCheckboxGroups";

const moduleAccessToolbar =
  "mb-2 flex flex-nowrap items-center gap-2 overflow-x-auto rounded-xl border border-border bg-white p-1.5 shadow-sm [-webkit-overflow-scrolling:touch]";

const ROLE_OPTIONS = [
  { value: "subadmin", label: "Subadmin" },
  { value: "super_subadmin", label: "Super subadmin" },
];

export default function ModuleAccessPage() {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(ap("subadmin"));
  };

  const [role, setRole] = useState("subadmin");
  const [availableModules, setAvailableModules] = useState([]);
  const [panelGroups, setPanelGroups] = useState(null);
  const [selectedModules, setSelectedModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const roleLabel = useMemo(
    () => ROLE_OPTIONS.find((r) => r.value === role)?.label || role,
    [role],
  );

  const loadMetaAndRole = async (targetRole) => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const [meta, roleAccess] = await Promise.all([
        moduleAccessApi.getMeta(),
        moduleAccessApi.getRoleAccess(targetRole),
      ]);
      setAvailableModules(meta?.availableModules || []);
      setPanelGroups(meta?.panelGroups || null);
      setSelectedModules(roleAccess?.allowedModules || []);
    } catch (e) {
      setError(e?.message || "Failed to load module access");
      setAvailableModules([]);
      setPanelGroups(null);
      setSelectedModules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetaAndRole(role);
  }, [role]);

  const toggleModule = (moduleKey) => {
    setSelectedModules((prev) =>
      prev.includes(moduleKey) ? prev.filter((m) => m !== moduleKey) : [...prev, moduleKey],
    );
  };

  const selectAll = () => setSelectedModules([...availableModules]);
  const clearAll = () => setSelectedModules([]);

  const save = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await moduleAccessApi.setRoleAccess({
        role,
        allowedModules: selectedModules,
      });
      setSuccess(`Updated module permissions for ${roleLabel}.`);
    } catch (e) {
      setError(e?.message || "Failed to save module access");
    } finally {
      setSaving(false);
    }
  };

  const roleSelectClass =
    "shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] text-stone-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 w-[132px]";

  return (
    <div className={formPageWrap}>
      <form
        className={moduleAccessToolbar}
        onSubmit={(e) => e.preventDefault()}
      >
        <button type="button" onClick={goBack} className={`${btnOutline} shrink-0`} title="Back">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </button>
        <h1 className="shrink-0 whitespace-nowrap text-base font-bold tracking-tight sm:text-lg">
          Module access control
        </h1>
        <span className="shrink-0 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-stone-500">
          Role
        </span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className={roleSelectClass}
          title="Role"
          aria-label="Role"
          disabled={loading}
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <button type="button" onClick={selectAll} disabled={loading} className={`${btnOutline} shrink-0`}>
          Select all
        </button>
        <button type="button" onClick={clearAll} disabled={loading} className={`${btnOutline} shrink-0`}>
          Clear
        </button>
        <button
          type="button"
          disabled={saving || loading}
          onClick={save}
          className={`${btnPrimary} shrink-0`}
        >
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            <>
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Save
            </>
          )}
        </button>
        <button type="button" onClick={() => navigate(ap("subadmin"))} className={`${btnOutline} shrink-0`}>
          Close
        </button>
      </form>

      {error ? <div className={alertDanger}>{error}</div> : null}
      {success ? <div className={alertSuccess}>{success}</div> : null}

      <FormSection
        title={`Modules for ${roleLabel}`}
        hint={`${selectedModules.length} of ${availableModules.length} selected`}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[11px] text-stone-500">
            <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
            Loading modules…
          </div>
        ) : availableModules.length === 0 ? (
          <p className="py-6 text-center text-[11px] text-stone-500">No modules available.</p>
        ) : (
          <ModuleAccessCheckboxGroups
            panelGroups={panelGroups}
            availableModules={availableModules}
            selectedModules={selectedModules}
            onToggle={toggleModule}
          />
        )}
      </FormSection>
    </div>
  );
}
