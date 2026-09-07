/**
 * 카카오·메신저 링크 미리보기용 이미지.
 * 크롤러는 JS를 실행하지 않으므로 index.html의 og:image가 이 파일을 가리킨다.
 */
import { writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const FONT = "/System/Library/Fonts/AppleSDGothicNeo.ttc";

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#101010"/>
  <text x="600" y="250" text-anchor="middle" font-family="Apple SD Gothic Neo" font-size="128" font-weight="700" fill="#00d992">금맹</text>
  <text x="600" y="400" text-anchor="middle" font-family="Apple SD Gothic Neo" font-size="128" font-weight="700" fill="#00d992">탈출</text>
  <text x="600" y="520" text-anchor="middle" font-family="Apple SD Gothic Neo" font-size="32" font-weight="500" fill="#bdbdbd">들어본 말은 많은데, 막상 설명하려면 헷갈린다면</text>
</svg>`;

const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
  font: {
    fontFiles: [FONT],
    loadSystemFonts: true,
    defaultFontFamily: "Apple SD Gothic Neo",
  },
});
writeFileSync("public/og.png", resvg.render().asPng());
console.log("wrote public/og.png");
