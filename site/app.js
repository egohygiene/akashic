import { createMindMap } from "./mind-map.js";

const FAVORITES_KEY = "akashic-favorites";
const LEGACY_FAVORITES_KEY = "ego-awesome-favorites";
const THEME_KEY = "akashic-theme";
const LEGACY_THEME_KEY = "ego-awesome-theme";

function loadFavorites() {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || localStorage.getItem(LEGACY_FAVORITES_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

const state = {
  catalog: null,
  query: "",
  category: "all",
  section: "",
  sort: "featured",
  limit: 48,
  favorites: loadFavorites(),
};
let mindMap;

const elements = {
  categoryTotal: document.querySelector("#collection-total"),
  catalogAdvisory: document.querySelector("#catalog-advisory"),
  clear: document.querySelector("#clear-search"),
  collections: document.querySelector("#collection-grid"),
  empty: document.querySelector("#empty-state"),
  filters: document.querySelector("#filter-row"),
  form: document.querySelector("#search-form"),
  grid: document.querySelector("#resource-grid"),
  loadMore: document.querySelector("#load-more"),
  resourceTotal: document.querySelector("#resource-total"),
  search: document.querySelector("#search-input"),
  sort: document.querySelector("#sort-select"),
  summary: document.querySelector("#result-summary"),
  theme: document.querySelector("#theme-toggle"),
};

const glyphs = ["✦", "⌘", "◌", "△", "◇", "☼", "◎", "∞", "⚗", "◈", "⌁", "✺", "⬡", "◐", "✧"];
const colors = ["#ff66c8", "#9a7cff", "#66e8df", "#ff9a6b", "#8ee06f", "#62a8ff"];
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[character]);

function syncUrl() {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.category !== "all") params.set("collection", state.category);
  if (state.section) params.set("section", state.section);
  history.replaceState(null, "", `${location.pathname}${params.size ? `?${params}` : ""}${location.hash}`);
}

function renderCollections() {
  elements.collections.innerHTML = state.catalog.categories.map((category, index) => `
    <a class="collection-card" href="#catalog" data-category="${escapeHtml(category.slug)}" style="--card-color:${colors[index % colors.length]}">
      <span class="collection-icon" aria-hidden="true">${glyphs[index % glyphs.length]}</span>
      <div><h3>${escapeHtml(category.title)}</h3><p>${escapeHtml(category.description)}</p></div>
      <div class="collection-meta"><span>${category.count.toLocaleString()} resources</span><span aria-hidden="true">→</span></div>
    </a>`).join("");
  elements.collections.querySelectorAll("[data-category]").forEach((card) => card.addEventListener("click", () => {
    state.category = card.dataset.category;
    state.section = "";
    state.limit = 48;
    mindMap?.focus(state.category);
    renderCatalog();
  }));
}

function renderFilters() {
  const options = [{slug: "all", title: "All"}, ...state.catalog.categories];
  elements.filters.innerHTML = options.map((category) => `<button class="filter-chip" type="button" data-filter="${escapeHtml(category.slug)}" aria-pressed="${state.category === category.slug}">${escapeHtml(category.title)}</button>`).join("");
  elements.filters.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => {
    state.category = button.dataset.filter;
    state.section = "";
    state.limit = 48;
    mindMap?.focus(state.category === "all" ? "" : state.category);
    renderCatalog();
  }));
}

function filteredResources() {
  const terms = state.query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const matches = state.catalog.resources.filter((resource) => {
    if (state.category !== "all" && resource.categorySlug !== state.category) return false;
    if (state.section && resource.section !== state.section) return false;
    const haystack = `${resource.title} ${resource.description} ${resource.category} ${resource.section} ${resource.domain}`.toLocaleLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
  if (state.sort === "az") matches.sort((a, b) => a.title.localeCompare(b.title));
  if (state.sort === "za") matches.sort((a, b) => b.title.localeCompare(a.title));
  return matches;
}

function resourceCard(resource) {
  const favorite = state.favorites.has(resource.url);
  return `<article class="resource-card">
    <div class="resource-top"><span class="resource-domain">${escapeHtml(resource.domain)}</span><button class="favorite" type="button" data-favorite="${escapeHtml(resource.url)}" aria-label="${favorite ? "Remove from" : "Add to"} favorites" aria-pressed="${favorite}">${favorite ? "♥" : "♡"}</button></div>
    <h3>${escapeHtml(resource.title)}</h3><p>${escapeHtml(resource.description)}</p>
    <div class="resource-footer"><div class="resource-taxonomy"><span>${escapeHtml(resource.category)}</span><span>${escapeHtml(resource.section)}</span></div><a class="visit-link" href="${escapeHtml(resource.url)}" target="_blank" rel="noreferrer" aria-label="Visit ${escapeHtml(resource.title)} (opens in a new tab)"><span aria-hidden="true">↗</span></a></div>
  </article>`;
}

function renderCatalog() {
  const matches = filteredResources();
  const visible = matches.slice(0, state.limit);
  elements.grid.innerHTML = visible.map(resourceCard).join("");
  elements.empty.hidden = matches.length !== 0;
  elements.loadMore.hidden = visible.length >= matches.length;
  const context = state.section ? ` in “${state.section}”` : state.query ? ` matching “${state.query}”` : "";
  elements.summary.textContent = `${matches.length.toLocaleString()} ${matches.length === 1 ? "resource" : "resources"}${context}`;
  const advisory = state.catalog.categories.find((category) => category.slug === state.category)?.advisory || "";
  elements.catalogAdvisory.textContent = advisory;
  elements.catalogAdvisory.hidden = !advisory;
  elements.grid.querySelectorAll("[data-favorite]").forEach((button) => button.addEventListener("click", () => {
    const url = button.dataset.favorite;
    state.favorites.has(url) ? state.favorites.delete(url) : state.favorites.add(url);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...state.favorites]));
    renderCatalog();
  }));
  renderFilters();
  syncUrl();
}

function clearFilters() {
  state.query = "";
  state.category = "all";
  state.section = "";
  state.limit = 48;
  elements.search.value = "";
  mindMap?.focus("");
  renderCatalog();
}

function initializeTheme() {
  const saved = localStorage.getItem(THEME_KEY) || localStorage.getItem(LEGACY_THEME_KEY);
  const preferred = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  document.documentElement.dataset.theme = saved || preferred;
  elements.theme.addEventListener("click", () => {
    const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  });
}

async function initialize() {
  initializeTheme();
  const response = await fetch("data/catalog.json");
  if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
  state.catalog = await response.json();
  const params = new URLSearchParams(location.search);
  state.query = params.get("q") || "";
  const requestedCategory = params.get("collection") || "all";
  state.category = state.catalog.categories.some((category) => category.slug === requestedCategory) ? requestedCategory : "all";
  const requestedSection = params.get("section") || "";
  const selectedCategory = state.catalog.categories.find((category) => category.slug === state.category);
  state.section = selectedCategory?.sections.some((section) => section.title === requestedSection) ? requestedSection : "";
  elements.search.value = state.query;
  elements.resourceTotal.textContent = state.catalog.resourceCount.toLocaleString();
  elements.categoryTotal.textContent = state.catalog.categories.length.toLocaleString();
  renderCollections();
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
    initialCategory: state.category,
    onNavigate(categorySlug, section) {
      state.category = categorySlug;
      state.section = section;
      state.query = "";
      state.limit = 48;
      elements.search.value = "";
      renderCatalog();
      history.replaceState(null, "", `${location.pathname}${location.search}#catalog`);
      document.querySelector("#catalog").scrollIntoView({ behavior: "smooth" });
    },
  });

  let searchTimer;
  elements.search.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.query = elements.search.value.trim(); state.limit = 48; renderCatalog(); }, 120);
  });
  elements.form.addEventListener("submit", (event) => { event.preventDefault(); document.querySelector("#catalog").scrollIntoView(); });
  elements.sort.addEventListener("change", () => { state.sort = elements.sort.value; renderCatalog(); });
  elements.loadMore.addEventListener("click", () => { state.limit += 48; renderCatalog(); });
  elements.clear.addEventListener("click", clearFilters);
  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== elements.search) { event.preventDefault(); elements.search.focus(); }
    if (event.key === "Escape" && document.activeElement === elements.search) elements.search.blur();
  });
}

initialize().catch((error) => {
  console.error(error);
  elements.summary.textContent = "The catalog could not be loaded. Please try again shortly.";
});
