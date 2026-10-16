let weeklyEquipment = null,
  weekStart = "";
const weeklyPage = document.createElement("section");
weeklyPage.id = "weekly";
weeklyPage.className = "schedule-page weekly-page";
weeklyPage.hidden = true;
weeklyPage.innerHTML =
  '<div class="equipment-summary"><img id="weekly-image" alt=""><div><h2 id="weekly-name"></h2><p id="weekly-description"></p></div></div><div class="schedule-toolbar week-toolbar"><button id="week-prev" aria-label="前の週">〈</button><button id="week-picker" class="week-range" aria-label="週を選択"><svg class="week-calendar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg><span id="week-range"></span><input id="week-date" type="date" aria-label="週の基準日"></button><button id="week-next" aria-label="次の週">〉</button></div><div class="schedule-scroll"><div class="schedule-table" id="weekly-table"></div></div>';
weeklyPage.append(schedulePage.querySelector(".schedule-legend").cloneNode(true));
document.querySelector(".app").append(weeklyPage);
function monday(date) {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return key(d);
}
function showWeekly(equipment) {
  weeklyEquipment = equipment;
  weekStart = monday(scheduleDate);
  schedulePage.hidden = true;
  weeklyPage.hidden = false;
  document.querySelector(".app").classList.add("weekly-mode");
  document.querySelector("h1").textContent = "設備詳細";
  document.querySelector("#weekly-name").textContent = equipment.name;
  document.querySelector("#weekly-description").textContent =
    equipment.info + " ／ 予約単位：" + equipment.unit + "分";
  document.querySelector("#weekly-image").src = artwork(equipment.name);
  document.querySelector("#weekly-image").alt = equipment.name;
  renderWeekly();
}
function leaveWeekly() {
  weeklyPage.hidden = true;
  document.querySelector(".app").classList.remove("weekly-mode");
  schedulePage.hidden = false;
  document.querySelector("h1").textContent = scheduleCategory;
  renderSchedule();
}
function renderWeekly() {
  document.querySelector("#week-prev").disabled = weekStart <= monday(reservationMinimumDate);
  document.querySelector("#week-next").disabled = weekStart >= monday(reservationMaximumDate());
  const dailyDate = scheduleDate,
    table = document.querySelector("#weekly-table");
  table.replaceChildren();
  table.style.gridTemplateColumns = "70px repeat(7,max-content)";
  const end = new Date(weekStart + "T00:00:00");
  end.setDate(end.getDate() + 6);
  const short = (d) => `${d.getMonth() + 1}/${d.getDate()}（${weekdays[d.getDay()]}）`;
  document.querySelector("#week-range").textContent =
    short(new Date(weekStart + "T00:00:00")) + " 〜 " + short(end);
  document.querySelector("#week-date").value = weekStart;
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + i);
    const date = key(d);
    scheduleDate = date;
    renderSchedule();
    if (i === 0) {
      const times = document.querySelector("#schedule-table .time-column");
      times.querySelector(".schedule-heading").classList.add("weekly-heading");
      table.append(times);
    }
    const col = [...document.querySelectorAll("#schedule-table .equipment-column")].find(
      (c) => c.querySelector(".equipment-link").textContent === weeklyEquipment.name,
    );
    col.classList.add("weekly-column");
    col.dataset.date = date;
    const heading = col.querySelector(".schedule-heading");
    heading.classList.add("weekly-heading");
    heading.replaceChildren();
    const day = document.createElement("span");
    day.textContent = d.getMonth() + 1 + "/" + d.getDate();
    const weekday = document.createElement("small");
    weekday.textContent = "（" + weekdays[d.getDay()] + "）";
    heading.append(day, weekday);
    if (date < reservationToday()) heading.classList.add("past-heading");
    if (date === reservationToday()) {
      col.classList.add("is-today");
      heading.setAttribute("aria-current", "date");
    }
    if (d.getDay() === 0) heading.classList.add("week-sun");
    if (d.getDay() === 6) heading.classList.add("week-sat");
    col.addEventListener(
      "click",
      () => {
        scheduleDate = date;
      },
      true,
    );
    table.append(col);
  }
  scheduleDate = dailyDate;
  renderSchedule();
}
document.querySelector("#schedule-table").addEventListener("click", (event) => {
  const link = event.target.closest(".equipment-link");
  if (!link) return;
  showWeekly(scheduleEquipment[scheduleCategory].find((e) => e.name === link.textContent));
});
document.querySelector("#back").addEventListener(
  "click",
  (event) => {
    if (weeklyPage.hidden) return;
    event.stopImmediatePropagation();
    leaveWeekly();
  },
  true,
);
scheduleClose.addEventListener(
  "click",
  (event) => {
    if (weeklyPage.hidden) return;
    event.stopImmediatePropagation();
    weeklyPage.hidden = true;
    document.querySelector(".app").classList.remove("weekly-mode");
    leaveSchedule(true);
  },
  true,
);
document.querySelectorAll("[data-nav]").forEach((button) =>
  button.addEventListener(
    "click",
    () => {
      if (button.dataset.nav === "予約" && !weeklyPage.hidden) {
        weeklyPage.hidden = true;
        document.querySelector(".app").classList.remove("weekly-mode");
        leaveSchedule(true);
      }
    },
    true,
  ),
);
function changeWeek(offset) {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + offset * 7);
  if (key(d) < monday(reservationMinimumDate)) return;
  if (key(d) > monday(reservationMaximumDate())) return;
  weekStart = key(d);
  renderWeekly();
}
document.querySelector("#week-prev").onclick = () => changeWeek(-1);
document.querySelector("#week-next").onclick = () => changeWeek(1);
document.querySelector("#week-date").onchange = (event) => {
  if (event.target.value) {
    weekStart = monday(event.target.value);
    renderWeekly();
  }
};
document.querySelector("#slot-confirm").addEventListener("click", () => {
  if (!weeklyPage.hidden) renderWeekly();
});
