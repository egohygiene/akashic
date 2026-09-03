import { canonicalContentLanguage, number, plural, t } from "./i18n.js";

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
  scopeButtons: [...document.querySelectorAll("[data-atlas-scope]")],
  localResourceCount: document.querySelector("#atlas-local-resource-count"),
  availableResourceCount: document.querySelector("#atlas-available-resource-count"),
  resourceNav: document.querySelector("#atlas-resource-nav"),
  resourceGroups: document.querySelector("#atlas-resource-groups"),
  empty: document.querySelector("#atlas-empty"),
  zoomOut: document.querySelector("#atlas-zoom-out"),
  zoomIn: document.querySelector("#atlas-zoom-in"),
  zoomLevel: document.querySelector("#atlas-zoom-level"),
  fit: document.querySelector("#atlas-fit"),
  mapControls: document.querySelector("#atlas-map-controls"),
  mapFallback: document.querySelector("#atlas-map-fallback"),
  legend: document.querySelector("#atlas-legend"),
  mapNote: document.querySelector("#atlas-map-note"),
  directorySummary: document.querySelector("#atlas-place-directory-summary"),
  directoryList: document.querySelector("#atlas-place-directory-list"),
  themeToggle: document.querySelector("#theme-toggle"),
};

const copyByKind = {
  world: t("runtime.atlas.copy.world"),
  country: t("runtime.atlas.copy.country"),
  region: t("runtime.atlas.copy.region"),
  locality: t("runtime.atlas.copy.locality"),
};

const state = {
  atlas: null,
  themes: null,
  world: null,
  states: null,
  geometryReady: false,
  locationById: null,
  inheritanceById: null,
  resourceByAssociationId: null,
  locationId: "world",
  resourceSection: "",
  resourceScope: "all",
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
  return state.locationById;
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

function childLocations(location) {
  return location.children.map((id) => locationMap().get(id)).filter(Boolean);
}

function directoryEntries() {
  const entries = [];
  const visit = (locationId, depth, path) => {
    const location = locationMap().get(locationId);
    if (!location) return;
    const nextPath = [...path, location];
    entries.push({ location, depth, path: nextPath });
    for (const childId of location.children) visit(childId, depth + 1, nextPath);
  };
  visit(state.atlas.rootId, 0, []);
  return entries;
}

function placeHref(locationId) {
  const url = new URL(window.location.href);
  if (locationId === state.atlas.rootId) url.searchParams.delete("place");
  else url.searchParams.set("place", locationId);
  url.searchParams.delete("section");
  return `${url.pathname}${url.search}${url.hash}`;
}

function updatePlaceDirectoryLinks() {
  for (const link of selectors.directoryList.querySelectorAll("a")) link.href = placeHref(link.dataset.locationId);
}

function renderPlaceDirectory(current) {
  const entries = directoryEntries();
  selectors.directorySummary.textContent = t("runtime.atlas.placeDirectorySummary", { count: number(entries.length), name: current.name });
  if (selectors.directoryList.childElementCount === 0) {
    for (const entry of entries) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = placeHref(entry.location.id);
      link.dataset.locationId = entry.location.id;
      link.style.setProperty("--atlas-place-depth", entry.depth);
      link.addEventListener("click", (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        if (entry.location.id !== state.locationId) setLocation(entry.location.id, { focus: true });
      });

      const identity = document.createElement("span");
      identity.className = "atlas-place-directory-identity";
      const kind = document.createElement("small");
      kind.textContent = t(`runtime.atlas.kind.${entry.location.kind}`);
      const name = document.createElement("strong");
      name.textContent = entry.location.name;
      if (canonicalContentLanguage) name.lang = canonicalContentLanguage;
      identity.append(kind, name);
      if (entry.path.length > 1) {
        const path = document.createElement("span");
        path.textContent = entry.path.slice(0, -1).map((location) => location.shortName).join(" › ");
        if (canonicalContentLanguage) path.lang = canonicalContentLanguage;
        identity.append(path);
      }

      const metadata = document.createElement("span");
      metadata.className = "atlas-place-directory-metadata";
      const resources = document.createElement("span");
      resources.textContent = plural("runtime.unit.resource", entry.location.availableResourceCount);
      metadata.append(resources);
      if (entry.location.geometry.dataset === "none") {
        const directoryOnly = document.createElement("span");
        directoryOnly.textContent = t("runtime.atlas.placeDirectoryOnly");
        metadata.append(directoryOnly);
      }
      link.append(identity, metadata);
      item.append(link);
      selectors.directoryList.append(item);
    }
  }
  for (const link of selectors.directoryList.querySelectorAll("a")) {
    link.href = placeHref(link.dataset.locationId);
    const selected = link.dataset.locationId === current.id;
    if (selected) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
    const currentLabel = link.querySelector(".is-current");
    if (selected && !currentLabel) {
      const label = document.createElement("span");
      label.className = "is-current";
      label.textContent = t("runtime.atlas.placeDirectoryCurrent");
      link.querySelector(".atlas-place-directory-metadata").append(label);
    } else if (!selected) currentLabel?.remove();
  }
}

function resourceViews(location, scope = state.resourceScope) {
  return (state.atlas.resourcesByLocation[location.id] || [])
    .filter((placement) => scope === "all" || placement.relationship !== "inherited")
    .map((placement) => ({ placement, resource: state.resourceByAssociationId.get(placement.associationId) }))
    .filter((view) => view.resource);
}

function provenanceText(provenance, { inheritance = false } = {}) {
  if (inheritance && provenance.kind === "human-review") return t("runtime.atlas.provenance.inheritanceHumanReview", { date: provenance.reviewed, reviewer: provenance.reviewedBy });
  if (inheritance) return t("runtime.atlas.provenance.inheritanceMigration");
  if (provenance.kind === "human-review") return t("runtime.atlas.provenance.humanReview", { date: provenance.reviewed, reviewer: provenance.reviewedBy });
  return t(`runtime.atlas.provenance.${provenance.kind}`);
}

function option(value, label, { canonical = false } = {}) {
  const node = document.createElement("option");
  node.value = value;
  node.textContent = label;
  if (canonical && canonicalContentLanguage) node.lang = canonicalContentLanguage;
  return node;
}

function populatePlaceSelectors(location) {
  const byId = locationMap();
  const path = ancestors(location);
  const selectedCountry = path.find((item) => item.kind === "country");
  const selectedRegion = path.find((item) => item.kind === "region");
  const selectedLocality = path.find((item) => item.kind === "locality");
  const root = byId.get(state.atlas.rootId);

  selectors.country.replaceChildren(option("", t("static.atlas.chooseCountry")));
  for (const id of root.children) selectors.country.append(option(id, byId.get(id).name, { canonical: true }));
  selectors.country.value = selectedCountry?.id || "";

  selectors.region.replaceChildren(option("", selectedCountry ? t("runtime.atlas.chooseState") : t("static.atlas.chooseCountryFirst")));
  selectors.region.disabled = !selectedCountry;
  for (const id of selectedCountry?.children || []) selectors.region.append(option(id, byId.get(id).name, { canonical: true }));
  selectors.region.value = selectedRegion?.id || "";

  selectors.locality.replaceChildren(option("", selectedRegion ? t("runtime.atlas.chooseCity") : t("static.atlas.chooseRegionFirst")));
  selectors.locality.disabled = !selectedRegion;
  for (const id of selectedRegion?.children || []) selectors.locality.append(option(id, byId.get(id).shortName, { canonical: true }));
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
    if (canonicalContentLanguage) button.lang = canonicalContentLanguage;
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
  element.setAttribute("aria-label", t("runtime.atlas.open", { name }));
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
  const country = ancestors(location).find((item) => item.kind === "country");
  if (country?.id !== "us") return false;
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
    return true;
  }

  const geometry = geometryForLocation(selectedRegion);
  if (!geometry) return false;
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
  return true;
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
  addTitle(marker, selected ? t("runtime.atlas.selected", { name: location.name }) : location.name);
  if (!selected) makeInteractive(marker, location.id, location.name);
  selectors.map.append(marker);
}

function renderMap(location) {
  const svgTitle = svgElement("title", { id: "atlas-map-svg-title" });
  svgTitle.textContent = t("static.atlas.mapTitle");
  const svgDescription = svgElement("desc", { id: "atlas-map-svg-desc" });
  svgDescription.textContent = t("static.atlas.mapDescription");
  selectors.map.replaceChildren(svgTitle, svgDescription);
  let available = false;
  try {
    if (location.kind === "world" && state.world) {
      drawWorld(location);
      available = true;
    } else if (location.kind !== "world" && state.states) available = drawUnitedStates(location);
  } catch (error) {
    console.error(error);
  }
  selectors.map.hidden = !available;
  selectors.mapFallback.hidden = available || !state.geometryReady;
  selectors.mapControls.hidden = !available;
  selectors.legend.hidden = !available;
  selectors.mapNote.hidden = !available;
  selectors.theme.disabled = !available;
  const kind = t(`runtime.atlas.kind.${location.kind}`);
  selectors.level.textContent = t("runtime.atlas.view", { kind });
  selectors.title.textContent = location.kind === "world" ? t("static.atlas.exploreMap") : location.name;
  if (canonicalContentLanguage && location.kind !== "world") selectors.title.lang = canonicalContentLanguage;
  else selectors.title.removeAttribute("lang");
}

function renderPlacePanel(location) {
  const children = childLocations(location);
  selectors.placeKind.textContent = t(`runtime.atlas.kind.${location.kind}`);
  selectors.placeTitle.textContent = location.kind === "world" ? t("static.atlas.growing") : location.name;
  if (canonicalContentLanguage && location.kind !== "world") selectors.placeTitle.lang = canonicalContentLanguage;
  else selectors.placeTitle.removeAttribute("lang");
  selectors.placeCopy.textContent = copyByKind[location.kind] || copyByKind.locality;
  selectors.resourceCount.textContent = number(location.availableResourceCount);
  selectors.childCount.textContent = number(children.length);
  selectors.openChild.hidden = children.length !== 1;
  if (children.length === 1) {
    selectors.openChild.firstChild.textContent = t("runtime.atlas.openChild", { name: children[0].shortName });
    selectors.openChild.onclick = () => setLocation(children[0].id, { focus: true });
  }
}

function renderResourceNavigation(views) {
  selectors.resourceNav.replaceChildren();
  const sectionCounts = new Map();
  for (const { resource } of views) sectionCounts.set(resource.section, (sectionCounts.get(resource.section) || 0) + 1);
  const choices = [["", t("runtime.atlas.all"), views.length], ...[...sectionCounts].map(([section, count]) => [section, section, count])];
  selectors.resourceNav.hidden = views.length === 0;
  for (const [section, label, count] of choices) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.section = section;
    button.setAttribute("aria-pressed", String(section === state.resourceSection));
    const text = document.createElement("span");
    text.className = "atlas-resource-label";
    text.textContent = label;
    if (section && canonicalContentLanguage) text.lang = canonicalContentLanguage;
    button.append(text);
    const badge = document.createElement("span");
    badge.className = "atlas-resource-count";
    badge.textContent = number(count);
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
  const views = resourceViews(location);
  const visibleViews = state.resourceSection ? views.filter(({ resource }) => resource.section === state.resourceSection) : views;
  selectors.resourceGroups.replaceChildren();
  selectors.empty.hidden = views.length > 0;
  selectors.resourceSummary.textContent = views.length
    ? state.resourceSection
      ? t("runtime.atlas.summaryFiltered", { visible: number(visibleViews.length), total: number(views.length), name: location.name })
      : state.resourceScope === "local"
        ? t("runtime.atlas.summaryLocal", { resources: plural("runtime.unit.resource", views.length), name: location.name })
        : t("runtime.atlas.summaryAvailable", { resources: plural("runtime.unit.resource", views.length), name: location.name, inherited: number(location.inheritedResourceCount) })
    : t(state.resourceScope === "local" ? "runtime.atlas.summaryEmptyLocal" : "runtime.atlas.summaryEmpty", { kind: t(`runtime.atlas.kind.${location.kind}`), name: location.name });
  for (const button of selectors.resourceNav.querySelectorAll("button")) button.setAttribute("aria-pressed", String(button.dataset.section === state.resourceSection));
  const grouped = new Map();
  for (const view of visibleViews) {
    const key = `${view.placement.sourceLocationId}\u0000${view.resource.section}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(view);
  }
  for (const [key, entries] of grouped) {
    const [sourceLocationId, section] = key.split("\u0000");
    const inherited = entries[0].placement.relationship === "inherited";
    const sourceLocation = locationMap().get(sourceLocationId);
    const group = document.createElement("section");
    group.className = "atlas-resource-group";
    const heading = document.createElement("h3");
    heading.textContent = inherited ? t("runtime.atlas.inheritedGroup", { name: sourceLocation.name, section }) : section;
    if (canonicalContentLanguage) heading.lang = canonicalContentLanguage;
    const hasIndexes = entries.some(({ resource }) => resource.role === "index");
    if (hasIndexes) group.classList.add("has-indexes");
    if (inherited) group.classList.add("is-inherited");
    const grid = document.createElement("div");
    grid.className = "atlas-resource-grid";
    for (const { resource, placement } of entries) {
      const card = document.createElement("a");
      card.className = "atlas-resource-card";
      if (resource.role === "index") card.classList.add("is-index");
      card.href = resource.url;
      card.target = "_blank";
      card.rel = "noreferrer";
      const domain = document.createElement("span");
      const labels = [];
      if (resource.role === "index") labels.push(t("runtime.atlas.directory"));
      if (resource.catalogReference) labels.push(t("runtime.atlas.mainCatalog"));
      labels.push(resource.domain);
      domain.textContent = labels.join(" · ");
      const context = document.createElement("div");
      context.className = "atlas-resource-context";
      const scope = document.createElement("span");
      scope.className = `atlas-resource-scope is-${placement.relationship}`;
      scope.textContent = t(`runtime.atlas.scope.${placement.relationship}`, { name: sourceLocation.name });
      const provenanceLabels = [provenanceText(resource.provenance)];
      if (placement.relationship === "inherited") {
        const inheritanceProvenance = new Map(placement.inheritancePath
          .map((edgeId) => state.inheritanceById.get(edgeId))
          .filter(Boolean)
          .map((edge) => [edge.provenanceId, provenanceText(edge.provenance, { inheritance: true })]));
        provenanceLabels.push(...inheritanceProvenance.values());
      }
      context.append(scope);
      for (const label of provenanceLabels) {
        const provenance = document.createElement("span");
        provenance.className = "atlas-resource-provenance";
        provenance.textContent = label;
        context.append(provenance);
      }
      card.setAttribute("aria-label", t("runtime.atlas.resourceAria", { title: resource.title, scope: scope.textContent, provenance: provenanceLabels.join("; ") }));
      const title = document.createElement("strong");
      title.textContent = resource.title;
      if (canonicalContentLanguage) title.lang = canonicalContentLanguage;
      const description = document.createElement("p");
      description.textContent = resource.description;
      if (canonicalContentLanguage) description.lang = canonicalContentLanguage;
      const visit = document.createElement("span");
      visit.textContent = t(resource.role === "index" ? "runtime.atlas.exploreDirectory" : "runtime.atlas.visitResource");
      card.append(domain, context, title, description, visit);
      grid.append(card);
    }
    if (section.toLocaleLowerCase().startsWith("start here")) {
      const context = document.createElement("p");
      context.className = "atlas-resource-group-copy";
      context.textContent = t("runtime.atlas.gatewayCopy");
      group.append(heading, context, grid);
    } else group.append(heading, grid);
    selectors.resourceGroups.append(group);
  }
}

function renderResources(location, { requestedSection = "" } = {}) {
  const views = resourceViews(location);
  const sections = new Set(views.map(({ resource }) => resource.section));
  state.resourceSection = sections.has(requestedSection) ? requestedSection : "";
  const indexCount = views.filter(({ resource }) => resource.role === "index").length;
  selectors.scopeNote.hidden = indexCount === 0;
  selectors.indexCount.textContent = number(indexCount);
  selectors.localResourceCount.textContent = number(location.resourceCount);
  selectors.availableResourceCount.textContent = number(location.availableResourceCount);
  for (const button of selectors.scopeButtons) button.setAttribute("aria-pressed", String(button.dataset.atlasScope === state.resourceScope));
  renderResourceNavigation(views);
  renderResourceGroups(location);
}

function writeUrl({ push = true } = {}) {
  const url = new URL(location.href);
  if (state.locationId === state.atlas.rootId) url.searchParams.delete("place");
  else url.searchParams.set("place", state.locationId);
  if (state.resourceSection) url.searchParams.set("section", state.resourceSection);
  else url.searchParams.delete("section");
  if (state.resourceScope === "local") url.searchParams.set("scope", "local");
  else url.searchParams.delete("scope");
  if (state.mapTheme === state.themes.defaultTheme) url.searchParams.delete("mapTheme");
  else url.searchParams.set("mapTheme", state.mapTheme);
  history[push ? "pushState" : "replaceState"]({}, "", url);
  updatePlaceDirectoryLinks();
}

function setLocation(id, { historyMode = "push", focus = false, resourceSection = "", resourceScope = state.resourceScope } = {}) {
  if (!locationMap().has(id)) id = state.atlas.rootId;
  state.locationId = id;
  state.resourceScope = resourceScope === "local" ? "local" : "all";
  const location = currentLocation();
  populatePlaceSelectors(location);
  renderBreadcrumb(location);
  renderMap(location);
  renderPlacePanel(location);
  renderPlaceDirectory(location);
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
    const node = option(theme.id, theme.name, { canonical: true });
    node.title = theme.description;
    selectors.theme.append(node);
  }
  const params = new URLSearchParams(location.search);
  applyMapTheme(params.get("mapTheme") || storage.get("akashic-atlas-theme") || state.themes.defaultTheme, { updateUrl: false });
}

function setupPageTheme() {
  const update = () => {
    const light = document.documentElement.dataset.theme === "light";
    selectors.themeToggle.setAttribute("aria-label", t(light ? "runtime.theme.dark" : "runtime.theme.light"));
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
  for (const button of selectors.scopeButtons) {
    button.addEventListener("click", () => {
      if (button.dataset.atlasScope === state.resourceScope) return;
      state.resourceScope = button.dataset.atlasScope;
      renderResources(currentLocation(), { requestedSection: state.resourceSection });
      writeUrl();
    });
  }
  window.addEventListener("popstate", () => {
    const params = new URLSearchParams(location.search);
    applyMapTheme(params.get("mapTheme") || state.themes.defaultTheme, { updateUrl: false });
    setLocation(params.get("place") || state.atlas.rootId, { historyMode: "none", resourceSection: params.get("section") || "", resourceScope: params.get("scope") || "all" });
  });
}

async function initialize() {
  setupPageTheme();
  try {
    const [atlas, themes] = await Promise.all([
      fetch(new URL("./data/atlas.json", import.meta.url)).then((response) => response.ok ? response.json() : Promise.reject(new Error("Atlas data did not load."))),
      fetch(new URL("./data/atlas-themes.json", import.meta.url)).then((response) => response.ok ? response.json() : Promise.reject(new Error("Atlas themes did not load."))),
    ]);
    Object.assign(state, {
      atlas,
      themes,
      locationById: new Map(atlas.locations.map((location) => [location.id, location])),
      inheritanceById: new Map(atlas.inheritance.map((edge) => [edge.id, edge])),
      resourceByAssociationId: new Map(atlas.resources.map((resource) => [resource.associationId, resource])),
    });
    setupThemes();
    bindEvents();
    const params = new URLSearchParams(location.search);
    const requested = params.get("place") || atlas.rootId;
    setLocation(requested, { historyMode: "replace", resourceSection: params.get("section") || "", resourceScope: params.get("scope") || "all" });
    const [world, states] = await Promise.allSettled([
      fetch(new URL("./data/geometry/countries-110m.json", import.meta.url)).then((response) => response.ok ? response.json() : Promise.reject(new Error("World geometry did not load."))),
      fetch(new URL("./data/geometry/states-albers-10m.json", import.meta.url)).then((response) => response.ok ? response.json() : Promise.reject(new Error("U.S. geometry did not load."))),
    ]);
    state.world = world.status === "fulfilled" ? world.value : null;
    state.states = states.status === "fulfilled" ? states.value : null;
    state.geometryReady = true;
    if (world.status === "rejected") console.warn(world.reason);
    if (states.status === "rejected") console.warn(states.reason);
    renderMap(currentLocation());
    selectors.loading.hidden = true;
  } catch (error) {
    selectors.loading.replaceChildren();
    const message = document.createElement("p");
    message.textContent = t("runtime.atlas.error");
    const link = document.createElement("a");
    link.href = "https://github.com/egohygiene/akashic/tree/main/atlas";
    link.textContent = t("runtime.atlas.openSource");
    selectors.loading.append(message, link);
    console.error(error);
  }
}

initialize();
