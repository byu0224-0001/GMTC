#!/bin/zsh
# 앱 소스만 모아 GPT에 붙일 텍스트를 만듭니다. PDF·terms.json 전체·node_modules는 빼습니다.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/gpt-pack.txt"
{
  echo "=== VOCA GPT PACK $(date '+%Y-%m-%d %H:%M') ==="
  echo
  echo "먼저 docs/gpt-review-pack.md 를 읽고, 이 파일을 첨부하세요."
  echo "보내지 말 것: PDF, public/data/terms.json 전체, node_modules"
  echo
  echo "=== FILE TREE (src) ==="
  find "$ROOT/src" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \) | sed "s|$ROOT/||" | sort
  echo
  echo "=== terms.json META (not full dump) ==="
  python3 -c "
import json, re
from pathlib import Path
root = Path('$ROOT')
p = root/'public'/'data'/'terms.json'
d = json.loads(p.read_text())
print('count', d.get('count'), 'version', d.get('version'))
print('sourceTitle', d.get('sourceTitle'))
print('termKeys', list(d['terms'][0].keys()))
print('sample', {k:d['terms'][0][k] for k in ['id','headword','enName','abbr','shortDef']})
copy = (root/'src'/'content'/'coreCopy.ts').read_text()
lit = (root/'src'/'content'/'literacy.ts').read_text()
dr = (root/'src'/'content'/'drills.ts').read_text()
bf = (root/'src'/'content'/'briefings.ts').read_text()
print('CORE100', len(re.findall(r'\{ id: \"([^\"]+)\", taxonomy:', lit)))
print('CORE_COPY', len(re.findall(r'^  \"([^\"]+)\": \{', copy, re.M)))
print('CONTEXT_CASES', len(re.findall(r'id: \"cx-', lit)))
print('CONTRAST keys', len(re.findall(r'^  \"([^\"]+)\": \{', dr.split('export const CLOZE')[0], re.M)))
print('CLOZE keys', len(re.findall(r'^  \"([^\"]+)\": \{', dr.split('export const CLOZE')[1], re.M)))
print('BRIEFING ids', re.findall(r'id: \"(bf-[^\"]+)\"', bf))
print('BRIEFING headlines', re.findall(r'headline: \"([^\"]+)\"', bf))
"
  echo
  echo "=== SOURCE FILES ==="
  for rel in \
    package.json index.html vercel.json \
    public/manifest.webmanifest public/sw.js \
    src/types.ts src/App.tsx src/main.tsx src/styles.css src/components/Chrome.tsx \
    src/lib/data.ts src/lib/hangul.ts src/lib/lookup.ts src/lib/progress.ts src/lib/quiz.ts src/lib/srs.ts src/lib/today.ts \
    src/lib/todayPlan.ts src/lib/events.ts \
    src/content/literacy.ts src/content/coreCopy.ts src/content/reportLexicon.ts \
    src/content/drills.ts src/content/briefings.ts src/content/reasoning.ts src/content/claimCases.ts \
    src/pages/HomePage.tsx src/pages/CurriculumPage.tsx src/pages/CoreListPage.tsx src/pages/ReportHubPage.tsx \
    src/pages/LearnPage.tsx src/pages/BriefingPage.tsx \
    src/pages/NewsFeedPage.tsx src/pages/NewsQuizPage.tsx src/pages/GlossaryPage.tsx \
    src/pages/TermDetailPage.tsx src/pages/ReportPage.tsx \
    src/pages/LexiconPage.tsx src/pages/ThinkPage.tsx src/pages/ClaimQuizPage.tsx \
    public/content/today.json public/content/published-briefings.json \
    scripts/validate_content.py scripts/fetch_editorial.py scripts/editorial_draft.py scripts/editorial_publish.py \
    .github/workflows/editorial.yml .env.example
  do
    echo
    echo "----- FILE $rel -----"
    cat "$ROOT/$rel"
  done
} > "$OUT"
echo "Wrote $OUT ($(wc -c < "$OUT" | tr -d ' ') bytes, $(wc -l < "$OUT" | tr -d ' ') lines)"
echo "GPT에는 docs/gpt-review-pack.md 를 먼저 붙이고, 이 파일을 첨부하세요."
echo "PDF와 public/data/terms.json 전체는 보내지 마세요."
