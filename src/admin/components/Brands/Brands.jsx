import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import { getBrands, deleteBrand } from "../../apis/Brandapi";
import { useAdminPanelBasePath } from "../../../context/AdminPanelBasePathContext";

const Brand = () => {
  const navigate = useNavigate();
  const basePath = useAdminPanelBasePath();
  const ap = (suffix) =>
    `${basePath}/${String(suffix || "").replace(/^\/+/, "")}`.replace(/\/+/g, "/");

  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  const rowIndexBase = useMemo(() => (currentPage - 1) * limit, [currentPage, limit]);

  const filteredBrands = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((b) => (b.name || "").toLowerCase().includes(q));
  }, [brands, search]);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const res = await getBrands(currentPage, limit);
      const data = res?.data?.data || res?.data || {};
      const brandList = data.brands || data.items || data || [];
      const totalCount = data.total || brandList.length || 0;

      setBrands(Array.isArray(brandList) ? brandList : []);
      setTotalPages(data.totalPages || data.pages || Math.max(1, Math.ceil(totalCount / limit)) || 1);
    } catch (err) {
      console.error("[Brands] fetch error:", err);
      setBrands([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [limit, search]);

  useEffect(() => {
    fetchBrands();
  }, [currentPage, limit]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this brand?")) return;
    try {
      await deleteBrand(id);
      if (brands.length === 1 && currentPage > 1) {
        setCurrentPage((p) => p - 1);
      } else {
        await fetchBrands();
      }
    } catch (err) {
      console.error("[Brands] delete error:", err);
      alert(err?.message || "Failed to delete brand");
    }
  };

  const inputClass =
    "shrink-0 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="text-stone-900">
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
        <h1 className="mr-auto min-w-0 shrink-0 text-base font-bold tracking-tight sm:text-lg">
          Brands
        </h1>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name…"
          className={`${inputClass} w-full min-w-[140px] max-w-[220px] sm:w-auto`}
          aria-label="Search brands"
        />
        <select
          className={`${inputClass} min-w-[108px]`}
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value, 10) || 20)}
          title="Rows per page"
        >
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>
        <button
          type="button"
          onClick={() => navigate(ap("brands/create"))}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Create
        </button>
      </div>

      <div className="max-h-[calc(100vh-14rem)] overflow-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm [-webkit-overflow-scrolling:touch]">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 z-10 bg-canvas-muted/90 shadow-[0_1px_0_0_var(--color-border)]">
            <tr>
              <th className="w-10 px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                #
              </th>
              <th className="w-16 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Logo
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Name
              </th>
              <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-2 py-4 text-center text-stone-500">
                  Loading…
                </td>
              </tr>
            ) : filteredBrands.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-2 py-6 text-center">
                  <p className="text-stone-500">
                    {search ? "No brands match your search." : "No brands found."}
                  </p>
                  {!search ? (
                    <button
                      type="button"
                      onClick={() => navigate(ap("brands/create"))}
                      className="mt-1 text-[11px] font-medium text-brand-600 hover:text-brand-700 hover:underline"
                    >
                      Create your first brand →
                    </button>
                  ) : null}
                </td>
              </tr>
            ) : (
              filteredBrands.map((brand, idx) => (
                <tr key={brand._id} className="border-t border-border/80 hover:bg-brand-50/30">
                  <td className="px-2 py-2 text-center text-[10px] text-stone-500">
                    {rowIndexBase + idx + 1}
                  </td>
                  <td className="px-2 py-2">
                    {brand.icon?.imageUrl ? (
                      <img
                        src={brand.icon.imageUrl}
                        alt=""
                        className="h-9 w-9 rounded-md border border-border object-contain bg-white p-0.5"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-canvas-muted text-[9px] text-stone-400">
                        —
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2 font-medium text-stone-900">{brand.name}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => navigate(ap(`brands/edit/${brand._id}`))}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 transition-colors hover:bg-brand-100"
                        title="Edit"
                        aria-label="Edit brand"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(brand._id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-danger/30 bg-danger-bg text-danger transition-colors hover:opacity-90"
                        title="Delete"
                        aria-label="Delete brand"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          disabled={currentPage === 1 || loading}
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-stone-700 transition-colors hover:bg-brand-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Prev
        </button>
        <span className="rounded-lg bg-canvas-muted px-2.5 py-1 text-[11px] text-stone-700">
          Page {currentPage} / {totalPages || 1}
        </span>
        <button
          type="button"
          disabled={currentPage >= totalPages || loading}
          onClick={() => setCurrentPage((p) => p + 1)}
          className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-stone-700 transition-colors hover:bg-brand-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Brand;
