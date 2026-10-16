const datePopup = document.createElement("dialog");
datePopup.className = "date-popup";
datePopup.setAttribute("aria-label", "日付を選択");
datePopup.innerHTML =
  '<div class="date-popup-header"><button type="button" id="picker-prev" aria-label="前の月">〈</button><div id="picker-month" class="picker-period"><select id="picker-year-select" aria-label="表示する年"></select><select id="picker-month-select" aria-label="表示する月"></select></div><button type="button" id="picker-next" aria-label="次の月">〉</button></div><div class="picker-weekdays"><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span class="saturday">土</span><span class="sunday">日</span></div><div id="picker-days" class="picker-days"></div><div class="actions"><button type="button" id="picker-close">閉じる</button></div>';
document.body.append(datePopup);
let pickerTarget = null,
  pickerMonth = 0,
  pickerYear = 2026;
function openDatePopup(input) {
  pickerTarget = input;
  const value =
    input.value && input.value >= reservationMinimumDate ? input.value : reservationMinimumDate;
  const date = new Date(
    (value > reservationMaximumDate() ? reservationMaximumDate() : value) + "T00:00:00",
  );
  pickerYear = date.getFullYear();
  pickerMonth = date.getMonth();
  renderDatePopup();
  datePopup.showModal();
}
function renderDatePopup() {
  const allowPast = ["start", "end", "schedule-date", "week-date"].includes(pickerTarget.id);
  const today = reservationToday();
  const maximum = reservationMaximumDate();
  if (key(new Date(pickerYear, pickerMonth, 1)).slice(0, 7) > maximum.slice(0, 7)) {
    pickerYear = Number(maximum.slice(0, 4));
    pickerMonth = Number(maximum.slice(5, 7)) - 1;
  }
  document.querySelector("#picker-next").disabled =
    key(new Date(pickerYear, pickerMonth, 1)).slice(0, 7) >= maximum.slice(0, 7);
  document.querySelector("#picker-prev").disabled =
    (pickerYear === 2026 && pickerMonth === 0) ||
    (!allowPast && key(new Date(pickerYear, pickerMonth, 1)).slice(0, 7) <= today.slice(0, 7));
  const yearSelect = document.querySelector("#picker-year-select");
  const monthSelect = document.querySelector("#picker-month-select");
  yearSelect.replaceChildren();
  for (let year = 2026; year <= Number(maximum.slice(0, 4)); year++) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year + "年";
    option.disabled = !allowPast && year < Number(today.slice(0, 4));
    yearSelect.append(option);
  }
  monthSelect.replaceChildren();
  for (let month = 0; month < 12; month++) {
    const option = document.createElement("option");
    option.value = month;
    option.textContent = month + 1 + "月";
    option.disabled =
      key(new Date(pickerYear, month, 1)).slice(0, 7) > maximum.slice(0, 7) ||
      (!allowPast && key(new Date(pickerYear, month, 1)).slice(0, 7) < today.slice(0, 7));
    monthSelect.append(option);
  }
  yearSelect.value = pickerYear;
  monthSelect.value = pickerMonth;
  const grid = document.querySelector("#picker-days");
  grid.replaceChildren();
  const first = new Date(pickerYear, pickerMonth, 1),
    last = new Date(pickerYear, pickerMonth + 1, 0);
  const offset = (first.getDay() + 6) % 7;
  const count = Math.ceil((offset + last.getDate()) / 7) * 7;
  for (let i = 0; i < count; i++) {
    const date = new Date(pickerYear, pickerMonth, i - offset + 1),
      value = key(date);
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = date.getDate();
    button.className =
      "picker-day" +
      (date.getMonth() !== pickerMonth ? " muted" : "") +
      (date.getDay() === 0 ? " sunday" : date.getDay() === 6 ? " saturday" : "") +
      (pickerTarget.value === value ? " chosen" : "");
    button.setAttribute("aria-label", dateText(value));
    button.setAttribute("aria-pressed", String(pickerTarget.value === value));
    button.disabled =
      value < reservationMinimumDate || value > maximum || (!allowPast && value < today);
    button.onclick = () => {
      pickerTarget.value = value;
      pickerTarget.dispatchEvent(new Event("input", { bubbles: true }));
      pickerTarget.dispatchEvent(new Event("change", { bubbles: true }));
      datePopup.close();
    };
    grid.append(button);
  }
}
function movePickerMonth(offset) {
  const date = new Date(pickerYear, pickerMonth + offset, 1);
  if (key(date) < reservationMinimumDate) return;
  if (key(date).slice(0, 7) > reservationMaximumDate().slice(0, 7)) return;
  pickerYear = date.getFullYear();
  pickerMonth = date.getMonth();
  renderDatePopup();
}
document.querySelector("#picker-prev").onclick = () => movePickerMonth(-1);
document.querySelector("#picker-next").onclick = () => movePickerMonth(1);
document.querySelector("#picker-close").onclick = () => datePopup.close();
datePopup.addEventListener("click", (event) => {
  if (event.target !== datePopup) return;
  const rect = datePopup.getBoundingClientRect();
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    datePopup.close();
});
document.querySelectorAll('input[type="date"]').forEach((input) => {
  input.min = reservationMinimumDate;
  input.max = reservationMaximumDate();
  input.readOnly = true;
  input.classList.add("popup-date-input");
  input.setAttribute("aria-haspopup", "dialog");
  input.addEventListener("click", (event) => {
    event.preventDefault();
    openDatePopup(input);
  });
  input.addEventListener("keydown", (event) => {
    if (["Enter", " ", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      openDatePopup(input);
    }
  });
});
const monthPopup = document.createElement("dialog");
monthPopup.className = "date-popup";
monthPopup.setAttribute("aria-label", "年月を選択");
monthPopup.innerHTML =
  '<div class="date-popup-header"><button type="button" id="year-prev" aria-label="前年">〈</button><div class="picker-period"><select id="picker-year" aria-label="表示する年"></select></div><button type="button" id="year-next" aria-label="翌年">〉</button></div><div id="month-options" class="month-options"></div><div class="actions"><button type="button" id="month-close">閉じる</button></div>';
document.body.append(monthPopup);
let choosingYear = 2026;
function renderMonthPopup() {
  const maximum = reservationMaximumDate();
  document.querySelector("#year-next").disabled = choosingYear >= Number(maximum.slice(0, 4));
  document.querySelector("#year-prev").disabled = choosingYear <= 2026;
  const yearSelect = document.querySelector("#picker-year");
  yearSelect.replaceChildren();
  for (let value = 2026; value <= Number(maximum.slice(0, 4)); value++) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value + "年";
    yearSelect.append(option);
  }
  yearSelect.value = choosingYear;
  const grid = document.querySelector("#month-options");
  grid.replaceChildren();
  for (let m = 0; m < 12; m++) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "month-option" + (choosingYear === year && m === month ? " chosen" : "");
    button.textContent = m + 1 + "月";
    button.setAttribute("aria-pressed", String(choosingYear === year && m === month));
    button.disabled = `${choosingYear}-${String(m + 1).padStart(2, "0")}` > maximum.slice(0, 7);
    button.onclick = () => {
      year = choosingYear;
      month = m;
      selected = null;
      render();
      monthPopup.close();
    };
    grid.append(button);
  }
}
document.querySelector("#month-title").onclick = () => {
  choosingYear = year;
  renderMonthPopup();
  monthPopup.showModal();
};
document.querySelector("#year-prev").onclick = () => {
  if (choosingYear <= 2026) return;
  choosingYear--;
  renderMonthPopup();
};
document.querySelector("#year-next").onclick = () => {
  if (choosingYear >= Number(reservationMaximumDate().slice(0, 4))) return;
  choosingYear++;
  renderMonthPopup();
};
document.querySelector("#month-close").onclick = () => monthPopup.close();

document.querySelector("#picker-year-select").onchange = (event) => {
  pickerYear = Number(event.target.value);
  renderDatePopup();
};
document.querySelector("#picker-month-select").onchange = (event) => {
  pickerMonth = Number(event.target.value);
  renderDatePopup();
};

document.querySelector("#picker-year").onchange = (event) => {
  choosingYear = Number(event.target.value);
  renderMonthPopup();
};
