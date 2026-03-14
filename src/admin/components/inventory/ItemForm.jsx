// ItemForm.jsx - Complete form component for Create/Edit Item
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createItem,
  updateItem,
  getSingleItem,
} from "../../apis/itemapi";

const ItemForm = () => {
  const { categoryId, subcategoryId, id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [backendErrors, setBackendErrors] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [activeTab, setActiveTab] = useState(1);
  const fileInputRefs = useRef({}); // Track file inputs to prevent double-firing
  const [form, setForm] = useState({
    name: "",
    shortDescription: "",
    longDescription: "",
    price: "",
    discountedPrice: "",
    productId: "",
    defaultColor: "Black",
    isActive: true,

    variants: [
      {
        color: { name: "Black", hex: "#000000" },
        images: [],
        sizes: [
                    { sku: "", size: "XS", stock: "" },

          { sku: "", size: "S", stock: "" },
          { sku: "", size: "M", stock: "" },
          { sku: "", size: "L", stock: "" },
          { sku: "", size: "XL", stock: "" },
                    { sku: "", size: "XXL", stock: "" },

        ],
      },
    ],

    categoryId: categoryId || "",
    subcategoryId: subcategoryId || "",

    filters: [],

    care: {
      description: "",
      instructions: [],
    },

    sizeChart: {
      unit: "in",
      headers: [
        { key: "chest", label: "Chest" },
        { key: "length", label: "Length" }
      ],
      rows: [],
      measureImages: [],
    },

    shipping: {
      iconUrl: "",
      iconKey: "",
      title: "",
      estimatedDelivery: "",
      shippingCharges: "",
      iconFile: null,
    },

    codPolicy: {
      iconUrl: "",
      iconKey: "",
      text: "",
      iconFile: null,
    },

    returnPolicy: {
      iconUrl: "",
      iconKey: "",
      text: "",
      iconFile: null,
    },

    exchangePolicy: {
      iconUrl: "",
      iconKey: "",
      text: "",
      iconFile: null,
    },

    cancellationPolicy: {
      iconUrl: "",
      iconKey: "",
      text: "",
      iconFile: null,
    },
  });

  const validateBasicTab = () => {
    const errors = {};

    if (!form.name?.trim()) {
      errors.name = "Product name is required.";
    }

    if (form.price === "" || form.price === null || Number(form.price) <= 0) {
      errors.price = "MRP must be greater than 0.";
    }

    if (form.shortDescription && form.shortDescription.length > 70) {
      errors.shortDescription = "Short description cannot exceed 70 characters.";
    }

    if (form.longDescription && form.longDescription.length > 150) {
      errors.longDescription = "Detailed description cannot exceed 150 characters.";
    }

    if (
      form.discountedPrice !== "" &&
      form.discountedPrice !== null &&
      Number(form.discountedPrice) > Number(form.price || 0)
    ) {
      errors.discountedPrice = "Discounted price cannot be greater than actual price.";
    }

    return errors;
  };

  const isBasicTabValid = () => {
    const errors = validateBasicTab();
    return Object.keys(errors).length === 0;
  };

  const validateVariantsTab = () => {
    // At least one variant with a valid color name
    return form.variants.some(
      (variant) => variant?.color?.name && variant.color.name.trim()
    );
  };

  const validateSizesTab = () => {
    // At least one size across all variants with stock filled
    return form.variants.some((variant) =>
      Array.isArray(variant.sizes)
        ? variant.sizes.some((s) => s && s.size && s.stock !== "" && s.stock !== null)
        : false
    );
  };

  // Load item data if editing
  useEffect(() => {
  if (isEdit && id) {
    console.log("[useEffect] isEdit=true, id:", id);
    
    const loadItem = async () => {
      try {
        console.log("[loadItem] Start loading item");
        setLoading(true);

        console.log("[loadItem] Calling getSingleItem API with id:", id);
        const res = await getSingleItem(id);

        console.log("[loadItem] API response received:", res);

        // Handle response structure
        const itemData = res?.data?.data || res?.data?.item || res?.data || {};
        console.log("[loadItem] Parsed itemData:", itemData);

        if (itemData) {
          console.log("[loadItem] Setting form state with item data");
          setForm({
            name: itemData.name || "",
            shortDescription: itemData.shortDescription || "",
            longDescription: itemData.longDescription || "",
            price: itemData.price || "",
            discountedPrice: itemData.discountedPrice || "",
            productId: itemData.productId || "",
            defaultColor: itemData.defaultColor || "Black",
            isActive: itemData.isActive ?? true,

            variants: itemData.variants?.map((variant, vIdx) => {
              console.log(`[loadItem] Processing variant #${vIdx + 1}:`, variant.color?.name);

              const sizeMap = {};
              const defaultSizes = ["S", "M", "L", "XL"];
              if (variant.sizes) {
                variant.sizes.forEach((size) => {
                  sizeMap[size.size] = {
                    sku: size.sku || "",
                    size: size.size || "",
                    stock: size.stock || "",
                  };
                });
              }

              return {
                color: {
                  name: variant.color?.name || "",
                  hex: variant.color?.hex || "#000000",
                },
                images: variant.images?.map((img) => img.url || img) || [],
                sizes: defaultSizes.map((size) => sizeMap[size] || { sku: "", size, stock: "" }),
              };
            }) || [
              {
                color: { name: "Black", hex: "#000000" },
                images: [],
                sizes: [
                  { sku: "", size: "S", stock: "" },
                  { sku: "", size: "M", stock: "" },
                  { sku: "", size: "L", stock: "" },
                  { sku: "", size: "XL", stock: "" },
                ],
              },
            ],

            categoryId: itemData.categoryId || categoryId || "",
            subcategoryId: itemData.subcategoryId || subcategoryId || "",

            filters: itemData.filters?.map((f) => ({
              key: f.key || "",
              value: f.value || "",
            })) || [],

            care: {
              description: itemData.care?.description || "",
              instructions: itemData.care?.instructions?.map((inst, iIdx) => {
                console.log(`[loadItem] Processing care instruction #${iIdx + 1}`, inst.text);
                return {
                  iconUrl: inst.iconUrl || "",
                  iconKey: inst.iconKey || "",
                  text: inst.text || "",
                  iconFile: null,
                };
              }) || [],
            },

            sizeChart: {
              unit: itemData.sizeChart?.unit || "in",
              headers: [
                { key: "chest", label: "Chest" },
                { key: "length", label: "Length" }
              ],
              rows: itemData.sizeChart?.rows || [],
              measureImages: itemData.sizeChart?.measureImage?.map((img, idx) => {
                console.log(`[loadItem] sizeChart image #${idx + 1}:`, img.url || img);
                return img.url || img;
              }) || [],
            },

            shipping: {
              iconUrl: itemData.shipping?.iconUrl || "",
              iconKey: itemData.shipping?.iconKey || "",
              title: itemData.shipping?.title || "",
              estimatedDelivery: itemData.shipping?.estimatedDelivery || "",
              shippingCharges: itemData.shipping?.shippingCharges || "",
              iconFile: null,
            },

            codPolicy: {
              iconUrl: itemData.codPolicy?.iconUrl || "",
              iconKey: itemData.codPolicy?.iconKey || "",
              text: itemData.codPolicy?.text || "",
              iconFile: null,
            },

            returnPolicy: {
              iconUrl: itemData.returnPolicy?.iconUrl || "",
              iconKey: itemData.returnPolicy?.iconKey || "",
              text: itemData.returnPolicy?.text || "",
              iconFile: null,
            },

            exchangePolicy: {
              iconUrl: itemData.exchangePolicy?.iconUrl || "",
              iconKey: itemData.exchangePolicy?.iconKey || "",
              text: itemData.exchangePolicy?.text || "",
              iconFile: null,
            },

            cancellationPolicy: {
              iconUrl: itemData.cancellationPolicy?.iconUrl || "",
              iconKey: itemData.cancellationPolicy?.iconKey || "",
              text: itemData.cancellationPolicy?.text || "",
              iconFile: null,
            },
          });

          console.log("[loadItem] Form state set successfully");
        }
      } catch (err) {
        console.error("[loadItem] Error loading item:", err);
        alert("Failed to load item details: " + (err.response?.data?.message || "Unknown error"));
      } finally {
        console.log("[loadItem] Loading finished");
        setLoading(false);
      }
    };

    loadItem();
  }
}, [id, isEdit, categoryId, subcategoryId]);

  // Variant actions
  const addVariant = () => {
    console.log("[ItemForm] addVariant: current variants count:", form.variants.length);
    setForm((prev) => {
      const next = {
        ...prev,
        variants: [
          ...prev.variants,
          {
            color: { name: "", hex: "#000000" },
            images: [],
            sizes: [
              { sku: "", size: "S", stock: "" },
              { sku: "", size: "M", stock: "" },
              { sku: "", size: "L", stock: "" },
              { sku: "", size: "XL", stock: "" },
            ],
          },
        ],
      };
      console.log("[ItemForm] addVariant: new variants state:", next.variants);
      return next;
    });
  };

  const updateVariantColor = (index, field, value) => {
    console.log("[ItemForm] updateVariantColor:", { index, field, value });
    setForm((prev) => {
      const newVariants = [...prev.variants];
      newVariants[index].color = { ...newVariants[index].color, [field]: value };
      console.log("[ItemForm] updateVariantColor: updated variant color:", newVariants[index].color);
      return { ...prev, variants: newVariants };
    });
  };

  const addImageToVariant = (variantIndex, files) => {
    if (!files?.length) return;
    console.log("[ItemForm] addImageToVariant: variantIndex, files:", variantIndex, files);

    // IMPORTANT: clone FileList immediately so it doesn't get cleared
    const fileArray = Array.from(files);
    
    setForm((prev) => {
      const newVariants = [...prev.variants];
      const existingImages = newVariants[variantIndex].images || [];

      // Create a Set to track existing file identifiers (name + size)
      const existingFileIds = new Set(
        existingImages
          .filter(img => img instanceof File)
          .map(img => `${img.name}-${img.size}`)
      );

      // Filter out duplicates by checking name and size
      const newFiles = fileArray.filter(file => {
        const fileId = `${file.name}-${file.size}`;
        if (existingFileIds.has(fileId)) {
          return false; // Skip duplicate
        }
        existingFileIds.add(fileId); // Track this file
        return true;
      });

      // Only add non-duplicate files
      if (newFiles.length > 0) {
        newVariants[variantIndex].images = [...existingImages, ...newFiles];
      }
      console.log("[ItemForm] addImageToVariant: new images length:", newVariants[variantIndex].images.length);
      return { ...prev, variants: newVariants };
    });
  };

  const removeImageFromVariant = (variantIndex, imageIndex) => {
    console.log("[ItemForm] removeImageFromVariant:", { variantIndex, imageIndex });
    setForm((prev) => {
      const newVariants = [...prev.variants];
      const currentImages = newVariants[variantIndex].images || [];
      const updatedImages = currentImages.filter((_, idx) => idx !== imageIndex);
      newVariants[variantIndex] = {
        ...newVariants[variantIndex],
        images: updatedImages,
      };
      console.log(
        "[ItemForm] removeImageFromVariant: remaining images:",
        updatedImages.length
      );
      return { ...prev, variants: newVariants };
    });
  };

  const updateSize = (variantIndex, sizeIndex, field, value) => {
    console.log("[ItemForm] updateSize:", { variantIndex, sizeIndex, field, value });
    setForm((prev) => {
      const newVariants = [...prev.variants];
      const sizeObj = newVariants[variantIndex].sizes[sizeIndex];
      newVariants[variantIndex].sizes[sizeIndex] = { ...sizeObj, [field]: value };
      console.log(
        "[ItemForm] updateSize: updated size:",
        newVariants[variantIndex].sizes[sizeIndex]
      );
      return { ...prev, variants: newVariants };
    });
  };

  // Filters actions
  const addFilter = () => {
    console.log("[ItemForm] addFilter: current filters:", form.filters);
    setForm((prev) => ({
      ...prev,
      filters: [...prev.filters, { key: "", value: "" }],
    }));
  };

  const updateFilter = (index, field, value) => {
    console.log("[ItemForm] updateFilter:", { index, field, value });
    setForm((prev) => {
      const newFilters = [...prev.filters];
      newFilters[index] = { ...newFilters[index], [field]: value };
      console.log("[ItemForm] updateFilter: new filters:", newFilters);
      return { ...prev, filters: newFilters };
    });
  };

  const removeFilter = (index) => {
    console.log("[ItemForm] removeFilter index:", index);
    setForm((prev) => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index),
    }));
  };

  // Care instructions handlers
  const addCareInstruction = () => {
    console.log("[ItemForm] addCareInstruction: current count:", form.care.instructions.length);
    setForm((prev) => ({
      ...prev,
      care: {
        ...prev.care,
        instructions: [
          ...prev.care.instructions,
          { iconUrl: "", iconKey: "", text: "", iconFile: null },
        ],
      },
    }));
  };

  const updateCareInstruction = (index, field, value) => {
    console.log("[ItemForm] updateCareInstruction:", { index, field, value });
    setForm((prev) => {
      const newInstructions = [...prev.care.instructions];
      newInstructions[index] = { ...newInstructions[index], [field]: value };
      return {
        ...prev,
        care: { ...prev.care, instructions: newInstructions },
      };
    });
  };

  const removeCareInstruction = (index) => {
    console.log("[ItemForm] removeCareInstruction index:", index);
    setForm((prev) => ({
      ...prev,
      care: {
        ...prev.care,
        instructions: prev.care.instructions.filter((_, i) => i !== index),
      },
    }));
  };

  // Size chart handlers
  const addSizeChartHeader = () => {
    console.log("[ItemForm] addSizeChartHeader: current headers:", form.sizeChart.headers);
    setForm((prev) => ({
      ...prev,
      sizeChart: {
        ...prev.sizeChart,
        headers: [...prev.sizeChart.headers, { key: "", label: "" }],
      },
    }));
  };

  const updateSizeChartHeader = (index, field, value) => {
    console.log("[ItemForm] updateSizeChartHeader:", { index, field, value });
    setForm((prev) => {
      const newHeaders = [...prev.sizeChart.headers];
      const header = { ...newHeaders[index] };

      if (field === "key") {
        header.key = value.trim();
        // If label is empty, auto-generate from key
        if (!header.label?.trim() && header.key) {
          const pretty = header.key
            .replace(/[_\-]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          header.label =
            pretty.charAt(0).toUpperCase() + pretty.slice(1) + ` (${prev.sizeChart.unit})`;
        }
      } else if (field === "label") {
        header.label = value;
        // If key is empty, auto-generate from label
        if (!header.key?.trim() && value.trim()) {
          header.key = value
            .toLowerCase()
            .replace(/\(.*?\)/g, "") // remove existing unit
            .replace(/[^a-z0-9]+/gi, "_")
            .replace(/^_+|_+$/g, "");
        }
      } else {
        header[field] = value;
      }

      newHeaders[index] = header;
      console.log("[ItemForm] updateSizeChartHeader: new headers:", newHeaders);
      return {
        ...prev,
        sizeChart: { ...prev.sizeChart, headers: newHeaders },
      };
    });
  };

  const removeSizeChartHeader = (index) => {
    console.log("[ItemForm] removeSizeChartHeader index:", index);
    setForm((prev) => ({
      ...prev,
      sizeChart: {
        ...prev.sizeChart,
        headers: prev.sizeChart.headers.filter((_, i) => i !== index),
      },
    }));
  };

  const addSizeChartRow = () => {
    console.log("[ItemForm] addSizeChartRow: current rows:", form.sizeChart.rows);
    setForm((prev) => {
      const measurements = {};
      prev.sizeChart.headers.forEach((h) => {
        if (h.key) measurements[h.key] = "";
      });
      return {
        ...prev,
        sizeChart: {
          ...prev.sizeChart,
          rows: [...prev.sizeChart.rows, { size: "", measurements }],
        },
      };
    });
  };

  const updateSizeChartRow = (rowIndex, field, value) => {
    console.log("[ItemForm] updateSizeChartRow:", { rowIndex, field, value });
    setForm((prev) => {
      const newRows = [...prev.sizeChart.rows];
      if (field === "size") {
        newRows[rowIndex] = { ...newRows[rowIndex], size: value };
      } else {
        newRows[rowIndex] = {
          ...newRows[rowIndex],
          measurements: {
            ...newRows[rowIndex].measurements,
            [field]: value,
          },
        };
      }
      return {
        ...prev,
        sizeChart: { ...prev.sizeChart, rows: newRows },
      };
    });
  };

  const removeSizeChartRow = (index) => {
    console.log("[ItemForm] removeSizeChartRow index:", index);
    setForm((prev) => ({
      ...prev,
      sizeChart: {
        ...prev.sizeChart,
        rows: prev.sizeChart.rows.filter((_, i) => i !== index),
      },
    }));
  };

  const addSizeChartImage = (files) => {
    if (!files?.length) return;
    console.log("[ItemForm] addSizeChartImage files:", files);
    setForm((prev) => ({
      ...prev,
      sizeChart: {
        ...prev.sizeChart,
        measureImages: [
          ...prev.sizeChart.measureImages,
          ...Array.from(files),
        ],
      },
    }));
  };

  const removeSizeChartImage = (index) => {
    console.log("[ItemForm] removeSizeChartImage index:", index);
    setForm((prev) => {
      const newImages = [...prev.sizeChart.measureImages];
      newImages.splice(index, 1);
      return {
        ...prev,
        sizeChart: { ...prev.sizeChart, measureImages: newImages },
      };
    });
  };

  // Save handler
  const handleSave = async () => {
    console.log("[ItemForm] handleSave: starting with mode:", isEdit ? "edit" : "create");
    console.log("[ItemForm] handleSave: current form state:", form);

    const basicErrors = validateBasicTab();
    if (Object.keys(basicErrors).length > 0) {
      setFieldErrors(basicErrors);
      setActiveTab(1);
      return;
    }

    try {
      setLoading(true);
      setBackendErrors([]);
      const formData = new FormData();

      // Basic text fields
      formData.append("name", form.name);
      formData.append("shortDescription", form.shortDescription);
      formData.append("longDescription", form.longDescription || "");
      formData.append("price", form.price);
      formData.append("discountedPrice", form.discountedPrice || "");
      formData.append("productId", form.productId || "");
      formData.append("categoryId", categoryId);
      formData.append("subcategoryId", subcategoryId);
      formData.append("defaultColor", form.defaultColor);
      formData.append("isActive", String(form.isActive));

      // Variants - prepare JSON structure
      console.log("[ItemForm] handleSave: preparing variantsData from variants:", form.variants);
      const variantsData = form.variants
        .filter((variant) => {
          // Only include variants with valid color names
          return variant && variant.color && variant.color.name && variant.color.name.trim();
        })
        .map((variant) => {
          const colorName = variant.color.name.trim();
          const colorHex = (variant.color && variant.color.hex) ? variant.color.hex : "#000000";
          const variantImages = Array.isArray(variant.images) ? variant.images : [];
          const variantSizes = Array.isArray(variant.sizes) ? variant.sizes : [];

          return {
            color: {
              name: colorName,
              hex: colorHex,
              isMultipleImages: variantImages.length > 1,
              totalImages: variantImages.length,
            },
            images: variantImages.map((img, idx) => {
              // For existing URLs, include the URL; for new files, just order
              if (img instanceof File) {
                return { order: idx + 1 };
              } else if (typeof img === 'string' && img.length > 0) {
                return { order: idx + 1, url: img };
              } else if (img && typeof img === 'object' && img.url) {
                return { order: idx + 1, url: img.url };
              }
              return { order: idx + 1 };
            }),
            sizes: variantSizes
              .filter((s) => s && s.size && s.stock !== "" && s.stock !== null)
              .map((s) => ({
                sku: (s.sku && s.sku.trim()) || "",
                size: s.size.trim(),
                stock: Number(s.stock) || 0,
              })),
          };
        });

      // Ensure variantsData is valid before sending
      if (!Array.isArray(variantsData) || variantsData.length === 0) {
        throw new Error("At least one variant with a color name is required");
      }
      console.log("[ItemForm] handleSave: variantsData:", variantsData);
      formData.append("variants", JSON.stringify(variantsData));

      // Variant images - multiple files per color variant (only File objects, not URLs)
      form.variants.forEach((variant) => {
        const colorName = variant.color.name?.trim();
        if (!colorName) return;

        variant.images.forEach((file, index) => {
          if (file instanceof File) {
            formData.append(`variants[${colorName}]`, file);
          }
        });
      });

      // Care instructions - JSON + icon files
      const careInstructions = form.care.instructions.map((inst, idx) => ({
        iconUrl: inst.iconUrl || "",
        iconKey: inst.iconKey || "",
        text: inst.text,
      }));
      const careData = {
        description: form.care.description,
        instructions: careInstructions,
      };
      formData.append("care", JSON.stringify(careData));

      form.care.instructions.forEach((inst, idx) => {
        if (inst.iconFile) {
          formData.append(`careInstructionIcons[${idx}]`, inst.iconFile);
        }
      });

      // Size chart - JSON + measure images
      const cleanedHeaders = (form.sizeChart.headers || []).filter(
        (h) => h && h.key && h.key.trim()
      );

      const cleanedRows = (form.sizeChart.rows || [])
        .filter((row) => {
          if (!row || !row.size || !row.size.toString().trim()) return false;
          const measurements = row.measurements || {};
          return Object.values(measurements).some(
            (val) => val !== "" && val !== null && val !== undefined
          );
        })
        .map((row) => ({
          size: row.size,
          measurements: row.measurements || {},
        }));

      const sizeChartData = {
        unit: form.sizeChart.unit || "in",
        headers: cleanedHeaders,
        rows: cleanedRows,
        measureImage: form.sizeChart.measureImages.map((_, idx) => ({
          imageKey: `measureImages/${idx}`,
        })),
      };
      console.log("[ItemForm] handleSave: sizeChartData:", sizeChartData);
      formData.append("sizeChart", JSON.stringify(sizeChartData));

      form.sizeChart.measureImages.forEach((file) => {
        if (file instanceof File) {
          formData.append("measureImages", file);
        }
      });

      // Shipping - JSON + icon file
      const shippingData = {
        iconUrl: form.shipping.iconUrl || "",
        iconKey: form.shipping.iconKey || "",
        title: form.shipping.title || "",
        estimatedDelivery: form.shipping.estimatedDelivery || "",
        shippingCharges: form.shipping.shippingCharges ? Number(form.shipping.shippingCharges) : undefined,
      };
      formData.append("shipping", JSON.stringify(shippingData));
      if (form.shipping.iconFile) {
        formData.append("shippingIcon", form.shipping.iconFile);
      }

      // COD Policy - JSON + icon file
      const codData = {
        iconUrl: form.codPolicy.iconUrl || "",
        iconKey: form.codPolicy.iconKey || "",
        text: form.codPolicy.text || "",
      };
      formData.append("codPolicy", JSON.stringify(codData));
      if (form.codPolicy.iconFile) {
        formData.append("codIcon", form.codPolicy.iconFile);
      }

      // Return Policy - JSON + icon file
      const returnData = {
        iconUrl: form.returnPolicy.iconUrl || "",
        iconKey: form.returnPolicy.iconKey || "",
        text: form.returnPolicy.text || "",
      };
      formData.append("returnPolicy", JSON.stringify(returnData));
      if (form.returnPolicy.iconFile) {
        formData.append("returnPolicyIcon", form.returnPolicy.iconFile);
      }

      // Exchange Policy - JSON + icon file
      const exchangeData = {
        iconUrl: form.exchangePolicy.iconUrl || "",
        iconKey: form.exchangePolicy.iconKey || "",
        text: form.exchangePolicy.text || "",
      };
      formData.append("exchangePolicy", JSON.stringify(exchangeData));
      if (form.exchangePolicy.iconFile) {
        formData.append("exchangePolicyIcon", form.exchangePolicy.iconFile);
      }

      // Cancellation Policy - JSON + icon file
      const cancellationData = {
        iconUrl: form.cancellationPolicy.iconUrl || "",
        iconKey: form.cancellationPolicy.iconKey || "",
        text: form.cancellationPolicy.text || "",
      };
      formData.append("cancellationPolicy", JSON.stringify(cancellationData));
      if (form.cancellationPolicy.iconFile) {
        formData.append("cancellationPolicyIcon", form.cancellationPolicy.iconFile);
      }

      // Filters - JSON array
      formData.append("filters", JSON.stringify(form.filters));
      console.log("[ItemForm] handleSave: filters:", form.filters);

      // Create or update based on mode
      if (isEdit && id) {
        console.log("[ItemForm] handleSave: sending updateItem with id:", id);
        await updateItem(id, formData);
        alert("Product updated successfully!");
      } else {
        console.log("[ItemForm] handleSave: sending createItem");
        await createItem(formData);
        alert("Product created successfully!");
      }

      console.log("[ItemForm] handleSave: navigation to items list");
      navigate(`/admin/inventory/items/${categoryId}/${subcategoryId}`);
    } catch (err) {
      console.error("[ItemForm] handleSave error:", err);
      // Support both axios-style errors (err.response.data) and plain backend objects thrown from api layer
      const rawData = err?.response?.data ?? err ?? {};
      const responseData =
        typeof rawData === "string" ? { message: rawData } : rawData;

      const collectedBackendErrors = [];

      if (responseData?.errors && typeof responseData.errors === "object") {
        Object.values(responseData.errors).forEach((val) => {
          if (Array.isArray(val)) {
            val.forEach((msg) => {
              if (msg) collectedBackendErrors.push(String(msg));
            });
          } else if (val) {
            collectedBackendErrors.push(String(val));
          }
        });
      }

      if (typeof responseData?.error === "string") {
        collectedBackendErrors.push(responseData.error);
      }

      if (Array.isArray(responseData?.details)) {
        responseData.details.forEach((d) => {
          if (typeof d === "string") {
            collectedBackendErrors.push(d);
          } else if (d?.message) {
            collectedBackendErrors.push(String(d.message));
          }
        });
      }

      if (responseData?.message && !collectedBackendErrors.length) {
        collectedBackendErrors.push(String(responseData.message));
      }

      if (!collectedBackendErrors.length && err?.message) {
        collectedBackendErrors.push(String(err.message));
      }

      if (!collectedBackendErrors.length) {
        collectedBackendErrors.push(
          `Failed to ${isEdit ? "update" : "create"} item`
        );
      }

      setBackendErrors(collectedBackendErrors);

      alert(
        `Failed to ${isEdit ? "update" : "create"} product. Please review the errors shown on the form.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 text-gray-600 hover:text-gray-900 flex items-center gap-2 text-sm font-medium transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Products
          </button>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
            {isEdit ? "Edit Product" : "Create New Product"}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {isEdit ? "Update product details below" : "Fill in the details to create a new product"}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-10">
            {backendErrors.length > 0 && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <div className="font-semibold mb-1">Please fix the following problems:</div>
                <ul className="list-disc list-inside space-y-1">
                  {backendErrors.map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}
            {/* Tabs */}
            <div className="flex border-b-2 border-gray-200 overflow-x-auto mb-8">
              {["Basic", "Variants", "Sizes", "Care", "Size Chart", "Policies", "Filters"].map((label, i) => (
                <button
                  key={label}
                  onClick={() => {
                    const targetTab = i + 1;
                    if (targetTab === 1) {
                      setActiveTab(1);
                      return;
                    }

                    const basicErrors = validateBasicTab();
                    if (Object.keys(basicErrors).length > 0) {
                      setFieldErrors(basicErrors);
                      setActiveTab(1);
                      window.alert(
                        "Please complete the Basic tab before moving to the next step."
                      );
                      return;
                    }

                    // Block Sizes (tab 3) and anything beyond if Variants not valid
                    if (targetTab >= 3 && !validateVariantsTab()) {
                      setActiveTab(2);
                      window.alert(
                        "Please complete the Variants tab (add at least one color) before moving to Sizes."
                      );
                      return;
                    }

                    // Block Filters (tab 7) if Sizes not valid
                    if (targetTab === 7 && !validateSizesTab()) {
                      setActiveTab(3);
                      window.alert(
                        "Please complete the Sizes tab (add stock for at least one size) before moving to Filters."
                      );
                      return;
                    }

                    setFieldErrors({});
                    setActiveTab(targetTab);
                  }}
                  className={`flex-1 py-4 text-center font-semibold transition-all duration-200 whitespace-nowrap min-w-[100px] border-b-2 ${
                    activeTab === i + 1
                      ? "border-black text-black"
                      : `border-transparent ${
                          i + 1 > 1 && !isBasicTabValid()
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-gray-500 hover:text-gray-700"
                        }`
                  }`}
                  disabled={i + 1 > 1 && !isBasicTabValid()}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab 1 – Basic */}
            {activeTab === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter product name"
                    className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                  {fieldErrors.name && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Product ID / SKU
                  </label>
                  <input
                    value={form.productId}
                    onChange={(e) => setForm({ ...form, productId: e.target.value })}
                    placeholder="e.g. TSHIRT-OVERSIZE-006"
                    className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Short Description
                  </label>
                  <textarea
                    value={form.shortDescription}
                    onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                    placeholder="Short description (max 160 chars)"
                    rows={3}
                    maxLength={70}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 resize-none"
                  />
                  <div className="mt-1 flex justify-between items-center">
                    <span className="text-[11px] text-gray-400">
                      {form.shortDescription?.length || 0}/70 characters
                    </span>
                    {fieldErrors.shortDescription && (
                      <span className="text-[11px] text-red-600">
                        {fieldErrors.shortDescription}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Detailed Description
                  </label>
                  <textarea
                    value={form.longDescription}
                    onChange={(e) => setForm({ ...form, longDescription: e.target.value })}
                    placeholder="Detailed product description"
                    rows={6}
                    maxLength={150}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 resize-none"
                  />
                  <div className="mt-1 flex justify-between items-center">
                    <span className="text-[11px] text-gray-400">
                      {form.longDescription?.length || 0}/150 characters
                    </span>
                    {fieldErrors.longDescription && (
                      <span className="text-[11px] text-red-600">
                        {fieldErrors.longDescription}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      MRP (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                    {fieldErrors.price && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.price}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Selling Price (₹)
                    </label>
                    <input
                      type="number"
                      value={form.discountedPrice}
                      onChange={(e) => setForm({ ...form, discountedPrice: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    />
                    {fieldErrors.discountedPrice && (
                      <p className="mt-1 text-xs text-red-600">
                        {fieldErrors.discountedPrice}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center pt-8">
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">
                        Active
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Default Color
                  </label>
                  <input
                    type="text"
                    value={form.defaultColor}
                    onChange={(e) => setForm({ ...form, defaultColor: e.target.value })}
                    placeholder="e.g. Black, White, Red"
                    className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      const errors = validateBasicTab();
                      if (Object.keys(errors).length > 0) {
                        setFieldErrors(errors);
                        return;
                      }
                      setFieldErrors({});
                      setActiveTab(2);
                    }}
                    className="inline-flex items-center px-6 py-2.5 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-all"
                  >
                    Next: Variants
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2 – Variants */}
            {activeTab === 2 && (
              <div className="space-y-8">
                {form.variants.map((variant, vIdx) => (
                  <div key={vIdx} className="border-2 border-gray-200 rounded-xl p-6 bg-gray-50">
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-14 h-14 rounded-xl border-2 border-gray-300 shadow-md"
                          style={{ backgroundColor: variant.color.hex }}
                          title="Color Preview"
                        />
                        <input
                          value={variant.color.name}
                          onChange={(e) => updateVariantColor(vIdx, "name", e.target.value)}
                          placeholder="Color name (e.g. Black, White, Red)"
                          className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                          Hex Code:
                        </label>
                        <input
                          type="text"
                          value={variant.color.hex}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "" || /^#?[0-9A-Fa-f]{0,6}$/.test(value)) {
                              const hex = value.startsWith("#") ? value : `#${value}`;
                              updateVariantColor(vIdx, "hex", hex);
                            }
                          }}
                          placeholder="#000000"
                          className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                          maxLength={7}
                        />
                        <input
                          type="color"
                          value={variant.color.hex}
                          onChange={(e) => updateVariantColor(vIdx, "hex", e.target.value)}
                          className="w-16 h-12 rounded-xl cursor-pointer border-2 border-gray-300"
                          title="Pick Color"
                        />
                      </div>
                      {/* Color presets */}
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-gray-600">Quick colors:</span>
                        <div className="flex items-center gap-2 flex-wrap max-h-48 overflow-y-auto p-2">
                          {[
                            { name: "Black", hex: "#000000" },
                            { name: "White", hex: "#FFFFFF" },
                            { name: "Red", hex: "#FF0000" },
                            { name: "Blue", hex: "#0000FF" },
                            { name: "Green", hex: "#008000" },
                            { name: "Yellow", hex: "#FFFF00" },
                            { name: "Orange", hex: "#FFA500" },
                            { name: "Purple", hex: "#800080" },
                            { name: "Pink", hex: "#FFC0CB" },
                            { name: "Brown", hex: "#A52A2A" },
                            { name: "Gray", hex: "#808080" },
                            { name: "Navy", hex: "#000080" },
                          ].map((preset) => (
                            <button
                              key={preset.hex}
                              type="button"
                              onClick={() => {
                                updateVariantColor(vIdx, "hex", preset.hex);
                                if (!variant.color.name) {
                                  updateVariantColor(vIdx, "name", preset.name);
                                }
                              }}
                              className="w-10 h-10 rounded-lg border-2 border-gray-300 hover:border-gray-500 transition-all shadow-sm"
                              style={{ backgroundColor: preset.hex }}
                              title={preset.name}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <p className="text-sm font-semibold text-gray-700 mb-3">Product Images</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                      {variant.images.map((file, imgIdx) => (
                        <div key={imgIdx} className="relative group">
                          <img
                            src={file instanceof File ? URL.createObjectURL(file) : file}
                            alt=""
                            className="aspect-square object-cover rounded-xl border-2 border-gray-200 shadow-md"
                          />
                          <button
                            onClick={() => removeImageFromVariant(vIdx, imgIdx)}
                            className="absolute top-2 right-2 bg-red-500 text-white text-xs w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg"
                          >
                            ×
                          </button>
                        </div>
                      ))}

                      <label className="aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all">
                        <span className="text-3xl text-gray-400">+</span>
                        <span className="text-xs text-gray-500 mt-1 font-medium">Add image</span>
                        <input
                          ref={(el) => {
                            if (el) fileInputRefs.current[`variant-${vIdx}`] = el;
                          }}
                          type="file"
                          accept="image/*"
                          multiple
                          hidden
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files?.length) {
                              // Prevent double-firing by checking if we're already processing
                              const inputKey = `variant-${vIdx}`;
                              const input = fileInputRefs.current[inputKey];
                              if (input?.disabled) return;
                              
                              // Temporarily disable to prevent double-firing
                              if (input) input.disabled = true;
                              
                              addImageToVariant(vIdx, files);
                              
                              // Reset input and re-enable after processing
                              setTimeout(() => {
                                if (input) {
                                  input.value = '';
                                  input.disabled = false;
                                }
                              }, 100);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addVariant}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add another color variant
                </button>
                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab(1)}
                    className="inline-flex items-center px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    Back: Basic
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!validateVariantsTab()) {
                        window.alert(
                          "Please complete the Variants tab (add at least one color) before moving to Sizes."
                        );
                        return;
                      }
                      setActiveTab(3);
                    }}
                    className="inline-flex items-center px-6 py-2.5 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-all"
                  >
                    Next: Sizes
                  </button>
                </div>
              </div>
            )}

            {/* Tab 3 – Sizes */}
            {activeTab === 3 && (
              <div className="space-y-8">
                {form.variants.map((variant, vIdx) => (
                  <div key={vIdx} className="border-2 border-gray-200 rounded-xl p-6 bg-white">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-lg shadow-md" style={{ backgroundColor: variant.color.hex }} />
                      <span className="font-bold text-gray-900">{variant.color.name || "Unnamed Color"}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {variant.sizes.map((size, sIdx) => (
                        <div key={sIdx} className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <div className="font-bold text-gray-900">{size.size}</div>
                          <input
                            type="text"
                            placeholder="SKU (e.g. TSH-BLK-S)"
                            value={size.sku}
                            onChange={(e) => updateSize(vIdx, sIdx, "sku", e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          />
                          <input
                            type="number"
                            placeholder="Stock"
                            value={size.stock}
                            onChange={(e) => updateSize(vIdx, sIdx, "stock", e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab(2)}
                    className="inline-flex items-center px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    Back: Variants
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!validateSizesTab()) {
                        window.alert(
                          "Please complete the Sizes tab (add stock for at least one size) before moving to Filters."
                        );
                        return;
                      }
                      setActiveTab(7);
                    }}
                    className="inline-flex items-center px-6 py-2.5 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-all"
                  >
                    Next: Filters
                  </button>
                </div>
              </div>
            )}

            {/* Tab 4 – Care */}
            {activeTab === 4 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Care Description
                  </label>
                  <textarea
                    value={form.care.description}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        care: { ...form.care, description: e.target.value },
                      })
                    }
                    placeholder="Proper care will help maintain fabric quality and color."
                    rows={4}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Care Instructions</h3>
                    <button
                      type="button"
                      onClick={addCareInstruction}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm font-semibold"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Instruction
                    </button>
                  </div>

                  {form.care.instructions.length === 0 ? (
                    <p className="text-gray-500 text-sm italic p-4 bg-gray-50 rounded-xl">No care instructions added yet</p>
                  ) : (
                    <div className="space-y-4">
                      {form.care.instructions.map((inst, index) => (
                        <div
                          key={index}
                          className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3"
                        >
                          <div className="flex gap-3">
                            <input
                              type="text"
                              value={inst.text}
                              onChange={(e) =>
                                updateCareInstruction(index, "text", e.target.value)
                              }
                              placeholder="Instruction text (e.g. Machine wash cold)"
                              className="flex-1 px-3 py-2 text-sm rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                            <button
                              onClick={() => removeCareInstruction(index)}
                              className="text-red-600 hover:text-red-800 px-3 py-2 rounded-lg hover:bg-red-50 transition-all font-semibold text-sm"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="flex gap-3">
                            <input
                              type="text"
                              value={inst.iconUrl}
                              onChange={(e) =>
                                updateCareInstruction(index, "iconUrl", e.target.value)
                              }
                              placeholder="Icon URL"
                              className="flex-1 px-3 py-2 text-sm rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                            <input
                              type="text"
                              value={inst.iconKey}
                              onChange={(e) =>
                                updateCareInstruction(index, "iconKey", e.target.value)
                              }
                              placeholder="Icon Key"
                              className="flex-1 px-3 py-2 text-sm rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                          </div>
                          <label className="block">
                            <span className="text-sm font-semibold text-gray-700 mb-1 block">Icon File</span>
                            <input
                              type="file"
                              accept="image/*,.svg"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                updateCareInstruction(index, "iconFile", file);
                              }}
                              className="text-sm text-gray-600"
                            />
                        {(inst.iconFile || inst.iconUrl) && (
                          <div className="mt-2 flex items-center gap-3">
                            <span className="text-xs text-gray-500">
                              Preview:
                            </span>
                            <img
                              src={
                                inst.iconFile
                                  ? URL.createObjectURL(inst.iconFile)
                                  : inst.iconUrl
                              }
                              alt="Care icon preview"
                              className="h-8 w-8 rounded border border-gray-200 object-contain bg-white"
                            />
                          </div>
                        )}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 5 – Size Chart */}
            {activeTab === 5 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Unit
                  </label>
                  <select
                    value={form.sizeChart.unit}
                    onChange={(e) => {
                      const newUnit = e.target.value;
                      setForm({
                        ...form,
                        sizeChart: { 
                          ...form.sizeChart, 
                          unit: newUnit,
                          headers: form.sizeChart.headers.map(header => ({
                            ...header,
                            label: header.label.replace(/\(in\)|\(cm\)/g, `(${newUnit})`)
                          }))
                        },
                      });
                    }}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  >
                    <option value="in">Inches (in)</option>
                    <option value="cm">Centimeters (cm)</option>
                  </select>
                </div>

                {/* Headers */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Measurement Headers</h3>
                    <button
                      type="button"
                      onClick={addSizeChartHeader}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm font-semibold"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Header
                    </button>
                  </div>

                  {form.sizeChart.headers.length === 0 ? (
                    <p className="text-gray-500 text-sm italic p-4 bg-gray-50 rounded-xl">No headers added yet</p>
                  ) : (
                    <div className="space-y-3">
                      {form.sizeChart.headers.map((header, index) => (
                        <div
                          key={index}
                          className="flex gap-3 items-center bg-gray-50 p-3 rounded-xl border border-gray-200"
                        >
                          <input
                            type="text"
                            value={header.key}
                            onChange={(e) =>
                              updateSizeChartHeader(index, "key", e.target.value)
                            }
                            placeholder="Key (e.g. chest, length)"
                            className="flex-1 px-3 py-2 text-sm rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          />
                          <input
                            type="text"
                            value={header.label}
                            onChange={(e) =>
                              updateSizeChartHeader(index, "label", e.target.value)
                            }
                            placeholder={`Label (e.g. Chest (${form.sizeChart.unit}))`}
                            className="flex-1 px-3 py-2 text-sm rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          />
                          <button
                            onClick={() => removeSizeChartHeader(index)}
                            className="text-red-600 hover:text-red-800 px-3 py-2 rounded-lg hover:bg-red-50 transition-all font-semibold text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Rows */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Size Rows</h3>
                    <button
                      type="button"
                      onClick={addSizeChartRow}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm font-semibold"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Row
                    </button>
                  </div>

                  {form.sizeChart.rows.length === 0 ? (
                    <p className="text-gray-500 text-sm italic p-4 bg-gray-50 rounded-xl">No rows added yet</p>
                  ) : (
                    <div className="space-y-4">
                      {form.sizeChart.rows.map((row, rowIndex) => (
                        <div
                          key={rowIndex}
                          className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50"
                        >
                          <div className="flex gap-3 items-center">
                            <input
                              type="text"
                              value={row.size}
                              onChange={(e) =>
                                updateSizeChartRow(rowIndex, "size", e.target.value)
                              }
                              placeholder="Size (e.g. S, M, L, XL)"
                              className="w-24 px-3 py-2 text-sm rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                            {form.sizeChart.headers.map((header) => (
                              <input
                                key={header.key}
                                type="number"
                                value={row.measurements[header.key] || ""}
                                onChange={(e) =>
                                  updateSizeChartRow(
                                    rowIndex,
                                    header.key,
                                    e.target.value
                                  )
                                }
                                placeholder={header.label || header.key}
                                className="flex-1 px-3 py-2 text-sm rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                              />
                            ))}
                            <button
                              onClick={() => removeSizeChartRow(rowIndex)}
                              className="text-red-600 hover:text-red-800 px-3 py-2 rounded-lg hover:bg-red-50 transition-all font-semibold text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Measure Images */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Measurement Images</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                    {form.sizeChart.measureImages.map((file, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={file instanceof File ? URL.createObjectURL(file) : file}
                          alt=""
                          className="aspect-square object-cover rounded-xl border-2 border-gray-200 shadow-md"
                        />
                        <button
                          onClick={() => removeSizeChartImage(idx)}
                          className="absolute top-2 right-2 bg-red-500 text-white text-xs w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <label className="aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all">
                      <span className="text-3xl text-gray-400">+</span>
                      <span className="text-xs text-gray-500 mt-1 font-medium">Add image</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={(e) => addSizeChartImage(e.target.files)}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 6 – Policies */}
            {activeTab === 6 && (
              <div className="space-y-8">
                {/* Shipping */}
                <div className="border-2 border-gray-200 rounded-xl p-6 bg-white">
                  <h3 className="font-semibold text-gray-900 mb-4">Shipping Policy</h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={form.shipping.title}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          shipping: { ...form.shipping, title: e.target.value },
                        })
                      }
                      placeholder="Title (e.g. Free Shipping)"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                    <input
                      type="text"
                      value={form.shipping.estimatedDelivery}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          shipping: {
                            ...form.shipping,
                            estimatedDelivery: e.target.value,
                          },
                        })
                      }
                      placeholder="Estimated Delivery (e.g. Delivery within 4-6 business days)"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                    <input
                      type="number"
                      value={form.shipping.shippingCharges}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          shipping: {
                            ...form.shipping,
                            shippingCharges: e.target.value,
                          },
                        })
                      }
                      placeholder="Shipping Charges (₹)"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={form.shipping.iconUrl}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            shipping: { ...form.shipping, iconUrl: e.target.value },
                          })
                        }
                        placeholder="Icon URL"
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                      <input
                        type="text"
                        value={form.shipping.iconKey}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            shipping: { ...form.shipping, iconKey: e.target.value },
                          })
                        }
                        placeholder="Icon Key"
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <label className="block">
                      <span className="text-sm font-semibold text-gray-700 mb-1 block">Shipping Icon File</span>
                      <input
                        type="file"
                        accept="image/*,.svg"
                        onChange={(e) =>
                          setForm({
                            ...form,
                            shipping: {
                              ...form.shipping,
                              iconFile: e.target.files?.[0] || null,
                            },
                          })
                        }
                        className="text-sm text-gray-600"
                      />
                      {(form.shipping.iconFile || form.shipping.iconUrl) && (
                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-xs text-gray-500">
                            Preview:
                          </span>
                          <img
                            src={
                              form.shipping.iconFile
                                ? URL.createObjectURL(form.shipping.iconFile)
                                : form.shipping.iconUrl
                            }
                            alt="Shipping icon preview"
                            className="h-8 w-8 rounded border border-gray-200 object-contain bg-white"
                          />
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* COD Policy */}
                <div className="border-2 border-gray-200 rounded-xl p-6 bg-white">
                  <h3 className="font-semibold text-gray-900 mb-4">COD Policy</h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={form.codPolicy.text}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          codPolicy: { ...form.codPolicy, text: e.target.value },
                        })
                      }
                      placeholder="Text (e.g. Cash on Delivery available)"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={form.codPolicy.iconUrl}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            codPolicy: { ...form.codPolicy, iconUrl: e.target.value },
                          })
                        }
                        placeholder="Icon URL"
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                      <input
                        type="text"
                        value={form.codPolicy.iconKey}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            codPolicy: { ...form.codPolicy, iconKey: e.target.value },
                          })
                        }
                        placeholder="Icon Key"
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <label className="block">
                      <span className="text-sm font-semibold text-gray-700 mb-1 block">COD Icon File</span>
                      <input
                        type="file"
                        accept="image/*,.svg"
                        onChange={(e) =>
                          setForm({
                            ...form,
                            codPolicy: {
                              ...form.codPolicy,
                              iconFile: e.target.files?.[0] || null,
                            },
                          })
                        }
                        className="text-sm text-gray-600"
                      />
                      {(form.codPolicy.iconFile || form.codPolicy.iconUrl) && (
                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-xs text-gray-500">
                            Preview:
                          </span>
                          <img
                            src={
                              form.codPolicy.iconFile
                                ? URL.createObjectURL(form.codPolicy.iconFile)
                                : form.codPolicy.iconUrl
                            }
                            alt="COD icon preview"
                            className="h-8 w-8 rounded border border-gray-200 object-contain bg-white"
                          />
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Return Policy */}
                <div className="border-2 border-gray-200 rounded-xl p-6 bg-white">
                  <h3 className="font-semibold text-gray-900 mb-4">Return Policy</h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={form.returnPolicy.text}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          returnPolicy: { ...form.returnPolicy, text: e.target.value },
                        })
                      }
                      placeholder="Text (e.g. 7-day easy return policy)"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={form.returnPolicy.iconUrl}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            returnPolicy: { ...form.returnPolicy, iconUrl: e.target.value },
                          })
                        }
                        placeholder="Icon URL"
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                      <input
                        type="text"
                        value={form.returnPolicy.iconKey}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            returnPolicy: { ...form.returnPolicy, iconKey: e.target.value },
                          })
                        }
                        placeholder="Icon Key"
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <label className="block">
                      <span className="text-sm font-semibold text-gray-700 mb-1 block">Return Policy Icon File</span>
                      <input
                        type="file"
                        accept="image/*,.svg"
                        onChange={(e) =>
                          setForm({
                            ...form,
                            returnPolicy: {
                              ...form.returnPolicy,
                              iconFile: e.target.files?.[0] || null,
                            },
                          })
                        }
                        className="text-sm text-gray-600"
                      />
                      {(form.returnPolicy.iconFile || form.returnPolicy.iconUrl) && (
                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-xs text-gray-500">
                            Preview:
                          </span>
                          <img
                            src={
                              form.returnPolicy.iconFile
                                ? URL.createObjectURL(form.returnPolicy.iconFile)
                                : form.returnPolicy.iconUrl
                            }
                            alt="Return policy icon preview"
                            className="h-8 w-8 rounded border border-gray-200 object-contain bg-white"
                          />
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Exchange Policy */}
                <div className="border-2 border-gray-200 rounded-xl p-6 bg-white">
                  <h3 className="font-semibold text-gray-900 mb-4">Exchange Policy</h3>
                  <div className="space-y-4">
                    <textarea
                      value={form.exchangePolicy.text}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          exchangePolicy: { ...form.exchangePolicy, text: e.target.value },
                        })
                      }
                      placeholder="Text (e.g. Orders can be exchanged within 7 days of delivery)"
                      rows={3}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                    />
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={form.exchangePolicy.iconUrl}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            exchangePolicy: { ...form.exchangePolicy, iconUrl: e.target.value },
                          })
                        }
                        placeholder="Icon URL"
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                      <input
                        type="text"
                        value={form.exchangePolicy.iconKey}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            exchangePolicy: { ...form.exchangePolicy, iconKey: e.target.value },
                          })
                        }
                        placeholder="Icon Key"
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <label className="block">
                      <span className="text-sm font-semibold text-gray-700 mb-1 block">Exchange Policy Icon File</span>
                      <input
                        type="file"
                        accept="image/*,.svg"
                        onChange={(e) =>
                          setForm({
                            ...form,
                            exchangePolicy: {
                              ...form.exchangePolicy,
                              iconFile: e.target.files?.[0] || null,
                            },
                          })
                        }
                        className="text-sm text-gray-600"
                      />
                      {(form.exchangePolicy.iconFile || form.exchangePolicy.iconUrl) && (
                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-xs text-gray-500">
                            Preview:
                          </span>
                          <img
                            src={
                              form.exchangePolicy.iconFile
                                ? URL.createObjectURL(form.exchangePolicy.iconFile)
                                : form.exchangePolicy.iconUrl
                            }
                            alt="Exchange policy icon preview"
                            className="h-8 w-8 rounded border border-gray-200 object-contain bg-white"
                          />
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Cancellation Policy */}
                <div className="border-2 border-gray-200 rounded-xl p-6 bg-white">
                  <h3 className="font-semibold text-gray-900 mb-4">Cancellation Policy</h3>
                  <div className="space-y-4">
                    <textarea
                      value={form.cancellationPolicy.text}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          cancellationPolicy: { ...form.cancellationPolicy, text: e.target.value },
                        })
                      }
                      placeholder="Text (e.g. Orders can be cancelled within 24 hours of placement)"
                      rows={3}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                    />
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={form.cancellationPolicy.iconUrl}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            cancellationPolicy: { ...form.cancellationPolicy, iconUrl: e.target.value },
                          })
                        }
                        placeholder="Icon URL"
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                      <input
                        type="text"
                        value={form.cancellationPolicy.iconKey}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            cancellationPolicy: { ...form.cancellationPolicy, iconKey: e.target.value },
                          })
                        }
                        placeholder="Icon Key"
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <label className="block">
                      <span className="text-sm font-semibold text-gray-700 mb-1 block">Cancellation Policy Icon File</span>
                      <input
                        type="file"
                        accept="image/*,.svg"
                        onChange={(e) =>
                          setForm({
                            ...form,
                            cancellationPolicy: {
                              ...form.cancellationPolicy,
                              iconFile: e.target.files?.[0] || null,
                            },
                          })
                        }
                        className="text-sm text-gray-600"
                      />
                      {(form.cancellationPolicy.iconFile || form.cancellationPolicy.iconUrl) && (
                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-xs text-gray-500">
                            Preview:
                          </span>
                          <img
                            src={
                              form.cancellationPolicy.iconFile
                                ? URL.createObjectURL(form.cancellationPolicy.iconFile)
                                : form.cancellationPolicy.iconUrl
                            }
                            alt="Cancellation policy icon preview"
                            className="h-8 w-8 rounded border border-gray-200 object-contain bg-white"
                          />
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 7 – Filters */}
            {activeTab === 7 && (
              <div className="space-y-6">
                <div className="border-2 border-gray-200 rounded-xl p-6 bg-white">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-semibold text-gray-900">Filters / Tags</h3>
                    <button
                      type="button"
                      onClick={addFilter}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm font-semibold"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Filter
                    </button>
                  </div>

                  {form.filters.length === 0 ? (
                    <p className="text-gray-500 text-sm italic p-4 bg-gray-50 rounded-xl">No filters added yet. Add filters like category, fabric, fit, sleeve, etc.</p>
                  ) : (
                    <div className="space-y-4">
                      {form.filters.map((filter, index) => (
                        <div key={index} className="flex gap-3 items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                          <input
                            value={filter.key}
                            onChange={(e) => updateFilter(index, "key", e.target.value)}
                            placeholder="Key (e.g. category, fabric, fit, sleeve)"
                            className="flex-1 px-4 py-2.5 text-sm rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          />
                          <input
                            value={filter.value}
                            onChange={(e) => updateFilter(index, "value", e.target.value)}
                            placeholder="Value (e.g. tshirt, cotton, oversized, half sleeve)"
                            className="flex-1 px-4 py-2.5 text-sm rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          />
                          <button
                            onClick={() => removeFilter(index)}
                            className="text-red-600 hover:text-red-800 px-4 py-2.5 rounded-lg hover:bg-red-50 transition-all font-semibold text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-8 border-t-2 border-gray-200 mt-8">
              <button
                onClick={() => navigate(-1)}
                className="px-8 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  isEdit ? "Update Product" : "Create Product"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemForm;
