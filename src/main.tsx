import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { flushEvents, flushStatusOutbox } from "./lib/learner";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

/**
 * 못 보낸 완료 상태와 이벤트를 다시 보낸다.
 *
 * 완료 상태가 서버에 닿지 않으면 오늘 다 한 사람에게 저녁에 독촉이 간다. 그래서
 * 앱을 열 때와 온라인으로 돌아올 때 한 번씩 확인한다. 학습을 막지 않는 뒷작업이다.
 */
function retrySync() {
  void flushStatusOutbox();
  void flushEvents();
}
window.addEventListener("online", retrySync);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") retrySync();
});
retrySync();
