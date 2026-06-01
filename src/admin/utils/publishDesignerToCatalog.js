import { createItem } from "../apis/itemapi";
import {
  patchDesignerInventoryListed,
  unwrapDesignerInventoryItem,
} from "../apis/Designerapi";
import { buildItemCreateFormData } from "./buildItemCreateFormData";
import { logFormDataSummary } from "./logFormDataSummary";

const LOG = "[publishDesignerToCatalog]";

/**
 * Unwrap catalog item from POST /items/create response shapes.
 */
export function unwrapCatalogItemFromCreateResponse(res) {
  if (!res || typeof res !== "object") return null;
  const candidates = [
    res?.data?.data,
    res?.data?.item,
    res?.data?.product,
    res?.data,
    res?.item,
    res?.product,
    res,
  ];
  for (const c of candidates) {
    if (c && typeof c === "object" && !Array.isArray(c) && (c._id || c.productId)) {
      return c;
    }
  }
  return null;
}

/**
 * Admin listing flow:
 * 1. Build FormData (same as ItemForm create)
 * 2. POST /api/items/create → saves main catalog item in DB
 * 3. PATCH /api/admin/panels/designer/inventory/:id/listed { isListed, catalogItemId }
 *
 * @param {object} params
 * @param {string} params.designerInventoryId - designer inventory row _id
 * @param {object} params.form - ItemForm-shaped state (from designerInventoryToItemFormState + edits)
 * @param {string} params.categoryId - primary catalog category
 * @param {string} params.subcategoryId - primary catalog subcategory
 * @param {object} [params.designerRow] - optional row snapshot for logging
 * @returns {Promise<{ catalogItem, catalogItemId, createResponse, listedResponse, updatedDesigner }>}
 */
export async function publishDesignerToCatalog({
  designerInventoryId,
  form,
  categoryId,
  subcategoryId,
  designerRow = null,
}) {
  const id = String(designerInventoryId || "").trim();
  if (!id) throw new Error("designerInventoryId is required.");
  if (!categoryId || !subcategoryId) {
    throw new Error("categoryId and subcategoryId are required for catalog create.");
  }
  if (!form?.name?.trim()) {
    throw new Error("Catalog product name is required.");
  }

  const secondaryCategoryId =
    form.secondaryCategoryId ?? designerRow?.secondaryCategoryId ?? [];
  const secondarySubcategoryId =
    form.secondarySubcategoryId ?? designerRow?.secondarySubcategoryId ?? [];

  console.log(`${LOG} START`, {
    designerInventoryId: id,
    styleNumber: designerRow?.StyleNumber ?? form?.skuCodeInputs?.styleNu,
    categoryId,
    subcategoryId,
    secondaryCategoryId,
    secondarySubcategoryId,
    variantCount: form?.variants?.length ?? 0,
    productId: form?.productId,
  });

  console.log(`${LOG} step 1 — buildItemCreateFormData`);
  const formData = buildItemCreateFormData(form, categoryId, subcategoryId, {
    secondaryCategoryId,
    secondarySubcategoryId,
  });
  logFormDataSummary(formData, "POST /items/create");

  console.log(`${LOG} step 2 — POST /items/create`);
  const createResponse = await createItem(formData);
  console.log(`${LOG} step 2 response`, createResponse);

  const catalogItem = unwrapCatalogItemFromCreateResponse(createResponse);
  const catalogItemId = catalogItem?._id ? String(catalogItem._id) : "";
  if (!catalogItemId) {
    console.error(`${LOG} missing catalog item id`, { createResponse, catalogItem });
    throw new Error(
      "Catalog create succeeded but no item _id was returned. Check POST /items/create response shape.",
    );
  }

  console.log(`${LOG} step 3 — catalog item saved`, {
    catalogItemId,
    productId: catalogItem?.productId,
    name: catalogItem?.name,
  });

  const listedBody = {
    isListed: true,
    catalogItemId,
  };
  console.log(`${LOG} step 4 — PATCH designer inventory listed`, { id, body: listedBody });
  const listedResponse = await patchDesignerInventoryListed(id, listedBody);
  console.log(`${LOG} step 4 response`, listedResponse);

  const updatedDesigner = unwrapDesignerInventoryItem(listedResponse) || {
    ...(designerRow || {}),
    _id: id,
    isListed: true,
    catalogItemId,
  };

  console.log(`${LOG} DONE`, {
    designerInventoryId: id,
    catalogItemId,
    isListed: updatedDesigner?.isListed,
  });

  return {
    catalogItem,
    catalogItemId,
    createResponse,
    listedResponse,
    updatedDesigner,
  };
}
