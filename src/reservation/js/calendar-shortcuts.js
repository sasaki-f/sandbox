const monthShortcut = document.createElement("button");
monthShortcut.type = "button";
monthShortcut.className = "calendar-shortcut";
monthShortcut.textContent = "今月";
monthShortcut.onclick = () => {
  const today = reservationToday().split("-");
  year = Number(today[0]);
  month = Number(today[1]) - 1;
  selected = null;
  render();
  monthPopup.close();
};
monthPopup.querySelector(".actions").prepend(monthShortcut);
const dayShortcut = document.createElement("button");
dayShortcut.type = "button";
dayShortcut.className = "calendar-shortcut";
dayShortcut.textContent = "今日";
dayShortcut.onclick = () => {
  if (!pickerTarget) return;
  pickerTarget.value = reservationToday();
  pickerTarget.dispatchEvent(new Event("input", { bubbles: true }));
  pickerTarget.dispatchEvent(new Event("change", { bubbles: true }));
  datePopup.close();
};
datePopup.querySelector(".actions").prepend(dayShortcut);
