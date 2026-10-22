const bookingDialog = document.createElement("dialog");
bookingDialog.className = "booking-dialog booking-page booking-popup";
bookingDialog.id = "booking-page";
bookingDialog.setAttribute("aria-label", "予約");
bookingDialog.innerHTML = `<div class="booking-header"><button type="button" id="booking-back" aria-label="戻る"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m15 4-8 8 8 8"/></svg></button><h2 id="booking-heading"></h2><div><button type="button" id="booking-menu" aria-label="予定のメニュー">⋮</button><button type="button" id="booking-close" aria-label="閉じる">×</button></div></div><div id="booking-menu-panel" hidden><button type="button" id="booking-delete"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>削除</button></div><div class="booking-equipment"><img id="booking-image" alt=""><div><strong id="booking-equipment-name"></strong><p id="booking-equipment-info"></p></div></div><div id="booking-read"></div><form id="booking-form"><label>タイトル<input id="booking-title" required maxlength="80" placeholder="タイトルを入力してください"></label><label>日時<input id="booking-date" type="date" required readonly aria-haspopup="dialog"></label><div class="booking-times"><label>開始<select id="booking-from"></select></label><span>〜</span><label>終了<select id="booking-to"></select></label></div><div class="booking-repeat-section"><div class="booking-section-label">繰り返し</div><fieldset class="booking-repeat"><label class="repeat-toggle"><input id="booking-repeat" type="checkbox">繰り返して予約する</label><div id="repeat-fields" hidden><label>繰り返し間隔<select id="repeat-interval"><option value="1">毎週</option><option value="monthly">毎月</option></select></label><div class="repeat-weekdays" id="repeat-weekdays"></div><p id="repeat-monthly-hint" hidden style="font-size:12px;color:#61778f;line-height:1.6"></p><label>繰り返し終了<select id="repeat-mode"><option value="count">回数で指定</option><option value="date">終了日を指定</option></select></label><label id="repeat-count-label">回数<input id="repeat-count" type="number" min="2" max="52" value="6"></label><label id="repeat-end-label" hidden>終了日<input id="repeat-end" type="date" readonly aria-haspopup="dialog"></label></div></fieldset></div><label>備考<textarea id="booking-notes" rows="3" placeholder="備考を入力してください"></textarea></label><p id="booking-error" role="alert"></p><button class="booking-primary" id="booking-submit" type="submit">予約内容を確認する</button></form><div id="booking-confirm" hidden></div>`;
document.body.append(bookingDialog);
const bookingBody = document.createElement("div");
bookingBody.className = "booking-scroll-body";
for (const child of [...bookingDialog.children]) {
  if (!child.matches(".booking-header, #booking-menu-panel")) bookingBody.append(child);
}
bookingDialog.append(bookingBody);
const deleteDialog = document.createElement("dialog");
deleteDialog.className = "booking-delete-dialog";
deleteDialog.innerHTML =
  '<h2>この予約を削除しますか？</h2><p>この操作は取り消せません。</p><button id="delete-confirm" class="booking-danger">予約を削除する</button><button id="delete-cancel" class="booking-secondary">キャンセル</button>';
document.body.append(deleteDialog);
const successDialog = document.createElement("dialog");
let successReturnDay = null;
successDialog.className = "booking-success";
successDialog.innerHTML =
  '<div class="success-mark">✓</div><h2>予約が完了しました</h2><p id="booking-success-text"></p><button class="booking-primary" id="booking-success-ok">OK</button>';
document.body.append(successDialog);
let activeBooking = null,
  bookingNew = false,
  bookingDraft = null;
let bookingSerial = 0;
const B = (id) => document.getElementById(id);
const deleteScopeLabel = document.createElement("fieldset");
deleteScopeLabel.className = "booking-scope";
deleteScopeLabel.id = "booking-delete-scope";
deleteScopeLabel.innerHTML = `<legend>削除対象</legend>
  <label><input type="radio" name="delete-scope" value="this" checked>この予定</label>
  <label><input type="radio" name="delete-scope" value="all">現在時刻以降の繰り返し予約すべて</label>`;
B("delete-confirm").before(deleteScopeLabel);
const deleteActions = document.createElement("div");
deleteActions.className = "booking-delete-actions";
deleteDialog.append(deleteActions);
deleteActions.append(B("delete-confirm"), B("delete-cancel"));
function bookingScope(id) {
  return B(id).querySelector("input:checked").value;
}
function editsWholeSeries() {
  return !bookingNew && !!activeBooking?.repeat;
}
function canChangeBooking(entry) {
  const today = reservationToday();
  return entry.date > today || (entry.date === today && entry.from >= reservationCurrentMinute());
}
function matchesBookingScope(entry, booking, all) {
  return all
    ? sameSeries(entry, booking) && canChangeBooking(entry)
    : entry === booking ||
        (!!booking.seriesId &&
          entry.seriesId === booking.seriesId &&
          entry.date === booking.date &&
          entry.from === booking.from &&
          entry.to === booking.to);
}
const allDayLabel = document.createElement("label");
allDayLabel.className = "booking-all-day";
allDayLabel.innerHTML = '<input type="checkbox" id="booking-all-day">終日（受付時間全体）';
const allDayHint = document.createElement("p");
allDayHint.className = "booking-all-day-hint";
allDayHint.textContent = "※ 当日は残りの受付時間、翌日以降は受付時間全体を予約します。";
B("booking-from").closest(".booking-times").append(allDayLabel, allDayHint);
function bookingHours(e, date) {
  return {
    opening: e.openMinute ?? scheduleStart,
    closing: Math.min(e.closeMinute ?? scheduleEnd, reservationClosingMinute(date)),
  };
}
function allDayBookingRange(b, date) {
  const e = equipmentFor(b.equipment);
  const { opening, closing } = bookingHours(e, date);
  const now = date === reservationToday() ? reservationCurrentMinute() : opening;
  const from = opening + Math.max(0, Math.ceil((now - opening) / e.unit)) * e.unit;
  const to = opening + Math.floor((closing - opening) / e.unit) * e.unit;
  return { from, to };
}
const monthlyWeekdayOption = document.createElement("option");
monthlyWeekdayOption.value = "monthly-weekday";
B("repeat-interval").append(monthlyWeekdayOption);
function monthlyWeekdayLabel(date) {
  const day = new Date(date + "T00:00:00");
  return `毎月 第${Math.ceil(day.getDate() / 7)} ${weekdays[day.getDay()]}曜日`;
}
function equipmentFor(name) {
  for (const [category, items] of Object.entries(scheduleEquipment)) {
    const e = items.find((e) => e.name === name);
    if (e) return { ...e, category };
  }
  return {
    name,
    unit: 30,
    info: "設備予約",
    category: name.includes("会議室")
      ? "会議室"
      : name.includes("面談室")
        ? "面談室"
        : name.includes("プロジェクター")
          ? "プロジェクター"
          : "モニター",
  };
}
function minute(value) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}
function bookingFromRow(r, own) {
  if (r.booking) return r.booking;
  const b = {
    equipment: r.name,
    date: r.date,
    from: minute(r.from),
    to: minute(r.to),
    title: r.title || "設備予約",
    own,
    person: r.person || "自分",
    notes: r.notes || "",
    category: equipmentFor(r.name).category,
    row: r,
  };
  r.booking = b;
  return b;
}
function repeatDescription(b) {
  if (!b.repeat) return "なし";
  if (b.repeat.frequency === "monthly-weekday")
    return (
      monthlyWeekdayLabel(b.date) +
      "　" +
      (b.repeat.mode === "date" ? dateText(b.repeat.end) + "まで" : "全" + b.repeat.count + "回")
    );
  if (b.repeat.frequency === "monthly")
    return (
      "毎月 " +
      new Date(b.date + "T00:00:00").getDate() +
      "日　" +
      (b.repeat.mode === "date" ? dateText(b.repeat.end) + "まで" : "全" + b.repeat.count + "回")
    );
  const names = ["月", "火", "水", "木", "金", "土", "日"];
  return (
    (b.repeat.interval === 1 ? "毎週" : "隔週") +
    " " +
    b.repeat.days.map((d) => names[d]).join("・") +
    "曜日　" +
    (b.repeat.mode === "date" ? dateText(b.repeat.end) + "まで" : "全" + b.repeat.count + "回")
  );
}
function appendDetail(container, label, value) {
  const row = document.createElement("div");
  row.className = "booking-detail-row";
  const term = document.createElement("strong");
  term.textContent = label;
  const desc = document.createElement("span");
  desc.textContent = value;
  row.append(term, desc);
  container.append(row);
}
function fillDetail(container, b, confirmation = false) {
  container.replaceChildren();
  appendDetail(container, "タイトル", b.title);
  appendDetail(
    container,
    confirmation && b.repeat ? "初回の日時" : "日時",
    dateText(b.date) + "\n" + scheduleTime(b.from) + " 〜 " + scheduleTime(b.to),
  );
  if (!confirmation) {
    appendDetail(container, "予約者名", b.person || (b.own ? "自分" : "佐藤 太郎"));
    appendDetail(container, "所属", b.department || (b.own ? "企画部" : "総務部"));
  }
  appendDetail(container, "繰り返し", repeatDescription(b));
  if (b.allDay)
    appendDetail(container, "終日", "当日は残りの受付時間、翌日以降は受付時間全体を予約します。");
  appendDetail(container, "備考", b.notes || "―");
}
function openBooking(b, isNew = false) {
  const past =
    b.date < reservationToday() ||
    (b.date === reservationToday() && b.from < reservationCurrentMinute());
  if (isNew && past) {
    toast("過去の日付では予約できません。");
    return;
  }
  activeBooking = b;
  bookingNew = isNew;
  bookingDraft = null;
  const e = equipmentFor(b.equipment);
  B("booking-heading").textContent = isNew ? "新規予約" : "予約詳細";
  B("booking-equipment-name").textContent = b.equipment;
  B("booking-equipment-info").textContent = e.info + " ／ 予約単位：" + e.unit + "分";
  B("booking-image").src = artwork(b.equipment);
  B("booking-image").alt = b.equipment;
  B("booking-menu").hidden = isNew || !b.own || past;
  B("booking-menu-panel").hidden = true;
  B("booking-confirm").hidden = true;
  B("booking-error").textContent = "";
  B("booking-form").hidden = !isNew;
  B("booking-read").hidden = isNew;
  if (isNew || (b.own && !past)) fillBookingForm(b);
  else fillDetail(B("booking-read"), b);
  showBookingPage();
}
function fillBookingForm(b) {
  B("booking-repeat").closest(".booking-repeat-section").hidden =
    !bookingNew && !!b.repeat && !editsWholeSeries();
  if (b.repeat && b.seriesId && editsWholeSeries()) {
    const editable = scheduleBookings
      .filter((entry) => entry.seriesId === b.seriesId && canChangeBooking(entry))
      .sort((a, b) => a.date.localeCompare(b.date));
    b = { ...(editable[0] || b), repeat: { ...b.repeat, count: editable.length || 1 } };
  }
  const e = equipmentFor(b.equipment);
  B("booking-heading").textContent = bookingNew ? "新規予約" : "予定の編集";
  B("booking-read").hidden = true;
  B("booking-form").hidden = false;
  B("booking-confirm").hidden = true;
  B("booking-title").value = bookingNew ? "" : b.title;
  B("booking-date").value = b.date;
  B("booking-notes").value = b.notes || "";
  B("booking-all-day").checked = !!b.allDay;
  for (const id of ["booking-from", "booking-to"]) {
    const select = B(id);
    select.dataset.unit = e.unit;
    select.replaceChildren();
    for (let t = scheduleStart; t <= scheduleEnd; t += e.unit) {
      if (id === "booking-from" && t === scheduleEnd) continue;
      const option = document.createElement("option");
      option.value = t;
      option.textContent = scheduleTime(t);
      select.append(option);
    }
    select.value = id === "booking-from" ? b.from : b.to;
  }
  B("booking-repeat").checked = !!b.repeat;
  B("repeat-fields").hidden = !b.repeat;
  B("repeat-interval").value = b.repeat?.frequency?.startsWith("monthly")
    ? b.repeat.frequency
    : "1";
  B("repeat-mode").value = b.repeat?.mode || "count";
  B("repeat-count").value = b.repeat?.count || 6;
  B("repeat-count").min = editsWholeSeries() ? "1" : "2";
  const end = new Date(b.date + "T00:00:00");
  end.setDate(end.getDate() + 35);
  B("repeat-end").value = b.repeat?.end || key(end);
  const day = (new Date(b.date + "T00:00:00").getDay() + 6) % 7;
  B("repeat-weekdays").replaceChildren();
  ["月", "火", "水", "木", "金", "土", "日"].forEach((name, i) => {
    const label = document.createElement("label");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.value = i;
    check.checked = b.repeat ? b.repeat.days.includes(i) : day === i;
    label.append(check, document.createTextNode(name));
    B("repeat-weekdays").append(label);
  });
  repeatMode();
  repeatFrequency();
  B("booking-submit").textContent = bookingNew ? "予約内容を確認する" : "変更内容を確認する";
  updateBookingTimeAvailability();
}
function updateBookingTimeAvailability() {
  const date = B("booking-date").value;
  const now = reservationCurrentMinute();
  const isPast = (value) =>
    date < reservationToday() || (date === reservationToday() && value < now);
  const from = B("booking-from");
  const to = B("booking-to");
  const { opening, closing } = bookingHours(equipmentFor(activeBooking.equipment), date);
  const unit = Number(from.dataset.unit);
  if (!unit) return;
  const allDay = B("booking-all-day").checked;
  from.disabled = allDay;
  to.disabled = allDay;
  const range = allDay ? allDayBookingRange(activeBooking, date) : null;
  for (const select of [from, to]) {
    const previous = select.value;
    select.replaceChildren();
    for (let value = opening; value <= closing; value += unit) {
      if (isPast(value)) continue;
      if (select === from && value + unit > closing) continue;
      if (select === to && (!from.value || value <= Number(from.value))) continue;
      if (allDay && (range.to <= range.from || value !== (select === from ? range.from : range.to)))
        continue;
      const option = document.createElement("option");
      option.value = value;
      option.textContent = scheduleTime(value);
      select.append(option);
    }
    if ([...select.options].some((option) => option.value === previous)) select.value = previous;
  }
  B("booking-submit").disabled = !from.value || !to.value;
  if (B("booking-submit").disabled) {
    B("booking-error").textContent =
      "この日には予約できる時間がありません。別の日付を選択してください。";
  } else if (B("booking-error").textContent.startsWith("この日には予約できる時間")) {
    B("booking-error").textContent = "";
  }
}
B("booking-all-day").addEventListener("change", updateBookingTimeAvailability);
B("booking-date").addEventListener("change", updateBookingTimeAvailability);
B("booking-from").addEventListener("change", updateBookingTimeAvailability);
for (const id of ["booking-from", "booking-to"])
  B(id).addEventListener("focus", updateBookingTimeAvailability);
function repeatMode() {
  B("repeat-count-label").hidden = B("repeat-mode").value !== "count";
  B("repeat-end-label").hidden = B("repeat-mode").value !== "date";
}
function occurrenceDates(b) {
  if (!b.repeat) return [b.date];
  if (b.repeat.frequency.startsWith("monthly")) {
    const start = new Date(b.date + "T00:00:00"),
      dates = [];
    for (let i = 0; i < 120; i++) {
      let d;
      if (b.repeat.frequency === "monthly-weekday") {
        const first = new Date(start.getFullYear(), start.getMonth() + i, 1);
        const offset = (start.getDay() - first.getDay() + 7) % 7;
        d = new Date(
          first.getFullYear(),
          first.getMonth(),
          1 + offset + Math.floor((start.getDate() - 1) / 7) * 7,
        );
        if (d.getMonth() !== first.getMonth()) continue;
      } else {
        d = new Date(start.getFullYear(), start.getMonth() + i, start.getDate());
        if (d.getDate() !== start.getDate()) continue;
      }
      const value = key(d);
      if (b.repeat.mode === "date" && value > b.repeat.end) break;
      dates.push(value);
      if (b.repeat.mode === "count" && dates.length >= b.repeat.count) break;
    }
    if (!dates.length) throw Error("繰り返し条件に一致する日付がありません。");
    return dates;
  }
  const dates = [],
    start = new Date(b.date + "T00:00:00"),
    week = monday(b.date),
    base = new Date(week + "T00:00:00");
  const until = b.repeat.mode === "date" ? b.repeat.end : null;
  for (let i = 0; i < 366; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const value = key(d);
    if (until && value > until) break;
    const weekIndex = Math.floor(Math.round((d - base) / 86400000) / 7);
    if (weekIndex % b.repeat.interval === 0 && b.repeat.days.includes((d.getDay() + 6) % 7))
      dates.push(value);
    if (!until && dates.length >= b.repeat.count) break;
  }
  if (!dates.length) throw Error("繰り返し条件に一致する日付がありません。");
  if (!until && dates.length < b.repeat.count) throw Error("繰り返し期間は1年以内にしてください。");
  return dates;
}
function sameSeries(a, b) {
  return a === b || (a.seriesId && a.seriesId === b.seriesId);
}
function validateDraft(b, dates) {
  if (b.allDay) {
    for (const date of dates) {
      const range = allDayBookingRange(b, date);
      if (range.to <= range.from)
        throw Error(dateText(date) + "には終日予約できる時間がありません。");
      validateDraft({ ...b, ...range, date, allDay: false }, [date]);
    }
    return;
  }
  const e = equipmentFor(b.equipment);
  if (!b.title.trim()) throw Error("タイトルを入力してください。");
  if (!b.date || !Number.isFinite(b.from) || !Number.isFinite(b.to) || b.to <= b.from)
    throw Error("開始・終了時刻を確認してください。");
  if ((b.from - bookingHours(e, b.date).opening) % e.unit || (b.to - b.from) % e.unit)
    throw Error("この設備は" + e.unit + "分単位で予約してください。");
  for (const date of dates) {
    if (date === reservationToday() && b.from < reservationCurrentMinute())
      throw Error("過去の時刻では予約できません。現在時刻以降の開始時刻を選択してください。");
    if (date > reservationMaximumDate())
      throw Error(
        `予約できるのは${dateText(reservationMaximumDate())}までです。繰り返しの終了条件も確認してください。`,
      );
    if (date < reservationToday())
      throw Error("過去の日付では予約できません。今日以降を選択してください。");
    if (scheduleEquipment[b.category]?.some((e) => e.name === b.equipment)) {
      const { opening, closing } = bookingHours(e, date);
      if (b.from < opening || b.to > closing)
        throw Error(
          `${dateText(date)}の予約受付は${scheduleTime(opening)}〜${scheduleTime(closing)}です。`,
        );
      seedSchedule(b.category, date);
    }
    const conflicts = scheduleBookings.some(
      (x) =>
        x.equipment === b.equipment &&
        x.date === date &&
        x.from < b.to &&
        x.to > b.from &&
        (bookingNew || !matchesBookingScope(x, activeBooking, editsWholeSeries())),
    );
    const rowConflicts = mine
      .concat(reservations)
      .some(
        (x) =>
          x.name === b.equipment &&
          x.date === date &&
          minute(x.from) < b.to &&
          minute(x.to) > b.from &&
          x !== activeBooking.row &&
          (!x.booking || !matchesBookingScope(x.booking, activeBooking, editsWholeSeries())),
      );
    const blocked = scheduleBlocked.some(
      (x) => x.equipment === b.equipment && x.date === date && x.from < b.to && x.to > b.from,
    );
    if (conflicts || rowConflicts || blocked)
      throw Error(dateText(date) + "の時間帯は予約できません。");
  }
}
B("booking-form").onsubmit = (event) => {
  event.preventDefault();
  try {
    const b = {
      ...activeBooking,
      title: B("booking-title").value.trim(),
      date: B("booking-date").value,
      from: Number(B("booking-from").value),
      to: Number(B("booking-to").value),
      notes: B("booking-notes").value,
      allDay: B("booking-all-day").checked,
      own: true,
      person: "自分",
    };
    b.repeat = B("booking-repeat").checked
      ? {
          frequency: B("repeat-interval").value.startsWith("monthly")
            ? B("repeat-interval").value
            : "weekly",
          interval: 1,
          days: [...B("repeat-weekdays").querySelectorAll("input:checked")].map((e) =>
            Number(e.value),
          ),
          mode: B("repeat-mode").value,
          count: Number(B("repeat-count").value),
          end: B("repeat-end").value,
        }
      : null;
    if (!bookingNew && activeBooking.repeat && !editsWholeSeries()) b.repeat = null;
    if (
      b.repeat &&
      ((!b.repeat.frequency.startsWith("monthly") && !b.repeat.days.length) ||
        (b.repeat.mode === "count" &&
          (!Number.isInteger(b.repeat.count) ||
            b.repeat.count < (editsWholeSeries() ? 1 : 2) ||
            b.repeat.count > 52)) ||
        (b.repeat.mode === "date" && (!b.repeat.end || b.repeat.end < b.date)))
    )
      throw Error("繰り返しの曜日・終了条件を確認してください。");
    const dates = occurrenceDates(b);
    validateDraft(b, dates);
    bookingDraft = { b, dates };
    B("booking-form").hidden = true;
    B("booking-heading").textContent = "予約内容の確認";
    const confirm = B("booking-confirm");
    confirm.hidden = false;
    fillDetail(
      confirm,
      {
        ...b,
        date: dates[0],
        ...(b.allDay ? allDayBookingRange(b, dates[0]) : {}),
      },
      true,
    );
    if (!bookingNew && activeBooking.repeat)
      appendDetail(
        confirm,
        "変更対象",
        editsWholeSeries() ? "現在時刻以降の繰り返し予約すべて" : "この予定",
      );
    B("booking-menu").hidden = true;
    B("booking-menu-panel").hidden = true;
    appendDetail(confirm, "予約件数", dates.length + "件");
    if (b.allDay && b.repeat)
      appendDetail(
        confirm,
        "各日の時間",
        dates
          .map((date) => {
            const range = allDayBookingRange(b, date);
            return `${dateText(date)} ${scheduleTime(range.from)}〜${scheduleTime(range.to)}`;
          })
          .join("\n"),
      );
    const actions = document.createElement("div");
    actions.className = "actions";
    const back = document.createElement("button");
    back.type = "button";
    back.textContent = "修正する";
    back.onclick = returnToBookingForm;
    const save = document.createElement("button");
    save.type = "button";
    save.className = "primary";
    save.textContent = bookingNew ? "この内容で予約する" : "変更を保存する";
    save.onclick = commitBooking;
    actions.append(back, save);
    confirm.append(actions);
    bookingBody.scrollTo(0, 0);
    B("booking-heading").focus({ preventScroll: true });
  } catch (error) {
    showBookingError(error.message);
  }
};
function removeBooking(b, all = true) {
  for (let i = scheduleBookings.length - 1; i >= 0; i--)
    if (matchesBookingScope(scheduleBookings[i], b, all)) scheduleBookings.splice(i, 1);
  for (const list of [mine, reservations])
    for (let i = list.length - 1; i >= 0; i--)
      if (
        (list[i] === b.row && (!all || canChangeBooking(b))) ||
        (list[i].booking && matchesBookingScope(list[i].booking, b, all))
      )
        list.splice(i, 1);
}
function refreshBookings() {
  render();
  search();
  if (!weeklyPage.hidden) renderWeekly();
  else if (!schedulePage.hidden) renderSchedule();
}
function commitBooking() {
  try {
    const { b, dates } = bookingDraft;
    validateDraft(b, dates);
    if (!bookingNew) removeBooking(activeBooking, editsWholeSeries());
    const seriesId = "series-" + Date.now() + "-" + ++bookingSerial;
    dates.forEach((date) => {
      const entry = {
        ...b,
        ...(b.allDay ? allDayBookingRange(b, date) : {}),
        date,
        seriesId,
        row: undefined,
      };
      scheduleBookings.push(entry);
      const row = {
        name: b.equipment,
        date,
        from: scheduleTime(entry.from),
        to: scheduleTime(entry.to),
        title: b.title,
        person: "自分",
        notes: b.notes,
        booking: entry,
      };
      entry.row = row;
      mine.push(row);
      reservations.push(row);
    });
    successReturnDay = returnToDayPopup || dayPopup.open ? selected : null;
    returnToDayPopup = false;
    if (dayPopup.open) dayPopup.close();
    closeBookingPage();
    refreshBookings();
    B("booking-success-text").textContent =
      (bookingNew ? "予約を作成しました。" : "変更を保存しました。") +
      "（全" +
      dates.length +
      "件）";
    successDialog.querySelector("h2").textContent = bookingNew
      ? "予約が完了しました"
      : "変更を保存しました";
    successDialog.showModal();
  } catch (error) {
    B("booking-confirm").hidden = true;
    B("booking-form").hidden = false;
    B("booking-menu").hidden = bookingNew || !activeBooking.own;
    showBookingError(error.message);
  }
}
B("booking-menu").setAttribute("aria-expanded", "false");
B("booking-menu").onclick = () => {
  const open = B("booking-menu-panel").hidden;
  B("booking-menu-panel").hidden = !open;
  B("booking-menu").setAttribute("aria-expanded", String(open));
  if (open) {
    const panel = B("booking-menu-panel");
    const buttonRect = B("booking-menu").getBoundingClientRect();
    const dialogRect = bookingDialog.getBoundingClientRect();
    panel.style.top = `${buttonRect.bottom - dialogRect.top + bookingDialog.scrollTop + 6}px`;
    panel.style.left = `${Math.max(8, buttonRect.right - dialogRect.left - panel.offsetWidth)}px`;
    panel.style.right = "auto";
  }
};
B("booking-delete").onclick = () => {
  if (!activeBooking.own) return;
  B("booking-menu-panel").hidden = true;
  deleteScopeLabel.hidden = !activeBooking.repeat;
  B("booking-delete-scope").querySelector('[value="this"]').checked = true;
  deleteDialog.showModal();
};
B("delete-confirm").onclick = () => {
  if (!activeBooking?.own) return;
  if (!canChangeBooking(activeBooking)) {
    toast("過去の予定は削除できません。");
    return;
  }
  removeBooking(
    activeBooking,
    !!activeBooking.repeat && bookingScope("booking-delete-scope") === "all",
  );
  deleteDialog.close();
  closeBookingPage();
  refreshBookings();
  toast("予約を削除しました");
};
B("delete-cancel").onclick = () => deleteDialog.close();
B("booking-close").onclick = () => closeBookingPage();
B("booking-success-ok").onclick = () => successDialog.close();
successDialog.addEventListener("close", () => {
  if (!successReturnDay) return;
  selected = successReturnDay;
  successReturnDay = null;
  render();
  showDayReservations();
});
B("booking-repeat").onchange = () => (B("repeat-fields").hidden = !B("booking-repeat").checked);
B("repeat-mode").onchange = repeatMode;
for (const id of ["booking-date", "repeat-end"]) {
  B(id).max = reservationMaximumDate();
  const input = B(id);
  input.classList.add("popup-date-input");
  input.onclick = (event) => {
    event.preventDefault();
    openDatePopup(input);
  };
  input.onkeydown = (event) => {
    if (["Enter", " ", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      openDatePopup(input);
    }
  };
}
const originalRow = row;
row = function (r, searching) {
  const button = originalRow(r, searching);
  button.onclick = () => openBooking(bookingFromRow(r, !searching || r.person === "自分"));
  return button;
};
render();
search();

function showBookingError(message) {
  const error = B("booking-error");
  error.textContent = message;
  error.setAttribute("tabindex", "-1");
  error.scrollIntoView({ block: "nearest" });
  error.focus({ preventScroll: true });
}

bookingDialog.addEventListener("click", (event) => {
  if (!event.target.closest("#booking-menu") && !event.target.closest("#booking-menu-panel")) {
    B("booking-menu-panel").hidden = true;
    B("booking-menu").setAttribute("aria-expanded", "false");
  }
});

function repeatFrequency() {
  const date = B("booking-date").value;
  monthlyWeekdayOption.textContent = date ? monthlyWeekdayLabel(date) : "毎月 第○曜日";
  const monthly = B("repeat-interval").value.startsWith("monthly");
  B("repeat-weekdays").hidden = monthly;
  B("repeat-monthly-hint").hidden = !monthly;
  B("repeat-monthly-hint").textContent =
    B("repeat-interval").value === "monthly-weekday"
      ? "初回と同じ第何週・曜日で予約します。該当する曜日がない月はスキップします。"
      : "毎月、初回と同じ日付で予約します。その日付がない月はスキップします。";
}
B("repeat-interval").onchange = repeatFrequency;
B("booking-date").addEventListener("change", repeatFrequency);

function showBookingPage() {
  if (!bookingDialog.open) bookingDialog.showModal();
  bookingBody.scrollTop = 0;
  B("booking-heading").setAttribute("tabindex", "-1");
  B("booking-heading").focus({ preventScroll: true });
}
function closeBookingPage() {
  if (bookingDialog.open) bookingDialog.close();
}
bookingDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeBookingPage();
});
bookingDialog.addEventListener("click", (event) => {
  if (event.target !== bookingDialog) return;
  const rect = bookingDialog.getBoundingClientRect();
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    closeBookingPage();
});
function returnToBookingForm() {
  B("booking-confirm").hidden = true;
  B("booking-form").hidden = false;
  B("booking-menu").hidden = bookingNew || !activeBooking.own;
  B("booking-heading").textContent = bookingNew ? "新規予約" : "予定の編集";
  bookingBody.scrollTo(0, 0);
}
B("booking-back").onclick = () => {
  if (!B("booking-confirm").hidden) returnToBookingForm();
  else closeBookingPage();
};
