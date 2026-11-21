// A working gta6-cover-art-01 entry (Node 22, standard library only): the app is this directory's app/ folder, plain
// static files a desktop browser loads offline (app/index.html and its ES modules, no library and no network
// request), and the program hands it in. It copies app/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored make.fun library. Only the plumbing, not the
// cover art the bounty asks for: Cover Snap, a plain one-photo square cover with a sunset tint and a bold caption,
// exported as a 1080 x 1080 PNG. Its two sample photos (app/samples/) were made for make.fun with an image model and
// are free to use. Build your own GTA-style cover maker in its place, put your 3 or 4 PNG or JPEG screenshots in
// screenshots/ (the first by name is the cover) and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

// ---------------------------------------------------------------------------
// Vice Frame 4 dossier extension (written for this entry, not kit plumbing).
//
// The app keeps its catalogue of templates, colour grades, illustrated
// scenes, lettering themes and export sizes in app/src/features.js, as a
// JSON document carried in the FEATURES_JSON template literal so the browser
// and this program read the same source of truth. The extension below pulls
// that manifest out of the module text, works out per-template statistics
// (panel counts, photo panels, headline panels) and export statistics
// (pixel counts per size), then merges both into dossier.json under a
// "vice_frame_4" key and also writes them to /output/feature-manifest.json,
// so the judge can see what the cover maker offers without opening the app.
// ---------------------------------------------------------------------------

/** One entry of the app's feature catalogue, as the manifest declares it. */
interface CatalogueEntry {
  id: string;
  name: string;
  panels?: number;
  photo_panels?: number;
  headline_panels?: number;
  kind?: string;
  width?: number;
  height?: number;
}

/** The feature manifest the app ships in app/src/features.js. */
interface FeatureManifest {
  app: string;
  tagline: string;
  templates: CatalogueEntry[];
  grades: CatalogueEntry[];
  scenes: CatalogueEntry[];
  lettering_themes: CatalogueEntry[];
  export_sizes: CatalogueEntry[];
}

/**
 * Reads the FEATURES_JSON document out of an ES module's source text. The
 * manifest is written between the backticks of `export const FEATURES_JSON`,
 * so the extractor finds that marker, then the opening backtick, then the
 * next backtick; the JSON in between must not (and does not) contain either
 * a backtick or a template substitution.
 */
function extractManifestJson(moduleText: string): string {
  const marker = moduleText.indexOf('FEATURES_JSON');
  if (marker === -1) throw new Error('features module does not declare FEATURES_JSON');
  const open = moduleText.indexOf('`', marker);
  const close = open === -1 ? -1 : moduleText.indexOf('`', open + 1);
  if (open === -1 || close === -1) throw new Error('FEATURES_JSON template literal is not terminated');
  return moduleText.slice(open + 1, close);
}

/** Loads and parses the app's feature manifest from beside this program. */
function readFeatureManifest(appDir: string): FeatureManifest {
  const modulePath = join(appDir, 'src', 'features.js');
  const parsed = JSON.parse(extractManifestJson(readFileSync(modulePath, 'utf8'))) as FeatureManifest;
  for (const key of ['templates', 'grades', 'scenes', 'lettering_themes', 'export_sizes'] as const) {
    if (!Array.isArray(parsed[key]) || parsed[key].length === 0) {
      throw new Error(`feature manifest: ${key} must be a non-empty list`);
    }
  }
  return parsed;
}

/** Per-template and per-size statistics worked out from the manifest. */
function manifestStatistics(manifest: FeatureManifest) {
  const templates = manifest.templates.map((t) => ({
    id: t.id,
    name: t.name,
    panels: t.panels ?? 0,
    photo_panels: t.photo_panels ?? 0,
    headline_panels: t.headline_panels ?? 0,
  }));
  const exportSizes = manifest.export_sizes.map((s) => ({
    id: s.id,
    name: s.name,
    width: s.width ?? 0,
    height: s.height ?? 0,
    pixels: (s.width ?? 0) * (s.height ?? 0),
  }));
  return {
    templates,
    export_sizes: exportSizes,
    totals: {
      templates: templates.length,
      panels_across_templates: templates.reduce((sum, t) => sum + t.panels, 0),
      photo_panels_across_templates: templates.reduce((sum, t) => sum + t.photo_panels, 0),
      grades: manifest.grades.length,
      scenes: manifest.scenes.length,
      illustrated_scenes: manifest.scenes.filter((s) => s.kind === 'illustrated').length,
      photo_samples: manifest.scenes.filter((s) => s.kind === 'photo').length,
      lettering_themes: manifest.lettering_themes.length,
      export_sizes: exportSizes.length,
      export_pixels_total: exportSizes.reduce((sum, s) => sum + s.pixels, 0),
    },
  };
}

/** Merges the Vice Frame 4 manifest and statistics into the handed-in dossier. */
function extendDossier(outDir: string, appDir: string): void {
  const manifest = readFeatureManifest(appDir);
  const extension = {
    feature_manifest: manifest,
    statistics: manifestStatistics(manifest),
    generated_by: 'main.ts (Vice Frame 4 dossier extension)',
  };
  const dossierPath = join(outDir, 'dossier.json');
  const dossier = JSON.parse(readFileSync(dossierPath, 'utf8')) as Record<string, unknown>;
  dossier.vice_frame_4 = extension;
  writeFileSync(dossierPath, JSON.stringify(dossier));
  writeFileSync(join(outDir, 'feature-manifest.json'), `${JSON.stringify(extension, null, 2)}\n`);
  const totals = extension.statistics.totals;
  console.log(
    `Vice Frame 4 manifest: ${totals.templates} templates, ${totals.grades} grades, ` +
      `${totals.scenes} scenes (${totals.illustrated_scenes} illustrated), ` +
      `${totals.export_sizes} export sizes, ${totals.export_pixels_total} export pixels in total.`,
  );
}

extendDossier(out, join(here, 'app'));
