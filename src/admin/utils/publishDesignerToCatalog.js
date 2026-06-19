import { createItem, searchItems } from "../apis/itemapi";
import {
  patchDesignerInventoryListed,
  unwrapDesignerInventoryItem,
} from "../apis/Designerapi";
import { buildItemCreateFormData } from "./buildItemCreateFormData";
import { logFormDataSummary } from "./logFormDataSummary";
import { variantSkuSet } from "./catalogDesignerSyncPreflight";

const LOG = "[publishDesignerToCatalog]";

function unwrapSearchItems(res) {
  const root = res?.data ?? res ?? {};
  const payload = root?.data && typeof root.data === "object" ? root.data : root;
  const list = payload?.items ?? payload?.products ?? [];
  return Array.isArray(list) ? list : [];
}

function catalogItemIdOf(item) {
  if (!item) return "";
  return String(item._id || item.itemId || "").trim();
}

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
 * Find main catalog item matching designer row (productId, style number, or shared SKU).
 */
export async function findExistingCatalogItemForDesigner({ productId, designerRow } = {}) {
  const styleNumber = String(
    productId ||
      designerRow?.StyleNumber ||
      designerRow?.skuCodeInputs?.styleNu ||
      ""
  ).trim();
  if (!styleNumber) return null;

  const designerSkus = variantSkuSet(designerRow);

  const tryResolve = (items) => {
    if (!Array.isArray(items) || !items.length) return null;

    const pidLower = styleNumber.toLowerCase();
    const byProductId = items.find(
      (item) => String(item?.productId || "").trim().toLowerCase() === pidLower
    );
    if (byProductId) return byProductId;

    if (designerSkus.size) {
      for (const item of items) {
        const catalogSkus = variantSkuSet(item);
        for (const sku of designerSkus) {
          if (catalogSkus.has(sku)) return item;
        }
      }
    }
    return null;
  };

  try {
    const res = await searchItems({ keywords: styleNumber, limit: 25 });
    const hit = tryResolve(unwrapSearchItems(res));
    if (hit) return hit;
  } catch (err) {
    console.warn(`${LOG} catalog search failed`, err?.message || err);
  }

  const firstSku = [...designerSkus][0];
  if (firstSku) {
    try {
      const res = await searchItems({ keywords: firstSku, limit: 25 });
      const hit = tryResolve(unwrapSearchItems(res));
      if (hit) return hit;
    } catch (err) {
      console.warn(`${LOG} catalog SKU search failed`, err?.message || err);
    }
  }

  return null;
}

/**
 * Link designer row to an existing catalog item (no POST /items/create).
 */
export async function linkDesignerToExistingCatalog({
  designerInventoryId,
  catalogItem,
  catalogItemId,
  designerRow = null,
}) {
  const id = String(designerInventoryId || "").trim();
  const cid = String(catalogItemId || catalogItemIdOf(catalogItem) || "").trim();
  if (!id) throw new Error("designerInventoryId is required.");
  if (!cid) throw new Error("catalogItemId is required to link.");

  console.log(`${LOG} LINK existing catalog`, {
    designerInventoryId: id,
    catalogItemId: cid,
    productId: catalogItem?.productId,
  });

  const listedBody = { isListed: true, catalogItemId: cid };
  const listedResponse = await patchDesignerInventoryListed(id, listedBody);
  const updatedDesigner = unwrapDesignerInventoryItem(listedResponse) || {
    ...(designerRow || {}),
    _id: id,
    isListed: true,
    catalogItemId: cid,
  };

  return {
    mode: "link",
    catalogItem: catalogItem || { _id: cid },
    catalogItemId: cid,
    listedResponse,
    updatedDesigner,
    createResponse: null,
  };
}

/**
 * Admin listing flow:
 * 1. If catalog item already exists (productId / SKU) → link only
 * 2. Else build FormData → POST /items/create
 * 3. PATCH designer inventory listed { isListed, catalogItemId }
 */
export async function publishDesignerToCatalog({
  designerInventoryId,
  form,
  categoryId,
  subcategoryId,
  designerRow = null,
  linkOnly = false,
}) {
  const id = String(designerInventoryId || "").trim();
  if (!id) throw new Error("designerInventoryId is required.");

  const presetCatalogId = String(designerRow?.catalogItemId || "").trim();
  if (presetCatalogId && /^[a-f0-9]{24}$/i.test(presetCatalogId)) {
    return linkDesignerToExistingCatalog({
      designerInventoryId: id,
      catalogItemId: presetCatalogId,
      designerRow,
    });
  }

  const productId = String(
    form?.productId?.trim() ||
      form?.skuCodeInputs?.styleNu?.trim() ||
      designerRow?.StyleNumber ||
      ""
  ).trim();

  const existingCatalog = await findExistingCatalogItemForDesigner({
    productId,
    designerRow: designerRow || form,
  });

  if (linkOnly || existingCatalog) {
    if (!existingCatalog) {
      throw new Error(
        linkOnly
          ? "No matching catalog item found. Check Product ID or create a new catalog item."
          : "No existing catalog item found to link."
      );
    }
    return linkDesignerToExistingCatalog({
      designerInventoryId: id,
      catalogItem: existingCatalog,
      designerRow,
    });
  }

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

  console.log(`${LOG} CREATE new catalog`, {
    designerInventoryId: id,
    styleNumber: designerRow?.StyleNumber ?? form?.skuCodeInputs?.styleNu,
    categoryId,
    subcategoryId,
    productId: form.productId,
  });

  const formData = buildItemCreateFormData(form, categoryId, subcategoryId, {
    secondaryCategoryId,
    secondarySubcategoryId,
  });
  logFormDataSummary(formData, "POST /items/create");

  let createResponse;
  try {
    createResponse = await createItem(formData);
  } catch (createErr) {
    const msg = String(createErr?.message || createErr || "");
    if (/product id already exist|sku\(s\) already exist/i.test(msg)) {
      const retryCatalog = await findExistingCatalogItemForDesigner({
        productId: form.productId,
        designerRow,
      });
      if (retryCatalog) {
        console.log(`${LOG} create failed — linking to existing catalog instead`);
        return linkDesignerToExistingCatalog({
          designerInventoryId: id,
          catalogItem: retryCatalog,
          designerRow,
        });
      }
    }
    throw createErr;
  }

  const catalogItem = unwrapCatalogItemFromCreateResponse(createResponse);
  const catalogItemId = catalogItemIdOf(catalogItem);
  if (!catalogItemId) {
    throw new Error(
      "Catalog create succeeded but no item _id was returned. Check POST /items/create response shape."
    );
  }

  const listedResponse = await patchDesignerInventoryListed(id, {
    isListed: true,
    catalogItemId,
  });

  const updatedDesigner = unwrapDesignerInventoryItem(listedResponse) || {
    ...(designerRow || {}),
    _id: id,
    isListed: true,
    catalogItemId,
  };

  return {
    mode: "create",
    catalogItem,
    catalogItemId,
    createResponse,
    listedResponse,
    updatedDesigner,
  };
}
