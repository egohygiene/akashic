const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const DESKTOP = { width: 1200, height: 700 };
const MOBILE = { width: 360, height: 520 };
const MIN_SCALE = 0.72;
const MAX_SCALE = 1.9;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NAMESPACE, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}

function fittedLabel(title, radius, mobile) {
  const maximumLines = 3;
  const maximumCharacters = Math.max(6, Math.floor(radius / (mobile ? 3.25 : 3.7)));
  const words = title.split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maximumCharacters || !current) current = candidate;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  const visible = lines.slice(0, maximumLines);
  if (lines.length > maximumLines) {
    visible[maximumLines - 1] = `${visible[maximumLines - 1].slice(0, Math.max(3, maximumCharacters - 1)).replace(/[.\s]+$/, "")}…`;
  }
  const longest = Math.max(...visible.map((line) => line.length), 1);
  const widthLimited = (radius * 1.48) / (longest * 0.57);
  const fontSize = Math.max(mobile ? 5.2 : 7.2, Math.min(mobile ? 9 : 11.5, widthLimited));
  return { lines: visible, fontSize };
}

function valueForTopic(groupSlug, section) {
  return `${encodeURIComponent(groupSlug || "")}~${encodeURIComponent(section)}`;
}

function topicFromValue(value) {
  const [groupSlug = "", section = ""] = value.split("~");
  return { groupSlug: decodeURIComponent(groupSlug), section: decodeURIComponent(section) };
}

export function createMindMap({
  catalog, container, select, topicSelect, back, status, advisory, zoomIn, zoomOut, reset,
  expand, zoomLevel, breadcrumb, branchList, shell, detail, initialSelection, onSelection,
}) {
  const svg = svgElement("svg", {
    viewBox: `0 0 ${DESKTOP.width} ${DESKTOP.height}`,
    role: "group",
    "aria-label": "Interactive map of the akashic knowledge collection",
    preserveAspectRatio: "xMidYMid meet",
  });
  const backdrop = svgElement("g", { class: "map-backdrop", "aria-hidden": "true" });
  const stage = svgElement("g", { class: "map-stage" });
  svg.append(backdrop, stage);
  container.replaceChildren(svg);

  let dimensions = DESKTOP;
  let selection = { categorySlug: "", groupSlug: "", section: "" };
  let scale = 1;
  let panX = 0;
  let panY = 0;
  let expanded = false;
  let detailAction = null;
  let lastLayoutMode = "desktop";
  const activePointers = new Map();
  let dragStart = null;
  let pinchStart = null;

  for (const category of catalog.categories) {
    const option = document.createElement("option");
    option.value = category.slug;
    option.textContent = `${category.title} (${category.count.toLocaleString()})`;
    select.append(option);
  }

  function categoryFor(slug = selection.categorySlug) {
    return catalog.categories.find((category) => category.slug === slug) || null;
  }

  function groupFor(category, slug = selection.groupSlug) {
    if (!category) return null;
    return category.groups.find((group) => group.slug === slug) || (category.groups.length === 1 ? category.groups[0] : null);
  }

  function clampPan() {
    const allowanceX = dimensions.width * Math.max(0, scale - 0.65) * 0.45;
    const allowanceY = dimensions.height * Math.max(0, scale - 0.65) * 0.45;
    panX = Math.max(-allowanceX, Math.min(allowanceX, panX));
    panY = Math.max(-allowanceY, Math.min(allowanceY, panY));
  }

  function updateTransform() {
    clampPan();
    stage.setAttribute("transform", `translate(${dimensions.width / 2 + panX} ${dimensions.height / 2 + panY}) scale(${scale}) translate(${-dimensions.width / 2} ${-dimensions.height / 2})`);
    zoomLevel.value = `${Math.round(scale * 100)}%`;
    zoomLevel.textContent = `${Math.round(scale * 100)}%`;
    zoomIn.disabled = scale >= MAX_SCALE;
    zoomOut.disabled = scale <= MIN_SCALE;
  }

  function resetView() {
    scale = 1;
    panX = 0;
    panY = 0;
    updateTransform();
  }

  function zoomBy(amount, anchor) {
    const previousScale = scale;
    const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, previousScale + amount));
    if (nextScale === previousScale) return;
    const point = anchor || { x: dimensions.width / 2, y: dimensions.height / 2 };
    const worldX = dimensions.width / 2 + (point.x - dimensions.width / 2 - panX) / previousScale;
    const worldY = dimensions.height / 2 + (point.y - dimensions.height / 2 - panY) / previousScale;
    scale = nextScale;
    panX = point.x - dimensions.width / 2 - scale * (worldX - dimensions.width / 2);
    panY = point.y - dimensions.height / 2 - scale * (worldY - dimensions.height / 2);
    updateTransform();
  }

  function edge(x1, y1, radius1, x2, y2, radius2, color, index) {
    const distance = Math.hypot(x2 - x1, y2 - y1) || 1;
    const directionX = (x2 - x1) / distance;
    const directionY = (y2 - y1) / distance;
    const startX = x1 + directionX * Math.max(0, radius1 - 5);
    const startY = y1 + directionY * Math.max(0, radius1 - 5);
    const endX = x2 - directionX * (radius2 + 7);
    const endY = y2 - directionY * (radius2 + 7);
    const bend = index % 2 === 0 ? 0.065 : -0.065;
    const middleX = (startX + endX) / 2 + (endY - startY) * bend;
    const middleY = (startY + endY) / 2 - (endX - startX) * bend;
    stage.append(svgElement("path", {
      d: `M ${startX} ${startY} Q ${middleX} ${middleY} ${endX} ${endY}`,
      class: "map-edge",
      style: `--edge-color:${color};--node-index:${index};--node-delay:${index * 16}ms`,
      "data-edge": index,
    }));
  }

  function showDetail(item) {
    detail.kicker.textContent = item.kicker || "Knowledge map";
    detail.glyph.textContent = item.glyph || "✦";
    detail.glyph.style.setProperty("--detail-color", item.color || "#d1459f");
    detail.title.textContent = item.title;
    detail.copy.textContent = item.description || "Follow this branch to explore its curated resources.";
    detail.count.textContent = Number(item.count || 0).toLocaleString();
    detail.branches.textContent = Number(item.branches || 0).toLocaleString();
    detailAction = item.action || null;
    detail.action.hidden = !detailAction;
    if (detailAction) detail.action.firstChild.textContent = item.actionLabel || "Explore resources ";
  }

  function highlight(index, item) {
    stage.querySelectorAll(".map-node[data-node-index], .map-edge[data-edge]").forEach((element) => {
      const related = element.getAttribute("data-node-index") === String(index) || element.getAttribute("data-edge") === String(index);
      element.classList.toggle("is-highlighted", related);
      element.classList.toggle("is-dimmed", !related);
    });
    showDetail(item);
  }

  function node({ x, y, radius, title, subtitle, color, className = "", action, selected = false, index = -1, detailItem }) {
    const attributes = {
      class: `map-node ${action ? "is-actionable" : ""} ${selected ? "is-selected" : ""} ${className}`.trim(),
      transform: `translate(${x} ${y})`,
      style: `--node-color:${color};--node-index:${Math.max(0, index)};--node-delay:${Math.max(0, index) * 16}ms`,
    };
    if (index >= 0) attributes["data-node-index"] = index;
    if (action) {
      attributes.role = "button";
      attributes.tabindex = "0";
      attributes["aria-label"] = `${title}, ${subtitle}. Activate to explore.`;
      if (selected) attributes["aria-current"] = "true";
    }
    const group = svgElement("g", attributes);
    const fullTitle = svgElement("title");
    fullTitle.textContent = `${title}${subtitle ? ` — ${subtitle} resources` : ""}`;
    group.append(fullTitle);
    group.append(svgElement("circle", { r: radius + 13, class: "map-node-aura" }));
    group.append(svgElement("circle", { r: radius + (selected ? 5 : 0), class: "map-node-halo" }));
    group.append(svgElement("circle", { r: radius - 5, class: "map-node-core" }));
    const label = fittedLabel(title, radius, dimensions === MOBILE);
    const lineHeight = label.fontSize * 1.16;
    const labelText = svgElement("text", {
      class: "map-node-label",
      "text-anchor": "middle",
      x: 0,
      y: -((label.lines.length - 1) * lineHeight) / 2 - (subtitle ? label.fontSize * 0.22 : 0),
      style: `--map-label-size:${label.fontSize}px`,
    });
    label.lines.forEach((line, lineIndex) => {
      const span = svgElement("tspan", { x: 0, dy: lineIndex ? lineHeight : 0 });
      span.textContent = line;
      labelText.append(span);
    });
    group.append(labelText);
    if (subtitle) {
      const detailText = svgElement("text", { class: "map-node-count", "text-anchor": "middle", x: 0, y: radius - (dimensions === MOBILE ? 8 : 10) });
      detailText.textContent = subtitle;
      group.append(detailText);
    }
    if (action) {
      group.addEventListener("click", action);
      group.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          action();
          window.setTimeout(() => { if (document.activeElement === document.body) (back.hidden ? select : back).focus(); }, 0);
        }
      });
      group.addEventListener("mouseenter", () => highlight(index, detailItem));
      group.addEventListener("focus", () => highlight(index, detailItem));
    }
    stage.append(group);
  }

  function radiusForItem(item, items) {
    const mobile = dimensions === MOBILE;
    const minimum = mobile ? (items.length > 14 ? 24 : 28) : (items.length > 15 ? 37 : 42);
    const maximum = mobile ? (items.length > 14 ? 37 : 43) : (items.length > 15 ? 58 : 68);
    const values = items.map((candidate) => Math.log1p(candidate.count || 1));
    const low = Math.min(...values);
    const high = Math.max(...values);
    const ratio = high === low ? 0.5 : (Math.log1p(item.count || 1) - low) / (high - low);
    return minimum + Math.sqrt(Math.max(0, ratio)) * (maximum - minimum);
  }

  function positions(items, rootRadius) {
    const mobile = dimensions === MOBILE;
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const horizontalRange = mobile ? 142 : 505;
    const verticalRange = mobile ? 218 : 286;
    const gap = mobile ? 10 : 19;
    const points = items.map((item, index) => {
      const radius = radiusForItem(item, items);
      const angle = -Math.PI / 2 + index * GOLDEN_ANGLE;
      const orbit = items.length <= 8 ? 0.9 : 0.58 + 0.42 * Math.sqrt((index + 0.65) / items.length);
      const x = centerX + Math.cos(angle) * horizontalRange * orbit;
      const y = centerY + Math.sin(angle) * verticalRange * orbit;
      return { x, y, anchorX: x, anchorY: y, radius };
    });

    for (let iteration = 0; iteration < 180; iteration += 1) {
      const attraction = iteration < 80 ? 0.022 : 0.01;
      for (const point of points) {
        point.x += (point.anchorX - point.x) * attraction;
        point.y += (point.anchorY - point.y) * attraction;
        const fromRootX = point.x - centerX;
        const fromRootY = point.y - centerY;
        const rootDistance = Math.hypot(fromRootX, fromRootY) || 1;
        const rootMinimum = rootRadius + point.radius + gap + (mobile ? 4 : 9);
        if (rootDistance < rootMinimum) {
          const push = rootMinimum - rootDistance;
          point.x += fromRootX / rootDistance * push;
          point.y += fromRootY / rootDistance * push;
        }
      }
      for (let first = 0; first < points.length; first += 1) {
        for (let second = first + 1; second < points.length; second += 1) {
          const a = points[first];
          const b = points[second];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let distance = Math.hypot(dx, dy);
          if (!distance) { dx = 0.01; dy = 0.01; distance = Math.hypot(dx, dy); }
          const minimum = a.radius + b.radius + gap;
          if (distance >= minimum) continue;
          const push = (minimum - distance) / 2;
          a.x -= dx / distance * push;
          a.y -= dy / distance * push;
          b.x += dx / distance * push;
          b.y += dy / distance * push;
        }
      }
      for (const point of points) {
        const margin = mobile ? 8 : 22;
        point.x = Math.max(point.radius + margin, Math.min(dimensions.width - point.radius - margin, point.x));
        point.y = Math.max(point.radius + margin, Math.min(dimensions.height - point.radius - margin, point.y));
      }
    }
    return points;
  }

  function renderChildren(items, root, itemAction) {
    const rootRadius = dimensions === MOBILE ? 54 : 80;
    const points = positions(items, rootRadius);
    stage.append(svgElement("ellipse", { cx: dimensions.width / 2, cy: dimensions.height / 2, rx: dimensions === MOBILE ? 146 : 515, ry: dimensions === MOBILE ? 224 : 296, class: "map-orbit map-orbit-outer", style: `--edge-color:${root.color}` }));
    stage.append(svgElement("circle", { cx: dimensions.width / 2, cy: dimensions.height / 2, r: rootRadius + (dimensions === MOBILE ? 19 : 28), class: "map-pack-core", style: `--edge-color:${root.color}` }));
    items.forEach((item, index) => {
      const point = points[index];
      edge(dimensions.width / 2, dimensions.height / 2, rootRadius, point.x, point.y, point.radius, root.color, index);
      node({
        x: point.x, y: point.y, radius: point.radius, title: item.title, subtitle: `${item.count.toLocaleString()}`,
        color: root.color, className: item.className, selected: item.selected, index,
        action: () => itemAction(item), detailItem: item.detail,
      });
    });
  }

  function currentContext() {
    const category = categoryFor();
    const group = groupFor(category);
    const section = group?.sections.find((item) => item.title === selection.section)
      || category?.sections.find((item) => item.title === selection.section);
    return { category, group, section };
  }

  function browseCurrent() {
    if (expanded) toggleExpanded(false, false);
    onSelection({ ...selection, intent: "browse" });
  }

  function browseRoot() {
    const category = categoryFor();
    const group = groupFor(category);
    applySelection({ categorySlug: category?.slug || "", groupSlug: group?.slug || "", section: "" }, { emit: true, browse: true });
  }

  function showCurrentDetail() {
    const { category, group, section } = currentContext();
    if (!category) {
      showDetail({ kicker: "The full constellation", glyph: "∞", color: "#d1459f", title: "akashic", description: "Choose a constellation to reveal its branches and discover where your curiosity leads.", count: catalog.resourceCount, branches: catalog.categories.length });
      return;
    }
    if (section) {
      showDetail({ kicker: group?.slug ? group.title : category.title, glyph: category.glyph, color: category.color, title: section.title, description: `A focused topic within ${group?.slug ? `${group.title}, part of ` : ""}${category.title}.`, count: section.count, branches: 1, action: browseCurrent, actionLabel: `View ${section.count.toLocaleString()} resources ` });
      return;
    }
    if (group?.slug) {
      showDetail({ kicker: category.title, glyph: category.glyph, color: category.color, title: group.title, description: `A focused subcollection inside ${category.title}, organized into ${group.sections.length.toLocaleString()} topics.`, count: group.count, branches: group.sections.length, action: browseCurrent, actionLabel: `View all ${group.count.toLocaleString()} resources ` });
      return;
    }
    showDetail({ kicker: "Collection", glyph: category.glyph, color: category.color, title: category.title, description: category.description, count: category.count, branches: category.groups.length > 1 ? category.groups.length : category.sections.length, action: browseCurrent, actionLabel: `View all ${category.count.toLocaleString()} resources ` });
  }

  function renderOverview() {
    const items = catalog.categories.map((category) => ({
      ...category,
      className: "map-category-node",
      detail: { kicker: "Collection", glyph: category.glyph, color: category.color, title: category.title, description: category.description, count: category.count, branches: category.groups.length > 1 ? category.groups.length : category.sections.length, action: () => applySelection({ categorySlug: category.slug }, { emit: true }), actionLabel: "Open this collection " },
    }));
    renderChildren(items, { color: "#d1459f" }, (category) => applySelection({ categorySlug: category.slug }, { emit: true }));
    node({ x: dimensions.width / 2, y: dimensions.height / 2, radius: dimensions === MOBILE ? 54 : 80, title: "akashic", subtitle: `${catalog.resourceCount.toLocaleString()}`, color: "#d1459f", className: "map-root-node" });
    status.textContent = `${catalog.categories.length} collections orbit akashic. Select one to reveal its branches.`;
  }

  function renderFocus(category) {
    const group = groupFor(category);
    const showingGroups = category.groups.length > 1 && !selection.groupSlug;
    const children = showingGroups ? category.groups : (group?.sections || category.sections);
    const items = children.map((item) => {
      const selected = !showingGroups && item.title === selection.section;
      return {
        ...item,
        selected,
        className: showingGroups ? "map-group-node" : "map-section-node",
        detail: showingGroups
          ? { kicker: category.title, glyph: category.glyph, color: category.color, title: item.title, description: `A ${item.sections.length.toLocaleString()}-topic branch inside ${category.title}.`, count: item.count, branches: item.sections.length, action: () => applySelection({ categorySlug: category.slug, groupSlug: item.slug }, { emit: true }), actionLabel: "Open this branch " }
          : { kicker: group?.slug ? group.title : category.title, glyph: category.glyph, color: category.color, title: item.title, description: `A focused topic within ${category.title}.`, count: item.count, branches: 1, action: () => applySelection({ categorySlug: category.slug, groupSlug: group?.slug || "", section: item.title }, { emit: true, browse: true }), actionLabel: `View ${item.count.toLocaleString()} resources ` },
      };
    });
    renderChildren(items, category, (item) => {
      if (showingGroups) applySelection({ categorySlug: category.slug, groupSlug: item.slug }, { emit: true });
      else applySelection({ categorySlug: category.slug, groupSlug: group?.slug || "", section: item.title }, { emit: true, browse: true });
    });
    const rootTitle = group?.slug ? group.title : category.title;
    const rootCount = group?.slug ? group.count : category.count;
    node({ x: dimensions.width / 2, y: dimensions.height / 2, radius: dimensions === MOBILE ? 56 : 82, title: rootTitle, subtitle: `${rootCount.toLocaleString()}`, color: category.color, className: "map-root-node", action: browseRoot, detailItem: { title: rootTitle, count: rootCount, branches: children.length, color: category.color, glyph: category.glyph } });
    status.textContent = showingGroups ? `${category.title} contains ${children.length} subcollections. Choose one to reveal every topic.` : `${rootTitle} contains ${children.length} topics. Select one to explore its resources.`;
  }

  function populateTopics(category) {
    topicSelect.replaceChildren();
    const prompt = document.createElement("option");
    prompt.value = "";
    prompt.textContent = category ? "Choose a topic…" : "Choose a collection first";
    topicSelect.append(prompt);
    for (const group of category?.groups || []) {
      const parent = category.groups.length > 1 ? document.createElement("optgroup") : topicSelect;
      if (parent !== topicSelect) parent.label = group.title;
      for (const section of group.sections) {
        const option = document.createElement("option");
        option.value = valueForTopic(group.slug, section.title);
        option.textContent = `${section.title} (${section.count.toLocaleString()})`;
        parent.append(option);
      }
      if (parent !== topicSelect) topicSelect.append(parent);
    }
    topicSelect.disabled = !category;
    topicSelect.value = selection.section ? valueForTopic(selection.groupSlug, selection.section) : "";
  }

  function renderBreadcrumb() {
    breadcrumb.replaceChildren();
    const addSegment = (label, nextSelection, current = false) => {
      if (breadcrumb.childElementCount) {
        const divider = document.createElement("span");
        divider.textContent = "/";
        divider.setAttribute("aria-hidden", "true");
        breadcrumb.append(divider);
      }
      if (current) {
        const text = document.createElement("strong");
        text.textContent = label;
        breadcrumb.append(text);
      } else {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.addEventListener("click", (event) => {
          applySelection(nextSelection, { emit: true });
          if (event.detail === 0) window.setTimeout(() => (back.hidden ? select : back).focus(), 0);
        });
        breadcrumb.append(button);
      }
    };
    const { category, group } = currentContext();
    addSegment("akashic", {}, !category);
    if (category) addSegment(category.title, { categorySlug: category.slug }, !group?.slug && !selection.section);
    if (group?.slug) addSegment(group.title, { categorySlug: category.slug, groupSlug: group.slug }, !selection.section);
    if (selection.section) addSegment(selection.section, selection, true);
  }

  function renderBranches() {
    const { category, group } = currentContext();
    const children = !category ? catalog.categories : category.groups.length > 1 && !selection.groupSlug ? category.groups : (group?.sections || category.sections);
    branchList.replaceChildren();
    const label = document.createElement("p");
    label.textContent = !category ? "Collections" : category.groups.length > 1 && !selection.groupSlug ? "Subcollections" : "Topics";
    branchList.append(label);
    for (const item of children) {
      const isCategory = !category;
      const isGroup = category && category.groups.length > 1 && !selection.groupSlug;
      const button = document.createElement("button");
      button.type = "button";
      const title = document.createElement("span");
      title.textContent = item.title;
      const count = document.createElement("b");
      count.textContent = item.count.toLocaleString();
      button.append(title, count);
      if (!isCategory && !isGroup && selection.section === item.title) button.setAttribute("aria-pressed", "true");
      button.addEventListener("click", (event) => {
        if (isCategory) applySelection({ categorySlug: item.slug }, { emit: true });
        else if (isGroup) applySelection({ categorySlug: category.slug, groupSlug: item.slug }, { emit: true });
        else applySelection({ categorySlug: category.slug, groupSlug: group?.slug || "", section: item.title }, { emit: true, browse: true });
        if (event.detail === 0 && (isCategory || isGroup)) window.setTimeout(() => back.focus(), 0);
      });
      branchList.append(button);
    }
    branchList.hidden = false;
  }

  function render() {
    stage.replaceChildren();
    stage.classList.remove("is-entering");
    void stage.getBoundingClientRect();
    stage.classList.add("is-entering");
    const category = categoryFor();
    category ? renderFocus(category) : renderOverview();
    advisory.textContent = category?.advisory || "";
    advisory.hidden = !category?.advisory;
    select.value = category?.slug || "";
    populateTopics(category);
    renderBreadcrumb();
    renderBranches();
    back.hidden = !category;
    showCurrentDetail();
    updateTransform();
  }

  function normalizeSelection(next) {
    const category = categoryFor(next.categorySlug || "");
    if (!category) return { categorySlug: "", groupSlug: "", section: "" };
    let group = category.groups.find((item) => item.slug === (next.groupSlug || "")) || null;
    if (!group && next.section) group = category.groups.find((item) => item.sections.some((section) => section.title === next.section)) || null;
    if (!group && category.groups.length === 1) group = category.groups[0];
    const section = (group?.sections || category.sections).some((item) => item.title === next.section) ? next.section : "";
    return { categorySlug: category.slug, groupSlug: group?.slug || "", section };
  }

  function applySelection(next, options = {}) {
    selection = normalizeSelection(next);
    resetView();
    render();
    if (options.emit) {
      if (options.browse && expanded) toggleExpanded(false, false);
      onSelection({ ...selection, intent: options.browse ? "browse" : "focus" });
    }
  }

  function goBack() {
    if (selection.section) applySelection({ categorySlug: selection.categorySlug, groupSlug: selection.groupSlug }, { emit: true });
    else if (selection.groupSlug) applySelection({ categorySlug: selection.categorySlug }, { emit: true });
    else applySelection({}, { emit: true });
    if (back.hidden) select.focus();
  }

  function toggleExpanded(force, restoreFocus = true) {
    expanded = typeof force === "boolean" ? force : !expanded;
    shell.classList.toggle("is-expanded", expanded);
    document.body.classList.toggle("map-expanded", expanded);
    expand.setAttribute("aria-label", expanded ? "Close expanded mind map" : "Expand mind map");
    expand.setAttribute("aria-expanded", String(expanded));
    expand.querySelector(".control-label").textContent = expanded ? "Close" : "Expand";
    if (expanded) {
      shell.setAttribute("role", "dialog");
      shell.setAttribute("aria-modal", "true");
      shell.setAttribute("aria-label", "Expanded knowledge map");
    } else {
      shell.removeAttribute("role");
      shell.removeAttribute("aria-modal");
      shell.removeAttribute("aria-label");
      if (restoreFocus) window.setTimeout(() => expand.focus(), 0);
    }
    resetView();
  }

  function updateDimensions() {
    const nextMode = container.clientWidth < 700 ? "mobile" : "desktop";
    if (nextMode === lastLayoutMode) return;
    lastLayoutMode = nextMode;
    dimensions = nextMode === "mobile" ? MOBILE : DESKTOP;
    svg.setAttribute("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`);
    resetView();
    render();
  }

  select.addEventListener("change", () => applySelection({ categorySlug: select.value }, { emit: true }));
  topicSelect.addEventListener("change", () => {
    if (!topicSelect.value) {
      applySelection({ categorySlug: selection.categorySlug, groupSlug: selection.groupSlug, section: "" }, { emit: true });
      return;
    }
    const topic = topicFromValue(topicSelect.value);
    applySelection({ categorySlug: selection.categorySlug, ...topic }, { emit: true, browse: true });
  });
  back.addEventListener("click", goBack);
  zoomIn.addEventListener("click", () => zoomBy(0.15));
  zoomOut.addEventListener("click", () => zoomBy(-0.15));
  reset.addEventListener("click", resetView);
  expand.addEventListener("click", () => toggleExpanded());
  detail.action.addEventListener("click", () => detailAction?.());
  svg.addEventListener("wheel", (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const bounds = svg.getBoundingClientRect();
    zoomBy(event.deltaY < 0 ? 0.09 : -0.09, { x: (event.clientX - bounds.left) * dimensions.width / bounds.width, y: (event.clientY - bounds.top) * dimensions.height / bounds.height });
  }, { passive: false });
  svg.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest(".map-node")) return;
    if (event.pointerType === "touch" && !expanded) return;
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    svg.setPointerCapture(event.pointerId);
    svg.classList.add("is-panning");
    if (activePointers.size === 1) dragStart = { x: event.clientX, y: event.clientY, panX, panY };
    if (activePointers.size === 2) {
      const points = [...activePointers.values()];
      pinchStart = { distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y), scale };
    }
  });
  svg.addEventListener("pointermove", (event) => {
    if (!activePointers.has(event.pointerId)) return;
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const bounds = svg.getBoundingClientRect();
    if (activePointers.size === 2 && pinchStart) {
      const points = [...activePointers.values()];
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const target = Math.max(MIN_SCALE, Math.min(MAX_SCALE, pinchStart.scale * distance / pinchStart.distance));
      zoomBy(target - scale);
    } else if (dragStart) {
      panX = dragStart.panX + (event.clientX - dragStart.x) * dimensions.width / bounds.width;
      panY = dragStart.panY + (event.clientY - dragStart.y) * dimensions.height / bounds.height;
      updateTransform();
    }
  });
  function releasePointer(event) {
    activePointers.delete(event.pointerId);
    dragStart = null;
    pinchStart = null;
    if (!activePointers.size) svg.classList.remove("is-panning");
  }
  svg.addEventListener("pointerup", releasePointer);
  svg.addEventListener("pointercancel", releasePointer);
  svg.addEventListener("lostpointercapture", releasePointer);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && expanded) { event.preventDefault(); toggleExpanded(false); }
    if (event.key === "Tab" && expanded) {
      const focusable = [...shell.querySelectorAll('button:not([disabled]), select:not([disabled]), [href], [tabindex="0"]')]
        .filter((element) => !element.hidden && element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      else if (!shell.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
    }
  });
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(updateDimensions).observe(container);

  lastLayoutMode = container.clientWidth < 700 ? "desktop" : "mobile";
  updateDimensions();
  applySelection(initialSelection || {}, { emit: false });

  return {
    setSelection(next) { applySelection(next, { emit: false }); },
    close() { if (expanded) toggleExpanded(false); },
  };
}
