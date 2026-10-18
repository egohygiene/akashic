// Presentation-only labels: never write translated names into Atlas records.
export function atlasPlaceLabel(location, field, contentLabel) {
  const short = field === "shortLabel";
  return contentLabel("place", location.id, short ? location.shortName : location.name, short ? "shortLabel" : "label");
}

export function atlasSourceLanguages(resource, locale, unknown) {
  const recorded = resource?.metadata?.language;
  const entries = Array.isArray(recorded) && recorded.length ? recorded : [null];
  const displayNames = new Intl.DisplayNames([locale], { type: "language", fallback: "none" });
  const labels = [];
  const codes = [];
  for (const entry of entries) {
    let code;
    let label;
    try {
      if (typeof entry === "string") code = Intl.getCanonicalLocales(entry)[0];
      if (code) label = displayNames.of(code);
    } catch {}
    if (label) {
      if (!codes.includes(code)) codes.push(code);
      if (!labels.includes(label)) labels.push(label);
    } else if (!labels.includes(unknown)) labels.push(unknown);
  }
  // A single specific, explicitly recorded language can describe the link.
  // Multiple/unknown languages never inherit the interface or place language.
  const linkLanguage = entries.length === 1 && codes.length === 1 && !["mul", "und", "zxx"].includes(codes[0]) ? codes[0] : "";
  return { labels, codes, linkLanguage };
}
