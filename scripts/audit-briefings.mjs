/**
 * 기사형 16편 QA. 습니다체 여부를 기사 완료로 세지 않는다.
 * 판정: 첫 두 문단에서 개념 정의를 빼도 사건·상황이 읽히는가.
 */
import { readFileSync } from "node:fs";

const src = readFileSync("src/content/briefings.ts", "utf8");
const figs = readFileSync("src/content/briefingFigures.ts", "utf8");
const chunks = src.split(/\n  \{\n    id: "/).slice(1);

const DEF = /라고 부릅니다|무엇이라고|을 나타내는 지표|나눈 배수입니다|로 봅니다\.|의 비율입니다|감안하기 전의/;
const EVENT = /발표|올랐|내렸|하락|늘었|줄었|나왔|해석|시장은|직후|당일|움직였/;
const CAVEAT = /다만|한 줄만으로|단정/;
const INTERP = /해석|시장은|읽었|점치/;

const rows = [];
for (const chunk of chunks) {
  const id = chunk.split('"', 1)[0];
  if (!id.startsWith("bf-")) continue;
  const headline = (chunk.match(/headline: "((?:[^"\\]|\\.)*)"/) || [])[1] ?? "";
  const deck = (chunk.match(/subtitle: "((?:[^"\\]|\\.)*)"/) || [])[1] ?? "";
  const paras = [...chunk.matchAll(/type: "p",\s*\n\s*text: "((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
  const lead = paras[0] ?? "";
  const second = paras[1] ?? "";
  const firstTwo = `${lead} ${second}`;
  const defHeavy = DEF.test(firstTwo);
  const eventOk = EVENT.test(firstTwo) && !defHeavy;
  const depths = [...chunk.matchAll(/depth: "(term|number|cause|next)"/g)].map((m) => m[1]);
  const cloze = /type: "cloze"/.test(chunk);
  const terms = depths.filter((d) => d === "term").length;
  const context = depths.filter((d) => d !== "term").length + (cloze ? 1 : 0);
  const hasFig = figs.includes(`"${id}"`);
  const reveal = new RegExp(`${id}[\\s\\S]*?revealAfterAnswer: true`).test(figs);
  const firstAsk = cloze
    ? "cloze"
    : (chunk.match(/type: "choice"[\s\S]*?depth: "(term|number|cause|next)"/) || [])[1] ?? "";
  rows.push({
    id,
    headline: headline ? "Y" : "",
    deck: deck ? "Y" : "",
    lead: lead ? "Y" : "",
    evidence: /[0-9]/.test(firstTwo) || hasFig ? "Y" : "",
    interpretation: INTERP.test(firstTwo) ? "Y" : "",
    caveat: CAVEAT.test(chunk) ? "Y" : "",
    next: depths.includes("next") || cloze ? "Y" : "",
    slots: [headline, deck, lead, firstTwo.match(/[0-9]/) || hasFig, INTERP.test(firstTwo), CAVEAT.test(chunk), depths.includes("next") || cloze].filter(Boolean).length,
    사건성립: eventOk ? "YES" : defHeavy ? "NO·정의문" : "WEAK",
    정의문항: terms,
    맥락문항: context,
    첫질문: firstAsk === "term" ? "TERM" : firstAsk || "?",
    정답후그림: reveal ? "Y" : hasFig ? "사실만" : "—",
  });
}

console.log("기사형 전수 감사. 판정 = 첫 두 문단에서 개념 정의를 빼도 사건이 성립하는가.\n");
console.table(rows);
const failEvent = rows.filter((r) => r.사건성립 !== "YES");
const failTerm = rows.filter((r) => r.정의문항 > 1 || r.맥락문항 < 1 || r.첫질문 === "TERM");
const thin = rows.filter((r) => r.slots < 4);
if (failEvent.length) {
  console.log("사건성립 미달:", failEvent.map((r) => `${r.id}(${r.사건성립})`).join(", "));
}
if (failTerm.length) {
  console.log("문항 규칙 미달:", failTerm.map((r) => `${r.id} 정의${r.정의문항} 맥락${r.맥락문항} 첫=${r.첫질문}`).join(" | "));
}
if (thin.length) {
  console.log("골격 4칸 미만:", thin.map((r) => `${r.id}:${r.slots}`).join(", "));
}
if (failEvent.length || failTerm.length || thin.length) process.exit(1);
console.log(`\n${rows.length}편 통과. 편당 골격 ${rows.map((r) => r.slots).join("/")}칸.`);
