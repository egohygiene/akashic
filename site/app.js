import { createMindMap } from "./mind-map.js";
import { buildSearchText, createAndSubstringMatcher } from "./search.js";

const FAVORITES_KEY = "akashic-favorites";
const LEGACY_FAVORITES_KEY = "ego-awesome-favorites";
const THEME_KEY = "akashic-theme";
const LEGACY_THEME_KEY = "ego-awesome-theme";
const VIEW_KEY = "akashic-catalog-view";
const PAGE_SIZE = 48;
const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

function readStorage(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function writeStorage(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

function loadFavorites() {
  try { return new Set(JSON.parse(readStorage(FAVORITES_KEY) || readStorage(LEGACY_FAVORITES_KEY) || "[]")); }
  catch { return new Set(); }
}

function loadViewPreference() {
  return readStorage(VIEW_KEY) === "list" ? "list" : "cards";
}

const state = {
  catalog: null,
  query: "",
  category: "all",
  group: "",
  section: "",
  domain: "",
  sort: "featured",
  view: loadViewPreference(),
  limit: PAGE_SIZE,
  savedOnly: false,
  favorites: loadFavorites(),
};

let mindMap;
let searchTimer;
let categoryBySlug = new Map();

const elements = {
  catalogAdvisory: document.querySelector("#catalog-advisory"),
  catalogCollection: document.querySelector("#catalog-collection-select"),
  catalogContext: document.querySelector("#catalog-context"),
  catalogHeading: document.querySelector(".catalog-heading"),
  catalogSearch: document.querySelector("#catalog-search-input"),
  catalogSearchClear: document.querySelector("#catalog-search-clear"),
  catalogSearchForm: document.querySelector("#catalog-search-form"),
  categoryTotal: document.querySelector("#collection-total"),
  clear: document.querySelector("#clear-search"),
  collections: document.querySelector("#collection-grid"),
  empty: document.querySelector("#empty-state"),
  filters: document.querySelector("#filter-row"),
  form: document.querySelector("#search-form"),
  grid: document.querySelector("#resource-grid"),
  heroSearchClear: document.querySelector("#hero-search-clear"),
  loadMore: document.querySelector("#load-more"),
  overviewBars: document.querySelector("#overview-collection-bars"),
  overviewBarsCount: document.querySelector("#overview-bars-count"),
  overviewDonut: document.querySelector("#overview-distribution-donut"),
  overviewDonutTotal: document.querySelector("#overview-donut-total"),
  overviewMetrics: document.querySelector("#overview-preview-metrics"),
  progress: document.querySelector("#scroll-progress"),
  resourceTotal: document.querySelector("#resource-total"),
  savedCount: document.querySelector("#saved-count"),
  savedFilter: document.querySelector("#saved-filter"),
  search: document.querySelector("#search-input"),
  sort: document.querySelector("#sort-select"),
  summary: document.querySelector("#result-summary"),
  theme: document.querySelector("#theme-toggle"),
  viewSwitch: document.querySelector(".view-switch"),
};

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);

function currentCategory() {
  return categoryBySlug.get(state.category) || null;
}

function currentGroup() {
  return currentCategory()?.groups.find((group) => group.slug === state.group) || null;
}

function scrollToTarget(selector, focus = false) {
  const target = document.querySelector(selector);
  if (!target) return;
  target.scrollIntoView({ behavior: prefersReducedMotion.matches ? "auto" : "smooth", block: "start" });
  if (focus) {
    const focusTarget = target.matches("[tabindex]") ? target : target.querySelector('[tabindex="-1"]') || target;
    window.setTimeout(() => focusTarget.focus({ preventScroll: true }), prefersReducedMotion.matches ? 0 : 420);
  }
}

function normalizeExplorer(next) {
  const requestedCategory = next.category ?? state.category;
  const category = categoryBySlug.get(requestedCategory);
  if (!category) return { category: "all", group: "", section: "" };
  const requestedGroup = next.group ?? (requestedCategory === state.category ? state.group : "");
  let group = category.groups.find((item) => item.slug === requestedGroup) || null;
  const requestedSection = next.section ?? (requestedCategory === state.category && requestedGroup === state.group ? state.section : "");
  if (!group && requestedSection) group = category.groups.find((item) => item.sections.some((section) => section.title === requestedSection)) || null;
  if (!group && category.groups.length === 1) group = category.groups[0];
  const section = (group?.sections || category.sections).some((item) => item.title === requestedSection) ? requestedSection : "";
  return { category: category.slug, group: group?.slug || "", section };
}

function urlForState(hash = location.hash) {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.category !== "all") params.set("collection", state.category);
  if (state.group) params.set("branch", state.group);
  if (state.section) params.set("section", state.section);
  if (state.domain) params.set("domain", state.domain);
  if (state.savedOnly) params.set("saved", "1");
  params.set("view", state.view);
  return `${location.pathname}${params.size ? `?${params}` : ""}${hash || ""}`;
}

function syncUrl(mode = "replace", hash = location.hash) {
  if (mode === "none") return;
  history[mode === "push" ? "pushState" : "replaceState"](null, "", urlForState(hash));
}

function readUrlState(usePreference = false) {
  const params = new URLSearchParams(location.search);
  return {
    query: params.get("q") || "",
    category: params.get("collection") || "all",
    group: params.get("branch") || "",
    section: params.get("section") || "",
    domain: params.get("domain") || "",
    savedOnly: params.get("saved") === "1",
    view: ["cards", "list"].includes(params.get("view")) ? params.get("view") : (usePreference ? loadViewPreference() : "cards"),
  };
}

function setSearchInputs(value) {
  elements.search.value = value;
  elements.catalogSearch.value = value;
  elements.heroSearchClear.hidden = !value;
  elements.catalogSearchClear.hidden = !value;
}

function applyState(next, options = {}) {
  const previousExplorer = `${state.category}\u0000${state.group}\u0000${state.section}`;
  const explorer = normalizeExplorer(next);
  state.category = explorer.category;
  state.group = explorer.group;
  state.section = explorer.section;
  if (Object.hasOwn(next, "query")) {
    clearTimeout(searchTimer);
    state.query = next.query;
  }
  if (Object.hasOwn(next, "savedOnly")) state.savedOnly = next.savedOnly;
  if (Object.hasOwn(next, "domain")) state.domain = next.domain;
  if (Object.hasOwn(next, "view")) {
    state.view = next.view === "list" ? "list" : "cards";
    writeStorage(VIEW_KEY, state.view);
  }
  state.limit = options.keepLimit ? state.limit : PAGE_SIZE;
  setSearchInputs(options.searchInputValue ?? state.query);
  renderCatalog({ suppressReveal: options.suppressReveal });
  const explorerChanged = previousExplorer !== `${state.category}\u0000${state.group}\u0000${state.section}`;
  if (options.syncMap !== false && explorerChanged) {
    mindMap?.setSelection({ categorySlug: state.category === "all" ? "" : state.category, groupSlug: state.group, section: state.section });
  }
  syncUrl(options.historyMode || "push", options.hash ?? location.hash);
  if (options.scroll) scrollToTarget(options.scroll, options.focusTarget);
}

function renderCollections() {
  elements.collections.innerHTML = state.catalog.categories.map((category, index) => `
    <article class="collection-path" style="--card-color:${category.color};--card-delay:${Math.min(index, 18) * 14}ms">
      <div class="collection-path-heading"><span class="collection-icon" aria-hidden="true">${category.glyph}</span><div><span class="collection-number">${String(index + 1).padStart(2, "0")}</span><h3>${escapeHtml(category.title)}</h3></div></div>
      <p>${escapeHtml(category.description)}</p>
      <div class="collection-path-footer"><div class="collection-meta"><span>${category.count.toLocaleString()} resources</span><span>${(category.groups.length > 1 ? category.groups.length : category.sections.length).toLocaleString()} branches</span></div><div class="collection-actions"><button type="button" data-browse-category="${escapeHtml(category.slug)}" aria-label="Browse ${escapeHtml(category.title)}">Browse <span aria-hidden="true">→</span></button><button type="button" data-map-category="${escapeHtml(category.slug)}" aria-label="View ${escapeHtml(category.title)} in the mind map">Map <span aria-hidden="true">⌁</span></button></div></div>
    </article>`).join("");
}

function renderOverviewPreview() {
  const categories = state.catalog.categories;
  const resourceCount = state.catalog.resourceCount;
  const topicPathCount = categories.reduce((sum, category) => sum + category.groups.reduce((groupSum, group) => groupSum + group.sections.length, 0), 0);
  const uniqueDomainCount = new Set(state.catalog.resources.map((resource) => resource.domain)).size;
  const metrics = [
    [resourceCount, "Resources"],
    [categories.length, "Collections"],
    [topicPathCount, "Topic paths"],
    [uniqueDomainCount, "Domains"],
  ];
  elements.overviewMetrics.innerHTML = metrics.map(([value, label]) => `<div><dt>${value.toLocaleString()}</dt><dd>${escapeHtml(label)}</dd></div>`).join("");

  let cursor = 0;
  const gap = 0.55;
  const stops = categories.map((category) => {
    const start = cursor;
    const end = cursor + category.count / resourceCount * 360;
    cursor = end;
    return `${category.color} ${start.toFixed(3)}deg ${Math.max(start, end - gap).toFixed(3)}deg, transparent ${Math.max(start, end - gap).toFixed(3)}deg ${end.toFixed(3)}deg`;
  });
  elements.overviewDonut.style.background = `conic-gradient(from -90deg, ${stops.join(", ")})`;
  elements.overviewDonutTotal.textContent = resourceCount.toLocaleString();

  const ranked = [...categories].sort((left, right) => right.count - left.count || left.title.localeCompare(right.title));
  const largest = ranked[0];
  elements.overviewDonut.setAttribute("aria-label", `Donut chart of ${resourceCount.toLocaleString()} resources across ${categories.length.toLocaleString()} collections. The largest collection is ${largest.title} with ${largest.count.toLocaleString()} resources. Exact values and navigation are available in the adjacent bar chart and full Observatory.`);
  const visible = ranked.slice(0, 6);
  const maximum = visible[0]?.count || 1;
  elements.overviewBarsCount.textContent = `Top ${visible.length.toLocaleString()}`;
  elements.overviewBars.innerHTML = visible.map((category, index) => {
    const percentage = resourceCount ? category.count / resourceCount * 100 : 0;
    const label = percentage > 0 && percentage < 1 ? "<1%" : `${percentage.toFixed(percentage < 10 ? 1 : 0)}%`;
    const params = new URLSearchParams({ collection: category.slug, view: state.view });
    return `<li><a class="overview-bar-row" href="index.html?${params}#catalog" style="--bar-color:${category.color};--bar-width:${category.count / maximum * 100}%">
      <span class="overview-bar-rank">${String(index + 1).padStart(2, "0")}</span><span class="overview-bar-glyph" aria-hidden="true">${category.glyph}</span><span class="overview-bar-copy"><strong>${escapeHtml(category.title)}</strong><i aria-hidden="true"><b></b></i></span><span class="overview-bar-value"><strong>${category.count.toLocaleString()}</strong><small>${label}</small></span><span aria-hidden="true">→</span>
    </a></li>`;
  }).join("");
}

function renderFilterControls() {
  const options = [{ slug: "all", title: "All collections", color: "#d1459f" }, ...state.catalog.categories];
  elements.filters.innerHTML = options.map((category) => `<button class="filter-chip" type="button" data-filter="${escapeHtml(category.slug)}" aria-pressed="false" style="--chip-color:${category.color}">${escapeHtml(category.title)}</button>`).join("");
  for (const category of state.catalog.categories) {
    const option = document.createElement("option");
    option.value = category.slug;
    option.textContent = category.title;
    elements.catalogCollection.append(option);
  }
}

function updateFilterControls() {
  elements.filters.querySelectorAll("[data-filter]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.filter === state.category)));
  elements.catalogCollection.value = state.category;
  elements.savedFilter.setAttribute("aria-pressed", String(state.savedOnly));
  elements.savedFilter.querySelector("span").textContent = state.savedOnly ? "♥" : "♡";
  elements.savedCount.textContent = state.favorites.size.toLocaleString();
  elements.viewSwitch.querySelectorAll("[data-catalog-view]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.catalogView === state.view)));
}

function filteredResources() {
  const matchesQuery = createAndSubstringMatcher(state.query);
  const matches = state.catalog.resources.filter((resource) => {
    if (state.savedOnly && !state.favorites.has(resource.url)) return false;
    if (state.category !== "all" && resource.categorySlug !== state.category) return false;
    if (state.group && resource.groupSlug !== state.group) return false;
    if (state.section && resource.section !== state.section) return false;
    if (state.domain && resource.domain !== state.domain) return false;
    return matchesQuery(resource);
  });
  if (state.sort === "az") matches.sort((a, b) => a.title.localeCompare(b.title));
  if (state.sort === "za") matches.sort((a, b) => b.title.localeCompare(a.title));
  return matches;
}

function resourceCard(resource, index) {
  const favorite = state.favorites.has(resource.url);
  const category = categoryBySlug.get(resource.categorySlug);
  return `<article class="resource-card" style="--category-color:${category?.color || "#7656d8"};--card-delay:${Math.min(index, 12) * 20}ms">
    <div class="resource-top"><span class="resource-domain">${escapeHtml(resource.domain)}</span><button class="favorite" type="button" data-favorite="${escapeHtml(resource.url)}" data-resource-title="${escapeHtml(resource.title)}" aria-label="${favorite ? "Remove" : "Add"} ${escapeHtml(resource.title)} ${favorite ? "from" : "to"} saved resources" aria-pressed="${favorite}">${favorite ? "♥" : "♡"}</button></div>
    <h3><a href="${escapeHtml(resource.url)}" target="_blank" rel="noreferrer">${escapeHtml(resource.title)}<span class="sr-only"> (opens in a new tab)</span></a></h3><p>${escapeHtml(resource.description)}</p>
    <div class="resource-footer"><div class="resource-taxonomy"><span>${escapeHtml(resource.category)}</span>${resource.groupSlug ? `<span>${escapeHtml(resource.groupTitle)}</span>` : ""}<span>${escapeHtml(resource.section)}</span></div><span class="visit-link" aria-hidden="true">↗</span></div>
  </article>`;
}

function addContextButton(parent, label, title, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.title = title;
  button.textContent = label;
  button.addEventListener("click", handler);
  parent.append(button);
}

function renderContext() {
  const category = currentCategory();
  const group = currentGroup();
  const active = category || state.query || state.domain || state.savedOnly;
  elements.catalogContext.hidden = !active;
  elements.catalogContext.replaceChildren();
  if (!active) return;
  const path = document.createElement("div");
  path.className = "context-path";
  const label = document.createElement("span");
  label.textContent = "Viewing";
  path.append(label);
  if (category) {
    addContextButton(path, category.title, "Show every collection", () => applyState({ category: "all", group: "", section: "" }, { historyMode: "push" }));
    if (group?.slug) addContextButton(path, group.title, `View all ${category.title} resources`, () => applyState({ category: category.slug, group: "", section: "" }, { historyMode: "push" }));
    if (state.section) addContextButton(path, state.section, "Clear this topic", () => applyState({ category: category.slug, group: state.group, section: "" }, { historyMode: "push" }));
  }
  if (state.query) addContextButton(path, `“${state.query}”`, "Clear search", () => applyState({ query: "" }, { historyMode: "push" }));
  if (state.domain) addContextButton(path, state.domain, "Show every source domain", () => applyState({ domain: "" }, { historyMode: "push" }));
  if (state.savedOnly) addContextButton(path, "Saved", "Show all resources", () => applyState({ savedOnly: false }, { historyMode: "push" }));
  elements.catalogContext.append(path);
  if (category) {
    const mapLink = document.createElement("a");
    mapLink.href = "#mind-map";
    mapLink.innerHTML = `See this path in the map <span aria-hidden="true">⌁</span>`;
    mapLink.addEventListener("click", () => mindMap?.setSelection({ categorySlug: category.slug, groupSlug: state.group, section: state.section }));
    elements.catalogContext.append(mapLink);
  }
}

function resultDescription(count, visibleCount) {
  const parts = [];
  if (state.savedOnly) parts.push("saved");
  if (currentCategory()) parts.push(currentCategory().title);
  if (currentGroup()?.slug) parts.push(currentGroup().title);
  if (state.section) parts.push(state.section);
  if (state.query) parts.push(`matching “${state.query}”`);
  if (state.domain) parts.push(`from ${state.domain}`);
  const total = `${count.toLocaleString()} ${count === 1 ? "resource" : "resources"}`;
  const amount = visibleCount < count ? `Showing ${visibleCount.toLocaleString()} of ${total}` : total;
  return `${amount}${parts.length ? ` · ${parts.join(" · ")}` : ""}`;
}

function renderCatalog(options = {}) {
  const matches = filteredResources();
  const visible = matches.slice(0, state.limit);
  elements.grid.classList.toggle("suppress-reveal", options.suppressReveal === true);
  elements.grid.classList.toggle("is-compact", state.view === "list");
  elements.grid.innerHTML = visible.map(resourceCard).join("");
  elements.empty.hidden = matches.length !== 0;
  elements.loadMore.hidden = visible.length >= matches.length;
  const remaining = Math.min(PAGE_SIZE, matches.length - visible.length);
  elements.loadMore.textContent = remaining > 0 ? `Show ${remaining.toLocaleString()} more` : "Show more resources";
  elements.summary.textContent = resultDescription(matches.length, visible.length);
  const advisory = currentCategory()?.advisory || "";
  elements.catalogAdvisory.textContent = advisory;
  elements.catalogAdvisory.hidden = !advisory;
  updateFilterControls();
  renderContext();
}

function clearFilters() {
  applyState({ query: "", category: "all", group: "", section: "", domain: "", savedOnly: false }, { historyMode: "push" });
  document.querySelector("#catalog").focus();
}

function updateThemeControl() {
  const dark = document.documentElement.dataset.theme !== "light";
  elements.theme.querySelector("span").textContent = dark ? "☼" : "☾";
  elements.theme.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  document.querySelector('meta[name="theme-color"]').content = dark ? "#090711" : "#f7f3fb";
}

function initializeTheme() {
  const saved = readStorage(THEME_KEY) || readStorage(LEGACY_THEME_KEY);
  if (!document.documentElement.dataset.theme) document.documentElement.dataset.theme = saved || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  updateThemeControl();
  elements.theme.addEventListener("click", () => {
    const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    writeStorage(THEME_KEY, theme);
    updateThemeControl();
  });
}

function initializeChrome() {
  const header = document.querySelector(".site-header");
  const updateScroll = () => {
    const maximum = document.documentElement.scrollHeight - innerHeight;
    elements.progress.style.transform = `scaleX(${maximum > 0 ? scrollY / maximum : 0})`;
    header.classList.toggle("is-scrolled", scrollY > 12);
  };
  addEventListener("scroll", updateScroll, { passive: true });
  updateScroll();
  if (typeof IntersectionObserver !== "undefined") {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      document.querySelectorAll("[data-nav-section]").forEach((link) => {
        const active = link.dataset.navSection === visible.target.id;
        link.classList.toggle("is-active", active);
        if (active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-35% 0px -55%", threshold: [0, 0.15, 0.5] });
    for (const id of ["top", "collections", "mind-map", "catalog"]) observer.observe(document.querySelector(`#${id}`));
  }
}

function scheduleSearch(value) {
  clearTimeout(searchTimer);
  setSearchInputs(value);
  searchTimer = window.setTimeout(() => applyState({ query: value.trim() }, { historyMode: "replace", searchInputValue: value, suppressReveal: true }), 120);
}

function submitSearch(value, focusTarget = false) {
  clearTimeout(searchTimer);
  applyState({ query: value.trim() }, { historyMode: "push", hash: "#catalog", scroll: "#catalog", focusTarget });
}

function initializeEvents() {
  elements.collections.addEventListener("click", (event) => {
    const browse = event.target.closest("[data-browse-category]");
    const map = event.target.closest("[data-map-category]");
    const slug = browse?.dataset.browseCategory || map?.dataset.mapCategory;
    if (!slug) return;
    applyState({ category: slug, group: "", section: "", savedOnly: false }, { historyMode: "push", hash: browse ? "#catalog" : "#mind-map", scroll: browse ? "#catalog" : "#mind-map", focusTarget: true });
  });
  elements.filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (button) applyState({ category: button.dataset.filter, group: "", section: "", savedOnly: false }, { historyMode: "push" });
  });
  elements.catalogCollection.addEventListener("change", () => applyState({ category: elements.catalogCollection.value, group: "", section: "", savedOnly: false }, { historyMode: "push" }));
  elements.grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-favorite]");
    if (!button) return;
    const url = button.dataset.favorite;
    const favorite = !state.favorites.has(url);
    favorite ? state.favorites.add(url) : state.favorites.delete(url);
    writeStorage(FAVORITES_KEY, JSON.stringify([...state.favorites]));
    button.setAttribute("aria-pressed", String(favorite));
    button.setAttribute("aria-label", `${favorite ? "Remove" : "Add"} ${button.dataset.resourceTitle} ${favorite ? "from" : "to"} saved resources`);
    button.textContent = favorite ? "♥" : "♡";
    updateFilterControls();
    if (state.savedOnly && !favorite) {
      const cardIndex = [...elements.grid.querySelectorAll("[data-favorite]")].indexOf(button);
      renderCatalog();
      (elements.grid.querySelectorAll("[data-favorite]")[Math.min(cardIndex, elements.grid.querySelectorAll("[data-favorite]").length - 1)] || elements.savedFilter).focus();
    }
  });
  elements.search.addEventListener("input", () => scheduleSearch(elements.search.value));
  elements.catalogSearch.addEventListener("input", () => scheduleSearch(elements.catalogSearch.value));
  elements.form.addEventListener("submit", (event) => { event.preventDefault(); submitSearch(elements.search.value, true); });
  elements.catalogSearchForm.addEventListener("submit", (event) => { event.preventDefault(); submitSearch(elements.catalogSearch.value); });
  elements.heroSearchClear.addEventListener("click", () => { applyState({ query: "" }, { historyMode: "push" }); elements.search.focus(); });
  elements.catalogSearchClear.addEventListener("click", () => { applyState({ query: "" }, { historyMode: "push" }); elements.catalogSearch.focus(); });
  elements.savedFilter.addEventListener("click", () => applyState({ savedOnly: !state.savedOnly }, { historyMode: "push" }));
  elements.viewSwitch.addEventListener("click", (event) => {
    const button = event.target.closest("[data-catalog-view]");
    if (button && button.dataset.catalogView !== state.view) applyState({ view: button.dataset.catalogView }, { historyMode: "push", keepLimit: true, suppressReveal: true });
  });
  elements.sort.addEventListener("change", () => { state.sort = elements.sort.value; state.limit = PAGE_SIZE; renderCatalog(); });
  elements.loadMore.addEventListener("click", () => {
    const previousVisible = elements.grid.children.length;
    state.limit += PAGE_SIZE;
    renderCatalog();
    (elements.grid.children[previousVisible]?.querySelector("h3 a") || elements.grid.lastElementChild?.querySelector("h3 a") || elements.catalogHeading).focus();
  });
  elements.clear.addEventListener("click", clearFilters);
  document.addEventListener("keydown", (event) => {
    const tag = document.activeElement?.tagName?.toLocaleLowerCase();
    const editing = ["input", "textarea", "select"].includes(tag) || document.activeElement?.isContentEditable;
    if (event.key === "/" && !editing) { event.preventDefault(); elements.search.focus(); }
    if (event.key === "Escape" && [elements.search, elements.catalogSearch].includes(document.activeElement)) document.activeElement.blur();
  });
  addEventListener("popstate", () => {
    clearTimeout(searchTimer);
    const next = readUrlState();
    const explorer = normalizeExplorer(next);
    Object.assign(state, next, explorer, { limit: PAGE_SIZE });
    writeStorage(VIEW_KEY, state.view);
    setSearchInputs(state.query);
    renderCatalog();
    mindMap?.setSelection({ categorySlug: state.category === "all" ? "" : state.category, groupSlug: state.group, section: state.section });
  });
}

async function initialize() {
  initializeTheme();
  initializeChrome();
  const response = await fetch("data/catalog.json");
  if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
  state.catalog = await response.json();
  categoryBySlug = new Map(state.catalog.categories.map((category) => [category.slug, category]));
  for (const resource of state.catalog.resources) resource.searchText = buildSearchText(resource);
  const requested = readUrlState(true);
  const explorer = normalizeExplorer(requested);
  Object.assign(state, requested, explorer);
  elements.resourceTotal.textContent = state.catalog.resourceCount.toLocaleString();
  elements.categoryTotal.textContent = state.catalog.categories.length.toLocaleString();
  setSearchInputs(state.query);
  renderOverviewPreview();
  renderCollections();
  renderFilterControls();
  renderCatalog();
  mindMap = createMindMap({
    catalog: state.catalog,
    container: document.querySelector("#mind-map-canvas"),
    select: document.querySelector("#mind-map-collection"),
    topicSelect: document.querySelector("#mind-map-topic"),
    back: document.querySelector("#map-back"),
    status: document.querySelector("#mind-map-status"),
    advisory: document.querySelector("#mind-map-advisory"),
    zoomIn: document.querySelector("#map-zoom-in"),
    zoomOut: document.querySelector("#map-zoom-out"),
    reset: document.querySelector("#map-reset"),
    expand: document.querySelector("#map-expand"),
    zoomLevel: document.querySelector("#map-zoom-level"),
    breadcrumb: document.querySelector("#map-breadcrumb"),
    branchList: document.querySelector("#map-branch-list"),
    shell: document.querySelector(".mind-map-shell"),
    detail: {
      kicker: document.querySelector("#map-detail-kicker"), glyph: document.querySelector("#map-detail-glyph"),
      title: document.querySelector("#map-detail-title"), copy: document.querySelector("#map-detail-copy"),
      count: document.querySelector("#map-detail-count"), branches: document.querySelector("#map-detail-branches"),
      action: document.querySelector("#map-detail-action"),
    },
    initialSelection: { categorySlug: state.category === "all" ? "" : state.category, groupSlug: state.group, section: state.section },
    onSelection(next) {
      applyState({ category: next.categorySlug || "all", group: next.groupSlug, section: next.section, savedOnly: false, ...(next.intent === "browse" ? { query: "" } : {}) }, {
        historyMode: "push", syncMap: false, hash: next.intent === "browse" ? "#catalog" : "#mind-map",
        scroll: next.intent === "browse" ? "#catalog" : undefined, focusTarget: next.intent === "browse",
      });
    },
  });
  initializeEvents();
  syncUrl("replace");
}

initialize().catch((error) => {
  console.error(error);
  elements.summary.textContent = "The catalog could not be loaded. Please try again shortly.";
  elements.collections.innerHTML = '<div class="load-error"><strong>The constellation is temporarily unavailable.</strong><p>You can still browse the complete collection on <a href="https://github.com/egohygiene/akashic">GitHub</a>.</p></div>';
});
