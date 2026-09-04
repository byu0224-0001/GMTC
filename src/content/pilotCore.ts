import { LEARNING_BRIEFINGS } from "./briefings";
import { canonBokId } from "./reportLexicon";

/**
 * 파일럿 Today에 실제로 나오는 개념.
 * Core100 나머지 72개는 사전에서만 찾고, 학습 세션·SRS에 넣지 않는다.
 */
export const PILOT_TERM_IDS: readonly string[] = (() => {
  const ids = new Set<string>();
  for (const b of LEARNING_BRIEFINGS) {
    for (const id of b.primaryTermIds) ids.add(canonBokId(id));
    for (const id of b.supportTermIds ?? []) ids.add(canonBokId(id));
  }
  return [...ids];
})();

export function isPilotTerm(id: string): boolean {
  return PILOT_TERM_IDS.includes(canonBokId(id));
}
