/**
 * 알림 문구.
 *
 * 기능 화면의 문구는 담백하게 쓰고, 브랜드 캐릭터는 감정이 실리는 자리에서만 쓴다.
 * 여기가 그 자리다. 알림, 연속 사용, 짧은 이탈.
 *
 * 톤의 원칙이 하나 있다. **밀린 일처럼 말하지 않는다.**
 * `오늘 공부할 게 남아 있어요`는 사실이지만 알림으로 받으면 할 일 목록이 하나 더
 * 늘어난 것으로 읽힌다. 이 앱을 쓰는 시간은 남은 숙제가 아니라 오늘 5분을 자기한테
 * 쓰는 일이다. 그래서 남은 분량을 알리는 대신 같이 해보자고 말한다.
 *
 * `퇴근길에 잠깐`처럼 발송 시각을 전제로 한 문구는 쓰지 않는다. 지금은 날짜만
 * 돌려 쓰므로, 점심에 와도 어색하지 않은 문장만 둔다.
 *
 * `금융문맹 되어가는 중…`은 제품 결정이다. 20~30대가 자조적 문구를 재치로 받는지
 * 불쾌하게 받는지를 파일럿에서 확인하려는 가설이므로, 판단해서 빼지 않는다.
 * 대신 남용되지 않도록 조건을 코드로 못박는다.
 *  - 2~3일 쉰 경우에만 쓴다 (그 뒤로는 자조가 아니라 잔소리가 된다)
 *  - 4~6일은 가볍게 부르고, 7일 이상은 중립적으로 쓴다
 *  - 같은 공백 구간에서 한 번만 보낸다
 *  - 온보딩이나 학습 중에는 쓰지 않는다
 */

export type NudgeKind =
  /** 오늘 아직 안 한 사람. 응원하는 자리다. */
  | "today_pending"
  /** 2~3일 쉰 사람. 자조적 브랜드 문구를 쓰는 유일한 자리다. */
  | "lapse_short"
  /** 4~6일 쉰 사람. 가볍게 부른다. */
  | "lapse_mid"
  /** 7일 이상 쉰 사람. 중립적으로 쓴다. */
  | "lapse_long"
  /** 연속 사용 축하. */
  | "streak";

export interface NudgeCopy {
  kind: NudgeKind;
  title: string;
  body: string;
}

/** 브랜드 캐릭터를 쓰는 문구. 파일럿에서 반응을 볼 대상이다. */
export const BRAND_VOICE_KINDS: NudgeKind[] = ["lapse_short", "streak"];

const LAPSE_SHORT_MIN_DAYS = 2;
const LAPSE_MID_MIN_DAYS = 4;
const LAPSE_LONG_MIN_DAYS = 7;

/**
 * 오늘 아직 안 한 사람에게 보내는 문구.
 *
 * 하나로 고정하면 매일 같은 문장이 와서 며칠 만에 배경음이 된다. 날짜로 돌려 쓴다.
 * 전부 `얼마 남았다`가 아니라 `같이 해보자`로 쓴다.
 */
const TODAY_VARIANTS: { title: string; body: string }[] = [
  { title: "금맹탈출, 오늘도 5분만 해볼까요?", body: "새 용어랑 복습이 준비돼 있어요." },
  { title: "어제 본 거, 오늘 한 번 더.", body: "짧게 복습하고 새 용어도 조금 볼게요." },
  { title: "잠깐만 보고 갈까요?", body: "오늘도 몇 개만 익히면 돼요." },
  { title: "오늘도 가볍게 이어가요.", body: "길게 안 해도 돼요. 몇 개만 보고 끝내요." },
  { title: "금맹탈출, 오늘도 이어가요.", body: "오늘 볼 용어가 준비돼 있어요." },
];

/** 문구를 고르는 데 쓰는 값. 같은 날에는 같은 문구가 나와야 한다. */
function variantIndex(seed: string, size: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 100_000;
  return h % size;
}

export function nudgeFor(input: {
  /** 마지막으로 학습한 날로부터 지난 일수. 오늘 했으면 0. 한 번도 안 했으면 null. */
  daysSinceStudy: number | null;
  /** 오늘 권장 분량을 마쳤는지. */
  doneToday: boolean;
  streakDays: number;
  /** 문구를 돌려 쓰기 위한 값. 보통 오늘 날짜(KST)를 넣는다. */
  seed?: string;
}): NudgeCopy | null {
  const { daysSinceStudy, doneToday, streakDays, seed = "" } = input;
  if (doneToday) return null;
  /**
   * 아직 한 번도 학습하지 않은 사람에게는 아무 말도 하지 않는다.
   * 여기를 막지 않으면 방금 설치한 사람이 `오랜만이에요`를 보게 되고,
   * 이틀만 지나면 `금융문맹 되어가는 중…`을 보게 된다. 둘 다 틀린 말이다.
   */
  if (daysSinceStudy === null) return null;

  if (daysSinceStudy >= LAPSE_LONG_MIN_DAYS) {
    return {
      kind: "lapse_long",
      title: "오랜만이에요.",
      body: "오늘은 5분만 가볍게 다시 시작해요.",
    };
  }
  if (daysSinceStudy >= LAPSE_MID_MIN_DAYS) {
    return {
      kind: "lapse_mid",
      title: "슬슬 다시 해볼까요?",
      body: "오늘은 5분만 가볍게 이어가요.",
    };
  }
  if (daysSinceStudy >= LAPSE_SHORT_MIN_DAYS) {
    return {
      kind: "lapse_short",
      title: "금융문맹 되어가는 중…",
      body: "오늘 5분만 다시 해볼까요?",
    };
  }
  if (streakDays >= 3) {
    return {
      kind: "streak",
      title: `🔥 ${streakDays}일 연속. 이 정도면 금맹탈출할 듯.`,
      body: "오늘도 5분만 이어가요.",
    };
  }
  const v = TODAY_VARIANTS[variantIndex(seed, TODAY_VARIANTS.length)];
  return { kind: "today_pending", ...v };
}

/** 알림 허용을 묻는 화면. 브라우저 권한창을 띄우기 전에 먼저 보여 준다. */
export const PUSH_PROMPT = {
  title: "내일도 이어서 볼까요?",
  body: "오늘 학습을 놓친 날에만 알려드릴게요.",
  accept: "알림 받기",
  decline: "나중에",
} as const;

/** 홈 알림 설정 시트. 매일 무조건 온다고 오해하지 않게 동작을 적는다. */
export const PUSH_SETTINGS = {
  onTitle: "알림 켜짐",
  onBody: "오늘 학습을 아직 하지 않은 날에만 알려드려요. 이미 학습을 마쳤다면 알림은 보내지 않아요.",
  onWhen: "보통 저녁 8시쯤 한 번 확인해요.",
  test: "시험 알림 받기",
  testHint: "지금 이 기기로 오는지 바로 확인해 볼 수 있어요. 오늘 학습과 상관없어요.",
  testSent: "보냈어요. 알림이 보이면 이 기기로 푸시가 도착한 거예요.",
  testFail: "지금은 보내지 못했어요. 잠시 후 다시 시도해 주세요.",
} as const;
