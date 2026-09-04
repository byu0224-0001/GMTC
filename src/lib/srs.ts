import type { GradeLabel, SrsCard } from "../types";

const KST = 9 * 60 * 60 * 1000;

export function startOfKst(d: Date): Date {
  const utc = d.getTime() + d.getTimezoneOffset() * 60_000;
  const kst = new Date(utc + KST);
  kst.setHours(0, 0, 0, 0);
  return kst;
}

export function kstDateKey(d = new Date()): string {
  const s = startOfKst(d);
  const y = s.getFullYear();
  const m = String(s.getMonth() + 1).padStart(2, "0");
  const day = String(s.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function newCard(termId: string, now = new Date()): SrsCard {
  return {
    termId,
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    lapses: 0,
    dueAt: kstDateKey(now),
    lastQuality: null,
    updatedAt: now.toISOString(),
  };
}

export function isDue(card: SrsCard, now = new Date()): boolean {
  return card.dueAt <= kstDateKey(now);
}

export function grade(card: SrsCard, label: GradeLabel, now = new Date()): SrsCard {
  const q = label === "again" ? 1 : label === "hard" ? 3 : 4;
  let { ease, interval, repetitions, lapses } = card;
  if (q < 3) {
    repetitions = 0;
    lapses += 1;
    interval = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.max(1, Math.round(interval * ease));
    if (label === "hard") interval = Math.max(1, Math.ceil(interval * 1.0));
  }
  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  ease = Math.max(1.3, ease);
  const dueAt = addDays(kstDateKey(now), interval);
  return {
    ...card,
    ease,
    interval,
    repetitions,
    lapses,
    dueAt,
    lastQuality: q,
    updatedAt: now.toISOString(),
  };
}

export function dueLabel(days: number): string {
  if (days <= 0) return "다음 복습은 오늘입니다";
  if (days === 1) return "다음 복습은 내일입니다";
  if (days < 7) return `다음 복습은 ${days}일 뒤입니다`;
  if (days < 30) return `다음 복습은 약 ${Math.round(days / 7)}주 뒤입니다`;
  if (days < 365) return `다음 복습은 약 ${Math.round(days / 30)}개월 뒤입니다`;
  return `다음 복습은 약 ${Math.round(days / 365)}년 뒤입니다`;
}

export function daysUntil(dueAt: string, now = new Date()): number {
  const a = startOfKst(now).getTime();
  const [y, m, d] = dueAt.split("-").map(Number);
  const b = Date.UTC(y, m - 1, d);
  return Math.round((b - a) / 86_400_000);
}
