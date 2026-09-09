import { READING_CASES } from "./readingCases";

export type ReadingRef = { id: string; title: string; primary: boolean };

/**
 * 용어 → 기존 읽기 사례. 새 콘텐츠가 아니라 이미 있는 사례의 인덱스다.
 * 정답 용어를 먼저 두고, 본문에 같이 나온 용어는 그다음에 둔다.
 */
export function readingsForTerm(termId: string): ReadingRef[] {
  const primary: ReadingRef[] = [];
  const support: ReadingRef[] = [];
  for (const cse of READING_CASES) {
    if (cse.answerTermId === termId) {
      primary.push({ id: cse.id, title: cse.title, primary: true });
    } else if (cse.termIds?.includes(termId)) {
      support.push({ id: cse.id, title: cse.title, primary: false });
    }
  }
  return [...primary, ...support].slice(0, 3);
}
