/** 검수 전 원고를 오늘 큐에 넣을지. 기본은 넣지 않는다. `?qa=drafts`로 켠다. */
const KEY = "voca-qa-drafts";

export function syncQaMode(search: string): boolean {
  if (typeof window === "undefined") return false;
  const qa = new URLSearchParams(search).get("qa");
  if (qa === "drafts") {
    sessionStorage.setItem(KEY, "1");
    return true;
  }
  if (qa === "off") {
    sessionStorage.removeItem(KEY);
    return false;
  }
  return sessionStorage.getItem(KEY) === "1";
}

export function includeDraftTerms(): boolean {
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(window.location.search).get("qa") === "drafts") return true;
  return sessionStorage.getItem(KEY) === "1";
}
