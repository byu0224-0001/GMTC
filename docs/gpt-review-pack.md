# 투자 문해력 앱 — GPT 리뷰용 브리핑 (2026-09-03)

이 문서를 **먼저** 읽고, 이어서 `gpt-pack.txt`를 첨부하세요.

**보내지 말 것**

- 한국은행 PDF, 증권사 PDF
- `public/data/terms.json` 전체(787개 원문 정의)
- `node_modules`

파일 전체를 채팅에 풀 필요는 없습니다. 이 브리핑 + `gpt-pack.txt`면 구현·설계·카피 원칙·데이터 구조를 거의 다 볼 수 있습니다. 화면이 필요하면 `http://localhost:5173/` 스크린샷(오늘 / 학습 세션 / 실전 브리핑 / 사전) 정도만 추가하면 됩니다.

---

## 0. 지금 이 리뷰에서 봐 주었으면 하는 것

제품 정의는 고정입니다. 출퇴근 5~10분으로 경제·투자 정보가 덜 막히게 한다. 암기장도, 뉴스 앱도 아니다.

이번 팩은 **Linked Learning MVP를 닫은 상태**입니다.

오늘 루프:

`today.json 브리핑 결정` → `primaryTermIds 중 미학습 2~3개` → `이해(다음/이전 단어)` → `첫 회상` → `due 복습` → `같은 브리핑` → `원인/판단` → `한 번에 연결`

신규 카드의 SRS 신호는 자기평가가 아니라 **첫 회상 정오답**입니다. 브리핑 완료와 문항 정답률은 분리합니다.

Editorial은 사용자 앱 밖입니다. RSS는 헤드라인 후보만. OpenAI는 `gpt-5.6-terra` 하나, factSheet 없이 숫자를 지어내지 않습니다. 초안은 `editorial/drafts`, 검수 후에만 `published-briefings.json`.

봐 달라는 것:

1. Linked Learning이 코드상으로 하루 경험으로 붙었는가.
2. `투자할 때는`가 특정 리포트/시나리오가 아니라 역할+해석인가.
3. Editorial 파이프라인이 자동 publish 없이 운영 가능한가.
4. 파일럿 Go/No-Go. 더 만들 기능이 아니라, 이 학습 방식을 10명에게 줄 수 있는가.

추측하지 말고 `gpt-pack.txt`를 근거로 지적해 주세요.

---

## 1. 한 줄 제품

출퇴근길에 짧게 공부해서, 경제·투자 정보가 조금씩 덜 막히게 한다.

- 암기장이 아니다.
- 뉴스 앱이 아니다.
- 증권사 PDF를 읽히는 서비스가 아니다.
- 가짜 뉴스를 진짜 기사처럼 위장하지도 않는다.

JTBD: 「짧게 공부해서 경제·투자 정보가 점점 잘 들립니다.」

홈 카피의 시간은 오늘 큐 길이로 계산해 `오늘은 약 N분`이라고 합니다. MVP 기본 체감은 7~10분입니다.

하단 탭 네 개: **오늘 / 학습 / 실전 / 사전**. 리포트 탭 없음.

---

## 2. 두 학습 엔진 (고정)

### A. 개념 학습 엔진

목적: 경제·금융 언어를 빠르게 익숙하게 만든다.

경험: `처음 이해 → 떠올리기 → 구분하기 → 문맥에서 알아보기 → 반복 복습`

MVP 문제 유형은 네 개만.

| 단계 | UX | 구현 |
|---|---|---|
| 처음 이해 | 한 줄·예시·투자할 때는·함께 보면. `이전 단어` / `다음` | 신규 카드. 오늘 세션에서는 이때 SRS에 넣지 않음 |
| 기억 꺼내기 | 설명 → 용어 객관식 | `DrillKind = recall` |
| 문맥에서 찾기 | 문장 빈칸 → 용어 선택 | `cloze` |
| 구분하기 | 헷갈리는 개념 비교 | `contrast`. 손글이 있는 용어만. 없으면 cloze로 강등 |

한 세션에서 네 종류를 다 풀게 하지 않습니다. 같은 Term을 만날 때마다 숙련도(`SrsCard.repetitions`)에 따라 형태가 바뀝니다.

- reps ≤ 1: recall
- reps = 2: cloze
- reps ≥ 3: contrast 있으면 contrast, 없으면 cloze

한글 직접 입력은 MVP에서 하지 않습니다. 출퇴근 모바일에서 키보드 friction이 큽니다. 우선순위는 선택형 → (나중) 탭/스와이프/O/X.

### B. 실전 브리핑 엔진

목적: 배운 개념을 실제 경제정보를 읽는 데 사용한다.

경험: `현실적인 경제 상황 → 기사처럼 스크롤 → 문단 사이 인터랙션 → 인라인 해설(읽기 계속) → 인과 요약 → 마지막 사고 문제 → 오늘 익힌 개념`

한 브리핑 안의 난이도:

```
용어 인식 → 숫자 읽기 → 원인/결과 → 다음에 확인할 것
```

빈칸 맞히기만 반복하면 세련된 Cloze Test가 되므로, 마지막은 반드시 사고 문제로 끝냅니다.

가짜 뉴스 위장 금지. 상단에 `학습용 브리핑` 배지. 문장은 공개 사실·공식 논리로 독자 작성. 증권사/언론 원문 복사 없음.

현재 3편:

| id | 제목 | 깊이 |
|---|---|---|
| `bf-cpi-rates` | 미국 물가가 예상보다 높게 나왔어요 | 용어(기준금리) → 용어(듀레이션) → 원인(국채금리) → 다음 확인(근원물가) |
| `bf-earnings-down` | 실적은 좋은데 왜 주가는 떨어졌을까요? | 사실 vs 전망 → 컨센서스 확인 |
| `bf-yoy-ytd` | 한 달 +45%, 연초 이후 +18% | 숫자 읽기 → 기저효과 |

---

## 3. 콘텐츠 층 (실제 숫자)

| 층 | 원천 | 사용자에게 | 수량 | 상태 |
|---|---|---|---|---|
| 한은 800 사전 | 한국은행 PDF 추출 | O | 787 엔트리 | 구현. 제목은 800선(자료명). TOC 789, 미분리 2개(`ASEAN+3`, `EMEAP`) |
| Core 100 | 한은 표제어 + 자체 쉬운 설명 | O | 100 | `coreCopy.ts`에 100개 손글. 품질은 검수 수준으로 교체한 상태. 기회비용은 쉬운 설명체로 재작성 |
| Report Essentials | 리포트 패턴 → 자체 작성 | O | 30 | `rpt-*` 별도 객체. 한은 표제어와 ID를 섞지 않음 |
| 투자 사고 | 리포트 논리 추상화 | O, 실전 탭 | 6 | `reasoning.ts`. 학습 탭에서는 뺐음 |
| 짧은 Context 퀴즈 | 자체 장면 | 경로만 남음 | 32 | `/context/:id`. 오늘 세션·실전 허브의 주 경험은 아님 |
| 클레임 구분 | 자체 사례 | 실전 탭 | 3 | 분류명(fact 등)을 고르게 하지 않음. 제목은 궁금증형 |
| Learning Briefing | 자체 작성 | O | 3 | 오늘 세션 마지막 + 실전 탭 메인 |
| 산업 Pack | — | 나중에 | 0 | MVP에서 안 함 |
| 증권사 PDF | 내부 vault | **절대 X** | — | gitignore. 앱 번들 아님 |

사전 탭 `전체` = 한은 787 + 리포트 30 = 817행, 가나다순. 기본 화면에서 80개로 자르던 버그는 수정함.

---

## 4. IA와 경로

```
/                      오늘
/learn                 학습 허브 (핵심 100 + 리포트 필수 표현)
/learn/core            핵심 100 목록, 분야 필터
/learn/report          리포트 표현 30, 그룹 필터
/learn/session         오늘 세션 (신규 3 + 복습 5 + 브리핑 1)
/learn/session?pack=report     리포트 표현 6개
/learn/session?taxonomy=물가   해당 분야만
/context               실전 허브 (브리핑 우선, 그다음 클레임·사고)
/briefing/:id          브리핑 단독
/context/:id           옛 장면 퀴즈 (허브에서 안 밀어 줌)
/claim/:id             사실/전망 구분
/think/:id             사고 패턴
/terms                 사전 (전체 / 핵심 100 / 리포트 표현)
/terms/:id             한은 용어. Core는 쉬운 설명 먼저, 원문은 fold
/lexicon/:id           리포트 표현
/report                내 공부 (진척)
```

`/news`는 `/context`로 리다이렉트.

세션·브리핑·장면·클레임 중에는 하단 탭을 숨깁니다.

---

## 5. Today 세션 — 기능 디테일

파일: `src/lib/today.ts`, `src/pages/LearnPage.tsx`, `src/pages/HomePage.tsx`

```
신규 3 (Core100, 분야를 돌아가며 뽑음 pickBroadFirst)
+ 복습 5 (due인 Core, dueAt 오름차순)
+ 실전 브리핑 1 (오늘 아직 안 끝낸 경우)
```

예상 시간:

```
minutes = round(신규×1.2 + 복습×0.8 + 브리핑.minutes)
clamp 1~12
큐가 비면 0
```

홈 헤드라인: `N분이면 끝나요` / `오늘은 다 했어요`  
구성 한 줄: `새 용어 n개 · 복습 n개 · 실전 브리핑 n편`  
면책: `한국은행 경제금융용어 800선 활용. 투자 권유 및 추천은 하지 않습니다.`

브리핑은 `contextStats[briefingId].lastAt`이 오늘(KST)이면 오늘 큐에 다시 안 넣습니다. 다 답하지 않고 나가면 완료로 치지 않습니다.

신규 카드 그레이드만 용어 SRS를 움직입니다. 브리핑 정오답은 `recordContext`만 하고 용어 카드를 리셋하지 않습니다.

분야별·리포트 팩 세션에는 브리핑을 넣지 않습니다. (`pickStudyQueue`)

---

## 6. 개념 학습 UX

### 신규 (`kind: "new"`)

1. 용어 제목. `눌러서 뜻 보기`
2. 한 줄 → 쉬운 설명 → `투자할 때는` → `함께 보면` 체인
3. `몰랐어요 / 애매해요 / 알겠어요` → SM-2

이게 **첫 만남에만** 쓰입니다. 모든 복습이 이 화면이면 안 된다는 게 이번 스프린트의 출발점이었습니다.

### 복습 (`kind: "recall"`이지만 실제 드릴은 세 종류)

`makeDrill(term, pool, card, seed)`

- recall: `oneLiner || easyExplanation`을 보고 용어 고르기. 보기 캡션 없음.
- cloze: 손글 `CLOZE[id]`가 있으면 그 문장, 없으면 설명에서 표제어를 빈칸으로. 보기 캡션 없음.
- contrast: `CONTRAST[id].question` + 지정 foil. 손글 없으면 recall/cloze로 강등.

손글 현황 (대략):

- CONTRAST: 기회비용, PER/PBR, 실업/고용, CPI/근원, 인플레 계열, GDP/GNI, 기준/명목금리, 고정/변동, 국채/회사채, LTV/DSR/DTI, 테이퍼링/양적완화, 옵션/풋, 자본적지출 등 **약 26개**
- CLOZE: 기회비용, 기준금리, 듀레이션, CPI, 근원, 신용스프레드 **6개**
- 나머지 Core는 자동 distractor(같은 taxonomy 우선)

정답/오답 후 바로 해설(용어 한 줄). `맞아요` 같은 진행 멘트 없음. `함께 보면` 체인.

---

## 7. 브리핑 UX — 블록 스키마

타입: `src/types.ts` `BriefingBlock`

```
p          짧은 문단
cloze      문장 속 □□ + 용어 선택. 고르면 빈칸이 정답 용어로 채워지고 기사 계속
choice     질문 + 보기. depth = term | number | cause | next
causal     한 번에 연결하면 + chain + 선택 extra
concepts   오늘 익힌 개념 칩 → /terms 또는 /lexicon
```

클로즈는 질문을 한 번 더 쓰지 않습니다. 문장 자체가 문항입니다. choice만 `briefing-q`로 질문합니다.

완료 시 `recordContext(briefing.id)`. 중간 문항별 stats는 남기지 않습니다(이전에 `id:index`로 오염되던 부분 수정).

---

## 8. SRS

파일: `src/lib/srs.ts`. SM-2 변형. Dexie/FSRS 없음. `localStorage` 키 `voca:progress:v2`.

| 버튼 | quality | 효과 |
|---|---|---|
| 몰랐어요 | 1 | reps=0, interval=1일, lapses++ |
| 애매해요 | 3 | reps++, interval 증가, ease 조정 |
| 알겠어요 | 4 | reps++, 첫 성공 1일, 둘째 6일, 이후 interval×ease |

복습 드릴에서 오답은 `again`, 정답은 `good`. 애매해요는 신규 카드에만 있습니다.

`known` 통계: `interval >= 6 && repetitions >= 2`.

날짜는 KST 자정 기준 `YYYY-MM-DD`.

---

## 9. 문체 원칙 (앱 기본 문법)

대화체가 아니라 **쉬운 설명체**.

- 쉬운 설명문 70% + 필요한 질문 20% + UI 안내 10%
- 문장을 읽었을 때 ‘친절하게 쓰려고 노력한 문장’이면 다시 쓴다
- 친근함보다 구체성

**쓰지 않는 것**

- 자, 맞혀볼까요 / 여기서 하나 / 이제 한 단계 더
- 맞아요. 핵심은 여기예요
- 엔트리, 학습 시작, 둘러보기, 투자 권유가 아닙니다(직역·문서체)
- 787개+30개 같은 내부 집계를 사용자에게 설명

**쓰는 것**

- 사실 → 맥락 → 질문 → 한 줄 해설 → 함께 보면
- `이때 알아두면 좋은 개념은 무엇일까요?` (필요할 때만)
- `8분이면 끝나요` (시간을 결과로 번역)
- 면책: `한국은행 경제금융용어 800선 활용. 투자 권유 및 추천은 하지 않습니다.`
- 브리핑 출처: `실제 기사·리포트 원문을 사용하지 않습니다.`

기회비용 카드 현재본:

> 하나를 선택하면서 포기한 대안의 가치입니다.
> 예를 들어 주식에 투자하면 같은 돈을 예금했을 때 받을 수 있었던 이자를 포기하게 됩니다.
> 투자할 때는: 금리가 오르면 예금·채권처럼 상대적으로 안전한 선택지의 매력도 높아집니다…
> 함께 보면: 선택 → 기회비용 → 기대수익률 → 위험

---

## 10. 데이터·코드 맵

| 파일 | 역할 |
|---|---|
| `public/data/terms.json` | 한은 787. GPT에 전문 금지 |
| `src/types.ts` | Term, SrsCard, Drill, Briefing, ReportTerm, Claim… |
| `src/content/literacy.ts` | CORE100 목록·taxonomy, CONTEXT_CASES 32, `learningFor` |
| `src/content/coreCopy.ts` | Core100 쉬운 설명 100개 |
| `src/content/reportLexicon.ts` | 30개 + 그룹 + BOK_REPORT_BRIDGE |
| `src/content/drills.ts` | CONTRAST / CLOZE 손글, `drillKindFor` |
| `src/content/briefings.ts` | 학습용 브리핑 3 |
| `src/content/reasoning.ts` | 사고 6 |
| `src/content/claimCases.ts` | 클레임 3 |
| `src/lib/data.ts` | fetch terms.json, Core면 coreCopy로 enrich |
| `src/lib/today.ts` | 오늘 큐, 시간 추정 |
| `src/lib/quiz.ts` | makeDrill / distractor |
| `src/lib/srs.ts` `progress.ts` | SM-2, localStorage |
| `src/lib/hangul.ts` `lookup.ts` | 검색, 체인 링크 |
| `src/pages/LearnPage.tsx` | 세션 러너 |
| `src/pages/BriefingPage.tsx` | 스크롤 브리핑 리더 |
| `src/pages/NewsFeedPage.tsx` | 실전 허브 |
| `scripts/validate_content.py` | Core100↔copy↔terms ID 검사 |
| `scripts/reconcile_800.py` | TOC vs 추출 대사 |
| `vercel.json` | SPA rewrite |
| `public/sw.js` | 기본 PWA. 폰트는 jsDelivr CDN |

스택: Vite 7 + React 19 + TS + React Router 7. 상태 라이브러리·DB 없음. 계정 없음.

UI: 다크 `#101010`, 악센트 `#00d992`, Pretendard. 라이트 테마 없음. 인바디 레퍼런스의 스크롤 구조만 가져왔고 색은 복사하지 않음.

---

## 11. 채택 / 깎은 것 / 아직 남은 빚

채택:

- Linked Learning: 오늘 브리핑의 primary terms가 오늘의 신규
- 첫 회상 전까지 신규는 SRS 숙련으로 안 잡힘
- 브리핑 완료 ≠ 정답률
- synthetic 10편, 연결된 핵심 용어 28개
- RSS는 Editorial Radar. 사용자 피드 없음
- OpenAI는 editorial script만. 모델은 Terra 하나. mock 기본
- `투자할 때는`는 역할 + 높고 낮음 해석

깎은 것:

- 관리자 웹, 로그인, 뉴스피드, 본문 크롤링, 자동 publish
- Luna/Sol 라우팅, FSRS, 산업 Pack
- 몰랐어요/애매해요/알겠어요를 신규 첫 신호로 쓰는 것

솔직한 빚:

- 10편은 여전히 evergreen/synthetic. 공식 수치 기반 실사건 브리핑은 아직 초안 파이프만
- 로컬 RSS dry-run에서 BLS 403, BOK 500, Reuters DNS. GitHub Actions에서 다시 봐야 함
- 실제 스마트폰으로 Today를 끝까지 눌러 보지 못함
- contrast/cloze 손글이 Core100 전부가 아님
- CONTEXT_CASES는 짧게 연습으로 일부만 노출
- PWA 오프라인·Vercel 접근 보호 미검증
- 계정·동기화 없음

---

## 12. GPT에게 부탁할 질문

1. 첨부 코드 기준으로 Linked Learning이 하루 경험으로 붙었는가. 파일과 함수를 짚어 주세요.
2. 이미 primary term을 일부 배운 사용자의 Today가 자연스러운가.
3. `투자할 때는` 카피가 너무 일반적이거나, 여전히 한 시나리오에 묶인 항목이 있는가.
4. 브리핑 10편의 문제 수·오답·용어 재등장이 파일럿에 충분한가.
5. Editorial CLI(fetch → factSheet → draft mock/Terra → validate → publish)가 운영 가능한가, 위험한가.
6. 파일럿 Go / No-Go. No-Go라면 **하나만** 고쳐서 다시 오라고 해 주세요.

답은 첨부 `gpt-pack.txt`를 근거로. 구현되어 있지 않은 기능을 있다고 쓰지 마세요.
