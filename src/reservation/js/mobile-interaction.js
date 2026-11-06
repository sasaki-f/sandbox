const modalIconPaths = {
  "×": '<path d="m6 6 12 12M18 6 6 18" />',
  "⋮": '<circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />',
  "〈": '<path d="m15 5-7 7 7 7" />',
  "〉": '<path d="m9 5 7 7-7 7" />',
};
function alignModalButton(button) {
  const text = button.textContent.trim();
  if (modalIconPaths[text] && !button.querySelector("svg")) {
    button.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
      stroke-linejoin="round" aria-hidden="true">${modalIconPaths[text]}</svg>`;
    return;
  }
}
for (const dialog of document.querySelectorAll("dialog, .app > header")) {
  dialog.querySelectorAll("button").forEach(alignModalButton);
  new MutationObserver((records) => {
    for (const record of records) {
      const button = record.target.closest?.("button");
      if (button) alignModalButton(button);
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches("button")) alignModalButton(node);
        node.querySelectorAll("button").forEach(alignModalButton);
      }
    }
  }).observe(dialog, { childList: true, subtree: true });
}

// Safari may ignore the viewport zoom limit; cancel only multi-touch gestures.
const preventMobileZoom = (event) => {
  if (matchMedia("(max-width: 999px)").matches) event.preventDefault();
};
document.addEventListener("gesturestart", preventMobileZoom, { passive: false });
document.addEventListener("gesturechange", preventMobileZoom, { passive: false });
document.addEventListener(
  "touchmove",
  (event) => {
    if (event.touches.length > 1) preventMobileZoom(event);
  },
  { passive: false },
);
