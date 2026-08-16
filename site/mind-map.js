const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const WIDTH = 1200;
const HEIGHT = 700;
const COLORS = ["#ff66c8", "#9a7cff", "#66e8df", "#ff9a6b", "#8ee06f", "#62a8ff"];

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NAMESPACE, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}

function labelLines(value, maximumLength = 20, maximumLines = 3) {
  const words = value.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maximumLength && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maximumLines) return lines;
  const visible = lines.slice(0, maximumLines);
  visible[maximumLines - 1] = `${visible[maximumLines - 1].replace(/[.\s]+$/, "")}…`;
  return visible;
}

function addText(group, text, options = {}) {
  const lines = labelLines(text, options.maximumLength, options.maximumLines);
  const element = svgElement("text", {
    class: options.className || "map-node-label",
    "text-anchor": "middle",
    x: options.x || 0,
    y: (options.y || 0) - ((lines.length - 1) * 8),
  });
  lines.forEach((line, index) => {
    const span = svgElement("tspan", { x: options.x || 0, dy: index === 0 ? 0 : 17 });
    span.textContent = line;
    element.append(span);
  });
  group.append(element);
}

export function createMindMap({ catalog, container, select, topicSelect, back, status, advisory, zoomIn, zoomOut, reset, initialCategory, onNavigate }) {
  const svg = svgElement("svg", {
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    "aria-hidden": "true",
    focusable: "false",
    preserveAspectRatio: "xMidYMid meet",
  });
  const stage = svgElement("g", { class: "map-stage" });
  svg.append(stage);
  container.replaceChildren(svg);

  let focusedCategory = null;
  let scale = 1;
  let panX = 0;
  let panY = 0;
  let pointer = null;

  for (const category of catalog.categories) {
    const option = document.createElement("option");
    option.value = category.slug;
    option.textContent = category.title;
    select.append(option);
  }

  function updateTransform() {
    stage.setAttribute("transform", `translate(${WIDTH / 2 + panX} ${HEIGHT / 2 + panY}) scale(${scale}) translate(${-WIDTH / 2} ${-HEIGHT / 2})`);
  }

  function resetView() {
    scale = 1;
    panX = 0;
    panY = 0;
    updateTransform();
  }

  function edge(x1, y1, x2, y2, color) {
    stage.append(svgElement("line", { x1, y1, x2, y2, class: "map-edge", style: `--edge-color:${color}` }));
  }

  function node({ x, y, radius, title, subtitle, color, className, action }) {
    const group = svgElement("g", {
      class: `map-node ${className}`,
      transform: `translate(${x} ${y})`,
      style: `--node-color:${color}`,
    });
    const fullTitle = svgElement("title");
    fullTitle.textContent = `${title}${subtitle ? ` — ${subtitle}` : ""}`;
    group.append(fullTitle);
    group.append(svgElement("circle", { r: radius, class: "map-node-halo" }));
    group.append(svgElement("circle", { r: radius - 5, class: "map-node-core" }));
    addText(group, title, {
      className: "map-node-label",
      maximumLength: radius > 70 ? 22 : 17,
      maximumLines: 3,
      y: subtitle ? -6 : 4,
    });
    if (subtitle) {
      const detail = svgElement("text", { class: "map-node-detail", "text-anchor": "middle", x: 0, y: radius > 70 ? 34 : 30 });
      detail.textContent = subtitle;
      group.append(detail);
    }
    if (action) group.addEventListener("click", action);
    stage.append(group);
  }

  function renderOverview() {
    stage.replaceChildren();
    const centerX = WIDTH / 2;
    const centerY = HEIGHT / 2;
    const categories = catalog.categories;
    categories.forEach((category, index) => {
      const angle = -Math.PI / 2 + (index / categories.length) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * 490;
      const y = centerY + Math.sin(angle) * 285;
      const color = COLORS[index % COLORS.length];
      edge(centerX, centerY, x, y, color);
      node({
        x, y, radius: categories.length > 16 ? 45 : 50, title: category.title, subtitle: `${category.count}`,
        color, className: "map-category-node",
        action: () => focus(category.slug),
      });
    });
    node({
      x: centerX, y: centerY, radius: 92, title: "akashic", subtitle: `${catalog.resourceCount.toLocaleString()} resources`,
      color: "#ff66c8", className: "map-root-node",
    });
    status.textContent = `${categories.length} collections orbit akashic. Select one to reveal its topics.`;
    advisory.hidden = true;
  }

  function renderFocus(category) {
    stage.replaceChildren();
    const centerX = WIDTH / 2;
    const centerY = HEIGHT / 2;
    const color = COLORS[catalog.categories.indexOf(category) % COLORS.length];
    const sections = category.sections;
    const visibleSections = sections.length > 28
      ? [...sections].sort((a, b) => b.count - a.count || a.title.localeCompare(b.title)).slice(0, 28)
      : sections;
    const maximumPerRing = 14;
    const ringCount = Math.max(1, Math.ceil(visibleSections.length / maximumPerRing));
    visibleSections.forEach((section, index) => {
      const ring = index % ringCount;
      const ringItems = visibleSections.filter((_, itemIndex) => itemIndex % ringCount === ring);
      const ringIndex = Math.floor(index / ringCount);
      const angle = -Math.PI / 2 + (ringIndex / ringItems.length) * Math.PI * 2 + ring * 0.14;
      const ringProgress = ringCount === 1 ? 1 : ring / (ringCount - 1);
      const radiusX = ringCount === 1 ? 400 : 190 + ringProgress * 330;
      const radiusY = ringCount === 1 ? 245 : 155 + ringProgress * 150;
      const nodeRadius = visibleSections.length > 14 ? 39 : 49;
      const x = centerX + Math.cos(angle) * radiusX;
      const y = centerY + Math.sin(angle) * radiusY;
      edge(centerX, centerY, x, y, color);
      node({
        x, y, radius: nodeRadius, title: section.title, subtitle: `${section.count}`,
        color, className: "map-section-node",
        action: () => navigate(category, section.title),
      });
    });
    node({
      x: centerX, y: centerY, radius: 100, title: category.title, subtitle: `${category.count} resources`,
      color, className: "map-root-node",
      action: () => focus(""),
    });
    status.textContent = sections.length > visibleSections.length
      ? `Showing ${visibleSections.length} high-signal topics from ${category.title}. Use the Topic menu to reach all ${sections.length}.`
      : `${category.title} contains ${sections.length} topics. Select one to filter the resource catalog.`;
    advisory.textContent = category.advisory;
    advisory.hidden = !category.advisory;
  }

  function populateTopics(category) {
    topicSelect.replaceChildren();
    const prompt = document.createElement("option");
    prompt.value = "";
    prompt.textContent = category ? "Choose a topic…" : "Choose a collection first";
    topicSelect.append(prompt);
    for (const section of category?.sections || []) {
      const option = document.createElement("option");
      option.value = section.title;
      option.textContent = `${section.title} (${section.count})`;
      topicSelect.append(option);
    }
    topicSelect.disabled = !category;
    topicSelect.value = "";
  }

  function navigate(category, section) {
    topicSelect.value = section;
    onNavigate(category.slug, section);
  }

  function focus(slug) {
    focusedCategory = catalog.categories.find((category) => category.slug === slug) || null;
    select.value = focusedCategory?.slug || "";
    populateTopics(focusedCategory);
    back.hidden = !focusedCategory;
    resetView();
    focusedCategory ? renderFocus(focusedCategory) : renderOverview();
  }

  select.addEventListener("change", () => focus(select.value));
  topicSelect.addEventListener("change", () => {
    if (focusedCategory && topicSelect.value) navigate(focusedCategory, topicSelect.value);
  });
  back.addEventListener("click", () => focus(""));
  zoomIn.addEventListener("click", () => { scale = Math.min(1.8, scale + 0.15); updateTransform(); });
  zoomOut.addEventListener("click", () => { scale = Math.max(0.7, scale - 0.15); updateTransform(); });
  reset.addEventListener("click", resetView);
  svg.addEventListener("wheel", (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    scale = Math.max(0.7, Math.min(1.8, scale + (event.deltaY < 0 ? 0.08 : -0.08)));
    updateTransform();
  }, { passive: false });
  svg.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch" || event.button !== 0 || event.target.closest(".map-node")) return;
    const bounds = svg.getBoundingClientRect();
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, panX, panY, width: bounds.width, height: bounds.height };
    svg.setPointerCapture(event.pointerId);
    svg.classList.add("is-panning");
  });
  svg.addEventListener("pointermove", (event) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    panX = pointer.panX + (event.clientX - pointer.x) * WIDTH / pointer.width;
    panY = pointer.panY + (event.clientY - pointer.y) * HEIGHT / pointer.height;
    updateTransform();
  });
  svg.addEventListener("pointerup", () => { pointer = null; svg.classList.remove("is-panning"); });
  svg.addEventListener("pointercancel", () => { pointer = null; svg.classList.remove("is-panning"); });

  focus(initialCategory);
  return { focus };
}
