/** Browser-only export helpers (download, PNG rasterisation, clipboard). */

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function svgBlob(svg: string): Blob {
  return new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
}

/** Rasterise an SVG string to a square PNG of `px` pixels. */
export async function svgToPng(svg: string, px: number): Promise<Blob> {
  const url = URL.createObjectURL(svgBlob(svg));
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is unavailable');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, px, px);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png'),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

/** Safe, readable file stem, e.g. "lettermint-lm-circle". */
export function fileStem(text: string, shape: string): string {
  const t = text.toLowerCase().replace(/[^a-z0-9]/g, '') || 'logo';
  return `lettermint-${t}-${shape}`;
}
