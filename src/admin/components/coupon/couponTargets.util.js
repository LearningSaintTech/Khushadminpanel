import { getSingleItem } from "../../apis/itemapi";

// Resolve product names for a coupon being edited (it stores only ids)
export async function loadItemLabels(itemIds = []) {
  const ids = itemIds.map((i) => String(i?._id || i)).filter(Boolean);
  const rows = await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await getSingleItem(id);
        const root = res?.data ?? res ?? {};
        const item = root?.data?.item || root?.data || root?.item || root;
        return { _id: id, name: item?.name || id };
      } catch {
        return { _id: id, name: id };
      }
    }),
  );
  return rows;
}
