/**
 * 학습 기록 지표. 홈과 상세가 이 함수만 쓴다.
 *
 * 모두 **고유 용어 수**다. 같은 말을 여러 번 봐도 1이다.
 *
 * | 지표 | 계산 | 기존 기록 |
 * | 새로 만난 말 | 이번 주가 `successDates[0]`인 카드 | 복원 가능 |
 * | 다시 본 말 | 이전에 배운 뒤 이번 주 다시 맞힌 카드 | 복원 가능 |
 * | 익숙해진 말(이번 주) | `isFamiliar`이고 `familiarAtRecorded`이며 그 날이 이번 주 | 이번 배포 이후만 정확 |
 * | 지금 익숙한 말 | `isFamiliar()` | 복원 가능. 언제인지는 모름 |
 * | 읽기 | 완료한 글 id 수 | 복원 가능 |
 * | 읽기에서 다시 만난 말 | 완료한 글에 나온 말 중, 그 전에 이미 배운 고유 용어 | 완료 시각과 first seen이 있을 때만 |
 * | 헷갈리는 개념 | 최근 혼동이 반복된 말. `lapses >= 2`이거나 contrast를 틀린 상태 | 반복만. 한 번 틀린 것은 넣지 않음 |
 */
import { briefingById } from "../content/briefings";
import { CONTEXT_CASES } from "../content/literacy";
import type { ProgressState, SrsCard, Term } from "../types";
import { displayTitle } from "./hangul";
import { isFamiliar, kstDateKey } from "./srs";
import { studyCandidates } from "./today";
import { studyDateSet, weekDateKeys } from "./weekly";

const WEEKDAY = ["월", "화", "수", "목", "금", "토", "일"] as const;

export interface EvidenceTerm {
  id: string;
  label: string;
}

export interface ConfusedItem {
  id: string;
  label: string;
  vsId?: string;
  vsLabel?: string;
}

export interface EncounterItem {
  id: string;
  label: string;
  count: number;
}

export interface DayRecord {
  date: string;
  newTerms: EvidenceTerm[];
  reviewTerms: EvidenceTerm[];
  readings: { id: string; title: string; kind: "long" | "short" }[];
}

export interface MonthCell {
  date: string;
  done: boolean;
}

export interface ProgressEvidence {
  studyDays: number;
  newThisWeek: number;
  reviewThisWeek: number;
  familiarThisWeek: number;
  familiarTotal: number;
  familiarTotalKnownWeek: boolean;
  learningTotal: number;
  readingsThisWeek: number;
  recentFamiliar: EvidenceTerm[];
  confused: ConfusedItem[];
  encounters: EncounterItem[];
  weekDays: { date: string; label: string; done: boolean }[];
  monthLabel: string;
  monthCells: (MonthCell | null)[];
  heroTitle: string;
  heroSub: string;
  viewportLine: string;
  emptyFamiliar: boolean;
  dayRecord: (date: string) => DayRecord;
}

export function formatDayHeading(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${m}월 ${d}일`;
}

function inWeek(day: string, week: string[]): boolean {
  return week.includes(day);
}

function labelOf(id: string, terms: Term[]): string {
  const hit = terms.find((t) => t.id === id);
  return hit ? displayTitle(hit) : id;
}

/** 이번 주가 이 카드를 처음 학습에 넣은 날인가. */
export function isNewThisPeriod(card: SrsCard, period: string[]): boolean {
  const first = card.successDates[0];
  return Boolean(first && period.includes(first));
}

/** 이전에 배운 말을 이 기간에 다시 맞혔는가. */
export function isReviewThisPeriod(card: SrsCard, period: string[]): boolean {
  const first = card.successDates[0];
  if (!first || period.includes(first)) return false;
  return card.successDates.some((d) => period.includes(d));
}

/** 학습 순간에 찍힌 익숙해진 날만 기간에 넣는다. 소급하지 않는다. */
export function recordedFamiliarDate(card: SrsCard): string | null {
  if (!card.familiarAtRecorded || !card.familiarAt) return null;
  return card.familiarAt;
}

export function isRepeatedConfusion(card: SrsCard): boolean {
  if (card.lapses >= 2) return true;
  return card.lastQuality === 1 && card.successForms.includes("contrast");
}

function completedReadings(state: ProgressState): { id: string; at: string; kind: "long" | "short" }[] {
  const out: { id: string; at: string; kind: "long" | "short" }[] = [];
  for (const attempt of state.briefingAttempts ?? []) {
    if (!attempt.completedAt) continue;
    out.push({
      id: attempt.briefingId,
      at: kstDateKey(new Date(attempt.completedAt)),
      kind: "long",
    });
  }
  for (const [id, stat] of Object.entries(state.contextStats)) {
    if (id.startsWith("bf-") || !stat.lastAt) continue;
    if ((stat.seen ?? 0) < 1) continue;
    out.push({ id, at: kstDateKey(new Date(stat.lastAt)), kind: "short" });
  }
  return out;
}

function readingTitle(id: string, kind: "long" | "short"): string {
  if (kind === "long") return briefingById(id)?.headline ?? id;
  return CONTEXT_CASES.find((c) => c.id === id)?.title ?? id;
}

function readingTermIds(id: string, kind: "long" | "short"): string[] {
  if (kind === "long") {
    const b = briefingById(id);
    if (!b) return [];
    return [...b.primaryTermIds, ...(b.supportTermIds ?? [])];
  }
  const cse = CONTEXT_CASES.find((c) => c.id === id);
  if (!cse) return [];
  return [...new Set([cse.answerTermId, ...(cse.termIds ?? [])])];
}

/** 읽기 완료일 이전에 이미 학습에 들어온 말. */
export function alreadyLearnedBefore(card: SrsCard | undefined, onDate: string): boolean {
  const first = card?.successDates[0];
  return Boolean(first && first < onDate);
}

export function progressEvidence(
  state: ProgressState,
  terms: Term[],
  now = new Date(),
): ProgressEvidence {
  const week = weekDateKeys(now);
  const studied = studyDateSet(state, now);
  const pool = studyCandidates(terms);
  const weekDays = week.map((date, i) => ({
    date,
    label: WEEKDAY[i],
    done: studied.has(date),
  }));
  const studyDays = weekDays.filter((d) => d.done).length;

  const newIds = new Set<string>();
  const reviewIds = new Set<string>();
  const familiarWeekIds = new Set<string>();
  const recentFamiliar: { id: string; label: string; at: string }[] = [];
  const confused: ConfusedItem[] = [];
  let familiarTotal = 0;
  let learningTotal = 0;

  for (const term of pool) {
    const card = state.cards[term.id];
    if (!card) continue;
    learningTotal += 1;
    if (isNewThisPeriod(card, week)) newIds.add(term.id);
    else if (isReviewThisPeriod(card, week)) reviewIds.add(term.id);
    if (isRepeatedConfusion(card) && !isFamiliar(card)) {
      const vsId = term.relatedIds.find((id) => id !== term.id);
      confused.push({
        id: term.id,
        label: displayTitle(term),
        vsId,
        vsLabel: vsId ? labelOf(vsId, terms) : undefined,
      });
    }
    if (!isFamiliar(card)) continue;
    familiarTotal += 1;
    const recorded = recordedFamiliarDate(card);
    if (recorded && inWeek(recorded, week)) familiarWeekIds.add(term.id);
    if (recorded) recentFamiliar.push({ id: term.id, label: displayTitle(term), at: recorded });
  }
  recentFamiliar.sort((a, b) => (a.at < b.at ? 1 : -1));
  learningTotal = Math.max(0, learningTotal - familiarTotal);

  const reads = completedReadings(state);
  const readingsThisWeek = new Set(reads.filter((r) => inWeek(r.at, week)).map((r) => r.id)).size;
  const encounterCount = new Map<string, number>();
  for (const r of reads) {
    for (const id of readingTermIds(r.id, r.kind)) {
      if (!alreadyLearnedBefore(state.cards[id], r.at)) continue;
      encounterCount.set(id, (encounterCount.get(id) ?? 0) + 1);
    }
  }
  const encounters: EncounterItem[] = [...encounterCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, count]) => ({ id, label: labelOf(id, terms), count }));

  const today = kstDateKey(now);
  const [y, m] = today.split("-").map(Number);
  const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const pad = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const monthCells: (MonthCell | null)[] = [];
  for (let i = 0; i < pad; i++) monthCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    monthCells.push({ date, done: studied.has(date) });
  }

  const newThisWeek = newIds.size;
  const reviewThisWeek = reviewIds.size;
  const familiarThisWeek = familiarWeekIds.size;
  const emptyFamiliar = familiarTotal === 0;
  const heroTitle = studyDays
    ? `이번 주 ${studyDays}일 공부했어요`
    : "아직 이번 주 기록이 없어요";
  const heroSub = familiarThisWeek
    ? `이번 주 금융 용어 ${familiarThisWeek}개가 더 익숙해졌어요.`
    : emptyFamiliar
      ? "아직 익히는 중이에요. 며칠 뒤 다시 만나면서 익숙한 말이 생겨요."
      : `지금 익숙한 말 ${familiarTotal}개 · 언제 익숙해졌는지는 이번 기록부터 남아요.`;
  const viewportParts = [`새로 만난 말 ${newThisWeek}`];
  if (familiarThisWeek) viewportParts.push(`새로 익숙해진 말 ${familiarThisWeek}`);
  viewportParts.push(`읽기 ${readingsThisWeek}편`);
  const viewportLine =
    studyDays || newThisWeek || familiarThisWeek || readingsThisWeek
      ? viewportParts.join(" · ")
      : "오늘 한 번 만나면 여기에 쌓여요.";

  function dayRecord(date: string): DayRecord {
    const newTerms: EvidenceTerm[] = [];
    const reviewTerms: EvidenceTerm[] = [];
    for (const term of pool) {
      const card = state.cards[term.id];
      if (!card) continue;
      const item = { id: term.id, label: displayTitle(term) };
      if (card.successDates[0] === date) newTerms.push(item);
      else if (card.successDates.includes(date)) reviewTerms.push(item);
    }
    const readings = reads
      .filter((r) => r.at === date)
      .map((r) => ({ id: r.id, title: readingTitle(r.id, r.kind), kind: r.kind }));
    return { date, newTerms, reviewTerms, readings };
  }

  return {
    studyDays,
    newThisWeek,
    reviewThisWeek,
    familiarThisWeek,
    familiarTotal,
    familiarTotalKnownWeek: familiarThisWeek > 0,
    learningTotal,
    readingsThisWeek,
    recentFamiliar: recentFamiliar.slice(0, 8).map(({ id, label }) => ({ id, label })),
    confused: confused.slice(0, 6),
    encounters,
    weekDays,
    monthLabel: `${y}년 ${m}월`,
    monthCells,
    heroTitle,
    heroSub,
    viewportLine,
    emptyFamiliar,
    dayRecord,
  };
}
