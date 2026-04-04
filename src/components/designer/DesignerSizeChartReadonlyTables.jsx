import {
  getDisplaySizeChartTables,
  measurementCell,
  safeImageUrl,
} from "../../utils/designerSizeChartDisplay";

function formatCell(value) {
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

function measureImageUrls(chart) {
  const raw = chart?.measureImage;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((im) => {
      const u = typeof im === "string" ? im : im?.url || "";
      return safeImageUrl(u);
    })
    .filter(Boolean);
}

function MeasureImageStrip({ label, urls, onImageClick }) {
  if (!urls?.length) return null;
  return (
    <div className="rounded-md border border-gray-200 bg-white/90 p-2">
      <p className="mb-2 text-xs font-medium text-gray-700">{label}</p>
      <div className="flex flex-wrap gap-2">
        {urls.map((src, idx) => (
          <button
            key={`${src}-${idx}`}
            type="button"
            onClick={() => onImageClick?.(urls, idx)}
            className="shrink-0 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-200"
            title="Open image viewer"
          >
            <img
              src={src}
              alt=""
              className="h-20 w-20 rounded-lg object-cover hover:opacity-90 sm:h-24 sm:w-24"
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function SizeChartTable({ title, chart, tableWrapClass }) {
  if (!Array.isArray(chart?.headers) || chart.headers.length === 0) return null;
  return (
    <div className="space-y-1">
      {title ? <p className="mb-1 text-[11px] font-semibold text-gray-700">{title}</p> : null}
      <div className={tableWrapClass}>
        <table className="w-full min-w-[620px] text-xs">
          <thead>
            <tr className="bg-gray-100 text-left text-gray-700">
              <th className="p-2 font-semibold">Size</th>
              {chart.headers.map((h, idx) => (
                <th key={`h-${h?.key || idx}`} className="p-2 font-semibold">
                  {h?.label || h?.key || "—"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(chart.rows || []).map((row, rowIdx) => (
              <tr key={`r-${rowIdx}`} className="border-t border-black/5 text-gray-800">
                <td className="p-2">{row?.size || "—"}</td>
                {chart.headers.map((h, colIdx) => (
                  <td key={`c-${rowIdx}-${colIdx}`} className="p-2 text-gray-700">
                    {formatCell(measurementCell(row, h?.key))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Read-only inch + cm tables from `item.sizeCharts` or legacy `item.sizeChart`.
 */
export default function DesignerSizeChartReadonlyTables({
  item,
  outerClassName = "space-y-3 rounded-xl border border-black/10 bg-gray-50 p-2.5",
  tableWrapClass = "overflow-x-auto rounded-lg border border-black/10 bg-white",
  showMeasureImages = false,
  onMeasureImageClick,
}) {
  const { in: inchChart, cm: cmChart } = getDisplaySizeChartTables(item);
  if (!inchChart && !cmChart) {
    return (
      <div className={outerClassName}>
        <p className="text-sm text-gray-500">No size chart data.</p>
      </div>
    );
  }
  const inchUrls = inchChart ? measureImageUrls(inchChart) : [];
  const cmUrls = cmChart ? measureImageUrls(cmChart) : [];
  const seenSide = new Set([...inchUrls, ...cmUrls]);
  const orphanLegacy = measureImageUrls(item?.sizeChart).filter((u) => u && !seenSide.has(u));
  return (
    <div className={outerClassName}>
      {inchChart ? (
        <SizeChartTable title="Inches (in)" chart={inchChart} tableWrapClass={tableWrapClass} />
      ) : null}
      {cmChart ? (
        <SizeChartTable title="Centimeters (cm)" chart={cmChart} tableWrapClass={tableWrapClass} />
      ) : null}
      {showMeasureImages ? (
        <div className="space-y-2">
          {inchUrls.length > 0 ? (
            <MeasureImageStrip
              label="Measurement images (in)"
              urls={inchUrls}
              onImageClick={onMeasureImageClick}
            />
          ) : null}
          {cmUrls.length > 0 ? (
            <MeasureImageStrip
              label="Measurement images (cm)"
              urls={cmUrls}
              onImageClick={onMeasureImageClick}
            />
          ) : null}
          {orphanLegacy.length > 0 ? (
            <MeasureImageStrip
              label="Measurement images (catalog)"
              urls={orphanLegacy}
              onImageClick={onMeasureImageClick}
            />
          ) : null}
          {inchUrls.length === 0 && cmUrls.length === 0 && orphanLegacy.length === 0 ? (
            <p className="text-xs text-gray-500">No measurement images.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
