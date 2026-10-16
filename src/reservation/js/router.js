// Query-based routes work when this mock is opened as a file or served over HTTP.
let routing = false,
  routeQueued = false,
  routeSequence = 0;
function readReservationRoute() {
  const params = new URLSearchParams();
  const page = !weeklyPage.hidden
    ? "device"
    : !schedulePage.hidden
      ? "category"
      : !document.querySelector("#categories").hidden
        ? "equipment"
        : !document.querySelector("#search").hidden
          ? "search"
          : "home";
  params.set("page", page);
  if (page === "home") {
    params.set("month", `${year}-${String(month + 1).padStart(2, "0")}`);
    if (dayPopup.open && selected) params.set("day", selected);
  }
  if (page === "search") {
    for (const [key, id] of [
      ["from", "start"],
      ["to", "end"],
      ["title", "keyword"],
      ["author", "search-author"],
      ["equipment", "search-equipment"],
      ["category", "search-category"],
    ]) {
      const value = document.querySelector("#" + id).value;
      if (value) params.set(key, value);
    }
    params.set("p", String(reservationSearchPage));
  }
  if (page === "equipment") {
    if (categorySearch.value) params.set("q", categorySearch.value);
    if (selected) params.set("date", selected);
  }
  if (page === "category" || page === "device") {
    params.set("category", scheduleCategory);
    params.set("date", page === "device" ? weekStart : scheduleDate);
    if (page === "device") params.set("equipment", weeklyEquipment.name);
  }
  if (bookingDialog.open && activeBooking) {
    params.set("modal", bookingNew ? "new" : "booking");
    params.set("name", activeBooking.equipment);
    params.set("booking-date", activeBooking.date);
    params.set("time", String(activeBooking.from));
    if (bookingNew) params.set("until", String(activeBooking.to));
    if (returnToDayPopup && selected) params.set("day", selected);
  }
  return params;
}
function routeURL(params) {
  const url = new URL(location.href);
  url.search = params.toString();
  return url.href;
}
function syncReservationRoute(replace = false) {
  if (routing) return;
  const next = routeURL(readReservationRoute());
  if (next === location.href) return;
  const state = { reservationRoute: true, sequence: replace ? routeSequence : ++routeSequence };
  if (replace) history.replaceState(state, "", next);
  else history.pushState(state, "", next);
}
function queueReservationRoute() {
  if (routing || routeQueued) return;
  routeQueued = true;
  queueMicrotask(() => {
    routeQueued = false;
    syncReservationRoute();
  });
}
function validRouteDate(value, fallback) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") &&
    !Number.isNaN(new Date(value + "T00:00:00").getTime())
    ? value
    : fallback;
}
function applyReservationRoute() {
  routing = true;
  try {
    const params = new URLSearchParams(location.search);
    returnToDayPopup = false;
    for (const dialog of document.querySelectorAll("dialog[open]")) dialog.close();
    closeReservationMenu();
    resetReservationView();
    const date = validRouteDate(params.get("date"), reservationToday());
    selected = date;
    const page = params.get("page") || "home";
    if (page === "search") {
      document.querySelector("#start").value = validRouteDate(params.get("from"), "2026-10-01");
      document.querySelector("#end").value = validRouteDate(params.get("to"), "2026-10-31");
      document.querySelector("#keyword").value = params.get("title") || "";
      document.querySelector("#search-author").value = params.get("author") || "";
      document.querySelector("#search-equipment").value = params.get("equipment") || "";
      document.querySelector("#search-category").value = params.get("category") || "";
      reservationSearchPage = Math.max(1, Number(params.get("p")) || 1);
      tab(true);
      search();
    } else if (page === "equipment") {
      openMenuCategories();
      categorySearch.value = params.get("q") || "";
      renderCategories();
    } else if (page === "category" || page === "device") {
      const category = params.get("category");
      if (scheduleEquipment[category]) {
        document.querySelector("#mine").hidden = true;
        document.querySelector("#search").hidden = true;
        document.querySelector(".tabs").hidden = true;
        showSchedule(category);
        scheduleDate = date;
        renderSchedule();
        if (page === "device") {
          const equipment = scheduleEquipment[category].find(
            (e) => e.name === params.get("equipment"),
          );
          if (equipment) {
            showWeekly(equipment);
            weekStart = monday(date);
            renderWeekly();
            weeklyFromCategory = true;
          }
        }
      } else tab(false);
    } else {
      const monthValue = params.get("month");
      if (/^\d{4}-(0[1-9]|1[0-2])$/.test(monthValue || "")) {
        [year, month] = monthValue.split("-").map(Number);
        month--;
      }
      selected = null;
      tab(false);
      const day = params.get("day");
      if (day) {
        selected = validRouteDate(day, key(new Date(year, month, 1)));
        render();
        if (!params.get("modal")) showDayReservations();
      }
    }
    if (params.get("modal")) {
      const name = params.get("name"),
        bookingDate = validRouteDate(params.get("booking-date"), date),
        from = Number(params.get("time"));
      const e = equipmentFor(name || "");
      if (scheduleEquipment[e.category]?.some((item) => item.name === name)) {
        seedSchedule(e.category, bookingDate);
        const existing = scheduleBookings.find(
          (b) => b.equipment === name && b.date === bookingDate && b.from === from,
        );
        if (params.get("modal") === "new") {
          const until = Number(params.get("until"));
          if (Number.isFinite(from) && until > from)
            openBooking(
              {
                category: e.category,
                equipment: name,
                date: bookingDate,
                from,
                to: until,
                title: "設備予約",
                own: true,
              },
              true,
            );
        } else if (existing) openBooking(existing);
        returnToDayPopup = page === "home" && !!params.get("day");
      }
    }
    updateSidebarCurrent();
  } finally {
    setTimeout(() => {
      routing = false;
    }, 0);
  }
}
// Coalesce nested navigation (category -> equipment) into one history entry.
for (const name of [
  "tab",
  "showSchedule",
  "showWeekly",
  "leaveSchedule",
  "leaveWeekly",
  "openBooking",
  "closeBookingPage",
  "showDayReservations",
  "render",
  "renderSchedule",
  "renderWeekly",
  "search",
  "renderCategories",
]) {
  const original = globalThis[name];
  globalThis[name] = function (...args) {
    const result = original.apply(this, args);
    queueReservationRoute();
    return result;
  };
}
for (const dialog of [dayPopup, bookingDialog])
  dialog.addEventListener("close", queueReservationRoute);
for (const id of [
  "start",
  "end",
  "keyword",
  "search-author",
  "search-equipment",
  "search-category",
  "category-keyword",
])
  document.querySelector("#" + id).addEventListener("input", queueReservationRoute);
document.addEventListener(
  "click",
  (event) => {
    const back = event.target.closest("#back,#booking-back");
    if (!back || history.state?.sequence <= 0 || !history.state?.reservationRoute) return;
    if (back.id === "booking-back" && !B("booking-confirm").hidden) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    history.back();
  },
  true,
);
window.addEventListener("popstate", (event) => {
  routeSequence = event.state?.sequence || 0;
  applyReservationRoute();
});
if (new URLSearchParams(location.search).has("page")) {
  routeSequence = history.state?.sequence || 0;
  history.replaceState({ reservationRoute: true, sequence: routeSequence }, "", location.href);
  applyReservationRoute();
} else {
  history.replaceState(
    { reservationRoute: true, sequence: 0 },
    "",
    routeURL(readReservationRoute()),
  );
}

document.documentElement.classList.remove("route-loading");
