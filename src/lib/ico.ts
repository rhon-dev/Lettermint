/** Build a .ico that embeds PNG images (supported by every current browser and Windows Vista+). */
export function icoFromPngs(images: readonly { size: number; data: Uint8Array }[]): Uint8Array<ArrayBuffer> {
  const header = 6 + images.length * 16;
  const out = new Uint8Array(header + images.reduce((n, i) => n + i.data.length, 0));
  const v = new DataView(out.buffer);
  v.setUint16(2, 1, true); // type: icon
  v.setUint16(4, images.length, true);
  let offset = header;
  images.forEach((img, i) => {
    const e = 6 + i * 16;
    out[e] = img.size >= 256 ? 0 : img.size; // 0 means 256
    out[e + 1] = img.size >= 256 ? 0 : img.size;
    v.setUint16(e + 4, 1, true); // colour planes
    v.setUint16(e + 6, 32, true); // bits per pixel
    v.setUint32(e + 8, img.data.length, true);
    v.setUint32(e + 12, offset, true);
    out.set(img.data, offset);
    offset += img.data.length;
  });
  return out;
}
