import { canonBokId } from "../content/reportLexicon";
import { loadProgress } from "./progress";
import { isFamiliar } from "./srs";

function cardFor(id: string) {
  const cards = loadProgress().cards;
  return cards[canonBokId(id)] ?? cards[id];
}

/** 칩 동작은 같고, 익숙한 용어만 테두리로 아주 약하게 표시한다. 체크는 정답과 헷갈린다. */
export function chipClass(id: string): string {
  const card = cardFor(id);
  if (card && isFamiliar(card)) return "chip chip-link chip-familiar";
  return "chip chip-link";
}
