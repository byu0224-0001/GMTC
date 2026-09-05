/**
 * 학습 후보 산출.
 *
 * terms.json의 787개는 사전 항목이라 그대로 문항이 되지 않는다. 첫 문장이 배경 설명인
 * 경우가 많고, 표제어가 설명 안에 그대로 들어 있어 정답이 노출된다. 그래서 두 가지를
 * 계산한다.
 *
 *  1. topic  — 분야 라벨. terms.json의 category는 국내총생산을 지급결제로 넣는 등
 *              신뢰할 수 없어, 검수된 CORE100을 씨앗으로 relatedIds 그래프에 전파한다.
 *  2. prompt — 한국은행 원문에서 '정의문'만 골라 표제어를 가린 문장. 못 만들면 후보 제외.
 *
 * 새 원고를 쓰지 않고 원문만 쓰되, 문항으로 성립하는 것만 통과시킨다.
 */
import { CORE100, TAXONOMY_ORDER, type Taxonomy } from "../content/literacy";
import type { Term } from "../types";

/** 씨앗에서 몇 다리까지 학습 후보로 볼지. 넘어가면 사전에만 남는다. */
export const MAX_HOP = 3;

export const MASK = "○○○";

/** 정의문에 붙는 서술어. '가진다'처럼 배경 설명에도 쓰이는 것은 넣지 않는다. */
const DEFINITION_TAIL =
  /(말한다|말하며|의미한다|뜻한다|가리킨다|일컫는다|지칭한다|칭한다|부른다|의미이다|개념이다|지표이다|비율이다|제도이다|이라고 한다|라고 한다)\.?$/;

/** 앞 문장을 받아 이어지는 문장은 단독으로 읽히지 않는다. */
const CONTINUATION = /^(따라서|그러나|그런데|이러한|이와|이런|여기서|즉|예를|한편|또한|이에|반면|특히|다만|이때|그리고|아울러|이는|이를|이 때|동 |위와|앞서|보통 이를|반대로|물론)/;

/** 추출 과정에서 다른 표제어 묶음이 문장에 섞여 들어간 흔적. */
const SPLICED = /[가-힣]{3,}\/[가-힣]{3,}\//;

/** 그래프 전파가 엉뚱한 분야로 흐르는 것을 막는 최소 보정. */
const TOPIC_HINTS: [RegExp, Taxonomy][] = [
  [/인플레이션|물가|디플레|물가지수|구매력/, "물가"],
  [/환율|외환|통화바스켓|페그|원화|달러화/, "외환"],
  [/채권|금리|스프레드|수익률|본드|듀레이션/, "금리·채권"],
  [/주식|주가|증권시장|배당|자사주|상장/, "주식"],
  [/은행|여신|대출|충당금|자기자본비율|신용등급/, "은행·신용"],
  [/옵션|선물|스왑|파생/, "파생"],
  [/블록체인|가상자산|토큰|핀테크|디지털화폐|테크/, "디지털금융"],
  [/주택|부동산|모기지|전세/, "부동산"],
  [/고용|실업|취업|성장률|경기|생산지수/, "경기·성장"],
  [/중앙은행|통화정책|기준금리|지급준비|공개시장/, "통화정책"],
];

export interface PoolEntry {
  termId: string;
  /** CORE100에서 relatedIds로 몇 다리 떨어져 있는지. 0이면 CORE100. */
  hop: number;
  topic: Taxonomy;
  /** 한국은행 원문 정의문에서 표제어를 가린 문장. CORE100은 자체 원고를 쓰므로 없을 수 있다. */
  officialPrompt: string | null;
}

export interface Pool {
  entries: PoolEntry[];
  byId: Map<string, PoolEntry>;
  /** 학습 세션과 SRS에 들어갈 수 있는 용어. */
  ids: string[];
}

function splitSentences(text: string): string[] {
  return text.match(/[^.]{15,200}?다\./g)?.map((s) => s.trim()) ?? [];
}

function maskKeys(term: Term): string[] {
  const raw = [term.headword, term.abbr ?? "", term.enName ?? ""].filter((k) => k.length >= 2);
  return [...new Set(raw)].sort((a, b) => b.length - a.length);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 가림표 바로 뒤에 올 수 있는 조사·어미의 첫 음절.
 * 이 목록에 없는 한글이 붙어 있으면 표제어가 더 긴 합성어의 일부를 가린 것이다.
 * (예: 자산유동화 → "○○○증권", 외채 → "대○○○권") 그런 문장은 뜻이 달라져 버린다.
 */
const PARTICLE_HEAD = /^[는은이가을를의에와과도만로라란나서야며인일임]/;

/** 표제어를 가린다. 합성어 안에 가림표가 박히면 문장이 뒤틀리므로 그건 버린다. */
function maskHeadword(term: Term, sentence: string): { text: string; count: number } | null {
  let text = sentence;
  let count = 0;
  for (const key of maskKeys(term)) {
    const direct = new RegExp(escapeRe(key), "g");
    text = text.replace(direct, () => {
      count += 1;
      return MASK;
    });
    if (key.length >= 3) {
      const spaced = new RegExp([...key].map(escapeRe).join("\\s*"), "g");
      text = text.replace(spaced, () => {
        count += 1;
        return MASK;
      });
    }
  }
  if (count < 1 || count > 2) return null;
  if (new RegExp(`[가-힣]${MASK}|${MASK}\\s*${MASK}`).test(text)) return null;
  for (const m of text.matchAll(new RegExp(`${MASK}(.?)`, "g"))) {
    const next = m[1];
    if (next && /[가-힣]/.test(next) && !PARTICLE_HEAD.test(next)) return null;
  }
  return { text, count };
}

/** 표제어가 있으면 가리고, 없으면 문장을 그대로 돌려준다. 자체 원고에 쓴다. */
export function maskLenient(term: Term, sentence: string): string {
  let text = sentence;
  for (const key of maskKeys(term)) {
    text = text.replace(new RegExp(escapeRe(key), "g"), MASK);
  }
  return text;
}

/** 원문에서 문항으로 쓸 수 있는 정의문 하나를 고른다. 없으면 null. */
export function officialPromptFor(term: Term): string | null {
  if (term.headword.length < 2) return null;
  for (const sentence of splitSentences(term.definition)) {
    if (!DEFINITION_TAIL.test(sentence)) continue;
    if (CONTINUATION.test(sentence)) continue;
    if (SPLICED.test(sentence)) continue;
    const masked = maskHeadword(term, sentence);
    if (!masked) continue;
    if (masked.text.length < 28 || masked.text.length > 140) continue;
    if (masked.text.split(MASK).join("").length < 24) continue;
    return masked.text;
  }
  return null;
}

function buildHopAndTopic(terms: Term[]) {
  const byId = new Map(terms.map((t) => [t.id, t]));
  const neighbors = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!neighbors.has(a)) neighbors.set(a, new Set());
    neighbors.get(a)!.add(b);
  };
  for (const t of terms) {
    for (const r of t.relatedIds) {
      if (!byId.has(r)) continue;
      link(t.id, r);
      link(r, t.id);
    }
  }

  const hop = new Map<string, number>();
  const topic = new Map<string, Taxonomy>();
  const queue: string[] = [];
  for (const c of CORE100) {
    if (!byId.has(c.id)) continue;
    hop.set(c.id, 0);
    topic.set(c.id, c.taxonomy);
    queue.push(c.id);
  }
  for (let head = 0; head < queue.length; head += 1) {
    const u = queue[head];
    for (const v of [...(neighbors.get(u) ?? [])].sort()) {
      if (hop.has(v)) continue;
      hop.set(v, hop.get(u)! + 1);
      topic.set(v, topic.get(u)!);
      queue.push(v);
    }
  }

  // CORE100은 사람이 확인한 라벨이므로 덮지 않는다.
  for (const t of terms) {
    if (hop.get(t.id) === 0) continue;
    const hint = TOPIC_HINTS.find(([re]) => re.test(t.headword));
    if (hint) topic.set(t.id, hint[1]);
  }

  return { hop, topic };
}

let cache: { key: Term[]; pool: Pool } | null = null;

export function learningPool(terms: Term[]): Pool {
  if (cache && cache.key === terms) return cache.pool;
  const { hop, topic } = buildHopAndTopic(terms);
  const entries: PoolEntry[] = [];
  for (const term of terms) {
    const h = hop.get(term.id);
    if (h === undefined || h > MAX_HOP) continue;
    const officialPrompt = officialPromptFor(term);
    // CORE100은 자체 원고가 있어 원문 정의문이 없어도 학습할 수 있다.
    if (h > 0 && !officialPrompt) continue;
    entries.push({
      termId: term.id,
      hop: h,
      topic: topic.get(term.id) ?? "경제기초",
      officialPrompt,
    });
  }
  const pool: Pool = {
    entries,
    byId: new Map(entries.map((e) => [e.termId, e])),
    ids: entries.map((e) => e.termId),
  };
  cache = { key: terms, pool };
  return pool;
}

export function topicOf(terms: Term[], termId: string): Taxonomy | undefined {
  return learningPool(terms).byId.get(termId)?.topic;
}

/** 분야를 돌아가며 뽑을 때 쓰는 순서. */
export function topicOrder(): Taxonomy[] {
  return TAXONOMY_ORDER;
}
