import ingredientsRaw from '../data/ingredients.json';
import type { IngredientScore } from '../types';

// Internal type for JSON entries (includes aliases for lookup)
interface IngredientEntry extends IngredientScore {
  aliases: string[];
}

const INGREDIENTS = ingredientsRaw as IngredientEntry[];

// Lazy-built lookup map: lowercased name/alias → IngredientEntry
let _lookupMap: Map<string, IngredientEntry> | null = null;

function getLookupMap(): Map<string, IngredientEntry> {
  if (_lookupMap) return _lookupMap;

  _lookupMap = new Map<string, IngredientEntry>();
  for (const entry of INGREDIENTS) {
    _lookupMap.set(entry.name.toLowerCase(), entry);
    for (const alias of entry.aliases) {
      const key = alias.toLowerCase();
      if (!_lookupMap.has(key)) {
        _lookupMap.set(key, entry);
      }
    }
  }
  return _lookupMap;
}

/**
 * Look up a single ingredient by name (case-insensitive, checks name + aliases).
 * Returns the IngredientScore or null if not found.
 */
export function lookupIngredient(name: string): IngredientScore | null {
  const map = getLookupMap();
  const entry = map.get(name.trim().toLowerCase());
  if (!entry) return null;

  // Return only the IngredientScore fields (strip aliases)
  return {
    name: entry.name,
    safety: entry.safety,
    comedogenic: entry.comedogenic,
    irritation: entry.irritation,
    category: entry.category,
    notes: entry.notes,
  };
}

export interface IngredientListResult {
  scores: IngredientScore[];
  overall: number; // 0-100 composite safety score (higher = safer)
  flagged: string[]; // ingredients with safety >= 7 or comedogenic >= 3
  unknown: string[]; // ingredients not in database
}

/**
 * Score a full ingredient list (e.g. from a product label).
 *
 * Overall score: starts at 100, deducts:
 *   -5 per ingredient with safety >= 7
 *   -3 per ingredient with comedogenic >= 3
 * Clamped to 0–100.
 */
export function scoreIngredientList(ingredients: string[]): IngredientListResult {
  const scores: IngredientScore[] = [];
  const flagged: string[] = [];
  const unknown: string[] = [];

  let penalty = 0;

  for (const raw of ingredients) {
    const score = lookupIngredient(raw);
    if (!score) {
      unknown.push(raw.trim());
      continue;
    }

    scores.push(score);

    const isFlagged = score.safety >= 7 || score.comedogenic >= 3;
    if (isFlagged) {
      flagged.push(score.name);
    }

    if (score.safety >= 7) penalty += 5;
    if (score.comedogenic >= 3) penalty += 3;
  }

  const overall = Math.max(0, Math.min(100, 100 - penalty));

  return { scores, overall, flagged, unknown };
}
