import { canonicalContentLanguage, number, plural, t } from "./i18n.js";

const THEME_KEY = "akashic-theme";
const LEGACY_THEME_KEY = "ego-awesome-theme";
const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

const state = {
  overview: null,
  categorySlug: "",
};

const elements = {
  branchDirectory: document.querySelector("#branch-directory"),
  collectionLandscape: document.querySelector("#collection-landscape"),
  collectionSelect: document.querySelector("#collection-select"),
  domainPaths: document.querySelector("#domain-paths"),
  donut: document.querySelector("#distribution-donut"),
  donutTotal: document.querySelector("#donut-total"),
  landscapeCount: document.querySelector("#landscape-count"),
  metrics: document.querySelector("#dashboard-metrics"),
  profile: document.querySelector("#collection-profile"),
  profileAction: document.querySelector("#profile-action"),
  profileCopy: document.querySelector("#profile-copy"),
  profileGlyph: document.querySelector("#profile-glyph"),
  profileMetrics: document.querySelector("#profile-metrics"),
  profileStatus: document.querySelector("#profile-status"),
  profileTitle: document.querySelector("#profile-title"),
  progress: document.querySelector("#scroll-progress"),
  theme: document.querySelector("#theme-toggle"),
  topicPaths: document.querySelector("#topic-paths"),
};

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
const formatNumber = (value) => number(Number(value));
const canonicalLanguageAttribute = canonicalContentLanguage ? ` lang="${canonicalContentLanguage}"` : "";

function readStorage(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function writeStorage(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

function formatPercent(count, total) {
  const percentage = total ? count / total * 100 : 0;
  if (percentage > 0 && percentage < 1) return "<1%";
  return `${percentage.toFixed(percentage < 10 ? 1 : 0)}%`;
}

function catalogUrl({ categorySlug = "", groupSlug = "", section = "", query = "", domain = "" } = {}) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (domain) params.set("domain", domain);
  if (categorySlug) params.set("collection", categorySlug);
  if (groupSlug) params.set("branch", groupSlug);
  if (section) params.set("section", section);
  return `index.html${params.size ? `?${params}` : ""}#catalog`;
}

function currentCategory() {
  return state.overview.categories.find((category) => category.slug === state.categorySlug) || state.overview.categories[0];
}

function updateThemeControl() {
  const light = document.documentElement.dataset.theme === "light";
  elements.theme.setAttribute("aria-label", t(light ? "runtime.theme.dark" : "runtime.theme.light"));
  elements.theme.firstElementChild.textContent = light ? "☾" : "☼";
  document.querySelector('meta[name="theme-color"]').content = light ? "#f7f3fb" : "#090711";
}

function initializeChrome() {
  const saved = readStorage(THEME_KEY) || readStorage(LEGACY_THEME_KEY);
  if (!document.documentElement.dataset.theme) document.documentElement.dataset.theme = saved || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  updateThemeControl();
  elements.theme.addEventListener("click", () => {
    const theme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    writeStorage(THEME_KEY, theme);
    updateThemeControl();
  });
  const updateScroll = () => {
    const maximum = document.documentElement.scrollHeight - innerHeight;
    elements.progress.style.transform = `scaleX(${maximum > 0 ? scrollY / maximum : 0})`;
  };
  addEventListener("scroll", updateScroll, { passive: true });
  updateScroll();
}

function renderMetrics() {
  const metrics = [
    [state.overview.resourceCount, t("runtime.metric.resources")],
    [state.overview.collectionCount, t("runtime.metric.collections")],
    [state.overview.topicPathCount, t("runtime.metric.topicPaths")],
    [state.overview.sourceFileCount, t("runtime.metric.sourceLists")],
    [state.overview.uniqueDomainCount, t("runtime.metric.domains")],
  ];
  elements.metrics.innerHTML = metrics.map(([value, label]) => `<div><dt>${formatNumber(value)}</dt><dd>${escapeHtml(label)}</dd></div>`).join("");
}

function renderDonut() {
  let cursor = 0;
  const gap = 0.55;
  const stops = state.overview.categories.map((category) => {
    const start = cursor;
    const end = cursor + category.count / state.overview.resourceCount * 360;
    cursor = end;
    return `${category.color} ${start.toFixed(3)}deg ${Math.max(start, end - gap).toFixed(3)}deg, transparent ${Math.max(start, end - gap).toFixed(3)}deg ${end.toFixed(3)}deg`;
  });
  elements.donut.style.background = `conic-gradient(from -90deg, ${stops.join(", ")})`;
  elements.donutTotal.textContent = formatNumber(state.overview.resourceCount);
  const largest = [...state.overview.categories].sort((left, right) => right.count - left.count)[0];
  elements.donut.setAttribute("aria-label", t("runtime.app.donutAria", { resources: plural("runtime.unit.resource", state.overview.resourceCount), collections: plural("runtime.unit.collection", state.overview.collectionCount), title: largest.title, largest: plural("runtime.unit.resource", largest.count) }));
}

function renderLandscape() {
  const ranked = [...state.overview.categories].sort((left, right) => right.count - left.count || left.title.localeCompare(right.title));
  const maximum = ranked[0]?.count || 1;
  elements.landscapeCount.textContent = plural("runtime.unit.collection", ranked.length);
  elements.collectionLandscape.innerHTML = ranked.map((category, index) => {
    const selected = category.slug === state.categorySlug;
    return `<div class="landscape-row${selected ? " is-selected" : ""}" role="listitem" style="--row-color:${category.color};--row-width:${category.count / maximum * 100}%">
      <button type="button" data-select-category="${escapeHtml(category.slug)}" aria-pressed="${selected}" aria-label="${escapeHtml(t("runtime.dashboard.inspectAria", { title: category.title, resources: plural("runtime.unit.resource", category.count), percent: formatPercent(category.count, state.overview.resourceCount) }))}">
        <span class="landscape-rank" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
        <span class="landscape-glyph" aria-hidden="true">${escapeHtml(category.glyph)}</span>
        <span class="landscape-name"${canonicalLanguageAttribute}><strong>${escapeHtml(category.title)}</strong><i aria-hidden="true"><b></b></i></span>
        <span class="landscape-value"><strong>${formatNumber(category.count)}</strong><small>${formatPercent(category.count, state.overview.resourceCount)}</small></span>
      </button>
      <a href="${escapeHtml(catalogUrl({ categorySlug: category.slug }))}" aria-label="${escapeHtml(t("runtime.dashboard.browseAria", { title: category.title }))}"><span>${escapeHtml(t("runtime.action.browse"))}</span><b aria-hidden="true">→</b></a>
    </div>`;
  }).join("");
}

function renderProfileMetrics(category) {
  const values = [
    [category.count, t("runtime.metric.resources")],
    [category.topicPathCount, t("runtime.metric.topicPaths")],
    [category.sourceFileCount, t("runtime.metric.sourceLists")],
    [category.uniqueDomainCount, t("runtime.metric.domains")],
  ];
  elements.profileMetrics.innerHTML = values.map(([value, label]) => `<div><dt>${formatNumber(value)}</dt><dd>${escapeHtml(label)}</dd></div>`).join("");
}

function renderBranchDirectory(category) {
  elements.branchDirectory.innerHTML = category.groups.map((group, index) => {
    const title = category.groups.length === 1 ? t("runtime.dashboard.topics") : group.title;
    const branchUrl = catalogUrl({ categorySlug: category.slug, groupSlug: group.slug });
    return `<details class="branch-card"${index === 0 ? " open" : ""} style="--branch-color:${category.color}">
      <summary><span><small>${escapeHtml(t(group.slug ? "runtime.dashboard.branch" : "runtime.dashboard.directory"))}</small><strong${category.groups.length === 1 ? "" : canonicalLanguageAttribute}>${escapeHtml(title)}</strong></span><span><b>${formatNumber(group.count)}</b> ${escapeHtml(plural("runtime.unit.resource", group.count).replace(formatNumber(group.count), "").trim())} <i aria-hidden="true">⌄</i></span></summary>
      <div class="topic-directory">
        ${group.sections.map((section) => `<a href="${escapeHtml(catalogUrl({ categorySlug: category.slug, groupSlug: group.slug, section: section.title }))}"><span${canonicalLanguageAttribute}>${escapeHtml(section.title)}</span><strong>${formatNumber(section.count)}</strong></a>`).join("")}
      </div>
      <a class="branch-action" href="${escapeHtml(branchUrl)}">${escapeHtml(t(group.slug ? "runtime.dashboard.browseBranch" : "runtime.dashboard.browseCollection"))} <span aria-hidden="true">→</span></a>
    </details>`;
  }).join("");
}

function renderCollectionProfile() {
  const category = currentCategory();
  state.categorySlug = category.slug;
  elements.profile.style.setProperty("--profile-color", category.color);
  elements.profileGlyph.style.setProperty("--profile-color", category.color);
  elements.profileGlyph.textContent = category.glyph;
  elements.profileTitle.textContent = category.title;
  elements.profileStatus.textContent = t("runtime.dashboard.profileStatus", { title: category.title, resources: plural("runtime.unit.resource", category.count) });
  elements.profileCopy.textContent = category.description;
  if (canonicalContentLanguage) {
    elements.profileTitle.lang = canonicalContentLanguage;
    elements.profileCopy.lang = canonicalContentLanguage;
  }
  elements.profileAction.href = catalogUrl({ categorySlug: category.slug });
  elements.profileAction.setAttribute("aria-label", t("runtime.dashboard.exploreAllAria", { title: category.title }));
  elements.collectionSelect.value = category.slug;
  renderProfileMetrics(category);
  renderBranchDirectory(category);
}

function renderSignalBars(container, items, options) {
  const maximum = items[0]?.count || 1;
  container.innerHTML = items.map((item, index) => {
    const href = options.href(item);
    const eyebrow = options.eyebrow(item);
    const title = options.title(item);
    return `<a class="signal-row" href="${escapeHtml(href)}" style="--signal-width:${item.count / maximum * 100}%;--signal-color:${escapeHtml(options.color(item))}">
      <span class="signal-rank">${String(index + 1).padStart(2, "0")}</span>
      <span class="signal-copy"${options.canonical ? canonicalLanguageAttribute : ""}><small>${escapeHtml(eyebrow)}</small><strong>${escapeHtml(title)}</strong><i aria-hidden="true"><b></b></i></span>
      <span class="signal-count">${formatNumber(item.count)}<small>${escapeHtml(t("runtime.metric.resources"))}</small></span>
      <span aria-hidden="true">→</span>
    </a>`;
  }).join("");
}

function renderSignals() {
  renderSignalBars(elements.topicPaths, state.overview.topPaths, {
    href: (item) => catalogUrl({ categorySlug: item.categorySlug, groupSlug: item.groupSlug, section: item.title }),
    eyebrow: (item) => item.groupSlug ? `${item.categoryTitle} · ${item.groupTitle}` : item.categoryTitle,
    title: (item) => item.title,
    color: (item) => item.categoryColor,
    canonical: true,
  });
  renderSignalBars(elements.domainPaths, state.overview.topDomains, {
    href: (item) => catalogUrl({ domain: item.domain }),
    eyebrow: () => t("runtime.dashboard.sourceDomain"),
    title: (item) => item.domain,
    color: () => "var(--cyan)",
    canonical: false,
  });
}

function syncUrl(mode = "replace") {
  if (mode === "none") return;
  const url = new URL(location.href);
  url.searchParams.set("collection", state.categorySlug);
  history[mode === "push" ? "pushState" : "replaceState"](null, "", url);
}

function selectCategory(slug, { historyMode = "push", reveal = false } = {}) {
  if (!state.overview.categories.some((category) => category.slug === slug)) return;
  state.categorySlug = slug;
  renderLandscape();
  renderCollectionProfile();
  syncUrl(historyMode);
  if (reveal) {
    document.querySelector("#collection-lens").scrollIntoView({ behavior: prefersReducedMotion.matches ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => elements.profileTitle.focus?.({ preventScroll: true }), prefersReducedMotion.matches ? 0 : 420);
  }
}

function initializeEvents() {
  elements.collectionLandscape.addEventListener("click", (event) => {
    const button = event.target.closest("[data-select-category]");
    if (button) selectCategory(button.dataset.selectCategory, { historyMode: "push", reveal: true });
  });
  elements.collectionSelect.addEventListener("change", () => selectCategory(elements.collectionSelect.value, { historyMode: "push" }));
  addEventListener("popstate", () => {
    const requested = new URLSearchParams(location.search).get("collection");
    selectCategory(requested || state.overview.categories[0].slug, { historyMode: "none" });
  });
}

async function initialize() {
  initializeChrome();
  const response = await fetch(new URL("./data/overview.json", import.meta.url));
  if (!response.ok) throw new Error(`Overview request failed: ${response.status}`);
  state.overview = await response.json();
  if (state.overview.schemaVersion !== 1 || !state.overview.categories?.length) throw new Error("Unsupported overview data.");
  const requested = new URLSearchParams(location.search).get("collection");
  state.categorySlug = state.overview.categories.some((category) => category.slug === requested) ? requested : state.overview.categories[0].slug;
  for (const category of state.overview.categories) {
    const option = document.createElement("option");
    option.value = category.slug;
    option.textContent = `${category.title} · ${formatNumber(category.count)}`;
    if (canonicalContentLanguage) option.lang = canonicalContentLanguage;
    elements.collectionSelect.append(option);
  }
  renderMetrics();
  renderDonut();
  renderLandscape();
  renderCollectionProfile();
  renderSignals();
  initializeEvents();
  syncUrl("replace");
}

initialize().catch((error) => {
  console.error(error);
  elements.collectionLandscape.innerHTML = `<div class="dashboard-error"><strong>${escapeHtml(t("runtime.dashboard.errorTitle"))}</strong><p>${escapeHtml(t("runtime.dashboard.errorCopy"))}</p><a class="button button-primary" href="index.html#catalog">${escapeHtml(t("static.dashboard.openCatalog"))}</a></div>`;
  elements.profile.hidden = true;
});
