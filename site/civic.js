const cards = [...document.querySelectorAll(".civic-task")];
const theme = document.querySelector("#civic-theme");
const printButton = document.querySelector("#civic-print");
const checklistButton = document.querySelector("#civic-print-checklist");

// The browser holds reminders only for this page visit. Never persist them,
// attach them to share URLs, or treat them as agency transaction status.
for (const card of cards) {
  card.querySelector("details").open = false;
  const progress = card.querySelector(".civic-progress");
  const select = progress.querySelector("select");
  const output = progress.querySelector("output");
  select.value = "not-started";
  select.addEventListener("change", () => { output.textContent = select.selectedOptions[0].textContent; });
  progress.hidden = false;
  const deadline = Date.parse(`${card.dataset.reviewDue}T23:59:59Z`);
  card.querySelector(".civic-overdue").hidden = Date.now() <= deadline;
}

function revealTask({ focus = false } = {}) {
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const card = cards.find((candidate) => candidate.id === id);
  if (!card) return;
  card.querySelector("details").open = true;
  if (focus) card.querySelector("h2").focus({ preventScroll: true });
}
revealTask();
window.addEventListener("hashchange", () => revealTask({ focus: true }));
// Clicking the current hash again does not dispatch hashchange.
document.addEventListener("click", (event) => {
  const anchor = event.target.closest?.('a[href^="#"]');
  if (anchor?.getAttribute("href") === location.hash) revealTask({ focus: true });
});

function setTheme(light) {
  document.documentElement.dataset.theme = light ? "light" : "dark";
  theme.setAttribute("aria-pressed", String(light));
}
setTheme(window.matchMedia("(prefers-color-scheme: light)").matches);
theme.addEventListener("click", () => setTheme(theme.getAttribute("aria-pressed") !== "true"));
theme.hidden = false;

let beforePrint;
window.addEventListener("beforeprint", () => {
  beforePrint = cards.map((card) => card.querySelector("details").open);
  cards.forEach((card) => { card.querySelector("details").open = true; });
});
window.addEventListener("afterprint", () => {
  if (!beforePrint) return;
  cards.forEach((card, index) => { card.querySelector("details").open = beforePrint[index]; });
  beforePrint = undefined;
  delete document.body.dataset.printScope;
});
printButton.addEventListener("click", () => {
  delete document.body.dataset.printScope;
  window.print();
});
checklistButton.addEventListener("click", () => {
  document.body.dataset.printScope = "checklist";
  window.print();
});
printButton.hidden = false;
checklistButton.hidden = false;
