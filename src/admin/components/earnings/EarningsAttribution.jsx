import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Search, Loader2 } from "lucide-react";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";
import { getEarningsAttribution } from "../../apis/Earningsapi";
import {
  PageHeader,
  FormSection,
  Field,
  fieldClass,
  btnPrimary,
  shortId,
} from "./earningsShared";

const EarningsAttribution = () => {
  const basePath = useAdminPanelBasePath();
  const ap = (s) =>
    `${basePath}/${String(s || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [orderId, setOrderId] = useState("");
  const [itemId, setItemId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!orderId.trim() && !itemId.trim()) {
      toast.error("Provide orderId and/or itemId");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const params = {};
      if (orderId.trim()) params.orderId = orderId.trim();
      if (itemId.trim()) params.itemId = itemId.trim();
      const res = await getEarningsAttribution(params);
      setResult(res?.data ?? res);
    } catch (err) {
      toast.error(err?.message || "Lookup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl text-stone-900">
      <PageHeader
        icon={Search}
        title="Attribution lookup"
        subtitle="GET /admin/earnings/attribution — order line → content → author"
        backLink={
          <Link
            to={ap("earnings")}
            className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-canvas-muted"
          >
            ← Earnings
          </Link>
        }
      />

      <FormSection
        title="Lookup"
        hint="Used when supporting creator commission disputes."
      >
        <form onSubmit={handleLookup} className="space-y-2.5">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="Order ID">
              <input
                className={fieldClass}
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Mongo order id"
              />
            </Field>
            <Field label="Item ID">
              <input
                className={fieldClass}
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                placeholder="Catalog item id"
              />
            </Field>
          </div>
          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            Lookup
          </button>
        </form>
      </FormSection>

      {result ? (
        <FormSection title="Result">
          <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-canvas-muted p-3 text-[10px] text-stone-800">
            {JSON.stringify(result, null, 2)}
          </pre>
          {result.contentId || result.contentAuthorId ? (
            <p className="mt-2 text-[11px] text-stone-600">
              contentId:{" "}
              <span className="font-mono">{shortId(result.contentId)}</span>
              {" · "}
              author:{" "}
              <span className="font-mono">
                {shortId(result.contentAuthorId || result.authorId)}
              </span>
            </p>
          ) : null}
        </FormSection>
      ) : null}
    </div>
  );
};

export default EarningsAttribution;
