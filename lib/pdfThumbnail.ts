"use client";

let workerConfigured = false;

async function loadPdfjs() {
  const pdfjsLib = await import("pdfjs-dist");
  if (!workerConfigured) {
    // Served from /public as a plain static file — letting webpack bundle the
    // worker's own .mjs (via `new URL(..., import.meta.url)`) breaks the Next.js
    // production build, because its minifier chokes on the worker's top-level
    // import/export syntax.
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    workerConfigured = true;
  }
  return pdfjsLib;
}

// Renders a PDF's first page (fetched from `url`) to a JPEG data URL, for use as a grid thumbnail.
export async function generatePdfThumbnail(url: string, maxWidth = 400): Promise<string> {
  const pdfjsLib = await loadPdfjs();
  const res = await fetch(url);
  if (!res.ok) throw new Error("PDF fetch failed");
  const bytes = new Uint8Array(await res.arrayBuffer());

  const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
  const page = await doc.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = maxWidth / baseViewport.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  await page.render({ canvasContext: ctx, viewport }).promise;
  doc.destroy();
  return canvas.toDataURL("image/jpeg", 0.8);
}
