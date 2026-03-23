import React, { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  getSingleSkuFormulaConfig,
  createSkuFormulaConfig,
  updateSkuFormulaConfig,
} from "../../apis/inventoryCodeApi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { ArrowLeft, Save, AlertCircle, Layers } from "lucide-react";

const emptyHierarchy = { productId: "", sku: "", skuUid: "" };

const SkuFormulaFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isCreate = !id;
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [jsonError, setJsonError] = useState(null);

  const [name, setName] = useState("");
  const [skuTemplateString, setSkuTemplateString] = useState("");
  const [skuSegmentOrderText, setSkuSegmentOrderText] = useState("");
  const [segmentsJson, setSegmentsJson] = useState("[]");
  const [skuUidDescription, setSkuUidDescription] = useState("");
  const [skuUidExample, setSkuUidExample] = useState("");
  const [skuUidPatternHint, setSkuUidPatternHint] = useState("");
  const [exampleFullSku, setExampleFullSku] = useState("");
  const [exampleBreakdownJson, setExampleBreakdownJson] = useState("{}");
  const [hierarchy, setHierarchy] = useState(emptyHierarchy);
  const [adminNotes, setAdminNotes] = useState("");
  const [isActive, setIsActive] = useState(false);

  const hydrateFromDoc = useCallback((doc) => {
    if (!doc) return;
    setName(doc.name ?? "");
    setSkuTemplateString(doc.skuTemplateString ?? "");
    setSkuSegmentOrderText(Array.isArray(doc.skuSegmentOrder) ? doc.skuSegmentOrder.join(", ") : "");
    setSegmentsJson(JSON.stringify(doc.segments ?? [], null, 2));
    setSkuUidDescription(doc.skuUidDescription ?? "");
    setSkuUidExample(doc.skuUidExample ?? "");
    setSkuUidPatternHint(doc.skuUidPatternHint ?? "");
    setExampleFullSku(doc.exampleFullSku ?? "");
    setExampleBreakdownJson(JSON.stringify(doc.exampleSkuBreakdown ?? {}, null, 2));
    setHierarchy({
      productId: doc.hierarchyNotes?.productId ?? "",
      sku: doc.hierarchyNotes?.sku ?? "",
      skuUid: doc.hierarchyNotes?.skuUid ?? "",
    });
    setAdminNotes(doc.adminNotes ?? "");
    setIsActive(doc.isActive === true);
  }, []);

  useEffect(() => {
    if (isCreate) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getSingleSkuFormulaConfig(id);
        if (!cancelled) hydrateFromDoc(res?.data ?? {});
      } catch (err) {
        if (!cancelled) {
          setError(typeof err === "string" ? err : "Could not load formula.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isCreate, hydrateFromDoc]);

  const handleHierarchyChange = (key, value) => {
    setHierarchy((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setJsonError(null);
    setError(null);

    if (isCreate && !name.trim()) {
      setError("Name is required.");
      return;
    }

    let segments;
    let exampleSkuBreakdown;
    try {
      segments = JSON.parse(segmentsJson);
      if (!Array.isArray(segments)) throw new Error("segments must be a JSON array");
    } catch (err) {
      setJsonError(`Segments JSON: ${err.message || "invalid JSON"}`);
      return;
    }
    try {
      exampleSkuBreakdown = JSON.parse(exampleBreakdownJson);
      if (exampleSkuBreakdown !== null && typeof exampleSkuBreakdown !== "object") {
        throw new Error("must be an object");
      }
    } catch (err) {
      setJsonError(`Example breakdown JSON: ${err.message || "invalid JSON"}`);
      return;
    }

    const skuSegmentOrder = skuSegmentOrderText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const body = {
      name: name.trim(),
      skuTemplateString,
      skuSegmentOrder,
      segments,
      skuUidDescription,
      skuUidExample,
      skuUidPatternHint,
      exampleFullSku,
      exampleSkuBreakdown,
      hierarchyNotes: hierarchy,
      adminNotes,
      isActive,
    };

    try {
      setSaving(true);
      if (isCreate) {
        await createSkuFormulaConfig(body);
      } else {
        await updateSkuFormulaConfig(id, body);
      }
      navigate(ap("inventory-codes/sku-formula"));
    } catch (err) {
      const msg =
        typeof err === "string"
          ? err
          : err?.response?.data?.message || err?.message || "Save failed";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 bg-gray-50">
      <div className="mx-auto max-w-3xl">
        <Link
          to={ap("inventory-codes/sku-formula")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 w-fit"
        >
          <ArrowLeft size={18} /> Back to formulas
        </Link>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Layers className="h-8 w-8 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {isCreate ? "New SKU formula" : "Edit SKU formula"}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Check &quot;Active&quot; to use this preset and deactivate all others, or leave it off
                and set active from the list.
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-800 text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          {jsonError && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-amber-900 text-sm">
              <AlertCircle size={18} />
              {jsonError}
            </div>
          )}

          {loading ? (
            <p className="mt-8 text-center text-gray-500">Loading…</p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-8">
              <div>
                <label className="block text-xs font-medium text-gray-600">Preset name (unique)</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Standard 2025"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <section>
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Hierarchy (reference text)
                </h2>
                <div className="space-y-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Product ID</label>
                    <textarea
                      value={hierarchy.productId}
                      onChange={(e) => handleHierarchyChange("productId", e.target.value)}
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">SKU (variant)</label>
                    <textarea
                      value={hierarchy.sku}
                      onChange={(e) => handleHierarchyChange("sku", e.target.value)}
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">sku_uid</label>
                    <textarea
                      value={hierarchy.skuUid}
                      onChange={(e) => handleHierarchyChange("skuUid", e.target.value)}
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Concatenation template
                </h2>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Template string</label>
                  <input
                    value={skuTemplateString}
                    onChange={(e) => setSkuTemplateString(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">
                    Segment order (comma-separated)
                  </label>
                  <input
                    value={skuSegmentOrderText}
                    onChange={(e) => setSkuSegmentOrderText(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Segments (JSON)</label>
                  <textarea
                    value={segmentsJson}
                    onChange={(e) => setSegmentsJson(e.target.value)}
                    rows={14}
                    spellCheck={false}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono"
                  />
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">sku_uid</h2>
                <textarea
                  value={skuUidDescription}
                  onChange={(e) => setSkuUidDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Description"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    value={skuUidExample}
                    onChange={(e) => setSkuUidExample(e.target.value)}
                    placeholder="Example"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
                  />
                  <input
                    value={skuUidPatternHint}
                    onChange={(e) => setSkuUidPatternHint(e.target.value)}
                    placeholder="Pattern hint"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Example SKU</h2>
                <input
                  value={exampleFullSku}
                  onChange={(e) => setExampleFullSku(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
                />
                <textarea
                  value={exampleBreakdownJson}
                  onChange={(e) => setExampleBreakdownJson(e.target.value)}
                  rows={8}
                  spellCheck={false}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono"
                />
              </section>

              <section className="space-y-3">
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  placeholder="Admin notes"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  Set as active (deactivates all other formulas)
                </label>
              </section>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                <Save size={18} />
                {saving ? "Saving…" : isCreate ? "Create" : "Save changes"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SkuFormulaFormPage;
