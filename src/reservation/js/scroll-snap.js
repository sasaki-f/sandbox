// Snap between columns without adding space past the right edge of the table.
for (const scroller of document.querySelectorAll(".schedule-scroll")) {
  const table = scroller.querySelector(".schedule-table");
  const update = () => {
    const columns = table.querySelectorAll(".equipment-column"),
      column = columns[0];
    if (!column || !scroller.clientWidth) return;
    const weekly = column.classList.contains("weekly-column");
    const minimum = weekly ? (innerWidth < 600 ? 125 : 145) : innerWidth < 600 ? 190 : 210;
    const width =
      innerWidth >= 900 ? Math.max(minimum, (scroller.clientWidth - 70) / columns.length) : minimum;
    table.style.setProperty("--responsive-column-width", width + "px");
  };
  new ResizeObserver(update).observe(scroller);
  new MutationObserver(update).observe(table, { childList: true });
  update();
  let verticalTimer;
  const snapTime = () => {
    if (!scroller.clientHeight) return;
    const limit = scroller.scrollHeight - scroller.clientHeight;
    const top = Math.min(Math.round(scroller.scrollTop / 32) * 32, Math.floor(limit / 32) * 32);
    if (Math.abs(top - scroller.scrollTop) > 0.5)
      scroller.scrollTo({ top, left: scroller.scrollLeft, behavior: "smooth" });
  };
  scroller.addEventListener(
    "scroll",
    () => {
      clearTimeout(verticalTimer);
      verticalTimer = setTimeout(snapTime, 140);
    },
    { passive: true },
  );
  scroller.addEventListener("scrollend", snapTime);
}
