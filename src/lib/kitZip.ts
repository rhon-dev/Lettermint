/** Brand-kit ZIP assembly (browser-only; loaded with the export dialog). */
import {
  brandPalette,
  buildLockup,
  ICO_SIZES,
  inkColor,
  KIT_PNGS,
  kitTextFiles,
  OG,
  ogBackground,
  ogSvg,
  onColor,
  opaqueIconSvg,
} from './brandkit';
import type { GlyphFont, LogoGeometry } from './buildLogo';
import { svgToPng } from './exporter';
import { icoFromPngs } from './ico';
import type { Shape } from './shapes';
import { logoSvgString, type Paint } from './svg';
import { zipFiles, type ZipEntry } from './zip';

const bytes = async (b: Blob) => new Uint8Array(await b.arrayBuffer());

/** Rasterise every kit image and pack the whole brand kit into one ZIP. */
export async function brandKitZip(o: {
  paint: Paint & { shape: Shape };
  geo: LogoGeometry;
  font: GlyphFont;
  name: string;
  title: string;
}): Promise<Blob> {
  const { paint, geo, font, name } = o;
  const ink = inkColor(paint);
  const bg = ogBackground(brandPalette(ink), ink);
  const logoSvg = logoSvgString(paint, geo, o.title);
  const layouts = name ? (['horizontal', 'stacked'] as const) : [];
  const lockups = layouts.map((l) => ({ name: `lockup-${l}.svg`, text: buildLockup(paint, geo, font, name, l).svg }));
  const og = ogSvg(buildLockup(paint, geo, font, name, 'horizontal'), bg);
  const icon = opaqueIconSvg(paint, geo, bg);

  const utf8 = new TextEncoder();
  const files: ZipEntry[] = kitTextFiles({ name: name || o.title, ink, on: onColor(ink), logoSvg, lockups }).map((f) => ({
    name: f.name,
    data: utf8.encode(f.text),
  }));
  for (const [file, px, opaque] of KIT_PNGS) {
    files.push({ name: file, data: await bytes(await svgToPng(opaque ? icon : logoSvg, px)) });
  }
  const ico = await Promise.all(ICO_SIZES.map(async (size) => ({ size, data: await bytes(await svgToPng(logoSvg, size)) })));
  files.push({ name: 'favicon.ico', data: icoFromPngs(ico) });
  files.push({ name: 'og-image.png', data: await bytes(await svgToPng(og, OG.width, OG.height)) });
  return new Blob([zipFiles(files)], { type: 'application/zip' });
}
