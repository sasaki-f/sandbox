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
  if (!selected) return;
  document.querySelector("#day-panel").hidden = false;
  if (!dayPopup.open) dayPopup.showModal();
}
dayClose.onclick = () => dayPopup.close();
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
