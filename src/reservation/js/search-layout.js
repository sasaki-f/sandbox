const searchDesktop = window.matchMedia("(min-width:900px)");
function updateSearchLayout() {
  const button = document.querySelector("#toggle"),
    fields = document.querySelector("#fields"),
    label = document.querySelector("#toggle-label");
  button.disabled = searchDesktop.matches;
  if (searchDesktop.matches) {
    fields.hidden = false;
    label.textContent = "検索条件";
    button.removeAttribute("aria-expanded");
  } else {
    label.textContent = fields.hidden ? "検索条件を開く" : "検索条件を閉じる";
    button.setAttribute("aria-expanded", String(!fields.hidden));
    document.querySelector(".fold").classList.toggle("is-collapsed", fields.hidden);
  }
}
searchDesktop.addEventListener("change", updateSearchLayout);
updateSearchLayout();
