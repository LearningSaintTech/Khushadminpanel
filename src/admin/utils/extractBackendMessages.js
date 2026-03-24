/**
 * Normalize API/axios failures into a list of user-visible strings.
 * Works with: plain strings, objects from apiConnector (response body), or legacy axios errors.
 */
export function extractBackendMessages(err) {
  const messages = new Set();

  let data;
  if (typeof err === "string") {
    data = { message: err };
  } else if (err?.response?.data != null) {
    const d = err.response.data;
    data = typeof d === "string" ? { message: d } : d || {};
  } else {
    data = err && typeof err === "object" ? err : {};
  }
  if (typeof data === "string") data = { message: data };

  const add = (v) => {
    if (v == null) return;
    if (typeof v === "string" && v.trim()) messages.add(v.trim());
    else if (Array.isArray(v)) v.forEach(add);
  };

  add(data.message);
  add(data.error);
  if (data.errors && typeof data.errors === "object") {
    Object.values(data.errors).forEach((val) => {
      if (Array.isArray(val)) val.forEach((m) => add(m));
      else add(val);
    });
  }
  if (Array.isArray(data.details)) {
    data.details.forEach((d) => {
      if (typeof d === "string") add(d);
      else if (d?.message) add(String(d.message));
    });
  }

  if (messages.size === 0) add(err?.message);
  if (messages.size === 0) messages.add("Something went wrong");
  return Array.from(messages);
}
