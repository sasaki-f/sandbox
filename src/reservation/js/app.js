const $ = (s) => document.querySelector(s);
const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
let year = 2026,
  month = 9,
  selected = null;
let reservationSearchPage = 1;
const reservationPageSize = 50;
const reservations = [
  {
    name: "プロジェクター",
    title: "研修資料の投影",
    date: "2026-10-15",
    from: "09:00",
    to: "10:30",
    person: "佐藤 太郎",
  },
  {
    name: "会議室A",
    title: "定例会議",
    date: "2026-10-16",
    from: "10:00",
    to: "11:30",
    person: "田中 一郎",
  },
  {
    name: "会議室B",
    title: "営業打ち合わせ",
    date: "2026-10-19",
    from: "13:00",
    to: "14:00",
    person: "山田 花子",
  },
  {
    name: "面談室",
    title: "採用面談",
    date: "2026-10-22",
    from: "14:00",
    to: "15:00",
    person: "鈴木 健一",
  },
  {
    name: "モニター",
    title: "資料レビュー",
    date: "2026-10-27",
    from: "09:00",
    to: "10:00",
    person: "高橋 美咲",
  },
];
const mine = [
  { name: "会議室A", date: "2026-10-05", from: "10:00", to: "11:00" },
  { name: "プロジェクター", date: "2026-10-08", from: "09:00", to: "10:00" },
  { name: "面談室", date: "2026-10-14", from: "13:00", to: "14:00" },
  { name: "会議室A", date: "2026-10-15", from: "10:00", to: "11:00" },
  { name: "モニター", date: "2026-10-15", from: "14:00", to: "15:30" },
  { name: "会議室B", date: "2026-10-19", from: "10:00", to: "11:00" },
  { name: "会議室A", date: "2026-10-22", from: "10:00", to: "11:00" },
  { name: "モニター", date: "2026-10-22", from: "14:00", to: "15:00" },
  { name: "面談室", date: "2026-10-27", from: "10:00", to: "11:00" },
];
function artwork(name) {
  const room =
    name.includes("室") ||
    (typeof scheduleEquipment !== "undefined" &&
      Object.entries(scheduleEquipment).some(
        ([category, equipment]) =>
          (category === "会議室" || category === "面談室") &&
          equipment.some((item) => item.name === name),
      ));
  const svg = room
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 120"><defs><linearGradient id="a" x2="0" y2="1"><stop stop-color="#f6d59c"/><stop offset="1" stop-color="#a96f39"/></linearGradient></defs><rect width="180" height="120" fill="url(#a)"/><path d="M0 0h180l-30 30H25Z" fill="#e4bb85"/><path d="M0 0 25 30v60L0 120" fill="#bd8d59"/><path d="M0 120 25 90h125l30 30" fill="#8b643f"/><rect x="7" y="30" width="15" height="46" fill="#f8ebd1"/><path d="m40 73 72-8 38 24-74 14Z" fill="#d4a66b"/><path d="M76 103v17m62-29v29M44 76v28" stroke="#42372c" stroke-width="5"/><g fill="#2d2a28"><rect x="53" y="49" width="13" height="24" rx="3"/><rect x="78" y="45" width="13" height="23" rx="3"/><rect x="104" y="45" width="13" height="25" rx="3"/><rect x="131" y="55" width="13" height="27" rx="3"/><rect x="35" y="86" width="16" height="25" rx="3"/><rect x="91" y="93" width="18" height="27" rx="3"/></g><path d="M40 13h35m30 0h35" stroke="#fff5d5" stroke-width="5"/></svg>`
    : name.includes("モニター") ||
        (typeof scheduleEquipment !== "undefined" &&
          scheduleEquipment["モニター"].some((item) => item.name === name))
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 120"><rect width="180" height="120" fill="#eeeae4"/><path d="M0 105h180" stroke="#dbd2c8" stroke-width="30"/><path d="M85 83v18m-25 5h58" stroke="#393939" stroke-width="7"/><rect x="26" y="10" width="130" height="77" rx="3" fill="#252525"/><rect x="31" y="15" width="120" height="65" fill="#101519"/><path d="m33 17 115 60" stroke="#ffffff" opacity=".04" stroke-width="30"/></svg>`
      : typeof scheduleEquipment !== "undefined" &&
          scheduleEquipment["車両"].some((item) => item.name === name)
        ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 120"><defs><linearGradient id="car-bg" x2="0" y2="1"><stop stop-color="#eaf2f8"/><stop offset="1" stop-color="#d9e1e7"/></linearGradient><linearGradient id="car-body" x2="0" y2="1"><stop stop-color="#f8fafc"/><stop offset="1" stop-color="#a8b9ca"/></linearGradient></defs><rect width="180" height="120" fill="url(#car-bg)"/><path d="M0 88h180v32H0Z" fill="#c4cdd5"/><ellipse cx="93" cy="94" rx="68" ry="8" fill="#8f9ba5" opacity=".35"/><path d="m27 68 16-6 19-25h48l25 25 17 7 4 20H23Z" fill="url(#car-body)" stroke="#8598aa" stroke-width="2"/><path d="m51 61 15-19h18v19Zm39-19h17l19 19H90Z" fill="#38586e"/><path d="M91 67v17M52 66v18" stroke="#96a8b8"/><path d="M61 70h11m29 0h11" stroke="#677e92" stroke-width="2"/><circle cx="51" cy="88" r="13" fill="#283440"/><circle cx="51" cy="88" r="7" fill="#b8c6d2"/><circle cx="128" cy="88" r="13" fill="#283440"/><circle cx="128" cy="88" r="7" fill="#b8c6d2"/><path d="M27 73h10m106 0h9" stroke="#fff8d9" stroke-width="5"/><path d="M77 83h28" stroke="#879bac" stroke-width="3"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 120"><defs><linearGradient id="p" x2="0" y2="1"><stop stop-color="#e7e3de"/><stop offset="1" stop-color="#a9a29a"/></linearGradient></defs><rect width="180" height="120" fill="url(#p)"/><ellipse cx="91" cy="91" rx="64" ry="12" fill="#5c554f" opacity=".3"/><path d="m27 44 38-19 91 14-21 18Z" fill="#e8e6e1"/><path d="m27 44 108 13v34L30 76Z" fill="#bab9b5"/><path d="m135 57 21-18v36l-21 16Z" fill="#777774"/><circle cx="111" cy="72" r="18" fill="#24282b"/><circle cx="111" cy="72" r="12" fill="#244053"/><circle cx="111" cy="72" r="7" fill="#14212e"/><circle cx="107" cy="68" r="3" fill="#8eb7ca"/><path d="M37 55v15m5-14v15m5-14v15m5-14v15" stroke="#777" stroke-width="2"/></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
function key(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dateText(s) {
  const d = new Date(s + "T00:00:00");
  return `${s.replaceAll("-", "/")}（${weekdays[d.getDay()]}）`;
}
function row(r, search) {
  const b = document.createElement("button");
  b.className = "row";
  const img = document.createElement("img");
  img.className = "thumb";
  img.src = artwork(r.name);
  img.alt = r.name;
  const info = document.createElement("span");
  info.className = "row-info";
  const name = document.createElement("span");
  name.className = "row-name";
  name.textContent = search ? r.title || r.booking?.title || "設備予約" : r.name;
  if (search) {
    const equipment = document.createElement("span");
    equipment.className = "row-equipment";
    equipment.textContent = r.name;
    info.append(equipment);
  }
  const time = document.createElement("span");
  time.className = "row-time";
  time.textContent = (search ? dateText(r.date) + " " : "") + r.from + " 〜 " + r.to;
  info.append(name, time);
  if (search) info.prepend(name);
  if (search) {
    const p = document.createElement("span");
    p.className = "row-person";
    p.textContent = r.person;
    info.append(p);
  }
  const arrow = document.createElement("span");
  arrow.className = "chevron";
  arrow.textContent = "›";
  b.append(img, info, arrow);
  b.onclick = () => {
    $("#detail-title").textContent = r.name;
    $("#detail-image").src = artwork(r.name);
    $("#detail-image").alt = r.name;
    $("#detail-text").textContent =
      dateText(r.date) + " " + r.from + " 〜 " + r.to + "　予約者：" + (r.person || "自分");
    $("#detail").showModal();
  };
  return b;
}
function render() {
  $("#day-panel").hidden = !selected;
  $(".day-list").hidden = !selected;
  $("#new").hidden = !selected;
  $("#month-label").textContent = `${year}/${String(month + 1).padStart(2, "0")}`;
  const first = new Date(year, month, 1),
    last = new Date(year, month + 1, 0);
  const offset = (first.getDay() + 6) % 7;
  const total = Math.ceil((offset + last.getDate()) / 7) * 7;
  $("#calendar").replaceChildren();
  for (let i = 0; i < total; i++) {
    const d = new Date(year, month, i - offset + 1),
      s = key(d),
      items = mine.filter((r) => r.date === s);
    const b = document.createElement("button");
    b.className =
      "day" +
      (d.getMonth() !== month
        ? " outside"
        : d.getDay() === 0
          ? " sun"
          : d.getDay() === 6
            ? " sat"
            : "") +
      (s === selected ? " selected" : "");
    b.setAttribute("aria-label", dateText(s) + ` ${items.length}件の予約`);
    b.setAttribute("aria-pressed", String(s === selected));
    const n = document.createElement("span");
    n.textContent = d.getDate();
    b.append(n);
    if (items.length) {
      const event = document.createElement("span");
      event.className = "event";
      event.textContent = items[0].name;
      b.append(event);
      if (items.length > 1) {
        const more = document.createElement("span");
        more.className = "event";
        more.textContent = s === selected ? items[1].name : `他${items.length - 1}件`;
        b.append(more);
      }
    }
    b.onclick = () => {
      selected = s;
      if (d.getMonth() !== month) {
        year = d.getFullYear();
        month = d.getMonth();
      }
      render();
      showDayReservations();
    };
    $("#calendar").append(b);
  }
  if (!selected) return;
  const d = new Date(selected + "T00:00:00");
  $("#day-title").textContent =
    `${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）の予約`;
  const items = mine.filter((r) => r.date === selected);
  $("#day-count").textContent = items.length + "件";
  $("#day-rows").replaceChildren(...items.map((r) => row(r, false)));
  if (!items.length) $("#day-rows").innerHTML = '<p class="empty">この日の予約はありません</p>';
}
function search(event) {
  if (event?.type === "input") reservationSearchPage = 1;
  const normalize = (value) =>
    String(value || "")
      .normalize("NFKC")
      .toLowerCase();
  const kw = normalize($("#keyword").value.trim()),
    author = normalize($("#search-author").value).replace(/\s/g, ""),
    start = $("#start").value,
    end = $("#end").value;
  const items = reservations.filter(
    (r) =>
      (!start || r.date >= start) &&
      (!end || r.date <= end) &&
      normalize(r.title || r.booking?.title || "設備予約").includes(kw) &&
      normalize(r.person).replace(/\s/g, "").includes(author),
  );
  $("#result-count").textContent = items.length + "件";
  const pageCount = Math.max(1, Math.ceil(items.length / reservationPageSize));
  reservationSearchPage = Math.min(reservationSearchPage, pageCount);
  const pageStart = (reservationSearchPage - 1) * reservationPageSize;
  $("#result-rows").replaceChildren(
    ...items.slice(pageStart, pageStart + reservationPageSize).map((r) => row(r, true)),
  );
  renderReservationPagination(items.length, pageCount);
  if (!items.length)
    $("#result-rows").innerHTML = '<p class="empty">条件に一致する予約はありません</p>';
}
function tab(searching) {
  if (!searching) render();
  $("#categories").hidden = true;
  $(".tabs").hidden = false;
  $("h1").textContent = "予約";
  $("#mine").hidden = searching;
  $("#search").hidden = !searching;
  for (const [id, on] of [
    ["mine-tab", !searching],
    ["search-tab", searching],
  ]) {
    $("#" + id).classList.toggle("active", on);
    $("#" + id).setAttribute("aria-selected", String(on));
  }
}
$("#mine-tab").onclick = () => tab(false);
$("#search-tab").onclick = () => tab(true);
$("#prev").onclick = () => move(-1);
$("#next").onclick = () => move(1);
function move(n) {
  const d = new Date(year, month + n, 1);
  year = d.getFullYear();
  month = d.getMonth();
  selected = null;
  render();
}
$("#toggle").onclick = () => {
  const closed = !$("#fields").hidden;
  $("#fields").hidden = closed;
  $("#toggle").setAttribute("aria-expanded", String(!closed));
  $("#toggle-label").textContent = closed ? "検索条件を開く" : "検索条件を閉じる";
  $(".fold").classList.toggle("is-collapsed", closed);
};
["keyword", "search-author", "start", "end"].forEach((id) =>
  $("#" + id).addEventListener("input", search),
);
$("#new").onclick = () => {
  $("#mine").hidden = true;
  $("#search").hidden = true;
  $(".tabs").hidden = true;
  $("#categories").hidden = false;
  $("h1").textContent = "設備一覧";
  $("#category-keyword").value = "";
  renderCategories();
};
$("#cancel").onclick = () => $("#create").close();
$("#create-form").onsubmit = (e) => {
  e.preventDefault();
  const f = e.target.elements;
  if (f.to.value <= f.from.value) {
    $("#form-error").textContent = "終了時刻は開始時刻より後にしてください。";
    return;
  }
  const r = {
    name: f.equipment.value,
    date: f.date.value,
    from: f.from.value,
    to: f.to.value,
    person: "自分",
  };
  if (
    mine
      .concat(reservations)
      .some((x) => x.name === r.name && x.date === r.date && x.from < r.to && x.to > r.from)
  ) {
    $("#form-error").textContent = "この設備は選択した時間帯に予約されています。";
    return;
  }
  mine.push(r);
  reservations.push(r);
  selected = r.date;
  const d = new Date(r.date + "T00:00:00");
  year = d.getFullYear();
  month = d.getMonth();
  render();
  search();
  tab(false);
  $("#create").close();
  toast("予約を追加しました");
};
let timer;
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  clearTimeout(timer);
  timer = setTimeout(() => ($("#toast").hidden = true), 2600);
}
document.querySelectorAll("[data-nav]").forEach(
  (b) =>
    (b.onclick = () => {
      if (b.dataset.nav === "予約") tab(false);
      else toast(b.dataset.nav + "はモックの対象外です");
    }),
);
$("#back").onclick = () => {
  if (!$("#categories").hidden) {
    tab(false);
    return;
  }
  if (!$("#search").hidden) tab(false);
  else toast("設備予約のトップ画面です");
};
render();
search();
const equipmentCategories = ["プロジェクター", "会議室", "車両", "モニター", "面談室"];
function renderCategories() {
  const keyword = $("#category-keyword").value.trim().toLowerCase();
  const items = equipmentCategories.filter((name) => name.toLowerCase().includes(keyword));
  $("#category-count").textContent = items.length;
  $("#category-rows").replaceChildren(
    ...items.map((name) => {
      const button = document.createElement("button");
      button.className = "category-row";
      const label = document.createElement("span");
      label.textContent = name;
      const arrow = document.createElement("span");
      arrow.className = "chevron";
      arrow.textContent = "›";
      button.append(label, arrow);
      button.onclick = () => {
        $("#create-form").reset();
        $("#create-form").elements.equipment.value = name === "会議室" ? "会議室A" : name;
        $("#create-form").elements.date.value = selected;
        $("#form-error").textContent = "";
        $("#create").showModal();
      };
      return button;
    }),
  );
  if (!items.length)
    $("#category-rows").innerHTML = '<p class="empty">条件に一致するカテゴリーはありません</p>';
}
$("#category-keyword").addEventListener("input", renderCategories);
function renderReservationPagination(total, pages) {
  const nav = document.querySelector("#result-pagination");
  nav.replaceChildren();
  nav.hidden = total === 0;
  const summary = document.createElement("span");
  summary.className = "pagination-summary";
  summary.textContent = total
    ? `${(reservationSearchPage - 1) * reservationPageSize + 1}〜${Math.min(total, reservationSearchPage * reservationPageSize)}件 / 全${total}件`
    : "";
  nav.append(summary);
  const controls = document.createElement("div");
  controls.className = "pagination-controls";
  const add = (label, page, disabled, current = false) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.disabled = disabled;
    if (current) {
      button.className = "current";
      button.setAttribute("aria-current", "page");
    }
    button.setAttribute(
      "aria-label",
      label === "前へ" ? "前のページ" : label === "次へ" ? "次のページ" : page + "ページ目",
    );
    button.onclick = () => {
      reservationSearchPage = page;
      search();
      document.querySelector(".results").scrollIntoView({ block: "start" });
      document
        .querySelector('#result-pagination [aria-current="page"]')
        ?.focus({ preventScroll: true });
    };
    controls.append(button);
  };
  add("前へ", reservationSearchPage - 1, reservationSearchPage === 1);
  const shown = new Set([
    1,
    pages,
    reservationSearchPage - 1,
    reservationSearchPage,
    reservationSearchPage + 1,
  ]);
  let previous = 0;
  for (const page of [...shown].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b)) {
    if (previous && page - previous > 1) {
      const dots = document.createElement("span");
      dots.textContent = "…";
      controls.append(dots);
    }
    add(String(page), page, false, page === reservationSearchPage);
    previous = page;
  }
  add("次へ", reservationSearchPage + 1, reservationSearchPage === pages);
  nav.append(controls);
}
