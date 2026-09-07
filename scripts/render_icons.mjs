/**
 * 탭용 SVG보다 글자를 크게 뽑아 홈 화면 칸을 채운다.
 * iOS는 시스템이 모서리를 깎으므로 사각형으로 뽑는다.
 * Android 마스크는 가장자리가 잘릴 수 있어, 글자는 가운데 80% 안에 둔다.
 */
import { writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const FONT = "/System/Library/Fonts/AppleSDGothicNeo.ttc";

function mark(size, { fontRatio = 0.44, y1 = 0.48, y2 = 0.88 } = {}) {
  const fs = Math.round(size * fontRatio);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#101010"/>
  <text x="${size / 2}" y="${Math.round(size * y1)}" text-anchor="middle" font-family="Apple SD Gothic Neo" font-size="${fs}" font-weight="700" fill="#00d992">금맹</text>
  <text x="${size / 2}" y="${Math.round(size * y2)}" text-anchor="middle" font-family="Apple SD Gothic Neo" font-size="${fs}" font-weight="700" fill="#00d992">탈출</text>
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
const filled = mark(512);
writeFileSync(`${out}/apple-touch-icon.png`, png(mark(180), 180));
writeFileSync(`${out}/icon-192.png`, png(mark(192), 192));
writeFileSync(`${out}/icon-512.png`, png(filled, 512));
writeFileSync(`${out}/icon-maskable-512.png`, png(filled, 512));
console.log("wrote apple-touch-icon.png, icon-192.png, icon-512.png, icon-maskable-512.png");
