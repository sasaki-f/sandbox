function refreshReservationTime() {
  if (document.hidden) return;
  // Do not replace a table or dialog while it is being dragged.
  if (
    document.documentElement.classList.contains("calendar-mouse-dragging") ||
    document.querySelector(".dialog-drag-handle.is-dragging")
  )
    return;
  const scrollPositions = [...document.querySelectorAll(".schedule-scroll, #day-rows")].map(
    (element) => ({ element, left: element.scrollLeft, top: element.scrollTop }),
  );
  if (!weeklyPage.hidden) renderWeekly();
  else if (!schedulePage.hidden) renderSchedule();
  if (!document.querySelector("#mine").hidden) render();
  if (bookingDialog.open && !B("booking-form").hidden) updateBookingTimeAvailability();
  for (const { element, left, top } of scrollPositions) {
    element.scrollLeft = left;
    element.scrollTop = top;
  }
}

setInterval(refreshReservationTime, 60 * 1000);
function resumeReservationTime() {
  refreshReservationTime();
  if (location.protocol !== "file:" && !document.hidden) {
    synchronizeReservationClock().then(refreshReservationTime).catch(console.error);
  }
}
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) resumeReservationTime();
});
window.addEventListener("focus", resumeReservationTime);
