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
const formatNumber = (value) => Number(value).toLocaleString();

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
  elements.theme.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
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
    [state.overview.resourceCount, "Resources"],
    [state.overview.collectionCount, "Collections"],
    [state.overview.topicPathCount, "Topic paths"],
    [state.overview.sourceFileCount, "Source lists"],
    [state.overview.uniqueDomainCount, "Domains"],
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
  elements.donut.setAttribute("aria-label", `Donut chart of ${formatNumber(state.overview.resourceCount)} resources across ${formatNumber(state.overview.collectionCount)} collections. The largest collection is ${largest.title} with ${formatNumber(largest.count)} resources. Exact values and navigation follow in the ranked list.`);
}

function renderLandscape() {
  const ranked = [...state.overview.categories].sort((left, right) => right.count - left.count || left.title.localeCompare(right.title));
  const maximum = ranked[0]?.count || 1;
  elements.landscapeCount.textContent = `${formatNumber(ranked.length)} collections`;
  elements.collectionLandscape.innerHTML = ranked.map((category, index) => {
    const selected = category.slug === state.categorySlug;
    return `<div class="landscape-row${selected ? " is-selected" : ""}" role="listitem" style="--row-color:${category.color};--row-width:${category.count / maximum * 100}%">
      <button type="button" data-select-category="${escapeHtml(category.slug)}" aria-pressed="${selected}" aria-label="Inspect ${escapeHtml(category.title)}, ${formatNumber(category.count)} resources, ${formatPercent(category.count, state.overview.resourceCount)} of Akashic">
        <span class="landscape-rank" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
        <span class="landscape-glyph" aria-hidden="true">${escapeHtml(category.glyph)}</span>
        <span class="landscape-name"><strong>${escapeHtml(category.title)}</strong><i aria-hidden="true"><b></b></i></span>
        <span class="landscape-value"><strong>${formatNumber(category.count)}</strong><small>${formatPercent(category.count, state.overview.resourceCount)}</small></span>
      </button>
      <a href="${escapeHtml(catalogUrl({ categorySlug: category.slug }))}" aria-label="Browse ${escapeHtml(category.title)} resources"><span>Browse</span><b aria-hidden="true">→</b></a>
    </div>`;
  }).join("");
}

function renderProfileMetrics(category) {
  const values = [
    [category.count, "resources"],
    [category.topicPathCount, "topic paths"],
    [category.sourceFileCount, "source lists"],
    [category.uniqueDomainCount, "domains"],
  ];
  elements.profileMetrics.innerHTML = values.map(([value, label]) => `<div><dt>${formatNumber(value)}</dt><dd>${escapeHtml(label)}</dd></div>`).join("");
}

function renderBranchDirectory(category) {
  elements.branchDirectory.innerHTML = category.groups.map((group, index) => {
    const title = category.groups.length === 1 ? "Topics" : group.title;
    const branchUrl = catalogUrl({ categorySlug: category.slug, groupSlug: group.slug });
    return `<details class="branch-card"${index === 0 ? " open" : ""} style="--branch-color:${category.color}">
      <summary><span><small>${group.slug ? "Branch" : "Directory"}</small><strong>${escapeHtml(title)}</strong></span><span><b>${formatNumber(group.count)}</b> resources <i aria-hidden="true">⌄</i></span></summary>
      <div class="topic-directory">
        ${group.sections.map((section) => `<a href="${escapeHtml(catalogUrl({ categorySlug: category.slug, groupSlug: group.slug, section: section.title }))}"><span>${escapeHtml(section.title)}</span><strong>${formatNumber(section.count)}</strong></a>`).join("")}
      </div>
      <a class="branch-action" href="${escapeHtml(branchUrl)}">Browse this ${group.slug ? "branch" : "collection"} <span aria-hidden="true">→</span></a>
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
  elements.profileStatus.textContent = `${category.title}: ${formatNumber(category.count)} resources.`;
  elements.profileCopy.textContent = category.description;
  elements.profileAction.href = catalogUrl({ categorySlug: category.slug });
  elements.profileAction.setAttribute("aria-label", `Explore all ${category.title} resources`);
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
      <span class="signal-copy"><small>${escapeHtml(eyebrow)}</small><strong>${escapeHtml(title)}</strong><i aria-hidden="true"><b></b></i></span>
      <span class="signal-count">${formatNumber(item.count)}<small>resources</small></span>
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
  });
  renderSignalBars(elements.domainPaths, state.overview.topDomains, {
    href: (item) => catalogUrl({ domain: item.domain }),
    eyebrow: () => "Source domain",
    title: (item) => item.domain,
    color: () => "var(--cyan)",
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
  const response = await fetch("data/overview.json");
  if (!response.ok) throw new Error(`Overview request failed: ${response.status}`);
  state.overview = await response.json();
  if (state.overview.schemaVersion !== 1 || !state.overview.categories?.length) throw new Error("Unsupported overview data.");
  const requested = new URLSearchParams(location.search).get("collection");
  state.categorySlug = state.overview.categories.some((category) => category.slug === requested) ? requested : state.overview.categories[0].slug;
  for (const category of state.overview.categories) {
    const option = document.createElement("option");
    option.value = category.slug;
    option.textContent = `${category.title} · ${formatNumber(category.count)}`;
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
  elements.collectionLandscape.innerHTML = '<div class="dashboard-error"><strong>The overview could not be drawn.</strong><p>The complete catalog is still available on the main portal.</p><a class="button button-primary" href="index.html#catalog">Open the catalog</a></div>';
  elements.profile.hidden = true;
});
