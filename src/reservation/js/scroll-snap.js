// Snap between columns without adding space past the right edge of the table.
const reservationViewModeKey = "reservation-calendar-overview";
let reservationOverview = false;
try {
  reservationOverview = localStorage.getItem(reservationViewModeKey) === "true";
} catch {
  // Keep the shared mode for this page when browser storage is unavailable.
}
const reservationViewUpdates = [];
for (const scroller of document.querySelectorAll(".schedule-scroll")) {
  const table = scroller.querySelector(".schedule-table");
  const viewControls = document.createElement("div");
  viewControls.className = "schedule-view-controls";
  const overview = document.createElement("button");
  overview.type = "button";
  const updateOverviewLabel = (compact) => {
    overview.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
        ${
          compact
            ? '<path d="M9 8V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3" /><rect x="3" y="8" width="13" height="13" rx="2" />'
            : '<rect x="4" y="4" width="16" height="16" rx="3" />'
        }
      </svg>
      <span>${compact ? "通常表示" : "全体表示"}</span>
    `;
  };
  const applyOverview = () => {
    scroller.classList.toggle("schedule-overview", reservationOverview);
    updateOverviewLabel(reservationOverview);
    overview.setAttribute("aria-pressed", String(reservationOverview));
  };
  reservationViewUpdates.push(applyOverview);
  applyOverview();
  overview.onclick = () => {
    reservationOverview = !reservationOverview;
    try {
      localStorage.setItem(reservationViewModeKey, String(reservationOverview));
    } catch {
      // Navigation within this page still keeps the selected mode.
    }
    reservationViewUpdates.forEach((apply) => apply());
  };
  viewControls.append(overview);
  scroller.before(viewControls);
  const dragWrap = document.createElement("div");
  dragWrap.className = "schedule-drag-wrap";
  scroller.before(dragWrap);
  dragWrap.append(scroller);
  const dragHint = document.createElement("div");
  dragHint.className = "schedule-drag-hint";
  dragHint.setAttribute("aria-hidden", "true");
  dragHint.innerHTML = `
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none"
      stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M24 5v38M5 24h38M18 11l6-6 6 6M18 37l6 6 6-6M11 18l-6 6 6 6M37 18l6 6-6 6" />
    </svg>
    <span>ドラッグで縦横に<br>スクロールできます</span>
  `;
  dragWrap.append(dragHint);
  let hintTimer;
  let hintShown = false;
  const hideDragHint = () => {
    clearTimeout(hintTimer);
    dragHint.classList.remove("is-visible");
  };
  const showDragHint = () => {
    if (hintShown) return;
    hintShown = true;
    dragHint.classList.add("is-visible");
    hintTimer = setTimeout(hideDragHint, 6000);
  };
  const hintObserver = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) {
        hideDragHint();
        hintShown = false;
        return;
      }
      if (innerWidth >= 1000 || matchMedia("(any-pointer: fine)").matches) showDragHint();
    },
    { threshold: 0.2 },
  );
  hintObserver.observe(scroller);
  scroller.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") showDragHint();
  });
  scroller.addEventListener("pointerdown", hideDragHint);
  scroller.addEventListener("wheel", hideDragHint, { passive: true });
  let tableDrag = null;
  let suppressDragClick = false;
  scroller.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    // Leave native scrollbar dragging to the browser.
    const rect = scroller.getBoundingClientRect();
    if (
      event.clientX >= rect.left + scroller.clientWidth ||
      event.clientY >= rect.top + scroller.clientHeight
    )
      return;
    tableDrag = {
      x: event.clientX,
      y: event.clientY,
      left: scroller.scrollLeft,
      top: scroller.scrollTop,
      active: false,
      pointerId: event.pointerId,
    };
  });
  scroller.addEventListener("pointermove", (event) => {
    if (!tableDrag || event.pointerId !== tableDrag.pointerId) return;
    const dx = event.clientX - tableDrag.x;
    const dy = event.clientY - tableDrag.y;
    if (!tableDrag.active) {
      if (Math.hypot(dx, dy) < 8) return;
      tableDrag.active = true;
      scroller.setPointerCapture(event.pointerId);
      scroller.classList.add("is-table-dragging");
      document.documentElement.classList.add("calendar-mouse-dragging");
      window.getSelection()?.removeAllRanges();
    }
    event.preventDefault();
    scroller.scrollLeft = tableDrag.left - dx;
    scroller.scrollTop = tableDrag.top - dy;
  });
  const finishTableDrag = (event) => {
    if (!tableDrag || event.pointerId !== tableDrag.pointerId) return;
    if (tableDrag.active) {
      clearTimeout(verticalTimer);
      verticalTimer = setTimeout(snapTime, 140);
      suppressDragClick = true;
      setTimeout(() => {
        suppressDragClick = false;
      }, 0);
    }
    tableDrag = null;
    scroller.classList.remove("is-table-dragging");
    document.documentElement.classList.remove("calendar-mouse-dragging");
  };
  scroller.addEventListener("pointerup", finishTableDrag);
  scroller.addEventListener("pointercancel", finishTableDrag);
  scroller.addEventListener("lostpointercapture", finishTableDrag);
  scroller.addEventListener("pointerleave", (event) => {
    if (tableDrag && !tableDrag.active) finishTableDrag(event);
  });
  scroller.addEventListener(
    "click",
    (event) => {
      if (!suppressDragClick) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );
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
    if (tableDrag?.active) return;
    if (!scroller.clientHeight) return;
    const limit = scroller.scrollHeight - scroller.clientHeight;
    // The bottom edge is a valid stop even when it falls between time lines.
    if (limit - scroller.scrollTop <= 1) return;
    const rowHeight = scroller.querySelector(".time-label")?.getBoundingClientRect().height || 40;
    const top = Math.min(Math.round(scroller.scrollTop / rowHeight) * rowHeight, limit);
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
