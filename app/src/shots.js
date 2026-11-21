// Fixed scenes for screenshots: a `?shot=cover` or `?shot=editor` query
// builds a whole editor state from the query string, so each screenshot in
// shots.json is one URL. main.js applies the state, waits for the font and
// the sample photos, renders, and then sets window.__shotReady.
//
// Parameters: template, size, caption, subtitle, lettering, grade,
// scenes (comma list of scene ids filling the photo slots in order; a photo
// scene id such as pier-photo is recognised by kind), pgrades (comma list
// of per-slot grade overrides, "-" for none), headlines (| separated),
// badge=0|1, badgetext (| becomes a line break), rotation, banner=0|1,
// bannertext, and sunburst / halftone / grain / vignette as 0..1 numbers.

import { FEATURES } from './features.js';
import { defaultState } from './state.js';

function sourceFor(sceneId) {
  const scene = FEATURES.scenes.find((s) => s.id === sceneId);
  return scene && scene.kind === 'photo' ? `photo:${sceneId}` : `scene:${sceneId}`;
}

/** Builds an editor state from shot query parameters, or null when not a shot. */
export function stateFromQuery(params) {
  const shot = params.get('shot');
  if (shot !== 'cover' && shot !== 'editor') return null;
  const state = defaultState();
  if (params.get('template')) state.template = params.get('template');
  if (params.get('size')) state.size = params.get('size');
  if (params.get('caption') !== null) state.caption = params.get('caption');
  if (params.get('subtitle') !== null) state.subtitle = params.get('subtitle');
  if (params.get('lettering')) state.lettering = params.get('lettering');
  if (params.get('grade')) state.grade = params.get('grade');
  const scenes = params.get('scenes');
  if (scenes) {
    scenes.split(',').forEach((id, i) => {
      if (state.panels[i]) state.panels[i].source = sourceFor(id.trim());
    });
  }
  const pgrades = params.get('pgrades');
  if (pgrades) {
    pgrades.split(',').forEach((grade, i) => {
      if (state.panels[i] && grade !== '-') state.panels[i].grade = grade.trim();
    });
  }
  const headlines = params.get('headlines');
  if (headlines) state.headlines = headlines.split('|').map((s) => s.trim());
  if (params.get('badge') !== null) state.badge.on = params.get('badge') === '1';
  if (params.get('badgetext')) state.badge.text = params.get('badgetext').split('|').join('\n');
  if (params.get('rotation')) state.badge.rotation = Number(params.get('rotation')) || 0;
  if (params.get('banner') !== null) state.banner.on = params.get('banner') === '1';
  if (params.get('bannertext')) state.banner.text = params.get('bannertext');
  for (const key of ['sunburst', 'halftone', 'grain', 'vignette']) {
    if (params.get(key) !== null) state.finish[key] = Number(params.get(key));
  }
  return state;
}
