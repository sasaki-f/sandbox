const reservationLayout = document.createElement("div");
reservationLayout.className = "reservation-layout";
const appContent = document.querySelector(".app");
appContent.before(reservationLayout);
const sidebar = document.createElement("aside");
sidebar.className = "reservation-sidebar";
sidebar.setAttribute("aria-label", "予約メニュー");
const sidebarHeading = document.createElement("div");
sidebarHeading.className = "sidebar-heading";
const desktopLogo = document.createElement("img");
desktopLogo.src = "assets/kakalink-logo.svg";
desktopLogo.alt = "カカリンク";
sidebarHeading.append(desktopLogo);
const desktopFeature = document.createElement("span");
desktopFeature.className = "reservation-feature-label";
desktopFeature.textContent = "設備予約機能";
sidebarHeading.append(desktopFeature);
sidebar.append(sidebarHeading);
function sidebarIcon(kind) {
  const paths = {
    home: '<path d="m3 10 9-8 9 8v11h-6v-7H9v7H3Z" fill="currentColor" stroke="currentColor"/>',
    search: '<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 6 6"/>',
    equipment:
      '<rect x="2" y="3" width="18" height="13" rx="2"/><path d="M6 20h5M9 16v4"/><path d="m17 14 1-2 2 1 2 2-1 2 1 2-2 2-2-1-2 1-2-2 1-2-1-2 2-2Z" fill="white"/><circle cx="18" cy="17" r="2"/>',
    category:
      '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  };
  if (!paths[kind]) return null;
  const wrapper = document.createElement("span");
  wrapper.className = "sidebar-icon";
  wrapper.setAttribute("aria-hidden", "true");
  wrapper.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
    paths[kind] +
    "</svg>";
  return wrapper;
}
const makeMenuButton = (text, kind, action) => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "sidebar-link";
  b.dataset.menu = kind;
  const icon = sidebarIcon(kind);
  if (icon) b.append(icon);
  const label = document.createElement("span");
  label.className = "sidebar-label";
  label.textContent = text;
  b.append(label);
  b.onclick = () => {
    action();
    closeReservationMenu();
  };
  return b;
};
function resetReservationView() {
  weeklyPage.hidden = true;
  schedulePage.hidden = true;
  scheduleClose.hidden = true;
  document.querySelector(".app").classList.remove("schedule-mode", "weekly-mode");
  weeklyFromCategory = false;
}
const tabBeforeSidebar = tab;
tab = function (searching) {
  resetReservationView();
  tabBeforeSidebar(searching);
  document.querySelector("h1").textContent = searching ? "予約の検索" : "自分の予約";
};
sidebar.append(
  makeMenuButton("ホーム", "home", () => tab(false)),
  makeMenuButton("予約の検索", "search", () => tab(true)),
);
function openMenuCategories() {
  resetReservationView();
  document.querySelector("#new").onclick();
}
sidebar.append(makeMenuButton("設備一覧", "equipment", openMenuCategories));
const sidebarStorageKey = "kakalink.reservation.sidebar.expanded.v1";
let sidebarExpanded = {};
try {
  const saved = JSON.parse(localStorage.getItem(sidebarStorageKey) || "{}");
  if (saved && typeof saved === "object" && !Array.isArray(saved)) {
    for (const category of equipmentCategories)
      if (typeof saved[category] === "boolean") sidebarExpanded[category] = saved[category];
  }
} catch {}
function saveSidebarExpanded() {
  try {
    localStorage.setItem(sidebarStorageKey, JSON.stringify(sidebarExpanded));
  } catch {}
}
for (const category of equipmentCategories) {
  const section = document.createElement("div");
  section.className = "sidebar-category";
  const head = document.createElement("div");
  head.className = "sidebar-category-header";
  head.append(
    makeMenuButton(category, "category", () => {
      resetReservationView();
      document.querySelector("#mine").hidden = true;
      document.querySelector("#search").hidden = true;
      document.querySelector(".tabs").hidden = true;
      showSchedule(category);
    }),
  );
  head.firstChild.dataset.category = category;
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "sidebar-fold";
  toggle.setAttribute("aria-label", category + "の設備一覧を開閉");
  toggle.setAttribute("aria-expanded", "true");
  toggle.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 9 7 7 7-7"/></svg>';
  const list = document.createElement("div");
  list.className = "sidebar-equipment";
  list.id = "sidebar-list-" + equipmentCategories.indexOf(category);
  list.hidden = sidebarExpanded[category] === false;
  toggle.setAttribute("aria-expanded", String(!list.hidden));
  toggle.setAttribute("aria-controls", list.id);
  toggle.onclick = () => {
    list.hidden = !list.hidden;
    toggle.setAttribute("aria-expanded", String(!list.hidden));
    sidebarExpanded[category] = !list.hidden;
    saveSidebarExpanded();
  };
  for (const e of scheduleEquipment[category]) {
    const button = makeMenuButton(e.name, "item", () => {
      resetReservationView();
      document.querySelector("#mine").hidden = true;
      document.querySelector("#search").hidden = true;
      document.querySelector(".tabs").hidden = true;
      showSchedule(category);
      showWeekly(e);
      weeklyFromCategory = true;
    });
    button.dataset.category = category;
    button.dataset.equipment = e.name;
    list.append(button);
  }
  head.append(toggle);
  section.append(head, list);
  sidebar.append(section);
}
reservationLayout.append(sidebar, appContent);
const shade = document.createElement("button");
shade.type = "button";
shade.className = "reservation-menu-shade";
shade.setAttribute("aria-label", "メニューを閉じる");
reservationLayout.append(shade);
const menuButton = document.createElement("button");
menuButton.type = "button";
menuButton.className = "reservation-menu-button";
menuButton.setAttribute("aria-label", "メニューを開く");
menuButton.setAttribute("aria-expanded", "false");
menuButton.innerHTML =
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
const mobileTopbar = document.createElement("div");
mobileTopbar.className = "reservation-mobile-topbar";
const mobileBrand = document.createElement("span");
const mobileLogo = document.createElement("img");
mobileLogo.src = "assets/kakalink-logo.svg";
mobileLogo.alt = "カカリンク";
mobileBrand.append(mobileLogo);
const mobileFeature = document.createElement("span");
mobileFeature.className = "reservation-feature-label";
mobileFeature.textContent = "設備予約機能";
mobileBrand.append(mobileFeature);
mobileTopbar.append(menuButton, mobileBrand);
appContent.prepend(mobileTopbar);
function closeReservationMenu() {
  reservationLayout.classList.remove("menu-open");
  menuButton.setAttribute("aria-expanded", "false");
}
menuButton.onclick = () => {
  const open = reservationLayout.classList.toggle("menu-open");
  menuButton.setAttribute("aria-expanded", String(open));
  if (open) {
    sidebar.scrollTop = 0;
    sidebar.querySelector("button").focus({ preventScroll: true });
  }
};
shade.onclick = closeReservationMenu;
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && reservationLayout.classList.contains("menu-open")) {
    closeReservationMenu();
    menuButton.focus();
  }
});
const desktopMenu = matchMedia("(min-width:1000px)");
function sidebarAccessibility() {
  sidebar.inert = !desktopMenu.matches && !reservationLayout.classList.contains("menu-open");
}
desktopMenu.addEventListener("change", () => {
  closeReservationMenu();
  sidebarAccessibility();
});
new MutationObserver(sidebarAccessibility).observe(reservationLayout, {
  attributes: true,
  attributeFilter: ["class"],
});
sidebarAccessibility();
function updateSidebarCurrent() {
  let kind = !weeklyPage.hidden
    ? "item"
    : !schedulePage.hidden
      ? "category"
      : !document.querySelector("#categories").hidden
        ? "equipment"
        : !document.querySelector("#search").hidden
          ? "search"
          : "home";
  for (const button of sidebar.querySelectorAll("[data-menu]")) {
    const active =
      button.dataset.menu === kind &&
      (kind === "item"
        ? button.dataset.equipment === weeklyEquipment?.name
        : kind === "category"
          ? button.dataset.category === scheduleCategory
          : true);
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
}
new MutationObserver(updateSidebarCurrent).observe(appContent, {
  subtree: true,
  attributes: true,
  attributeFilter: ["hidden"],
  childList: true,
});
updateSidebarCurrent();
document.querySelector("h1").textContent = "自分の予約";

for (const brand of [sidebarHeading, mobileBrand]) {
  brand.setAttribute("role", "link");
  brand.setAttribute("tabindex", "0");
  brand.setAttribute("aria-label", "ホームへ移動");
  const goHome = () => {
    tab(false);
    closeReservationMenu();
  };
  brand.onclick = goHome;
  brand.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      goHome();
    }
  });
}
