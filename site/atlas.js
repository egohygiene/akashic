const SVG_NS = "http://www.w3.org/2000/svg";
const selectors = {
  map: document.querySelector("#atlas-map"),
  loading: document.querySelector("#atlas-loading"),
  breadcrumb: document.querySelector("#atlas-breadcrumb"),
  country: document.querySelector("#atlas-country"),
  region: document.querySelector("#atlas-region"),
  locality: document.querySelector("#atlas-locality"),
  theme: document.querySelector("#atlas-theme"),
  back: document.querySelector("#atlas-back"),
  level: document.querySelector("#atlas-level"),
  title: document.querySelector("#atlas-map-title"),
  placeKind: document.querySelector("#atlas-place-kind"),
  placeTitle: document.querySelector("#atlas-place-title"),
  placeCopy: document.querySelector("#atlas-place-copy"),
  resourceCount: document.querySelector("#atlas-resource-count"),
  childCount: document.querySelector("#atlas-child-count"),
  openChild: document.querySelector("#atlas-open-child"),
  resourceSummary: document.querySelector("#atlas-resource-summary"),
  scopeNote: document.querySelector("#atlas-scope-note"),
  indexCount: document.querySelector("#atlas-index-count"),
  resourceNav: document.querySelector("#atlas-resource-nav"),
  resourceGroups: document.querySelector("#atlas-resource-groups"),
  empty: document.querySelector("#atlas-empty"),
  zoomOut: document.querySelector("#atlas-zoom-out"),
  zoomIn: document.querySelector("#atlas-zoom-in"),
  zoomLevel: document.querySelector("#atlas-zoom-level"),
  fit: document.querySelector("#atlas-fit"),
  themeToggle: document.querySelector("#theme-toggle"),
};

const copyByKind = {
  world: "Begin with a highlighted country, then move toward the public knowledge closest to daily life.",
  country: "Choose a mapped state or region to find the institutions and public systems that change across the country.",
  region: "Move from statewide services into a covered city or town for genuinely local links.",
  locality: "A compact starting point for the official, civic, learning, and community resources closest to this place.",
};

const state = {
  atlas: null,
  themes: null,
  world: null,
  states: null,
  locationId: "world",
  resourceSection: "",
  mapTheme: "cosmic",
  zoom: 1,
  baseViewBox: { x: 0, y: 0, width: 1000, height: 500 },
};

const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch {} },
};

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

function locationMap() {
  return new Map(state.atlas.locations.map((location) => [location.id, location]));
}

function currentLocation() {
  return locationMap().get(state.locationId) || locationMap().get(state.atlas.rootId);
}

function ancestors(location) {
  const byId = locationMap();
  const path = [];
  let cursor = location;
  while (cursor) {
    path.unshift(cursor);
    cursor = cursor.parentId ? byId.get(cursor.parentId) : null;
  }
  return path;
}

function descendantCount(location) {
  const byId = locationMap();
  return location.children.filter((id) => byId.get(id)?.covered).length;
}

function option(value, label) {
  const node = document.createElement("option");
  node.value = value;
  node.textContent = label;
  return node;
}

function populatePlaceSelectors(location) {
  const byId = locationMap();
  const path = ancestors(location);
  const selectedCountry = path.find((item) => item.kind === "country");
  const selectedRegion = path.find((item) => item.kind === "region");
  const selectedLocality = path.find((item) => item.kind === "locality");
  const root = byId.get(state.atlas.rootId);

  selectors.country.replaceChildren(option("", "Choose a country"));
  for (const id of root.children) selectors.country.append(option(id, byId.get(id).name));
  selectors.country.value = selectedCountry?.id || "";

  selectors.region.replaceChildren(option("", selectedCountry ? "Choose a state or region" : "Choose a country first"));
  selectors.region.disabled = !selectedCountry;
  for (const id of selectedCountry?.children || []) selectors.region.append(option(id, byId.get(id).name));
  selectors.region.value = selectedRegion?.id || "";

  selectors.locality.replaceChildren(option("", selectedRegion ? "Choose a city or town" : "Choose a region first"));
  selectors.locality.disabled = !selectedRegion;
  for (const id of selectedRegion?.children || []) selectors.locality.append(option(id, byId.get(id).shortName));
  selectors.locality.value = selectedLocality?.id || "";
}

function renderBreadcrumb(location) {
  selectors.breadcrumb.replaceChildren();
  const path = ancestors(location);
  path.forEach((item, index) => {
    if (index) selectors.breadcrumb.append(Object.assign(document.createElement("i"), { textContent: "›" }));
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = item.shortName;
    if (item.id === location.id) button.setAttribute("aria-current", "location");
    else button.addEventListener("click", () => setLocation(item.id, { focus: true }));
    selectors.breadcrumb.append(button);
  });
}

function decodeArc(topology, index, cache) {
  const reversed = index < 0;
  const key = reversed ? ~index : index;
  if (!cache.has(key)) {
    let x = 0;
    let y = 0;
    const scale = topology.transform?.scale || [1, 1];
    const translate = topology.transform?.translate || [0, 0];
    cache.set(key, topology.arcs[key].map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
    }));
  }
  const points = cache.get(key);
  return reversed ? [...points].reverse() : points;
}

function ringsForGeometry(topology, geometry) {
  const cache = topology.__arcCache || (topology.__arcCache = new Map());
  const stitch = (indices) => indices.flatMap((index, arcIndex) => decodeArc(topology, index, cache).slice(arcIndex ? 1 : 0));
  if (geometry.type === "Polygon") return geometry.arcs.map(stitch);
  if (geometry.type === "MultiPolygon") return geometry.arcs.flatMap((polygon) => polygon.map(stitch));
  return [];
}

function worldProject([longitude, latitude]) {
  return [(longitude + 180) / 360 * 1000, (90 - latitude) / 180 * 500];
}

function pathFromRings(rings, project = (point) => point, splitWidth = Infinity) {
  return rings.map((ring) => {
    let result = "";
    let previous = null;
    for (const point of ring) {
      const [x, y] = project(point);
      const split = previous && Math.abs(x - previous[0]) > splitWidth;
      result += `${!previous || split ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      previous = [x, y];
    }
    return `${result}Z`;
  }).join("");
}

function featureCollection(topology, objectName) {
  const object = topology.objects[objectName];
  return object.type === "GeometryCollection" ? object.geometries : [object];
}

function addTitle(element, text) {
  const title = svgElement("title");
  title.textContent = text;
  element.append(title);
}

function makeInteractive(element, locationId, name) {
  element.classList.add("has-coverage");
  element.setAttribute("role", "button");
  element.setAttribute("tabindex", "0");
  element.setAttribute("aria-label", `Open ${name}`);
  const activate = () => setLocation(locationId, { focus: true });
  element.addEventListener("click", activate);
  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate();
    }
  });
}

function drawGrid(width, height, columns = 12, rows = 6) {
  const group = svgElement("g", { "aria-hidden": "true" });
  for (let index = 1; index < columns; index += 1) group.append(svgElement("line", { class: "atlas-grid-line", x1: width / columns * index, y1: 0, x2: width / columns * index, y2: height }));
  for (let index = 1; index < rows; index += 1) group.append(svgElement("line", { class: "atlas-grid-line", x1: 0, y1: height / rows * index, x2: width, y2: height / rows * index }));
  selectors.map.append(group);
}

function bboxForRings(rings) {
  const points = rings.flat();
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

function setBaseViewBox(x, y, width, height) {
  state.baseViewBox = { x, y, width, height };
  state.zoom = 1;
  updateViewBox();
}

function updateViewBox() {
  const base = state.baseViewBox;
  const width = base.width / state.zoom;
  const height = base.height / state.zoom;
  const x = base.x + (base.width - width) / 2;
  const y = base.y + (base.height - height) / 2;
  selectors.map.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
  selectors.zoomLevel.value = `${Math.round(state.zoom * 100)}%`;
  selectors.zoomOut.disabled = state.zoom <= 1;
  selectors.zoomIn.disabled = state.zoom >= 4;
}

function drawWorld(location) {
  setBaseViewBox(0, 0, 1000, 500);
  selectors.map.append(svgElement("rect", { class: "atlas-ocean", width: 1000, height: 500 }));
  drawGrid(1000, 500);
  for (const geometry of featureCollection(state.world, "countries")) {
    const path = svgElement("path", {
      class: "atlas-shape",
      d: pathFromRings(ringsForGeometry(state.world, geometry), worldProject, 450),
    });
    const name = geometry.properties?.name || `Country ${geometry.id}`;
    addTitle(path, name);
    if (String(geometry.id).padStart(3, "0") === "840") makeInteractive(path, "us", "United States");
    selectors.map.append(path);
  }
}

function geometryForLocation(location) {
  if (!location || location.geometry.dataset !== "us-states") return null;
  const geometryId = String(location.geometry.id).padStart(2, "0");
  return featureCollection(state.states, "states").find((geometry) => String(geometry.id).padStart(2, "0") === geometryId);
}

function drawUnitedStates(location) {
  const byId = locationMap();
  const country = byId.get("us");
  const selectedRegion = ancestors(location).find((item) => item.kind === "region");
  if (!selectedRegion) {
    const regionsByGeometryId = new Map((country?.children || [])
      .map((id) => byId.get(id))
      .filter((region) => region?.covered && region.geometry.dataset === "us-states")
      .map((region) => [String(region.geometry.id).padStart(2, "0"), region]));
    setBaseViewBox(0, 0, 975, 610);
    selectors.map.append(svgElement("rect", { class: "atlas-ocean", width: 975, height: 610 }));
    drawGrid(975, 610, 13, 8);
    for (const geometry of featureCollection(state.states, "states")) {
      const path = svgElement("path", { class: "atlas-shape", d: pathFromRings(ringsForGeometry(state.states, geometry)) });
      const name = geometry.properties?.name || `State ${geometry.id}`;
      addTitle(path, name);
      const coveredRegion = regionsByGeometryId.get(String(geometry.id).padStart(2, "0"));
      if (coveredRegion) makeInteractive(path, coveredRegion.id, coveredRegion.name);
      selectors.map.append(path);
    }
    return;
  }

  const geometry = geometryForLocation(selectedRegion);
  if (!geometry) return;
  const rings = ringsForGeometry(state.states, geometry);
  const bbox = bboxForRings(rings);
  const padding = Math.max(bbox.width, bbox.height) * .22;
  setBaseViewBox(bbox.minX - padding, bbox.minY - padding, bbox.width + padding * 2, bbox.height + padding * 2);
  selectors.map.append(svgElement("rect", { class: "atlas-ocean", x: bbox.minX - padding, y: bbox.minY - padding, width: bbox.width + padding * 2, height: bbox.height + padding * 2 }));
  const path = svgElement("path", { class: "atlas-shape has-coverage is-selected", d: pathFromRings(rings) });
  addTitle(path, selectedRegion.name);
  selectors.map.append(path);

  for (const childId of selectedRegion.children) {
    const markerLocation = byId.get(childId);
    if (markerLocation?.covered && markerLocation.geometry.dataset === "point") {
      drawLocalityMarker(markerLocation, bbox, location.id === markerLocation.id);
    }
  }
}

function drawLocalityMarker(location, bbox, selected) {
  const [normalizedX, normalizedY] = location.geometry.mapPosition;
  const x = bbox.minX + normalizedX * bbox.width;
  const y = bbox.minY + normalizedY * bbox.height;
  const radius = Math.max(bbox.width, bbox.height) * .025;
  const marker = svgElement("g", { class: `atlas-marker${selected ? " is-selected" : ""}`, transform: `translate(${x} ${y})` });
  marker.append(svgElement("circle", { class: "marker-halo", r: radius * 3.3 }));
  marker.append(svgElement("circle", { class: "marker-ring", r: radius * 1.35 }));
  marker.append(svgElement("circle", { class: "marker-core", r: radius * .46 }));
  const label = svgElement("text", { x: radius * 2.2, y: -radius * 1.7, "font-size": radius * 2.3, "stroke-width": radius * .55 });
  label.textContent = location.shortName;
  marker.append(label);
  addTitle(marker, `${location.name}${selected ? ", selected" : ""}`);
  if (!selected) makeInteractive(marker, location.id, location.name);
  selectors.map.append(marker);
}

function renderMap(location) {
  selectors.map.replaceChildren();
  if (location.kind === "world") drawWorld(location);
  else drawUnitedStates(location);
  selectors.level.textContent = `${location.kind === "region" ? "State / region" : location.kind} view`;
  selectors.title.textContent = location.kind === "world" ? "Explore the map" : location.name;
}

function renderPlacePanel(location) {
  const children = location.children.map((id) => locationMap().get(id)).filter((child) => child?.covered);
  selectors.placeKind.textContent = location.kind;
  selectors.placeTitle.textContent = location.kind === "world" ? "A growing atlas" : location.name;
  selectors.placeCopy.textContent = copyByKind[location.kind] || copyByKind.locality;
  selectors.resourceCount.textContent = location.resourceCount.toLocaleString();
  selectors.childCount.textContent = descendantCount(location).toLocaleString();
  selectors.openChild.hidden = children.length !== 1;
  if (children.length === 1) {
    selectors.openChild.firstChild.textContent = `Open ${children[0].shortName} `;
    selectors.openChild.onclick = () => setLocation(children[0].id, { focus: true });
  }
}

function renderResourceNavigation(resources) {
  selectors.resourceNav.replaceChildren();
  const sectionCounts = new Map();
  for (const resource of resources) sectionCounts.set(resource.section, (sectionCounts.get(resource.section) || 0) + 1);
  const choices = [["", "All", resources.length], ...[...sectionCounts].map(([section, count]) => [section, section, count])];
  selectors.resourceNav.hidden = resources.length === 0;
  for (const [section, label, count] of choices) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.section = section;
    button.setAttribute("aria-pressed", String(section === state.resourceSection));
    button.append(document.createTextNode(label));
    const badge = document.createElement("span");
    badge.textContent = count.toLocaleString();
    button.append(badge);
    button.addEventListener("click", () => {
      if (state.resourceSection === section) return;
      state.resourceSection = section;
      renderResourceGroups(currentLocation());
      writeUrl();
    });
    selectors.resourceNav.append(button);
  }
}

function renderResourceGroups(location) {
  const resources = state.atlas.resources.filter((resource) => resource.locationId === location.id);
  const visibleResources = state.resourceSection ? resources.filter((resource) => resource.section === state.resourceSection) : resources;
  selectors.resourceGroups.replaceChildren();
  selectors.empty.hidden = resources.length > 0;
  selectors.resourceSummary.textContent = resources.length
    ? state.resourceSection
      ? `Showing ${visibleResources.length.toLocaleString()} of ${resources.length.toLocaleString()} reviewed resources for ${location.name}.`
      : `${resources.length.toLocaleString()} reviewed ${resources.length === 1 ? "resource" : "resources"} specific to ${location.name}.`
    : `No place-specific resources at the ${location.kind} level yet.`;
  for (const button of selectors.resourceNav.querySelectorAll("button")) button.setAttribute("aria-pressed", String(button.dataset.section === state.resourceSection));
  const grouped = new Map();
  for (const resource of visibleResources) {
    if (!grouped.has(resource.section)) grouped.set(resource.section, []);
    grouped.get(resource.section).push(resource);
  }
  for (const [section, entries] of grouped) {
    const group = document.createElement("section");
    group.className = "atlas-resource-group";
    const heading = document.createElement("h3");
    heading.textContent = section;
    const hasIndexes = entries.some((resource) => resource.role === "index");
    if (hasIndexes) group.classList.add("has-indexes");
    const grid = document.createElement("div");
    grid.className = "atlas-resource-grid";
    for (const resource of entries) {
      const card = document.createElement("a");
      card.className = "atlas-resource-card";
      if (resource.role === "index") card.classList.add("is-index");
      card.href = resource.url;
      card.target = "_blank";
      card.rel = "noreferrer";
      card.setAttribute("aria-label", `${resource.title} (opens in a new tab)`);
      const domain = document.createElement("span");
      const labels = [];
      if (resource.role === "index") labels.push("Directory");
      if (resource.catalogReference) labels.push("Main catalog");
      labels.push(resource.domain);
      domain.textContent = labels.join(" · ");
      const title = document.createElement("strong");
      title.textContent = resource.title;
      const description = document.createElement("p");
      description.textContent = resource.description;
      const visit = document.createElement("span");
      visit.textContent = resource.role === "index" ? "Explore directory ↗" : "Visit resource ↗";
      card.append(domain, title, description, visit);
      grid.append(card);
    }
    if (section.toLocaleLowerCase().startsWith("start here")) {
      const context = document.createElement("p");
      context.className = "atlas-resource-group-copy";
      context.textContent = "These maintained gateways can take you further by place, need, eligibility, or service type.";
      group.append(heading, context, grid);
    } else group.append(heading, grid);
    selectors.resourceGroups.append(group);
  }
}

function renderResources(location, { requestedSection = "" } = {}) {
  const resources = state.atlas.resources.filter((resource) => resource.locationId === location.id);
  const sections = new Set(resources.map((resource) => resource.section));
  state.resourceSection = sections.has(requestedSection) ? requestedSection : "";
  const indexCount = resources.filter((resource) => resource.role === "index").length;
  selectors.scopeNote.hidden = indexCount === 0;
  selectors.indexCount.textContent = indexCount.toLocaleString();
  renderResourceNavigation(resources);
  renderResourceGroups(location);
}

function writeUrl({ push = true } = {}) {
  const url = new URL(location.href);
  if (state.locationId === state.atlas.rootId) url.searchParams.delete("place");
  else url.searchParams.set("place", state.locationId);
  if (state.resourceSection) url.searchParams.set("section", state.resourceSection);
  else url.searchParams.delete("section");
  if (state.mapTheme === state.themes.defaultTheme) url.searchParams.delete("mapTheme");
  else url.searchParams.set("mapTheme", state.mapTheme);
  history[push ? "pushState" : "replaceState"]({}, "", url);
}

function setLocation(id, { historyMode = "push", focus = false, resourceSection = "" } = {}) {
  if (!locationMap().has(id)) id = state.atlas.rootId;
  state.locationId = id;
  const location = currentLocation();
  populatePlaceSelectors(location);
  renderBreadcrumb(location);
  renderMap(location);
  renderPlacePanel(location);
  renderResources(location, { requestedSection: resourceSection });
  selectors.back.hidden = !location.parentId;
  if (historyMode !== "none") writeUrl({ push: historyMode === "push" });
  if (focus) selectors.placeTitle.focus({ preventScroll: true });
}

function applyMapTheme(id, { updateUrl = true } = {}) {
  const theme = state.themes.themes.find((candidate) => candidate.id === id) || state.themes.themes.find((candidate) => candidate.id === state.themes.defaultTheme);
  state.mapTheme = theme.id;
  selectors.theme.value = theme.id;
  for (const [name, color] of Object.entries(theme.colors)) {
    const cssName = name.replace(/[A-Z]/g, (letter) => `-${letter.toLocaleLowerCase()}`);
    document.body.style.setProperty(`--atlas-${cssName}`, color);
  }
  storage.set("akashic-atlas-theme", theme.id);
  if (updateUrl) writeUrl({ push: false });
}

function setupThemes() {
  selectors.theme.replaceChildren();
  for (const theme of state.themes.themes) {
    const node = option(theme.id, theme.name);
    node.title = theme.description;
    selectors.theme.append(node);
  }
  const params = new URLSearchParams(location.search);
  applyMapTheme(params.get("mapTheme") || storage.get("akashic-atlas-theme") || state.themes.defaultTheme, { updateUrl: false });
}

function setupPageTheme() {
  const update = () => {
    const light = document.documentElement.dataset.theme === "light";
    selectors.themeToggle.setAttribute("aria-pressed", String(light));
    selectors.themeToggle.setAttribute("aria-label", "Light page theme");
    selectors.themeToggle.firstElementChild.textContent = light ? "☾" : "☼";
  };
  selectors.themeToggle.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    storage.set("akashic-theme", next);
    update();
  });
  update();
}

function bindEvents() {
  selectors.country.addEventListener("change", () => setLocation(selectors.country.value || state.atlas.rootId));
  selectors.region.addEventListener("change", () => {
    const country = ancestors(currentLocation()).find((item) => item.kind === "country");
    setLocation(selectors.region.value || country?.id || state.atlas.rootId);
  });
  selectors.locality.addEventListener("change", () => {
    const region = ancestors(currentLocation()).find((item) => item.kind === "region");
    setLocation(selectors.locality.value || region?.id || state.atlas.rootId);
  });
  selectors.theme.addEventListener("change", () => applyMapTheme(selectors.theme.value));
  selectors.back.addEventListener("click", () => setLocation(currentLocation().parentId || state.atlas.rootId, { focus: true }));
  selectors.zoomOut.addEventListener("click", () => { state.zoom = Math.max(1, state.zoom / 1.35); updateViewBox(); });
  selectors.zoomIn.addEventListener("click", () => { state.zoom = Math.min(4, state.zoom * 1.35); updateViewBox(); });
  selectors.fit.addEventListener("click", () => { state.zoom = 1; updateViewBox(); });
  window.addEventListener("popstate", () => {
    const params = new URLSearchParams(location.search);
    applyMapTheme(params.get("mapTheme") || state.themes.defaultTheme, { updateUrl: false });
    setLocation(params.get("place") || state.atlas.rootId, { historyMode: "none", resourceSection: params.get("section") || "" });
  });
}

async function initialize() {
  setupPageTheme();
  try {
    const [atlas, themes, world, states] = await Promise.all([
      fetch("data/atlas.json").then((response) => response.ok ? response.json() : Promise.reject(new Error("Atlas data did not load."))),
      fetch("data/atlas-themes.json").then((response) => response.ok ? response.json() : Promise.reject(new Error("Atlas themes did not load."))),
      fetch("data/geometry/countries-110m.json").then((response) => response.ok ? response.json() : Promise.reject(new Error("World geometry did not load."))),
      fetch("data/geometry/states-albers-10m.json").then((response) => response.ok ? response.json() : Promise.reject(new Error("U.S. geometry did not load."))),
    ]);
    Object.assign(state, { atlas, themes, world, states });
    setupThemes();
    bindEvents();
    const params = new URLSearchParams(location.search);
    const requested = params.get("place") || atlas.rootId;
    setLocation(requested, { historyMode: "replace", resourceSection: params.get("section") || "" });
    selectors.loading.hidden = true;
  } catch (error) {
    selectors.loading.replaceChildren();
    const message = document.createElement("p");
    message.textContent = "The atlas could not load right now. The reviewed place files are still available on GitHub.";
    const link = document.createElement("a");
    link.href = "https://github.com/egohygiene/akashic/tree/main/atlas";
    link.textContent = "Open the atlas source →";
    selectors.loading.append(message, link);
    console.error(error);
  }
}

initialize();
