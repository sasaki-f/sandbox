let reservationClockEpoch = null;
let reservationClockTick = 0;

function reservationNow() {
  if (reservationClockEpoch === null) throw new Error("サーバー時刻が未同期です。");
  return new Date(reservationClockEpoch + performance.now() - reservationClockTick);
}

async function synchronizeReservationClock() {
  if (location.protocol === "file:") {
    reservationClockEpoch = Date.now();
    reservationClockTick = performance.now();
    return;
  }
  const started = performance.now();
  const url = new URL(location.href);
  url.searchParams.set("_clock", String(started));
  const response = await fetch(url, {
    method: "HEAD",
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  const received = performance.now();
  const serverTime = Date.parse(response.headers.get("Date"));
  if (!response.ok || !Number.isFinite(serverTime)) {
    throw new Error("配信サーバーのDateヘッダーを取得できませんでした。");
  }
  reservationClockEpoch = serverTime + (received - started) / 2;
  reservationClockTick = received;
}

async function bootstrapReservation() {
  try {
    await synchronizeReservationClock();
    for (const name of [
      "app",
      "schedule",
      "mock-data",
      "weekly",
      "date-picker",
      "booking",
      "scroll-snap",
      "day-popup",
      "search-layout",
      "category-tree",
      "sidebar",
      "calendar-shortcuts",
      "router",
    ]) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = new URL(`${name}.js`, document.currentScript?.src || bootstrapSource).href;
        script.onload = resolve;
        script.onerror = reject;
        document.body.append(script);
      });
    }
    if (location.protocol !== "file:") {
      setInterval(() => synchronizeReservationClock().catch(console.error), 5 * 60 * 1000);
    }
  } catch (error) {
    console.error(error);
    document.documentElement.classList.remove("route-loading");
    const message = document.createElement("p");
    message.setAttribute("role", "alert");
    message.textContent = "時刻の同期または画面の読み込みに失敗しました。再読み込みしてください。";
    document.body.replaceChildren(message);
  }
}
const bootstrapSource = document.currentScript.src;
bootstrapReservation();
