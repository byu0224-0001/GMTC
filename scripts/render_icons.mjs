/**
 * 탭에 쓰는 금맹탈출 마크를 iOS/Android 홈 화면용 PNG로 만든다.
 * iOS는 시스템이 모서리를 깎으므로 사각형으로 뽑는다.
 */
import { writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const FONT = "/System/Library/Fonts/AppleSDGothicNeo.ttc";

function mark(size, { round = false } = {}) {
  const rx = round ? Math.round(size * 0.1875) : 0;
  const fs = Math.round(size * (92 / 512));
  const y1 = Math.round(size * (228 / 512));
  const y2 = Math.round(size * (338 / 512));
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${rx}" fill="#101010"/>
  <text x="${size / 2}" y="${y1}" text-anchor="middle" font-family="Apple SD Gothic Neo" font-size="${fs}" font-weight="700" fill="#00d992">금맹</text>
  <text x="${size / 2}" y="${y2}" text-anchor="middle" font-family="Apple SD Gothic Neo" font-size="${fs}" font-weight="700" fill="#00d992">탈출</text>
</svg>`;
}

function png(svg, size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    font: {
      fontFiles: [FONT],
      loadSystemFonts: true,
      defaultFontFamily: "Apple SD Gothic Neo",
    },
  });
  return resvg.render().asPng();
}

const out = "public";
writeFileSync(`${out}/apple-touch-icon.png`, png(mark(180), 180));
writeFileSync(`${out}/icon-192.png`, png(mark(192), 192));
writeFileSync(`${out}/icon-512.png`, png(mark(512), 512));
console.log("wrote apple-touch-icon.png, icon-192.png, icon-512.png");
