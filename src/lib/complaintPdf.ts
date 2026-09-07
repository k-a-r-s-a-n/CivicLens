import type { jsPDF } from "jspdf";
import {
  SLA_DAYS,
  STATUS_COLOR,
  daysOpen,
  daysToResolve,
  isSlaBreached,
  formatDay,
  complaintPermalink,
  type Complaint,
} from "@/data/civic";

type Rgb = [number, number, number];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_H = 18;

const INK: Rgb = [24, 24, 27];
const BODY: Rgb = [63, 63, 70];
const MUTED: Rgb = [113, 113, 122];
const RULE: Rgb = [228, 228, 231];
const SOFT: Rgb = [250, 250, 249];
const PRIMARY: Rgb = [15, 118, 110];
const GREEN: Rgb = [22, 163, 74];
const AMBER: Rgb = [217, 119, 6];
const RED: Rgb = [220, 38, 38];

function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function slug(s: string, max = 40): string {
  return s
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, max)
    .replace(/-$/, "");
}

export function complaintPdfFilename(c: Complaint): string {
  const ward = c.wardId ? `Ward-${c.wardId}` : slug(c.area, 20) || "Chennai";
  const date = new Date().toISOString().slice(0, 10);
  return `CivicLens_${ward}_${slug(c.title) || "complaint"}_${c.id.slice(0, 8)}_${date}.pdf`;
}

type LoadedImage = { dataUrl: string; w: number; h: number };

/** Loads any browser-decodable image and normalises it to JPEG via canvas (needs CORS on the bucket — Supabase public storage sends it). */
function loadImageAsJpeg(url: string): Promise<LoadedImage | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const maxSide = 1200;
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({
          dataUrl: canvas.toDataURL("image/jpeg", 0.85),
          w: canvas.width,
          h: canvas.height,
        });
      } catch {
        resolve(null); // tainted canvas / CORS blocked
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

type Ctx = { doc: jsPDF; y: number; ref: string };

function rule(ctx: Ctx, y: number) {
  ctx.doc.setDrawColor(...RULE);
  ctx.doc.setLineWidth(0.3);
  ctx.doc.line(MARGIN, y, PAGE_W - MARGIN, y);
}

function runningHeader(ctx: Ctx) {
  ctx.doc.setFont("helvetica", "normal");
  ctx.doc.setFontSize(7.5);
  ctx.doc.setTextColor(...MUTED);
  ctx.doc.text(`CivicLens · Complaint record · ref ${ctx.ref} (continued)`, MARGIN, ctx.y + 3);
  rule(ctx, ctx.y + 5.5);
  ctx.y += 11;
}

function ensureSpace(ctx: Ctx, h: number) {
  if (ctx.y + h > PAGE_H - FOOTER_H - 4) {
    ctx.doc.addPage();
    ctx.y = MARGIN;
    runningHeader(ctx);
  }
}

function sectionHeading(ctx: Ctx, label: string) {
  ensureSpace(ctx, 12);
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(8);
  ctx.doc.setTextColor(...PRIMARY);
  ctx.doc.text(label.toUpperCase(), MARGIN, ctx.y + 3);
  rule(ctx, ctx.y + 5);
  ctx.y += 9;
}

type Row = { label: string; value: string; color?: Rgb; bold?: boolean; link?: string };

function drawRows(ctx: Ctx, rows: Row[]) {
  const labelW = 40;
  const gap = 4;
  const valueW = CONTENT_W - labelW - gap;
  const lineH = 4.6;
  const padY = 2.4;

  rows.forEach((r, i) => {
    ctx.doc.setFont("helvetica", r.bold ? "bold" : "normal");
    ctx.doc.setFontSize(9);
    const lines: string[] = ctx.doc.splitTextToSize(r.value, valueW);
    const h = Math.max(lines.length, 1) * lineH + padY * 2;
    ensureSpace(ctx, h);

    if (i % 2 === 0) {
      ctx.doc.setFillColor(...SOFT);
      ctx.doc.rect(MARGIN, ctx.y, CONTENT_W, h, "F");
    }

    ctx.doc.setFont("helvetica", "normal");
    ctx.doc.setFontSize(7.5);
    ctx.doc.setTextColor(...MUTED);
    ctx.doc.text(r.label.toUpperCase(), MARGIN + 2, ctx.y + padY + 3.2);

    ctx.doc.setFont("helvetica", r.bold ? "bold" : "normal");
    ctx.doc.setFontSize(9);
    ctx.doc.setTextColor(...(r.color ?? INK));
    lines.forEach((line, li) => {
      ctx.doc.text(line, MARGIN + labelW + gap, ctx.y + padY + 3.2 + li * lineH);
    });
    if (r.link) {
      ctx.doc.link(MARGIN + labelW + gap, ctx.y, valueW, h, { url: r.link });
    }
    ctx.y += h;
  });
}

type PhotoSlot = {
  label: string;
  caption: string;
  url?: string | undefined;
  img: LoadedImage | null;
};
function drawPhotos(ctx: Ctx, slots: PhotoSlot[]) {
  const cols = slots.length;
  const gutter = 6;
  const boxW = cols === 1 ? 86 : (CONTENT_W - gutter * (cols - 1)) / cols;
  const boxH = 70;
  ensureSpace(ctx, boxH + 16);

  slots.forEach((s, i) => {
    const x = MARGIN + i * (boxW + gutter);
    const top = ctx.y;

    ctx.doc.setFont("helvetica", "bold");
    ctx.doc.setFontSize(7.5);
    ctx.doc.setTextColor(...MUTED);
    ctx.doc.text(s.label.toUpperCase(), x, top + 3);

    const imgTop = top + 6;
    if (s.img) {
      const ratio = s.img.w / s.img.h;
      let drawW = boxW;
      let drawH = boxW / ratio;
      if (drawH > boxH) {
        drawH = boxH;
        drawW = boxH * ratio;
      }
      const dx = x + (boxW - drawW) / 2;
      const dy = imgTop + (boxH - drawH) / 2;
      ctx.doc.addImage(s.img.dataUrl, "JPEG", dx, dy, drawW, drawH);
      ctx.doc.setDrawColor(...RULE);
      ctx.doc.setLineWidth(0.3);
      ctx.doc.rect(dx, dy, drawW, drawH);
      if (s.url) ctx.doc.link(dx, dy, drawW, drawH, { url: s.url });
    } else {
      ctx.doc.setDrawColor(...RULE);
      ctx.doc.setLineWidth(0.4);
      ctx.doc.setLineDashPattern([1.5, 1.5], 0);
      ctx.doc.setFillColor(...SOFT);
      ctx.doc.roundedRect(x, imgTop, boxW, boxH, 2, 2, "FD");
      ctx.doc.setLineDashPattern([], 0);
      ctx.doc.setFont("helvetica", "normal");
      ctx.doc.setFontSize(8.5);
      ctx.doc.setTextColor(...MUTED);
      if (s.url) {
        ctx.doc.text("Photo could not be embedded", x + boxW / 2, imgTop + boxH / 2 - 2, {
          align: "center",
        });
        ctx.doc.setTextColor(...PRIMARY);
        ctx.doc.setFontSize(7.5);
        ctx.doc.text("Open original photo", x + boxW / 2, imgTop + boxH / 2 + 4, {
          align: "center",
        });
        ctx.doc.link(x, imgTop, boxW, boxH, { url: s.url });
      } else {
        ctx.doc.text("No photo on file", x + boxW / 2, imgTop + boxH / 2 + 1, { align: "center" });
      }
    }

    ctx.doc.setFont("helvetica", "normal");
    ctx.doc.setFontSize(7.5);
    ctx.doc.setTextColor(...MUTED);
    ctx.doc.text(s.caption, x, imgTop + boxH + 4.5);
  });

  ctx.y += boxH + 14;
}

function footers(doc: jsPDF, generatedLabel: string) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    const y = PAGE_H - FOOTER_H + 2;
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(
      "CivicLens is a community transparency mirror. This is not an official Greater Chennai Corporation document.",
      MARGIN,
      y + 4.5,
    );
    doc.text(
      `Status, dates and counts reflect the CivicLens database at ${generatedLabel}.`,
      MARGIN,
      y + 8.5,
    );
    doc.text(`Page ${i} of ${n}`, PAGE_W - MARGIN, y + 4.5, { align: "right" });
  }
}

/** Builds and downloads the PDF. Resolves with the filename used. */
export async function downloadComplaintPdf(c: Complaint): Promise<string> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const ctx: Ctx = { doc, y: MARGIN, ref: c.id.slice(0, 8) };

  const generated = new Date();
  const generatedLabel = generated.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const permalink = complaintPermalink(c.id);
  const osmUrl = `https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lng}#map=17/${c.lat}/${c.lng}`;
  const resolved = c.status === "Resolved";
  const open = daysOpen(c, generated);
  const fixedIn = daysToResolve(c);
  const breached = isSlaBreached(c, generated);
  const statusRgb = hexToRgb(STATUS_COLOR[c.status]);

  doc.setProperties({
    title: `CivicLens complaint record - ${c.title}`,
    subject: `${c.category} - ${c.area}`,
    author: "CivicLens",
    keywords: `civiclens, chennai, ${c.category}, ${c.status}, ${c.area}`,
  });

  // Photos first (network) so layout is synchronous afterwards
  const [before, after] = await Promise.all([
    c.imageUrl ? loadImageAsJpeg(c.imageUrl) : Promise.resolve(null),
    c.fixImageUrl ? loadImageAsJpeg(c.fixImageUrl) : Promise.resolve(null),
  ]);

  // ── Header ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PRIMARY);
  doc.text("CIVICLENS", MARGIN, ctx.y + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("Public complaint record · Chennai", MARGIN, ctx.y + 9);
  doc.text(`Generated ${generatedLabel}`, PAGE_W - MARGIN, ctx.y + 4, { align: "right" });
  doc.text(`Ref ${c.id}`, PAGE_W - MARGIN, ctx.y + 9, { align: "right" });
  ctx.y += 13;
  rule(ctx, ctx.y);
  ctx.y += 8;

  // ── Category / title / status ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`${c.category.toUpperCase()}${c.subType ? `  ·  ${c.subType}` : ""}`, MARGIN, ctx.y);
  ctx.y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const pillText = c.status.toUpperCase();
  const pillW = doc.getTextWidth(pillText) + 8;
  const pillH = 7;

  doc.setFontSize(18);
  doc.setTextColor(...INK);
  const titleLines: string[] = doc.splitTextToSize(c.title, CONTENT_W - pillW - 6);
  titleLines.forEach((line, i) => doc.text(line, MARGIN, ctx.y + 5 + i * 7.5));

  doc.setFillColor(...statusRgb);
  doc.roundedRect(PAGE_W - MARGIN - pillW, ctx.y, pillW, pillH, 3.5, 3.5, "F");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(pillText, PAGE_W - MARGIN - pillW / 2, ctx.y + 4.9, { align: "center" });
  ctx.y += titleLines.length * 7.5 + 4;

  if (c.description) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...BODY);
    const descLines: string[] = doc.splitTextToSize(c.description, CONTENT_W);
    ensureSpace(ctx, descLines.length * 5.2);
    descLines.forEach((line, i) => doc.text(line, MARGIN, ctx.y + 4 + i * 5.2));
    ctx.y += descLines.length * 5.2 + 6;
  }

  // ── Record details ──
  sectionHeading(ctx, "Record details");

  let slaText: string;
  let slaColor: Rgb;
  if (resolved) {
    if (fixedIn === null) {
      slaText = "Resolved (resolution date not recorded)";
      slaColor = MUTED;
    } else if (fixedIn <= SLA_DAYS) {
      slaText = `Met - resolved in ${fixedIn} day${fixedIn === 1 ? "" : "s"} (window ${SLA_DAYS} days)`;
      slaColor = GREEN;
    } else {
      slaText = `Missed - took ${fixedIn} days (window ${SLA_DAYS} days)`;
      slaColor = RED;
    }
  } else if (breached) {
    slaText = `Breached - open for ${open} days, window is ${SLA_DAYS} days`;
    slaColor = RED;
  } else {
    slaText = `Within window - ${SLA_DAYS - open} day${SLA_DAYS - open === 1 ? "" : "s"} remaining`;
    slaColor = AMBER;
  }

  const rows: Row[] = [
    { label: "Status", value: c.status, color: statusRgb, bold: true },
    { label: "Ward / area", value: c.wardId ? `Ward ${c.wardId}` : c.area },
    { label: "Landmark", value: c.landmark || "-" },
    {
      label: "Coordinates",
      value: `${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}  (open in OpenStreetMap)`,
      link: osmUrl,
      color: PRIMARY,
    },
    { label: "Raised on", value: formatDay(c.date) },
    resolved
      ? {
          label: "Resolved on",
          value: c.resolvedAt ? formatDay(c.resolvedAt) : "Resolved (date not recorded)",
        }
      : {
          label: "Time open",
          value: `${open} day${open === 1 ? "" : "s"} as of ${formatDay(generated.toISOString())}`,
        },
    ...(resolved
      ? [
          {
            label: "Time to resolve",
            value: fixedIn !== null ? `${fixedIn} day${fixedIn === 1 ? "" : "s"}` : "-",
          },
        ]
      : []),
    { label: `SLA (${SLA_DAYS} days)`, value: slaText, color: slaColor, bold: true },
    {
      label: "Community",
      value: `${c.upvotes} ${c.upvotes === 1 ? "person" : "people"} flagged this issue`,
    },
    {
      label: "Reported by",
      value: "Citizen report (anonymous - CivicLens stores no phone numbers or names)",
    },
    { label: "Permalink", value: permalink, link: permalink, color: PRIMARY },
  ];
  drawRows(ctx, rows);
  ctx.y += 8;

  // ── Photo evidence ──
  sectionHeading(ctx, "Photo evidence");
  const slots: PhotoSlot[] = resolved
    ? [
        {
          label: "Before",
          caption: "Photo submitted when the complaint was filed.",
          url: c.imageUrl,
          img: before,
        },
        {
          label: "After",
          caption: "Fix proof uploaded when the complaint was marked resolved.",
          url: c.fixImageUrl,
          img: after,
        },
      ]
    : [
        {
          label: "Photo",
          caption:
            "Photo submitted when the complaint was filed. An 'after' photo is added on resolution.",
          url: c.imageUrl,
          img: before,
        },
      ];
  drawPhotos(ctx, slots);

  footers(doc, generatedLabel);

  const filename = complaintPdfFilename(c);
  doc.save(filename);
  return filename;
}
