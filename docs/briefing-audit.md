# 기사형 16편 감사표

판정 질문: **첫 두 문단에서 개념 정의를 빼도 사건이 성립하는가?**
습니다체 여부는 기사 완료로 세지 않는다. 재실행: `node scripts/audit-briefings.mjs`

골격 칸: headline / deck / lead / evidence / interpretation / caveat / next variable. 편당 최소 4.

| id | 사건 | 정의문항 | 맥락문항 | 첫 질문 | 골격 | 정답 후 그림 |
| --- | --- | ---: | ---: | --- | ---: | --- |
| bf-cpi-rates | YES | 1 | 2 | cloze | 7 | Y |
| bf-earnings-down | YES | 0 | 2 | cause | 7 | 사실 비교만 |
| bf-yoy-ytd | YES | 0 | 2 | number | 7 | 사실 비교만 |
| bf-fx-export | YES | 0 | 2 | cause | 7 | Y |
| bf-jobs | YES | 1 | 2 | cloze | 7 | Y |
| bf-capex | YES | 1 | 2 | cause | 7 | Y |
| bf-gdp-retail | YES | 0 | 2 | cause | 6 | 사실 비교만 |
| bf-shareholder | YES | 1 | 2 | cause | 6 | Y |
| bf-bond-rates | YES | 1 | 2 | cause | 6 | Y |
| bf-supply-price | YES | 1 | 2 | cause | 6 | Y |
| bf-credit-spread | YES | 0 | 2 | cloze | 7 | 사실 비교만 |
| bf-nominal-price | YES | 0 | 2 | cloze | 7 | 사실만 |
| bf-dsr-home | YES | 0 | 2 | cloze | 6 | 사실 비교만 |
| bf-yield-curve | YES | 0 | 2 | cloze | 7 | 사실 비교만 |
| bf-per-pbr | YES | 0 | 2 | cloze | 7 | 사실 비교만 |
| bf-rate-fx | YES | 0 | 2 | cloze | 7 | Y |

규칙: 정의 확인(`depth: term`) 편당 최대 1. 반드시 최소 1개는 cloze·인과·비교·다음 변수. 첫 화면 질문은 정의 고르기가 아니다.
