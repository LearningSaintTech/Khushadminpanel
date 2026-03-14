import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSingleItem } from "../../apis/itemapi";

export default function ItemDetails() {
  const { itemId } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("general");

  const fetchItem = async () => {
    console.log("[ItemDetails] fetchItem called with itemId:", itemId);
    if (!itemId) {
      console.error("[ItemDetails] No itemId in route params");
      setError("No item ID provided");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log("[ItemDetails] Calling getSingleItem API...");
      const res = await getSingleItem(itemId);
      console.log("[ItemDetails] getSingleItem raw response:", res);

      let itemData =
        res?.data?.data ||
        res?.data?.item ||
        res?.data?.product ||
        res?.data ||
        null;

      console.log("[ItemDetails] Parsed itemData:", itemData);
      console.log("[ItemDetails] itemData.sizeChart:", itemData?.sizeChart);
      if (itemData?.sizeChart) {
        console.log(
          "[ItemDetails] sizeChart.unit:",
          itemData.sizeChart.unit,
          "headers:",
          itemData.sizeChart.headers,
          "rows:",
          itemData.sizeChart.rows,
          "measureImage:",
          itemData.sizeChart.measureImage,
        );
      } else {
        console.warn("[ItemDetails] sizeChart is missing on itemData");
      }

      setItem(itemData);
      // Expose last item globally for quick console inspection if needed
      if (typeof window !== "undefined") {
        window.__lastItemDetails = itemData;
      }

      if (!itemData) {
        setError("Item data not found in response");
      }
    } catch (err) {
      console.error("[ItemDetails] fetchItem error:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to load item";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItem();
  }, [itemId]);

  useEffect(() => {
    console.log("[ItemDetails] activeTab changed:", activeTab);
    if (activeTab === "size" && item) {
      console.log(
        "[ItemDetails] Size tab opened. Current item.sizeChart:",
        item.sizeChart,
      );
      if (item.sizeChart) {
        console.log(
          "[ItemDetails] sizeChart.unit:",
          item.sizeChart.unit,
          "headers:",
          item.sizeChart.headers,
          "rows:",
          item.sizeChart.rows,
          "measureImage:",
          item.sizeChart.measureImage,
        );
      }
    }
  }, [activeTab, item]);

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-50/40 p-4">
        <div className="text-gray-500 text-base sm:text-lg animate-pulse">
          Loading item details...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-gray-50/40 p-4 sm:p-6">
        <div className="text-red-600 text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">
          Error
        </div>
        <p className="text-gray-700 mb-6 sm:mb-8 text-center max-w-lg text-sm sm:text-base">
          {error}
        </p>
        <button
          onClick={() => {
            setError(null);
            fetchItem();
          }}
          className="px-6 sm:px-8 py-2.5 sm:py-3 bg-neutral-800 text-white rounded-lg hover:bg-neutral-900 transition font-medium text-sm sm:text-base"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-50/40 text-gray-600 text-base sm:text-lg p-4">
        Item not found
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50/40">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-5 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        {/* Back button */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors text-sm sm:text-base"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to list
          </button>
        </div>

        {/* Main product card */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden mb-6 sm:mb-8 lg:mb-10">
          <div className="p-4 sm:p-5 md:p-6 lg:p-8 xl:p-10">
            <div className="flex flex-col md:flex-row gap-4 sm:gap-6 lg:gap-8 xl:gap-10">
              {/* Product Image */}
              <div className="w-full md:w-72 lg:w-80 xl:w-96 flex-shrink-0 mx-auto md:mx-0">
                <div className="aspect-square w-full max-w-full">
                  <img
                    src={
                      item?.variants?.[0]?.images?.[0]?.url ||
                      item?.thumbnail ||
                      "https://via.placeholder.com/500?text=No+Image"
                    }
                    alt={item.name || "Product"}
                    className="w-full h-full object-cover rounded-xl shadow-sm border border-gray-100"
                  />
                </div>
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-gray-900 mb-2 sm:mb-3 break-words">
                  {item.name || "Unnamed Product"}
                </h1>

                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 leading-relaxed">
                  {item.shortDescription || "No short description available"}
                </p>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black">
                    ₹{item.discountedPrice ?? item.price ?? "—"}
                  </span>
                  {item.price &&
                    item.discountedPrice &&
                    item.price !== item.discountedPrice && (
                      <span className="text-lg sm:text-xl lg:text-2xl text-gray-400 line-through">
                        ₹{item.price}
                      </span>
                    )}
                </div>

                <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2 rounded-full bg-gray-100/80 text-xs sm:text-sm font-medium">
                  <span
                    className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${
                      item.isActive ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  />
                  {item.isActive ? "In Stock" : "Inactive / Out of Stock"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs - scrollable only when necessary */}
        <div className="border-b border-gray-200 mb-4 sm:mb-6 lg:mb-8 bg-white rounded-t-xl">
          <div className="flex gap-2 sm:gap-3 md:gap-4 lg:gap-6 overflow-x-auto pb-3 px-4 sm:px-5 lg:px-6 scrollbar-thin scrollbar-thumb-gray-300">
            {["general", "variants", "size", "care", "policies", "filters"].map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-2 px-3 sm:px-4 md:px-5 text-xs sm:text-sm md:text-base font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab
                      ? "text-black border-b-2 border-black"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Tab content container */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-5 md:p-6 lg:p-8 xl:p-10">
            {/* GENERAL */}
            {activeTab === "general" && (
              <div className="space-y-6 sm:space-y-8 text-gray-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div>
                    <dt className="text-xs sm:text-sm text-gray-500 font-medium">
                      Product ID
                    </dt>
                    <dd className="mt-1 text-sm sm:text-base font-semibold break-words">
                      {item.productId || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs sm:text-sm text-gray-500 font-medium">
                      Total Stock
                    </dt>
                    <dd className="mt-1 text-sm sm:text-base font-semibold">
                      {item.totalStock ?? "—"}
                    </dd>
                  </div>
                </div>

                <div>
                  <dt className="text-xs sm:text-sm text-gray-500 font-medium mb-2">
                    Full Description
                  </dt>
                  <dd className="text-sm sm:text-base whitespace-pre-line leading-relaxed text-gray-700">
                    {item.longDescription ||
                      "No detailed description available."}
                  </dd>
                </div>
              </div>
            )}

            {/* VARIANTS */}
            {activeTab === "variants" && (
              <div className="space-y-6 sm:space-y-8">
                {item.variants?.length > 0 ? (
                  item.variants.map((variant) => (
                    <div
                      key={variant._id}
                      className="border border-gray-200 rounded-xl p-4 sm:p-5 md:p-6"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
                        <div
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border shadow-sm flex-shrink-0"
                          style={{
                            backgroundColor: variant.color?.hex || "#e5e5e5",
                          }}
                        />
                        <span className="font-semibold text-base sm:text-lg break-words">
                          {variant.color?.name || "Color Variant"}
                        </span>
                      </div>

                      {variant.images?.length > 0 && (
                        <div className="flex gap-2 sm:gap-3 mb-4 sm:mb-6 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-thin">
                          {variant.images.map((img) => (
                            <img
                              key={img._id}
                              src={img.url}
                              className="h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 rounded-lg object-cover flex-shrink-0 snap-center border border-gray-200 shadow-sm"
                              alt="Variant"
                            />
                          ))}
                        </div>
                      )}

                      {variant.sizes?.length > 0 && (
                        <div className="space-y-3 sm:space-y-4">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <span className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide">
                              Sizes & SKUs
                            </span>
                            <span className="h-px flex-1 bg-gray-200" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                            {variant.sizes.map((s) => (
                              <div
                                key={s._id || `${variant.color?.name}-${s.size}`}
                                className="bg-gray-50 border border-gray-200 rounded-lg px-3 sm:px-4 py-3 sm:py-4 flex flex-col gap-1.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-white border border-gray-200 text-[11px] sm:text-xs font-semibold text-gray-900">
                                    {s.size || "—"}
                                  </span>
                                  <span className="text-[11px] sm:text-xs text-gray-600">
                                    Stock:{" "}
                                    <span className="font-semibold text-gray-900">
                                      {s.stock ?? 0}
                                    </span>
                                  </span>
                                </div>

                                <div className="mt-1">
                                  <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                                    SKU
                                  </p>
                                  <p className="text-[11px] sm:text-xs text-gray-900 break-all bg-white border border-dashed border-gray-200 rounded px-2 py-1">
                                    {s.sku || "Not set"}
                                  </p>
                                </div>

                                <div className="mt-1">
                                  <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                                    Barcode
                                  </p>
                                  <p className="text-[11px] sm:text-xs text-gray-900 break-all bg-white border border-dashed border-gray-200 rounded px-2 py-1">
                                    {s.barcode || "Not set"}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 py-6 sm:py-8 text-center text-sm sm:text-base">
                    No variants available
                  </p>
                )}
              </div>
            )}

            {/* SIZE */}
            {activeTab === "size" && item.sizeChart ? (
              <div className="space-y-6 sm:space-y-8 lg:space-y-10">
                {console.log(
                  "[ItemDetails] Rendering Size tab with sizeChart:",
                  item.sizeChart,
                )}
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="w-full text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-700">
                          <th className="p-3 sm:p-4 text-left font-medium rounded-l-lg whitespace-nowrap">
                            Size
                          </th>
                          {item.sizeChart.headers?.map((h) => (
                            <th
                              key={h.key}
                              className="p-3 sm:p-4 text-left font-medium whitespace-nowrap"
                            >
                              {h.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="text-gray-600">
                        {item.sizeChart.rows?.map((row) => (
                          <tr
                            key={row.size}
                            className="hover:bg-gray-50/70 transition"
                          >
                            <td className="p-3 sm:p-4 font-medium bg-white rounded-l-lg border-l border-gray-100 whitespace-nowrap">
                              {row.size}
                            </td>
                            {item.sizeChart.headers?.map((h) => (
                              <td
                                key={h.key}
                                className="p-3 sm:p-4 bg-white border-r border-gray-100 last:rounded-r-lg"
                              >
                                {row.measurements?.[h.key] ?? "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {item.sizeChart.measureImage?.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {item.sizeChart.measureImage.map((img) => (
                      <img
                        key={img._id}
                        src={img.url}
                        className="w-full h-auto max-h-48 sm:max-h-64 object-contain rounded-lg border border-gray-200 shadow-sm"
                        alt="Size guide illustration"
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === "size" ? (
              <p className="text-gray-500 py-6 sm:py-8 text-center text-sm sm:text-base">
                No size chart available
              </p>
            ) : null}

            {/* CARE */}
            {activeTab === "care" && item.care ? (
              <div className="space-y-6 sm:space-y-8">
                <p className="text-base sm:text-lg font-medium text-gray-800">
                  {item.care.description || "Care Instructions"}
                </p>

                {item.care.instructions?.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
                    {item.care.instructions.map((c) => (
                      <div
                        key={c._id}
                        className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-5 text-center hover:shadow-md transition"
                      >
                        {c.iconUrl && (
                          <img
                            src={c.iconUrl}
                            className="h-10 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-90"
                            alt=""
                          />
                        )}
                        <p className="text-xs sm:text-sm text-gray-700 font-medium break-words">
                          {c.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === "care" ? (
              <p className="text-gray-500 py-6 sm:py-8 text-center text-sm sm:text-base">
                No care instructions available
              </p>
            ) : null}

            {/* POLICIES */}
            {activeTab === "policies" && (
              <div className="space-y-6 sm:space-y-8">
                {/* Shipping Policy */}
                {item.shipping && (
                  <div className="border border-gray-200 rounded-xl p-4 sm:p-5 md:p-6 bg-gray-50">
                    <div className="flex items-start gap-3 sm:gap-4">
                      {item.shipping.iconUrl && (
                        <img
                          src={item.shipping.iconUrl}
                          alt="Shipping"
                          className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-base sm:text-lg text-gray-900 mb-2">
                          {item.shipping.title || "Shipping Policy"}
                        </h3>
                        {item.shipping.description && (
                          <p className="text-sm sm:text-base text-gray-700">
                            {item.shipping.description}
                          </p>
                        )}
                        {item.shipping.estimatedDelivery && (
                          <p className="text-sm text-gray-600 mt-2">
                            {item.shipping.estimatedDelivery}
                          </p>
                        )}
                        {item.shipping.shippingCharges !== undefined &&
                          item.shipping.shippingCharges !== null && (
                            <p className="text-sm text-gray-600 mt-1">
                              Shipping Charges: ₹{item.shipping.shippingCharges}
                            </p>
                          )}
                      </div>
                    </div>
                  </div>
                )}

                {/* COD Policy */}
                {item.codPolicy && (
                  <div className="border border-gray-200 rounded-xl p-4 sm:p-5 md:p-6 bg-gray-50">
                    <div className="flex items-start gap-3 sm:gap-4">
                      {item.codPolicy.iconUrl && (
                        <img
                          src={item.codPolicy.iconUrl}
                          alt="COD"
                          className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-base sm:text-lg text-gray-900 mb-2">
                          COD Policy
                        </h3>
                        {item.codPolicy.text && (
                          <p className="text-sm sm:text-base text-gray-700">
                            {item.codPolicy.text}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Return Policy */}
                {item.returnPolicy && (
                  <div className="border border-gray-200 rounded-xl p-4 sm:p-5 md:p-6 bg-gray-50">
                    <div className="flex items-start gap-3 sm:gap-4">
                      {item.returnPolicy.iconUrl && (
                        <img
                          src={item.returnPolicy.iconUrl}
                          alt="Return"
                          className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-base sm:text-lg text-gray-900 mb-2">
                          Return Policy
                        </h3>
                        {item.returnPolicy.text && (
                          <p className="text-sm sm:text-base text-gray-700">
                            {item.returnPolicy.text}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Exchange Policy */}
                {item.exchangePolicy && (
                  <div className="border border-gray-200 rounded-xl p-4 sm:p-5 md:p-6 bg-gray-50">
                    <div className="flex items-start gap-3 sm:gap-4">
                      {item.exchangePolicy.iconUrl && (
                        <img
                          src={item.exchangePolicy.iconUrl}
                          alt="Exchange"
                          className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-base sm:text-lg text-gray-900 mb-2">
                          Exchange Policy
                        </h3>
                        {item.exchangePolicy.text && (
                          <p className="text-sm sm:text-base text-gray-700 whitespace-pre-line">
                            {item.exchangePolicy.text}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Cancellation Policy */}
                {item.cancellationPolicy && (
                  <div className="border border-gray-200 rounded-xl p-4 sm:p-5 md:p-6 bg-gray-50">
                    <div className="flex items-start gap-3 sm:gap-4">
                      {item.cancellationPolicy.iconUrl && (
                        <img
                          src={item.cancellationPolicy.iconUrl}
                          alt="Cancellation"
                          className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-base sm:text-lg text-gray-900 mb-2">
                          Cancellation Policy
                        </h3>
                        {item.cancellationPolicy.text && (
                          <p className="text-sm sm:text-base text-gray-700 whitespace-pre-line">
                            {item.cancellationPolicy.text}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!item.shipping &&
                  !item.codPolicy &&
                  !item.returnPolicy &&
                  !item.exchangePolicy &&
                  !item.cancellationPolicy && (
                    <p className="text-gray-500 py-6 sm:py-8 text-center text-sm sm:text-base">
                      No policies available
                    </p>
                  )}
              </div>
            )}

            {/* FILTERS */}
            {activeTab === "filters" && (
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {item.filters?.length > 0 ? (
                  item.filters.map((f) => (
                    <span
                      key={f._id}
                      className="px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 bg-gray-100 text-gray-700 text-xs sm:text-sm rounded-full border border-gray-200 shadow-sm break-words"
                    >
                      <span className="font-medium text-gray-800">
                        {f.key}:
                      </span>{" "}
                      {f.value}
                    </span>
                  ))
                ) : (
                  <p className="text-gray-500 py-6 sm:py-8 text-center text-sm sm:text-base w-full">
                    No tags or filters available
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
