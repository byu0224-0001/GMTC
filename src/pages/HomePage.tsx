import { Link } from "react-router-dom";
import { TopBar } from "../components/Chrome";
import { APP_SHORT_NAME, SOURCE_DISCLAIMER } from "../content/brand";
import { CORE100 } from "../content/literacy";
import { mapForBriefing } from "../content/learningMaps";
import { labelFor } from "../lib/lookup";
import { nudgeFor } from "../content/notifications";
import { daysSinceStudy } from "../lib/learner";
import { defaultDoneToday, extraSessionsToday, stats, storageWritable } from "../lib/progress";
import { isFamiliar, kstDateKey } from "../lib/srs";
import { extraQueue, planCounts } from "../lib/today";
import type { TodayPlanFile } from "../lib/todayPlan";
import type { ProgressState, Term } from "../types";

export function HomePage({
  terms,
  progress,
  todayPlan,
}: {
  terms: Term[];
  progress: ProgressState;
  todayPlan: TodayPlanFile;
}) {
  const s = stats(progress, CORE100.map((c) => c.id));
  const plan = planCounts(terms, progress, todayPlan);
  /**
   * 완료 판단은 `남은 큐가 비었는가`가 아니라 권장 분량을 마쳤는지로 한다.
   * 추가로 공부하면 큐가 다시 차기 때문에, 큐 길이로 판단하면 완료가 취소된다.
   */
  const done = defaultDoneToday(progress) || plan.total === 0;
  const extras = extraSessionsToday(progress);
  /**
   * 브랜드 문구는 여기서만 쓴다.
   * 온보딩과 문제 화면에서는 쓰지 않는다. 처음 온 사람에게 자조적 문구를 먼저 보이면
   * 그건 농담이 아니라 평가가 된다. 이미 며칠 해 본 사람에게만 말을 건다.
   */
  const nudge = done
    ? null
    : nudgeFor({
        daysSinceStudy: daysSinceStudy(progress),
        doneToday: false,
        streakDays: progress.streakDays,
        seed: kstDateKey(),
      });
  const briefing = plan.briefing;
  const map = briefing ? mapForBriefing(briefing.id) : undefined;
  const newLabels = plan.newTerms.map((t) => labelFor(t.id, terms));
  const moreLeft = done ? extraQueue(terms, progress).length : 0;
  /**
   * 홈에 적는 진도는 Core100이 아니라 실제로 학습한 전체를 센다.
   * 학습 후보는 221개인데 Core100만 세면 사용자가 본 것보다 적게 나온다.
   */
  const cards = Object.values(progress.cards);
  const seenAll = cards.length;
  const knownAll = cards.filter(isFamiliar).length;

  return (
    <>
      <TopBar
        title={APP_SHORT_NAME}
        trailing={
          <Link to="/report" className="streak">
            {s.streakDays}일 연속
          </Link>
        }
      />
      <div className="page stack">
        <div className="card pad-lg featured">
          {done ? (
            <>
              <div className="display" style={{ margin: 0, fontSize: 22, lineHeight: 1.35 }}>
                오늘 할 건 다 했어요
              </div>
              {/*
                `권장 분량에 1번 더 얹었어요`, `복습이 돌아와요`는 우리 내부 개념을
                한국어로 옮긴 말이다. 사용자는 분량을 얹지 않고 그냥 더 했을 뿐이고,
                돌아오는 것은 복습이라는 일정이 아니라 다시 볼 용어다.
              */}
              <p className="muted" style={{ margin: "10px 0 0" }}>
                {extras
                  ? `오늘은 ${extras}번 더 익혔어요. 내일 다시 볼 용어가 있어요.`
                  : "내일 다시 볼 용어가 있어요. 더 하고 싶으면 이어서 해도 돼요."}
              </p>
            </>
          ) : (
            <>
              {nudge && nudge.kind !== "today_pending" ? (
                <>
                  <div className="display" style={{ margin: 0, fontSize: 20, lineHeight: 1.35 }}>
                    {nudge.title}
                  </div>
                  <p className="muted" style={{ margin: "8px 0 16px" }}>{nudge.body}</p>
                </>
              ) : null}
              {/*
                분량을 두 번 적지 않는다. 예전에는 `오늘 이만큼만 하면 충분합니다`라는
                줄 아래에 `7분`을 따로 크게 적었다. 같은 말을 두 줄에 나눠 쓴 셈이라
                카드만 길어지고, 정작 아래의 읽기 카드가 화면 밖으로 밀렸다.
                한 문장에 넣고 구성은 한 줄로 요약한다.
              */}
              <div className="display" style={{ margin: 0, fontSize: 22, lineHeight: 1.35 }}>
                오늘은 {plan.minutes}분이면 돼요
              </div>
              <p className="muted" style={{ margin: "8px 0 0" }}>
                {[
                  plan.newTerms.length ? `새 용어 ${plan.newTerms.length}개` : null,
                  plan.review ? `복습 ${plan.review}개` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "복습은 내일부터 돌아와요"}
              </p>
              {newLabels.length ? (
                <>
                  {/*
                    처음 보는 용어를 `익힐 개념`이라고 부르지 않는다.
                    처음 봄 / 익힘 / 익숙함은 우리가 구분해서 세는 상태다.
                    오늘 처음 만나는 것에 이미 익혔다는 이름을 붙이면 그 구분이 무너진다.
                  */}
                  <div className="caption" style={{ marginTop: 16 }}>새로 볼 용어</div>
                  <p style={{ margin: "4px 0 0", fontWeight: 600, lineHeight: 1.45 }}>
                    {newLabels.join(" · ")}
                  </p>
                </>
              ) : null}
            </>
          )}
        </div>

        {/*
          `오늘 할 건 다 했어요`라고 말하면서 가장 밝은 버튼으로 `5분 더`를 권하면
          앱이 두 가지 말을 동시에 하는 셈이다. 대상은 공부 습관이 약한 사람이라
          끝내도 괜찮다는 감각을 실제로 줘야 한다. 그래서 완료 상태에서는 primary를
          두지 않는다. 아직 남은 상태에서만 `시작하기`가 primary다.
        */}
        {done ? null : (
          <Link
            to="/learn/session"
            className="btn btn-primary"
            style={{ display: "grid", placeItems: "center", textDecoration: "none" }}
          >
            시작하기
          </Link>
        )}

        {briefing ? (
          <Link to={`/briefing/${briefing.id}`} className="card" style={{ color: "inherit", display: "block" }}>
            <div className="caption">읽기 · {briefing.minutes}분</div>
            <strong style={{ display: "block", marginTop: 6, lineHeight: 1.45 }}>{briefing.headline}</strong>
            <span className="muted">{map ? map.kicker : briefing.subtitle}</span>
          </Link>
        ) : null}

        {done && moreLeft ? (
          <Link
            to="/learn/extra"
            className="btn btn-ghost"
            style={{ display: "grid", placeItems: "center", textDecoration: "none" }}
          >
            5분 더 익히기
          </Link>
        ) : null}

        {/*
          예전에는 이 버튼이 학습 탭(`/learn`)으로 갔다. 하단 탭에 이미 `학습`이
          있으니 한 화면에 같은 목적지가 두 번 있었고, 이름은 흐름인데 흐름 화면이
          아닌 곳으로 갔다. 오늘 읽기에 붙은 개념 지도로 직접 보낸다.
        */}
        {map ? (
          <Link
            to={`/learn/map/${map.id}`}
            className="btn btn-ghost"
            style={{ display: "grid", placeItems: "center", textDecoration: "none" }}
          >
            개념 흐름 보기
          </Link>
        ) : null}

        {/*
          `학습 가능한 용어 221개 · 아직 안 본 용어 215개`를 지웠다.
          221은 우리가 문항을 만들 수 있는 범위이지 사용자가 알아야 할 수가 아니다.
          `한국은행 용어가 787개라는데 왜 221개지`라는 의문만 새로 만들고,
          `215개 남음`은 우리가 원하지 않는 완주 압박을 준다.
          대신 지금까지 쌓인 것만 보여 준다.
        */}
        {seenAll ? (
          <p className="caption" style={{ margin: 0 }}>
            지금까지 본 용어 {seenAll}개
            {knownAll ? ` · 익숙해진 용어 ${knownAll}개` : ""}
          </p>
        ) : null}
        {storageWritable() ? null : (
          <p className="notice">
            이 브라우저에서는 학습 기록을 저장할 수 없어요. 학습은 할 수 있지만 진도가 남지
            않아요. 시크릿 모드라면 일반 창에서 열어 주세요.
          </p>
        )}
        <p className="notice">{SOURCE_DISCLAIMER}</p>
      </div>
    </>
  );
}
