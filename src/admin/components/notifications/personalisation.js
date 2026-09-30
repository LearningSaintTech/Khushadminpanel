export const NAME_PLACEHOLDERS = [
  { token: "{{userName}}", label: "First name", hint: "Priya (or “there” if no name)" },
  { token: "{{fullName}}", label: "Full name", hint: "Priya Sharma" },
  { token: "{{userName|Friend}}", label: "First name, custom fallback", hint: "Priya (or “Friend”)" },
];

/** Insert `token` into a text input/textarea at the cursor and return the new value. */
export function insertAtCursor(el, currentValue, token) {
  const value = currentValue || "";
  if (!el || typeof el.selectionStart !== "number") return `${value}${token}`;
  const start = el.selectionStart;
  const end = el.selectionEnd ?? start;
  const next = value.slice(0, start) + token + value.slice(end);
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start + token.length, start + token.length);
  });
  return next;
}

/** Value for <input type="datetime-local"> min= (now + 1 minute, local time). */
export function minScheduleInputValue() {
  const d = new Date(Date.now() + 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
