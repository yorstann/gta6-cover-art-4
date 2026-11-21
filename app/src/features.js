// Vice Frame 4's feature catalogue: every template, colour grade, scene,
// lettering theme and export size the cover maker offers, declared once as a
// JSON document. The browser parses it below to build the editor's controls;
// the entry's main.ts extracts the same document (it looks for the
// FEATURES_JSON template literal) and merges it into dossier.json, so the
// judge reads exactly what the app ships. The JSON between the backticks
// must stay free of backticks and template substitutions.

export const FEATURES_JSON = `{
  "app": "Vice Frame 4",
  "tagline": "An offline GTA-style cover-art maker: illustrated scenes and your own photos, six layouts, per-panel colour grades, poster lettering, PNG exports.",
  "templates": [
    { "id": "grid", "name": "Vice Grid", "panels": 4, "photo_panels": 4, "headline_panels": 0 },
    { "id": "hero-three", "name": "Hero & Three", "panels": 4, "photo_panels": 4, "headline_panels": 0 },
    { "id": "poster", "name": "Poster", "panels": 1, "photo_panels": 1, "headline_panels": 0 },
    { "id": "snapshot", "name": "Tilted Snapshot", "panels": 3, "photo_panels": 2, "headline_panels": 0 },
    { "id": "cover-lines", "name": "Cover Lines", "panels": 4, "photo_panels": 3, "headline_panels": 1 },
    { "id": "slash", "name": "The Slash", "panels": 2, "photo_panels": 2, "headline_panels": 0 }
  ],
  "grades": [
    { "id": "sunset", "name": "Sunset" },
    { "id": "neon-nights", "name": "Neon Nights" },
    { "id": "golden-hour", "name": "Golden Hour" },
    { "id": "miami-pastel", "name": "Miami Pastel" },
    { "id": "noir", "name": "Noir" },
    { "id": "raw", "name": "Raw" }
  ],
  "scenes": [
    { "id": "sunset-pier", "name": "Sunset Pier", "kind": "illustrated" },
    { "id": "neon-boulevard", "name": "Neon Boulevard", "kind": "illustrated" },
    { "id": "beach-day", "name": "Beach Day", "kind": "illustrated" },
    { "id": "downtown-dusk", "name": "Downtown Dusk", "kind": "illustrated" },
    { "id": "palm-highway", "name": "Palm Highway", "kind": "illustrated" },
    { "id": "pier-photo", "name": "Pier (photo)", "kind": "photo" },
    { "id": "boulevard-photo", "name": "Boulevard (photo)", "kind": "photo" }
  ],
  "lettering_themes": [
    { "id": "blockbuster", "name": "Blockbuster" },
    { "id": "neon-sign", "name": "Neon Sign" },
    { "id": "gold-foil", "name": "Gold Foil" },
    { "id": "stencil", "name": "Stencil" }
  ],
  "export_sizes": [
    { "id": "square", "name": "Square 1080 x 1080", "width": 1080, "height": 1080 },
    { "id": "portrait", "name": "Portrait 1080 x 1350", "width": 1080, "height": 1350 },
    { "id": "landscape", "name": "Landscape 1920 x 1080", "width": 1920, "height": 1080 }
  ]
}`;

export const FEATURES = JSON.parse(FEATURES_JSON);

/** Finds a catalogue entry by id, or returns the first entry when unknown. */
export function byId(list, id) {
  return list.find((entry) => entry.id === id) ?? list[0];
}
