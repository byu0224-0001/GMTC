import type { Term, TermsFile } from "../types";
import { isCore, learningFor, taxonomyOf } from "../content/literacy";
import { mergeReportOntoBok } from "../content/reportLexicon";

let rawFile: TermsFile | null = null;
let meta: Omit<TermsFile, "terms"> | null = null;

function enrich(data: TermsFile): Term[] {
  return mergeReportOntoBok(
    data.terms.map((raw) => {
      const core = isCore(raw.id);
      const learn = core ? learningFor(raw) : null;
      return {
        ...raw,
        priority: core ? "core" : "full",
        taxonomy: taxonomyOf(raw.id),
        oneLiner: learn?.oneLiner ?? "",
        easyExplanation: learn?.easyExplanation ?? "",
        whyItMatters: learn?.whyItMatters ?? "",
        chain: learn?.chain ?? [],
        keyPoints: learn?.keyPoints ?? [],
        commonConfusions: learn?.commonConfusions ?? [],
        learningReviewed: learn?.reviewed ?? false,
      };
    }),
  );
}

export async function loadTerms(): Promise<Term[]> {
  if (!rawFile) {
    const res = await fetch("/data/terms.json");
    if (!res.ok) throw new Error("용어 데이터를 불러오지 못했습니다.");
    rawFile = (await res.json()) as TermsFile;
    meta = {
      version: rawFile.version,
      source: rawFile.source,
      sourceTitle: rawFile.sourceTitle,
      count: rawFile.count,
    };
  }
  return enrich(rawFile);
}

export function getMeta() {
  return meta;
}

export function byId(terms: Term[]): Map<string, Term> {
  return new Map(terms.map((t) => [t.id, t]));
}
