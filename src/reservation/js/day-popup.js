const dayPopup = document.createElement("dialog");
dayPopup.id = "day-popup";
dayPopup.className = "day-popup";
dayPopup.setAttribute("aria-labelledby", "day-title");
const dayClose = document.createElement("button");
dayClose.className = "day-popup-close";
dayClose.type = "button";
dayClose.setAttribute("aria-label", "予約一覧を閉じる");
dayClose.textContent = "×";
dayPopup.append(dayClose, document.querySelector("#day-panel"));
document.body.append(dayPopup);
function showDayReservations() {
  if (
    !selected ||
    selected > reservationMaximumDate() ||
    (selected < reservationToday() && !mine.some((reservation) => reservation.date === selected))
  ) {
    if (dayPopup.open) dayPopup.close();
    return;
  }
  document.querySelector("#day-panel").hidden = false;
  if (!dayPopup.open) {
    dayPopup.showModal();
    const title = dayPopup.querySelector("#day-title");
    title.setAttribute("tabindex", "-1");
    title.focus({ preventScroll: true });
  }
}
dayClose.onclick = () => dayPopup.close();
dayPopup.addEventListener("close", () => {
  if (
    !dayPopup.open &&
    !bookingDialog.open &&
    !document.querySelector("#mine").hidden &&
    selected
  ) {
    selected = null;
    render();
  }
});
dayPopup.addEventListener("click", (event) => {
  if (event.target !== dayPopup) return;
  const rect = dayPopup.getBoundingClientRect();
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    dayPopup.close();
});
let returnToDayPopup = false;
dayPopup.addEventListener(
  "click",
  (event) => {
    if (event.target.closest("#day-rows .row")) {
      returnToDayPopup = true;
      dayPopup.close();
    } else if (event.target.closest("#new")) {
      returnToDayPopup = false;
      dayPopup.close();
    }
  },
  true,
);
const closeBookingPageWithDayPopup = closeBookingPage;
closeBookingPage = function () {
  closeBookingPageWithDayPopup();
  if (returnToDayPopup) {
    returnToDayPopup = false;
    showDayReservations();
  }
};
