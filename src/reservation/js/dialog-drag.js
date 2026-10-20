// Keep the form controls usable while allowing desktop dialogs to uncover the calendar.
for (const [dialog, handle] of [
  [bookingDialog, document.querySelector(".booking-header")],
  [dayPopup, dayPopup.querySelector(".list-title")],
]) {
  handle.classList.add("dialog-drag-handle");
  handle.title = "ドラッグして移動";
  let drag = null;
  let offsetX = 0;
  let offsetY = 0;
  const reset = () => {
    drag = null;
    offsetX = 0;
    offsetY = 0;
    dialog.style.removeProperty("translate");
    handle.classList.remove("is-dragging");
  };
  handle.addEventListener("pointerdown", (event) => {
    if (
      !matchMedia("(min-width: 1000px)").matches ||
      event.button !== 0 ||
      event.target.closest("button, input, select, textarea, a")
    )
      return;
    const rect = dialog.getBoundingClientRect();
    drag = {
      x: event.clientX,
      y: event.clientY,
      offsetX,
      offsetY,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      handleTop: handle.getBoundingClientRect().top,
    };
    handle.setPointerCapture(event.pointerId);
    handle.classList.add("is-dragging");
    event.preventDefault();
  });
  handle.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const dx = Math.max(
      -drag.left - drag.width + 180,
      Math.min(innerWidth - drag.left - drag.width, event.clientX - drag.x),
    );
    const dy = Math.max(
      -drag.handleTop,
      Math.min(innerHeight - drag.handleTop - 64, event.clientY - drag.y),
    );
    offsetX = drag.offsetX + dx;
    offsetY = drag.offsetY + dy;
    dialog.style.translate = `${offsetX}px ${offsetY}px`;
  });
  const stop = () => {
    drag = null;
    handle.classList.remove("is-dragging");
  };
  handle.addEventListener("pointerup", stop);
  handle.addEventListener("pointercancel", stop);
  handle.addEventListener("lostpointercapture", stop);
  dialog.addEventListener("close", reset);
  window.addEventListener("resize", reset);
}
