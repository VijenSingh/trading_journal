import { isAllowedUploadType, parseDataUrl } from "@/lib/dataUrl";
import { MAX_SETUP_IMAGES } from "@/lib/playbook";

// Validates name/description/checklist/images from a request body (POST: all, PATCH: given ones).
export function cleanSetup(b: any, partial: boolean): { ok: true; set: Record<string, unknown> } | { ok: false; error: string } {
  const set: Record<string, unknown> = {};
  if (!partial || b.name !== undefined) {
    const name = String(b?.name || "").trim();
    if (!name || name.length > 60) return { ok: false, error: "Setup ka naam daalo (max 60 letters)" };
    set.name = name;
  }
  if (b.description !== undefined) set.description = String(b.description).slice(0, 2000);
  if (b.checklist !== undefined) {
    if (!Array.isArray(b.checklist)) return { ok: false, error: "Checklist galat hai" };
    set.checklist = b.checklist.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 30);
  }
  if (b.images !== undefined) {
    if (!Array.isArray(b.images) || b.images.length > MAX_SETUP_IMAGES) return { ok: false, error: `Max ${MAX_SETUP_IMAGES} images` };
    for (const d of b.images) {
      const p = typeof d === "string" ? parseDataUrl(d) : null;
      if (!p || !isAllowedUploadType(p.mime) || p.mime === "application/pdf") return { ok: false, error: "Sirf image upload ho sakti hai" };
    }
    set.images = b.images.map((data: string) => ({ data }));
  }
  return { ok: true, set };
}
