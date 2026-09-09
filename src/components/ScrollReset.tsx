import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * 새로 들어가는 화면은 맨 위부터.
 * 뒤로 가기는 직전에 보던 스크롤을 되돌린다.
 */
export function ScrollReset() {
  const loc = useLocation();
  const action = useNavigationType();
  const prevPath = useRef(loc.pathname);
  const saved = useRef<Record<string, number>>({});

  useLayoutEffect(() => {
    const from = prevPath.current;
    if (from !== loc.pathname) saved.current[from] = window.scrollY;
    if (action === "POP") window.scrollTo(0, saved.current[loc.pathname] ?? 0);
    else window.scrollTo(0, 0);
    prevPath.current = loc.pathname;
  }, [loc.pathname, action]);

  return null;
}
