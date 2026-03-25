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

  // express-validator (validate.middleware): errors is an array of { msg, path, type, ... }
  if (Array.isArray(data.errors)) {
    data.errors.forEach((item) => {
      if (typeof item === "string") {
        add(item);
        return;
      }
      if (item != null && typeof item === "object") {
        const m = item.msg ?? item.message;
        if (m != null && String(m).trim()) {
          const loc = item.path ?? item.param;
          const prefix = loc != null && String(loc).trim() ? `${String(loc)}: ` : "";
          messages.add(`${prefix}${String(m).trim()}`);
        }
      }
    });
  } else if (data.errors && typeof data.errors === "object") {
    Object.entries(data.errors).forEach(([key, val]) => {
      if (Array.isArray(val)) {
        val.forEach((m) => {
          if (typeof m === "string" && m.trim()) messages.add(`${key}: ${m.trim()}`);
          else if (m != null && typeof m === "object" && (m.msg || m.message)) {
            messages.add(`${key}: ${String(m.msg || m.message).trim()}`);
          } else add(m);
        });
      } else if (val != null && typeof val === "object" && (val.msg || val.message)) {
        messages.add(`${key}: ${String(val.msg || val.message).trim()}`);
      } else {
        add(val);
      }
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
