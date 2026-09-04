# 제품 헌법

파일럿·RSS·Terra가 들어와도 바꾸지 않는 원칙. 구현 백로그가 아니다.

## 정체성

- 제품명: **금융문맹 탈출하기**. 짧게·로고는 **금맹탈출**. 한은 「경제금융용어 800선」은 학습 자료명이지 앱 이름이 아니다.
- 성공 단위는 퀴즈 점수·Core100 진행률이 아니라 **앱 밖에서 경제·투자 정보가 덜 막히는 것**(transfer).
- 사용자에게 보이는 단위는 단어가 아니라 **오늘의 공부**(브리핑 한 편과 그에 묶인 개념)다.

## 콘텐츠

- 증권사 리포트는 **내부 source corpus**다. 원문 문단·차트·PDF를 사용자에게 보여 주지 않는다. 사용자-facing 문장은 독자적으로 쓴다.
- OpenAI는 사용자 앱이 아니라 editorial 초안 도구다. 자동 publish 금지. factSheet에 없는 숫자·사실을 만들지 않는다.
- RSS는 Editorial Radar다. 사용자 뉴스피드가 아니다. 뉴스가 커리큘럼을 지배하면 안 된다.
- Linked Learning: 같은 개념을 다루되 **같은 문장·같은 단서로 반복하지 않는다.** 단어 재등장이 전이가 아니다.
- 내부 claim 구분(FACT / COMPANY_GUIDANCE / ANALYST_ESTIMATE / ANALYST_THESIS / VALUATION_OPINION)은 유지한다. 사용자에게 분류명을 맞히게 하지 않는다. “지금 확인된 사실은 어디까지인가”를 묻는다.

## 학습 범위

- 파일럿 학습 세션은 **Pilot Core**(오늘 브리핑 primary/support)만 SRS에 넣는다.
- Core100 나머지와 리포트 표현은 사전에서 찾는다. 보기만으로 good을 기록하지 않는다.
- 카피 존재 ≠ human-reviewed. 파일럿 용어만 `reviewed: true`.
- 선행 개념(`prerequisiteTermIds`)은 지금은 브리핑 순서로 통제한다. 그래프는 RSS 단계 전에 검토.

## 데이터

- `terms.json`은 **787 엔트리**. 원 자료 명칭은 800선. 공개 전에 reconciliation. “800개 전부”라고 말하지 않는다.
- 사전은 하나다. 한은 / Core / 리포트 표현을 같이 검색한다. 내부 모델만 분리한다.
