import { createMindMap } from "./mind-map.js";
import { NEED_PATHS } from "./needs.js";
import { buildSearchIndex, searchResources, suggestedQueries } from "./search.js";
import { canonicalContentLanguage, number, plural, t } from "./i18n.js";
import { FAVORITES_KEY, migrateFavoriteTokens, parseFavoriteTokens, URL_FAVORITES_KEYS } from "./favorites.js";
import { activeMetadataFacetCount, emptyMetadataFacets, formatMetadataValue, humanizeMetadataValue, matchesMetadataFacets, METADATA_FACETS, metadataFacetValues } from "./catalog-metadata.js";

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

function loadFavorites(resources) {
  const savedIds = parseFavoriteTokens(readStorage(FAVORITES_KEY));
  const tokens = savedIds || URL_FAVORITES_KEYS.flatMap((key) => parseFavoriteTokens(readStorage(key)) || []);
  const favorites = migrateFavoriteTokens(resources, tokens);
  writeStorage(FAVORITES_KEY, JSON.stringify([...favorites]));
  return favorites;
}

function loadViewPreference() {
  const saved = readStorage(VIEW_KEY);
  return ["cards", "list", "text"].includes(saved) ? saved : "cards";
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
  favorites: new Set(),
  facets: emptyMetadataFacets(),
};

let mindMap;
let searchTimer;
let categoryBySlug = new Map();

const elements = {
  catalogAdvisory: document.querySelector("#catalog-advisory"),
  catalogBranch: document.querySelector("#catalog-branch-select"),
  catalogCollection: document.querySelector("#catalog-collection-select"),
  catalogContext: document.querySelector("#catalog-context"),
  catalogHeading: document.querySelector(".catalog-heading"),
  catalogSearch: document.querySelector("#catalog-search-input"),
  catalogSearchClear: document.querySelector("#catalog-search-clear"),
  catalogSearchForm: document.querySelector("#catalog-search-form"),
  catalogTopic: document.querySelector("#catalog-topic-select"),
  categoryTotal: document.querySelector("#collection-total"),
  clear: document.querySelector("#clear-search"),
  collections: document.querySelector("#collection-grid"),
  empty: document.querySelector("#empty-state"),
  emptySuggestions: document.querySelector("#empty-suggestions"),
  filters: document.querySelector("#filter-row"),
  form: document.querySelector("#search-form"),
  grid: document.querySelector("#resource-grid"),
  guide: document.querySelector("#collection-guide"),
  guideContent: document.querySelector("#collection-guide-content"),
  guideSource: document.querySelector("#collection-guide-source"),
  guideTitle: document.querySelector("#collection-guide-title"),
  heroSearchClear: document.querySelector("#hero-search-clear"),
  loadMore: document.querySelector("#load-more"),
  metadataClear: document.querySelector("#metadata-filter-clear"),
  metadataCount: document.querySelector("#metadata-filter-count"),
  metadataFilters: document.querySelector("#metadata-filters"),
  metadataGrid: document.querySelector("#metadata-filter-grid"),
  needs: document.querySelector("#need-paths"),
  overviewBars: document.querySelector("#overview-collection-bars"),
  overviewBarsCount: document.querySelector("#overview-bars-count"),
  overviewDonut: document.querySelector("#overview-distribution-donut"),
  overviewDonutTotal: document.querySelector("#overview-donut-total"),
  overviewMetrics: document.querySelector("#overview-preview-metrics"),
  progress: document.querySelector("#scroll-progress"),
  relatedPaths: document.querySelector("#related-paths"),
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
const canonicalLanguageAttribute = canonicalContentLanguage ? ` lang="${canonicalContentLanguage}"` : "";
const headingSlug = (value) => value.toLocaleLowerCase("en-US").replace(/[^\p{Letter}\p{Number}\s-]/gu, "").trim().replace(/\s+/g, "-");

function sourceUrl(source, section = "") {
  return `https://github.com/egohygiene/akashic/blob/main/${source}${section ? `#${headingSlug(section)}` : ""}`;
}

function reportUrl(title = "") {
  const params = new URLSearchParams({ template: "resource-update.yml" });
  if (title) params.set("title", `Resource update: ${title}`);
  return `https://github.com/egohygiene/akashic/issues/new?${params}`;
}

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
  for (const [field] of METADATA_FACETS) {
    if (state.facets[field]) params.set(`meta-${field}`, state.facets[field]);
  }
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
    facets: Object.fromEntries(METADATA_FACETS.map(([field]) => [field, params.get(`meta-${field}`) || ""])),
    view: ["cards", "list", "text"].includes(params.get("view")) ? params.get("view") : (usePreference ? loadViewPreference() : "cards"),
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
  if (Object.hasOwn(next, "facets")) state.facets = { ...emptyMetadataFacets(), ...next.facets };
  if (Object.hasOwn(next, "view")) {
    state.view = ["cards", "list", "text"].includes(next.view) ? next.view : "cards";
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

function renderNeedPaths() {
  elements.needs.innerHTML = NEED_PATHS.map((need) => `<button type="button" data-need-query="${escapeHtml(need.query)}"><span aria-hidden="true">${need.glyph}</span><span><strong>${escapeHtml(t(need.titleKey))}</strong><small>${escapeHtml(t(need.copyKey))}</small></span><b aria-hidden="true">→</b></button>`).join("");
}

function renderCollections() {
  elements.collections.innerHTML = state.catalog.categories.map((category, index) => `
    <article class="collection-path" style="--card-color:${category.color};--card-delay:${Math.min(index, 18) * 14}ms">
      <div class="collection-path-heading"><span class="collection-icon" aria-hidden="true">${category.glyph}</span><div><span class="collection-number">${String(index + 1).padStart(2, "0")}</span><h3${canonicalLanguageAttribute}>${escapeHtml(category.title)}</h3></div></div>
      <p${canonicalLanguageAttribute}>${escapeHtml(category.description)}</p>
      <div class="collection-path-footer"><div class="collection-meta"><span>${plural("runtime.unit.resource", category.count)}</span><span>${plural("runtime.unit.branch", category.groups.length > 1 ? category.groups.length : category.sections.length)}</span></div><div class="collection-actions">${category.guide ? `<button type="button" data-guide-category="${escapeHtml(category.slug)}" aria-label="${escapeHtml(t("runtime.app.guideAria", { title: category.title }))}">${escapeHtml(t("runtime.action.guide"))} <span aria-hidden="true">↓</span></button>` : ""}<button type="button" data-browse-category="${escapeHtml(category.slug)}" aria-label="${escapeHtml(t("runtime.app.browseAria", { title: category.title }))}">${escapeHtml(t("runtime.action.browse"))} <span aria-hidden="true">→</span></button><button type="button" data-map-category="${escapeHtml(category.slug)}" aria-label="${escapeHtml(t("runtime.app.mapAria", { title: category.title }))}">${escapeHtml(t("runtime.action.map"))} <span aria-hidden="true">⌁</span></button></div></div>
    </article>`).join("");
}

function renderOverviewPreview() {
  const categories = state.catalog.categories;
  const resourceCount = state.catalog.resourceCount;
  const topicPathCount = categories.reduce((sum, category) => sum + category.groups.reduce((groupSum, group) => groupSum + group.sections.length, 0), 0);
  const uniqueDomainCount = new Set(state.catalog.resources.map((resource) => resource.domain)).size;
  const metrics = [
    [resourceCount, t("runtime.metric.resources")],
    [categories.length, t("runtime.metric.collections")],
    [topicPathCount, t("runtime.metric.topicPaths")],
    [uniqueDomainCount, t("runtime.metric.domains")],
  ];
  elements.overviewMetrics.innerHTML = metrics.map(([value, label]) => `<div><dt>${number(value)}</dt><dd>${escapeHtml(label)}</dd></div>`).join("");

  let cursor = 0;
  const gap = 0.55;
  const stops = categories.map((category) => {
    const start = cursor;
    const end = cursor + category.count / resourceCount * 360;
    cursor = end;
    return `${category.color} ${start.toFixed(3)}deg ${Math.max(start, end - gap).toFixed(3)}deg, transparent ${Math.max(start, end - gap).toFixed(3)}deg ${end.toFixed(3)}deg`;
  });
  elements.overviewDonut.style.background = `conic-gradient(from -90deg, ${stops.join(", ")})`;
  elements.overviewDonutTotal.textContent = number(resourceCount);

  const ranked = [...categories].sort((left, right) => right.count - left.count || left.title.localeCompare(right.title));
  const largest = ranked[0];
  elements.overviewDonut.setAttribute("aria-label", t("runtime.app.donutAria", { resources: plural("runtime.unit.resource", resourceCount), collections: plural("runtime.unit.collection", categories.length), title: largest.title, largest: plural("runtime.unit.resource", largest.count) }));
  const visible = ranked.slice(0, 6);
  const maximum = visible[0]?.count || 1;
  elements.overviewBarsCount.textContent = t("runtime.app.top", { count: number(visible.length) });
  elements.overviewBars.innerHTML = visible.map((category, index) => {
    const percentage = resourceCount ? category.count / resourceCount * 100 : 0;
    const label = percentage > 0 && percentage < 1 ? "<1%" : `${percentage.toFixed(percentage < 10 ? 1 : 0)}%`;
    const params = new URLSearchParams({ collection: category.slug, view: state.view });
    return `<li><a class="overview-bar-row" href="index.html?${params}#catalog" style="--bar-color:${category.color};--bar-width:${category.count / maximum * 100}%">
      <span class="overview-bar-rank">${String(index + 1).padStart(2, "0")}</span><span class="overview-bar-glyph" aria-hidden="true">${category.glyph}</span><span class="overview-bar-copy"${canonicalLanguageAttribute}><strong>${escapeHtml(category.title)}</strong><i aria-hidden="true"><b></b></i></span><span class="overview-bar-value"><strong>${number(category.count)}</strong><small>${label}</small></span><span aria-hidden="true">→</span>
    </a></li>`;
  }).join("");
}

function renderFilterControls() {
  const options = [{ slug: "all", title: t("runtime.action.allCollections"), color: "#d1459f" }, ...state.catalog.categories];
  elements.filters.innerHTML = options.map((category) => `<button class="filter-chip" type="button" data-filter="${escapeHtml(category.slug)}" aria-pressed="false" style="--chip-color:${category.color}"${category.slug === "all" ? "" : canonicalLanguageAttribute}>${escapeHtml(category.title)}</button>`).join("");
  for (const category of state.catalog.categories) {
    const option = document.createElement("option");
    option.value = category.slug;
    option.textContent = category.title;
    if (canonicalContentLanguage) option.lang = canonicalContentLanguage;
    elements.catalogCollection.append(option);
  }
}

function renderMetadataControls() {
  elements.metadataGrid.innerHTML = METADATA_FACETS.map(([field, labelKey]) => {
    const values = metadataFacetValues(state.catalog.resources, field);
    return `<label><span>${escapeHtml(t(labelKey))}</span><select data-metadata-facet="${field}"><option value="">${escapeHtml(t("runtime.metadata.any"))}</option>${values.map((value) => `<option value="${escapeHtml(value)}"${canonicalLanguageAttribute}>${escapeHtml(formatMetadataValue(field, value))}</option>`).join("")}</select></label>`;
  }).join("");
}

function replaceSelectOptions(select, options, value, disabled = false) {
  select.replaceChildren(...options.map((item) => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    if (item.canonical && canonicalContentLanguage) option.lang = canonicalContentLanguage;
    return option;
  }));
  select.disabled = disabled;
  select.value = value;
}

function updateTaxonomyControls() {
  const category = currentCategory();
  elements.catalogCollection.value = state.category;
  if (!category) {
    replaceSelectOptions(elements.catalogBranch, [{ value: "", label: t("runtime.action.chooseCollectionFirst") }], "", true);
    replaceSelectOptions(elements.catalogTopic, [{ value: "", label: t("runtime.action.chooseCollectionFirst") }], "", true);
    return;
  }
  const hasBranches = category.groups.length > 1;
  const branchOptions = hasBranches
    ? [{ value: "", label: t("runtime.action.allBranches") }, ...category.groups.map((group) => ({ value: group.slug, label: `${group.title} · ${number(group.count)}`, canonical: true }))]
    : [{ value: "", label: category.groups[0]?.title || category.title, canonical: true }];
  replaceSelectOptions(elements.catalogBranch, branchOptions, state.group, !hasBranches);
  const topics = currentGroup()?.sections || category.sections;
  const topicOptions = [{ value: "", label: t("runtime.action.allTopics") }, ...topics.map((topic) => ({ value: topic.title, label: `${topic.title} · ${number(topic.count)}`, canonical: true }))];
  replaceSelectOptions(elements.catalogTopic, topicOptions, state.section, false);
}

function updateFilterControls() {
  elements.filters.querySelectorAll("[data-filter]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.filter === state.category)));
  updateTaxonomyControls();
  elements.savedFilter.setAttribute("aria-pressed", String(state.savedOnly));
  elements.savedFilter.querySelector("span").textContent = state.savedOnly ? "♥" : "♡";
  elements.savedCount.textContent = number(state.favorites.size);
  elements.viewSwitch.querySelectorAll("[data-catalog-view]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.catalogView === state.view)));
  elements.metadataGrid.querySelectorAll("[data-metadata-facet]").forEach((select) => { select.value = state.facets[select.dataset.metadataFacet] || ""; });
  const facetCount = activeMetadataFacetCount(state.facets);
  elements.metadataCount.textContent = number(facetCount);
  elements.metadataClear.disabled = facetCount === 0;
  elements.metadataFilters.classList.toggle("has-active-filters", facetCount > 0);
}

function filteredResources() {
  const filtered = state.catalog.resources.filter((resource) => {
    if (state.savedOnly && !state.favorites.has(resource.id)) return false;
    if (state.category !== "all" && resource.categorySlug !== state.category) return false;
    if (state.group && resource.groupSlug !== state.group) return false;
    if (state.section && resource.section !== state.section) return false;
    if (state.domain && resource.domain !== state.domain) return false;
    if (!matchesMetadataFacets(resource, state.facets)) return false;
    return true;
  });
  const matches = state.query ? searchResources(filtered, state.query) : filtered;
  if (state.sort === "az") matches.sort((a, b) => a.title.localeCompare(b.title));
  if (state.sort === "za") matches.sort((a, b) => b.title.localeCompare(a.title));
  return matches;
}

function resourceCard(resource, index) {
  const favorite = state.favorites.has(resource.id);
  const category = categoryBySlug.get(resource.categorySlug);
  const accessLabels = resource.accessLabels?.length
    ? `<ul class="resource-labels" aria-label="${escapeHtml(t("runtime.app.accessPlatform"))}"${canonicalLanguageAttribute}>${resource.accessLabels.map((label) => `<li>${escapeHtml(label)}</li>`).join("")}</ul>`
    : "";
  const metadata = resource.metadata || {};
  const metadataBadges = [metadata.authority, ...(metadata.access || [])].filter(Boolean);
  const structuredLabels = metadataBadges.length
    ? `<ul class="resource-labels resource-metadata-labels" aria-label="${escapeHtml(t("runtime.metadata.structuredLabels"))}"${canonicalLanguageAttribute}>${metadataBadges.map((label) => `<li>${escapeHtml(humanizeMetadataValue(label))}</li>`).join("")}</ul>`
    : "";
  const metadataRows = [
    [t("runtime.metadata.resourceId"), resource.id, false, false],
    [t("runtime.metadata.resourceType"), metadata.resourceType, true, true],
    [t("runtime.metadata.role"), metadata.role, true, true],
    [t("runtime.metadata.authority"), metadata.authority, true, true],
    [t("runtime.metadata.access"), metadata.access?.join(", "), true, true],
    [t("runtime.metadata.geography"), metadata.geography?.join(", "), false, true],
    [t("runtime.metadata.language"), metadata.language?.join(", "), false, true],
    [t("runtime.metadata.platform"), metadata.platform?.join(", "), true, true],
    [t("runtime.metadata.account"), metadata.account, true, true],
    [t("runtime.metadata.license"), metadata.license, true, true],
    [t("runtime.metadata.status"), metadata.status, true, true],
    [t("runtime.metadata.volatility"), metadata.volatility, true, true],
    [t("runtime.metadata.reviewTier"), metadata.reviewTier, true, true],
    [t("runtime.metadata.supportType"), metadata.supportType?.join(", "), true, true],
    [t("runtime.metadata.applicantType"), metadata.applicantType?.join(", "), true, true],
    [t("runtime.metadata.projectStage"), metadata.projectStage?.join(", "), true, true],
    [t("runtime.metadata.programCadence"), metadata.programCadence, true, true],
    [t("runtime.metadata.costModel"), metadata.costModel?.join(", "), true, true],
    [t("runtime.metadata.obligation"), metadata.obligation?.join(", "), true, true],
    [t("runtime.metadata.programCheck"), metadata.programChecked || t("runtime.metadata.notRecorded"), false, false],
    [t("runtime.metadata.humanReview"), metadata.reviewed || t("runtime.metadata.notRecorded"), false, false],
    [t("runtime.metadata.machineCheck"), metadata.linkStatus ? `${metadata.linkStatus} · ${metadata.linkChecked}` : t("runtime.metadata.notRecorded"), false, false],
    [t("runtime.metadata.sensitive"), metadata.sensitive?.join(", "), true, true],
  ].filter(([, value]) => value);
  const provenance = resource.idOrigin === "explicit"
    ? `<details class="resource-provenance"><summary>${escapeHtml(t("runtime.metadata.details"))}<span aria-hidden="true">＋</span></summary><dl>${metadataRows.map(([label, value, humanize, canonical]) => `<div><dt>${escapeHtml(label)}</dt><dd${canonical ? canonicalLanguageAttribute : ""}>${escapeHtml(humanize ? humanizeMetadataValue(value) : value)}</dd></div>`).join("")}</dl></details>`
    : "";
  const signals = accessLabels || structuredLabels || provenance ? `<div class="resource-signals">${accessLabels}${structuredLabels}${provenance}</div>` : "";
  const taxonomy = [
    `<button type="button" data-taxonomy-category="${escapeHtml(resource.categorySlug)}" aria-label="${escapeHtml(t("runtime.app.filterCollectionAria", { title: resource.category }))}">${escapeHtml(resource.category)}</button>`,
    resource.groupSlug ? `<button type="button" data-taxonomy-category="${escapeHtml(resource.categorySlug)}" data-taxonomy-group="${escapeHtml(resource.groupSlug)}" aria-label="${escapeHtml(t("runtime.app.filterBranchAria", { title: resource.groupTitle }))}">${escapeHtml(resource.groupTitle)}</button>` : "",
    `<button type="button" data-taxonomy-category="${escapeHtml(resource.categorySlug)}" data-taxonomy-group="${escapeHtml(resource.groupSlug)}" data-taxonomy-section="${escapeHtml(resource.section)}" aria-label="${escapeHtml(t("runtime.app.filterTopicAria", { title: resource.section }))}">${escapeHtml(resource.section)}</button>`,
  ].filter(Boolean).join("");
  return `<article class="resource-card" style="--category-color:${category?.color || "#7656d8"};--card-delay:${Math.min(index, 12) * 20}ms">
    <div class="resource-top"><span class="resource-domain">${escapeHtml(resource.domain)}</span><button class="favorite" type="button" data-favorite="${escapeHtml(resource.id)}" data-resource-title="${escapeHtml(resource.title)}" aria-label="${escapeHtml(t(favorite ? "runtime.app.favoriteRemove" : "runtime.app.favoriteAdd", { title: resource.title }))}" aria-pressed="${favorite}">${favorite ? "♥" : "♡"}</button></div>
    <h3${canonicalLanguageAttribute}><a href="${escapeHtml(resource.url)}" target="_blank" rel="noreferrer">${escapeHtml(resource.title)}<span class="sr-only">${escapeHtml(t("runtime.newTab"))}</span></a></h3>${signals}<p${canonicalLanguageAttribute}>${escapeHtml(resource.description)}</p>
    <div class="resource-footer"><div class="resource-taxonomy"${canonicalLanguageAttribute}>${taxonomy}</div><span class="visit-link" aria-hidden="true">↗</span></div>
  </article>`;
}

function addContextButton(parent, label, title, handler, { canonical = false } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.title = title;
  button.textContent = label;
  if (canonical && canonicalContentLanguage) button.lang = canonicalContentLanguage;
  button.addEventListener("click", handler);
  parent.append(button);
}

function contextLink(label, href, { external = false } = {}) {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = label;
  if (external) {
    link.target = "_blank";
    link.rel = "noreferrer";
    link.insertAdjacentHTML("beforeend", ' <span aria-hidden="true">↗</span>');
  }
  return link;
}

function renderContext() {
  const category = currentCategory();
  const group = currentGroup();
  const active = category || state.query || state.domain || state.savedOnly || activeMetadataFacetCount(state.facets);
  elements.catalogContext.hidden = !active;
  elements.catalogContext.replaceChildren();
  if (!active) return;
  const path = document.createElement("div");
  path.className = "context-path";
  const label = document.createElement("span");
  label.textContent = t("runtime.action.viewing");
  path.append(label);
  if (category) {
    addContextButton(path, category.title, t("runtime.action.showEveryCollection"), () => applyState({ category: "all", group: "", section: "" }, { historyMode: "push" }), { canonical: true });
    if (group?.slug) addContextButton(path, group.title, t("runtime.action.viewAllCategory", { title: category.title }), () => applyState({ category: category.slug, group: "", section: "" }, { historyMode: "push" }), { canonical: true });
    if (state.section) addContextButton(path, state.section, t("runtime.action.clearTopic"), () => applyState({ category: category.slug, group: state.group, section: "" }, { historyMode: "push" }), { canonical: true });
  }
  if (state.query) addContextButton(path, `“${state.query}”`, t("runtime.action.clearSearch"), () => applyState({ query: "" }, { historyMode: "push" }));
  if (state.domain) addContextButton(path, state.domain, t("runtime.action.showEveryDomain"), () => applyState({ domain: "" }, { historyMode: "push" }));
  if (state.savedOnly) addContextButton(path, t("runtime.action.saved"), t("runtime.action.showAllResources"), () => applyState({ savedOnly: false }, { historyMode: "push" }));
  if (activeMetadataFacetCount(state.facets)) addContextButton(path, t("runtime.metadata.active", { count: number(activeMetadataFacetCount(state.facets)) }), t("runtime.metadata.clear"), () => applyState({ facets: emptyMetadataFacets() }, { historyMode: "push" }));
  elements.catalogContext.append(path);
  const actions = document.createElement("div");
  actions.className = "context-actions";
  if (category) {
    const mapLink = document.createElement("a");
    mapLink.href = "#mind-map";
    mapLink.innerHTML = `${escapeHtml(t("runtime.action.seePathMap"))} <span aria-hidden="true">⌁</span>`;
    mapLink.addEventListener("click", () => mindMap?.setSelection({ categorySlug: category.slug, groupSlug: state.group, section: state.section }));
    actions.append(mapLink);
    const source = currentGroup()?.source || category.path;
    actions.append(contextLink(t("runtime.action.readSource"), sourceUrl(source, state.section), { external: true }));
  }
  actions.append(contextLink(t("runtime.action.reportUpdate"), reportUrl(category?.title || state.query), { external: true }));
  elements.catalogContext.append(actions);
}

function renderCollectionGuide() {
  const category = currentCategory();
  const guide = category?.guide;
  elements.guide.hidden = !guide;
  if (!guide) {
    elements.guide.open = false;
    elements.guide.dataset.category = "";
    elements.guideContent.replaceChildren();
    return;
  }
  const changed = elements.guide.dataset.category !== category.slug;
  elements.guide.dataset.category = category.slug;
  if (changed) elements.guide.open = false;
  elements.guideTitle.textContent = category.title;
  if (canonicalContentLanguage) elements.guideTitle.lang = canonicalContentLanguage;
  elements.guideContent.innerHTML = guide.html;
  elements.guideSource.href = sourceUrl(guide.source);
  const report = elements.guide.querySelector('a[href*="resource-update.yml"]');
  if (report) report.href = reportUrl(category.title);
  const related = category.relatedPaths || [];
  elements.relatedPaths.hidden = related.length === 0;
  elements.relatedPaths.querySelector("div").innerHTML = related.map((path) => `<button type="button" data-related-category="${escapeHtml(path.categorySlug)}" data-related-group="${escapeHtml(path.groupSlug)}" data-related-section="${escapeHtml(path.section)}"${canonicalLanguageAttribute}>${escapeHtml(path.title)} <span aria-hidden="true">→</span></button>`).join("");
}

function resultDescription(count, visibleCount) {
  const parts = [];
  if (state.savedOnly) parts.push(t("runtime.action.saved").toLocaleLowerCase());
  if (currentCategory()) parts.push(currentCategory().title);
  if (currentGroup()?.slug) parts.push(currentGroup().title);
  if (state.section) parts.push(state.section);
  if (state.query) parts.push(t("runtime.app.matching", { query: state.query }));
  if (state.domain) parts.push(t("runtime.app.fromDomain", { domain: state.domain }));
  if (activeMetadataFacetCount(state.facets)) parts.push(t("runtime.metadata.active", { count: number(activeMetadataFacetCount(state.facets)) }));
  const total = plural("runtime.unit.resource", count);
  const amount = visibleCount < count ? t("runtime.app.showing", { visible: number(visibleCount), total }) : total;
  return `${amount}${parts.length ? ` · ${parts.join(" · ")}` : ""}`;
}

function renderEmptySuggestions() {
  const suggestions = suggestedQueries(state.query);
  elements.emptySuggestions.innerHTML = suggestions.map((query) => {
    const need = NEED_PATHS.find((candidate) => candidate.query === query);
    const label = need ? t(need.titleKey) : query;
    return `<button type="button" data-suggested-query="${escapeHtml(query)}"${need || !canonicalContentLanguage ? "" : canonicalLanguageAttribute}>${escapeHtml(label)} <span aria-hidden="true">→</span></button>`;
  }).join("");
}

function renderCatalog(options = {}) {
  const matches = filteredResources();
  const visible = matches.slice(0, state.limit);
  elements.grid.classList.toggle("suppress-reveal", options.suppressReveal === true);
  elements.grid.classList.toggle("is-compact", state.view === "list");
  elements.grid.classList.toggle("is-text", state.view === "text");
  elements.grid.innerHTML = visible.map(resourceCard).join("");
  elements.empty.hidden = matches.length !== 0;
  if (!matches.length) renderEmptySuggestions();
  elements.loadMore.hidden = visible.length >= matches.length;
  const remaining = Math.min(PAGE_SIZE, matches.length - visible.length);
  elements.loadMore.textContent = remaining > 0 ? t("runtime.action.showMore", { count: number(remaining) }) : t("runtime.action.showMoreResources");
  elements.summary.textContent = resultDescription(matches.length, visible.length);
  const advisory = currentCategory()?.advisory || "";
  elements.catalogAdvisory.textContent = advisory;
  elements.catalogAdvisory.hidden = !advisory;
  updateFilterControls();
  renderContext();
  renderCollectionGuide();
}

function clearFilters() {
  applyState({ query: "", category: "all", group: "", section: "", domain: "", savedOnly: false, facets: emptyMetadataFacets() }, { historyMode: "push" });
  document.querySelector("#catalog").focus();
}

function updateThemeControl() {
  const dark = document.documentElement.dataset.theme !== "light";
  elements.theme.querySelector("span").textContent = dark ? "☼" : "☾";
  elements.theme.setAttribute("aria-label", t(dark ? "runtime.theme.light" : "runtime.theme.dark"));
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
  elements.needs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-need-query]");
    if (button) submitSearch(button.dataset.needQuery, true);
  });
  elements.collections.addEventListener("click", (event) => {
    const browse = event.target.closest("[data-browse-category]");
    const map = event.target.closest("[data-map-category]");
    const guide = event.target.closest("[data-guide-category]");
    const slug = browse?.dataset.browseCategory || map?.dataset.mapCategory || guide?.dataset.guideCategory;
    if (!slug) return;
    const catalogIntent = browse || guide;
    applyState({ category: slug, group: "", section: "", savedOnly: false }, { historyMode: "push", hash: catalogIntent ? "#catalog" : "#mind-map", scroll: catalogIntent ? (guide ? "#collection-guide" : "#catalog") : "#mind-map", focusTarget: true });
    if (guide) {
      elements.guide.open = true;
      window.setTimeout(() => elements.guide.querySelector("summary")?.focus({ preventScroll: true }), prefersReducedMotion.matches ? 0 : 420);
    }
  });
  elements.filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (button) applyState({ category: button.dataset.filter, group: "", section: "", savedOnly: false }, { historyMode: "push" });
  });
  elements.catalogCollection.addEventListener("change", () => applyState({ category: elements.catalogCollection.value, group: "", section: "", savedOnly: false }, { historyMode: "push" }));
  elements.catalogBranch.addEventListener("change", () => applyState({ category: state.category, group: elements.catalogBranch.value, section: "", savedOnly: false }, { historyMode: "push" }));
  elements.catalogTopic.addEventListener("change", () => applyState({ category: state.category, group: state.group, section: elements.catalogTopic.value, savedOnly: false }, { historyMode: "push" }));
  elements.metadataGrid.addEventListener("change", (event) => {
    const select = event.target.closest("[data-metadata-facet]");
    if (select) applyState({ facets: { ...state.facets, [select.dataset.metadataFacet]: select.value } }, { historyMode: "push" });
  });
  elements.metadataClear.addEventListener("click", () => applyState({ facets: emptyMetadataFacets() }, { historyMode: "push" }));
  elements.relatedPaths.addEventListener("click", (event) => {
    const button = event.target.closest("[data-related-category]");
    if (button) applyState({ category: button.dataset.relatedCategory, group: button.dataset.relatedGroup, section: button.dataset.relatedSection, query: "", savedOnly: false }, { historyMode: "push", hash: "#catalog", scroll: "#catalog", focusTarget: true });
  });
  elements.grid.addEventListener("click", (event) => {
    const taxonomy = event.target.closest("[data-taxonomy-category]");
    if (taxonomy) {
      applyState({ category: taxonomy.dataset.taxonomyCategory, group: taxonomy.dataset.taxonomyGroup || "", section: taxonomy.dataset.taxonomySection || "", savedOnly: false }, { historyMode: "push" });
      return;
    }
    const button = event.target.closest("[data-favorite]");
    if (!button) return;
    const resourceId = button.dataset.favorite;
    const favorite = !state.favorites.has(resourceId);
    favorite ? state.favorites.add(resourceId) : state.favorites.delete(resourceId);
    writeStorage(FAVORITES_KEY, JSON.stringify([...state.favorites]));
    button.setAttribute("aria-pressed", String(favorite));
    button.setAttribute("aria-label", t(favorite ? "runtime.app.favoriteRemove" : "runtime.app.favoriteAdd", { title: button.dataset.resourceTitle }));
    button.textContent = favorite ? "♥" : "♡";
    updateFilterControls();
    if (state.savedOnly && !favorite) {
      const cardIndex = [...elements.grid.querySelectorAll("[data-favorite]")].indexOf(button);
      renderCatalog();
      (elements.grid.querySelectorAll("[data-favorite]")[Math.min(cardIndex, elements.grid.querySelectorAll("[data-favorite]").length - 1)] || elements.savedFilter).focus();
    }
  });
  elements.emptySuggestions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-suggested-query]");
    if (button) submitSearch(button.dataset.suggestedQuery, true);
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
  const response = await fetch(new URL("./data/catalog.json", import.meta.url));
  if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
  state.catalog = await response.json();
  state.favorites = loadFavorites(state.catalog.resources);
  categoryBySlug = new Map(state.catalog.categories.map((category) => [category.slug, category]));
  for (const resource of state.catalog.resources) resource.searchIndex = buildSearchIndex(resource);
  const requested = readUrlState(true);
  const explorer = normalizeExplorer(requested);
  Object.assign(state, requested, explorer);
  elements.resourceTotal.textContent = number(state.catalog.resourceCount);
  elements.categoryTotal.textContent = number(state.catalog.categories.length);
  setSearchInputs(state.query);
  renderNeedPaths();
  renderOverviewPreview();
  renderCollections();
  renderFilterControls();
  renderMetadataControls();
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
    i18n: { canonicalContentLanguage, number, plural, t },
  });
  if (canonicalContentLanguage) {
    elements.catalogAdvisory.lang = canonicalContentLanguage;
    document.querySelector("#mind-map-advisory").lang = canonicalContentLanguage;
  }
  initializeEvents();
  syncUrl("replace");
}

initialize().catch((error) => {
  console.error(error);
  elements.summary.textContent = t("runtime.app.errorSummary");
  elements.collections.innerHTML = `<div class="load-error"><strong>${escapeHtml(t("runtime.app.errorTitle"))}</strong><p>${escapeHtml(t("runtime.app.errorCopy"))}</p></div>`;
});
