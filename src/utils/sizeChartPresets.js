/**
 * Shared size-chart templates for designer inventory and catalog ItemForm (in + cm tables).
 */

export const SIZE_CHART_PRESETS = {
  men: {
    upper: {
      title: "Men Shirt",
      unit: "in",
      sizes: ["S", "M", "L", "XL", "XXL"],
      headers: [
        { key: "chest", label: "Chest (in)" },
        { key: "front_length", label: "Front Length (in)" },
        { key: "across_shoulder", label: "Across Shoulder (in)" },
        { key: "sleeve_length", label: "Sleeve Length (in)" },
      ],
      sampleValues: {
        chest: ["39", "41", "43", "45", "47"],
        front_length: ["28 5/8", "29", "29 3/8", "29 3/4", "30 1/8"],
        across_shoulder: ["16", "16.5", "17", "17.5", "18"],
        sleeve_length: ["24.5", "24 3/4", "25", "25.25", "25.50"],
      },
    },
    lower: {
      title: "Men Pant",
      unit: "in",
      sizes: ["28", "30", "32", "34", "36", "38"],
      headers: [
        { key: "hip", label: "Hip (in)" },
        { key: "inseam", label: "Inseam (in)" },
        { key: "outseam", label: "Outseam (in)" },
      ],
      sampleValues: {
        hip: ["36", "38", "40", "42", "44", "46"],
        inseam: ["31", "30.5", "30", "29.5", "29", "28.5"],
        outseam: ["42", "42", "42", "42", "42", "42"],
      },
    },
  },
  women: {
    upper: {
      title: "Women Body Measurements",
      unit: "in",
      sizes: ["XS", "S", "M", "L", "XL", "XXL"],
      headers: [
        { key: "bust", label: "Bust (in)" },
        { key: "waist", label: "Waist (in)" },
        { key: "hip", label: "Hip (in)" },
        { key: "shoulder", label: "Shoulder (in)" },
      ],
      sampleValues: {
        bust: ["32", "34", "36", "38", "40", "42"],
        waist: ["26", "28", "30", "32", "34", "36"],
        hip: ["36", "38", "40", "42", "44", "46"],
        shoulder: ["13.5", "14", "14.5", "15", "15.5", "16"],
      },
    },
    lower: {
      title: "Bottom Body Measurements",
      unit: "in",
      sizes: ["XS", "S", "M", "L", "XL", "XXL"],
      headers: [
        { key: "waist", label: "Waist (in)" },
        { key: "hip", label: "Hip (in)" },
        { key: "thigh", label: "Thigh (in)" },
        { key: "length", label: "Length (in)" },
        { key: "inseam", label: "Inseam (in)" },
      ],
      sampleValues: {
        waist: ["26", "28", "30", "32", "34", "36"],
        hip: ["36", "38", "40", "42", "44", "46"],
        thigh: ["20", "21", "22", "23", "24", "25"],
        length: ["41", "41", "41", "41", "41", "41"],
        inseam: ["29", "28.5", "28", "27.5", "27", "26.5"],
      },
    },
  },
  unisex: {
    upper: {
      title: "Unisex Body Measurements",
      unit: "in",
      sizes: ["XS", "S", "M", "L", "XL", "XXL"],
      headers: [
        { key: "chest", label: "Chest (in)" },
        { key: "waist", label: "Waist (in)" },
        { key: "hip", label: "Hip (in)" },
      ],
    },
    lower: {
      title: "Unisex Body Measurements",
      unit: "in",
      sizes: ["XS", "S", "M", "L", "XL", "XXL"],
      headers: [
        { key: "waist", label: "Waist (in)" },
        { key: "hip", label: "Hip (in)" },
        { key: "inseam", label: "Inseam (in)" },
      ],
    },
  },
  kids: {
    upper: {
      title: "Kids Size Chart",
      unit: "in",
      sizes: ["2Y", "4Y", "6Y", "8Y", "10Y", "12Y"],
      headers: [
        { key: "chest", label: "Chest (in)" },
        { key: "length", label: "Length (in)" },
        { key: "shoulder", label: "Shoulder (in)" },
      ],
    },
    lower: {
      title: "Kids Size Chart",
      unit: "in",
      sizes: ["2Y", "4Y", "6Y", "8Y", "10Y", "12Y"],
      headers: [
        { key: "waist", label: "Waist (in)" },
        { key: "hip", label: "Hip (in)" },
        { key: "outseam", label: "Outseam (in)" },
      ],
    },
  },
};

/** Map catalog SKU gender code / label → preset group (matches designer `gender` keys). */
export function presetGenderKeyFromSkuGender(g) {
  const s = String(g ?? "")
    .trim()
    .toLowerCase();
  if (!s) return "unisex";
  if (s === "m" || s.startsWith("men") || s === "male" || s === "man") return "men";
  if (s === "f" || s.startsWith("women") || s === "woman" || s === "female" || s === "ladies")
    return "women";
  if (s.includes("kid") || s.includes("child") || s.includes("boy") || s.includes("girl"))
    return "kids";
  if (s.includes("uni")) return "unisex";
  return "unisex";
}

export function parseInchesValue(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return NaN;
  const mixed = raw.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const whole = Number(mixed[1]);
    const num = Number(mixed[2]);
    const den = Number(mixed[3]);
    if (Number.isFinite(whole) && Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
      return whole + num / den;
    }
  }
  const asNum = Number(raw);
  return Number.isFinite(asNum) ? asNum : NaN;
}

export function inchesToCmText(value) {
  const inch = parseInchesValue(value);
  if (!Number.isFinite(inch)) return "—";
  const cm = inch * 2.54;
  const rounded = Math.round(cm * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * Merge preset structure into existing `sizeCharts` (preserves measureImages per side).
 */
export function mergeSizeChartsWithPreset(sizeCharts, preset) {
  if (!preset?.headers || !Array.isArray(preset.sizes)) return sizeCharts;
  const rowsIn = preset.sizes.map((size) => {
    const measurements = {};
    preset.headers.forEach((h) => {
      measurements[h.key] = "";
    });
    return { size, measurements };
  });
  const headersCm = preset.headers.map((h) => ({
    key: h.key,
    label: String(h.label || h.key || "")
      .replace(/\s*\(in\/cm\)/gi, " (cm)")
      .replace(/\s*\(in\)/gi, " (cm)"),
  }));
  const rowsCm = preset.sizes.map((size) => {
    const measurements = {};
    preset.headers.forEach((h) => {
      measurements[h.key] = "";
    });
    return { size, measurements };
  });
  const prevIn = sizeCharts?.in || { headers: [], rows: [], measureImages: [] };
  const prevCm = sizeCharts?.cm || { headers: [], rows: [], measureImages: [] };
  return {
    in: {
      ...prevIn,
      headers: preset.headers,
      rows: rowsIn,
    },
    cm: {
      ...prevCm,
      headers: headersCm,
      rows: rowsCm,
    },
  };
}
