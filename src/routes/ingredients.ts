import { Hono } from 'hono';
import ingredientsRaw from '../data/ingredients.json';
import { invokeClaude } from '../lib/bedrock';
import { scoreIngredientList } from '../lib/scoring';
import type { IngredientScore, SkinProfile } from '../types';

const ingredientRoutes = new Hono();

// ─── /ingredients/check ─────────────────────────────────────────────────────

ingredientRoutes.get('/check', (c) => {
  return c.json({
    endpoint: '/ingredients/check',
    method: 'POST',
    description:
      'Analyze a list of ingredients for safety, comedogenicity, and irritation potential.',
    body: { ingredients: ['GLYCERIN', 'SODIUM LAURYL SULFATE', '...'] },
    pricing: '$0.02 per call (x402)',
  });
});

ingredientRoutes.post('/check', async (c) => {
  let body: { ingredients?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.ingredients || !Array.isArray(body.ingredients) || body.ingredients.length === 0) {
    return c.json(
      { error: 'Missing or empty "ingredients" array. Provide a list of ingredient names.' },
      400,
    );
  }

  const ingredientNames = body.ingredients as string[];
  if (ingredientNames.some((i) => typeof i !== 'string')) {
    return c.json({ error: 'All items in "ingredients" must be strings.' }, 400);
  }

  if (ingredientNames.length > 100) {
    return c.json({ error: 'Maximum 100 ingredients per request.' }, 400);
  }

  // Score using our database
  const result = scoreIngredientList(ingredientNames);

  // Generate natural-language summary using Claude, grounded in DB scores
  let summary: string;
  try {
    const summaryPrompt = buildCheckSummaryPrompt(
      result.scores,
      result.flagged,
      result.unknown,
      result.overall,
      ingredientNames.length,
    );
    summary = await invokeClaude(summaryPrompt);
  } catch {
    // Fallback summary if Bedrock fails
    summary = buildFallbackSummary(
      result.overall,
      result.flagged,
      result.unknown,
      ingredientNames.length,
    );
  }

  return c.json({
    overall_score: result.overall,
    total_ingredients: ingredientNames.length,
    flagged_count: result.flagged.length,
    unknown_count: result.unknown.length,
    ingredients: result.scores,
    flagged: result.flagged,
    unknown: result.unknown,
    summary,
  });
});

// ─── /ingredients/recommend ─────────────────────────────────────────────────

ingredientRoutes.get('/recommend', (c) => {
  return c.json({
    endpoint: '/ingredients/recommend',
    method: 'POST',
    description: 'Get personalized ingredient recommendations based on your skin profile.',
    body: {
      skin_profile: {
        skinType: 'oily | dry | combination | normal | sensitive',
        concerns: [{ name: 'acne', score: 8 }],
        topConcerns: ['acne', 'oiliness'],
        confidence: 0.85,
      },
    },
    pricing: '$0.02 per call (x402)',
  });
});

interface RecommendationItem {
  ingredient: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

interface RecommendResponse {
  skin_type: string;
  top_concerns: string[];
  seek: RecommendationItem[];
  avoid: RecommendationItem[];
}

ingredientRoutes.post('/recommend', async (c) => {
  let body: { skin_profile?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.skin_profile) {
    return c.json(
      { error: 'Missing "skin_profile" object. Provide skinType, concerns, and topConcerns.' },
      400,
    );
  }

  const profile = body.skin_profile as SkinProfile;

  // Validate required fields
  const validSkinTypes = ['oily', 'dry', 'combination', 'normal', 'sensitive'];
  if (!profile.skinType || !validSkinTypes.includes(profile.skinType)) {
    return c.json({ error: `Invalid skinType. Must be one of: ${validSkinTypes.join(', ')}` }, 400);
  }
  if (!Array.isArray(profile.topConcerns) || profile.topConcerns.length === 0) {
    return c.json({ error: 'topConcerns must be a non-empty array of strings.' }, 400);
  }

  // Gather relevant ingredients from our database as grounding context
  const groundingContext = buildGroundingContext(profile);

  // Build the recommendation prompt
  const prompt = buildRecommendPrompt(profile, groundingContext);

  let response: RecommendResponse;
  try {
    const raw = await invokeClaude(prompt);
    response = parseRecommendResponse(raw, profile);
  } catch {
    return c.json({ error: 'Failed to generate recommendations. Please try again.' }, 500);
  }

  return c.json(response);
});

// ─── Helper Functions ────────────────────────────────────────────────────────

function buildCheckSummaryPrompt(
  scores: IngredientScore[],
  flagged: string[],
  unknown: string[],
  overall: number,
  totalCount: number,
): string {
  const flaggedDetails = flagged.map((name) => {
    const s = scores.find((sc) => sc.name === name);
    if (!s) return `${name} (flagged)`;
    const reasons: string[] = [];
    if (s.safety >= 7) reasons.push(`safety concern (${s.safety}/10)`);
    if (s.comedogenic >= 3) reasons.push(`comedogenic (${s.comedogenic}/5)`);
    return `${name}: ${reasons.join(', ')} — ${s.notes}`;
  });

  return `You are a cosmetic chemist AI assistant. Summarize this ingredient safety analysis in 2-3 sentences.

DATA (from verified database — use these exact numbers, do not invent different scores):
- Overall safety score: ${overall}/100 (higher = safer)
- Total ingredients analyzed: ${totalCount}
- Flagged ingredients (${flagged.length}): ${flaggedDetails.length > 0 ? flaggedDetails.join('; ') : 'none'}
- Unknown ingredients (${unknown.length}): ${unknown.length > 0 ? unknown.join(', ') : 'none'}

Write a concise, factual summary stating the overall score, what was flagged and why, and which skin types should be cautious. Do NOT invent scores or claims beyond the data provided. Keep it under 100 words. Return ONLY the summary text, no JSON, no markdown.`;
}

function buildFallbackSummary(
  overall: number,
  flagged: string[],
  unknown: string[],
  _totalCount: number,
): string {
  const parts: string[] = [`This product scores ${overall}/100 for safety.`];
  if (flagged.length > 0) {
    parts.push(
      `${flagged.length} ingredient${flagged.length > 1 ? 's' : ''} flagged: ${flagged.join(', ')}.`,
    );
  }
  if (unknown.length > 0) {
    parts.push(
      `${unknown.length} ingredient${unknown.length > 1 ? 's' : ''} not found in our database.`,
    );
  }
  if (overall >= 80) {
    parts.push('Overall suitable for most skin types.');
  } else if (overall >= 60) {
    parts.push('Use with caution for sensitive or acne-prone skin.');
  } else {
    parts.push('Multiple concerns detected — not recommended for sensitive skin.');
  }
  return parts.join(' ');
}

function buildGroundingContext(profile: SkinProfile): string {
  // Select ingredients relevant to this skin type/concerns from our database
  const allIngredients = ingredientsRaw as Array<{
    name: string;
    safety: number;
    comedogenic: number;
    irritation: number;
    category: string;
    notes: string;
    aliases: string[];
  }>;

  // Beneficial: low safety score, low comedogenic, low irritation
  const beneficial = allIngredients
    .filter((i) => i.safety <= 2 && i.comedogenic <= 1 && i.irritation <= 1)
    .map(
      (i) =>
        `${i.name} (${i.category}, safety:${i.safety}, comedogenic:${i.comedogenic}, irritation:${i.irritation}) — ${i.notes}`,
    );

  // Active ingredients for specific concerns
  const actives = allIngredients
    .filter((i) => i.category === 'active' || i.category === 'antioxidant')
    .map(
      (i) =>
        `${i.name} (${i.category}, safety:${i.safety}, comedogenic:${i.comedogenic}, irritation:${i.irritation}) — ${i.notes}`,
    );

  // Problematic: high comedogenic or high safety/irritation scores
  const problematic = allIngredients
    .filter((i) => i.comedogenic >= 3 || i.safety >= 6 || i.irritation >= 3)
    .map(
      (i) =>
        `${i.name} (${i.category}, safety:${i.safety}, comedogenic:${i.comedogenic}, irritation:${i.irritation}) — ${i.notes}`,
    );

  // Skin-type specific additions
  const skinTypeContext = getSkinTypeContext(profile.skinType);

  return `=== SAFE/BENEFICIAL INGREDIENTS (from database) ===
${beneficial.join('\n')}

=== ACTIVE INGREDIENTS (from database) ===
${actives.join('\n')}

=== PROBLEMATIC INGREDIENTS (from database) ===
${problematic.join('\n')}

=== SKIN TYPE NOTES ===
${skinTypeContext}`;
}

function getSkinTypeContext(skinType: string): string {
  const contexts: Record<string, string> = {
    oily: 'Oily skin overproduces sebum. Seek: lightweight, oil-free formulations, BHAs, niacinamide. Avoid: heavy oils, comedogenic ingredients (rating 3+), occlusive barriers that trap oil.',
    dry: 'Dry skin lacks natural lipids and moisture. Seek: ceramides, rich emollients, hyaluronic acid, occlusives. Avoid: harsh surfactants (SLS), drying alcohols, strong actives without adequate hydration.',
    combination:
      'Combination skin has oily T-zone and dry cheeks. Seek: balanced hydration, niacinamide, lightweight moisturizers. Avoid: extremely heavy occlusives (for oily zones) and harsh strippers (for dry zones).',
    normal:
      'Normal skin is balanced. Seek: maintenance actives (antioxidants, gentle retinoids), SPF. Avoid: unnecessarily irritating ingredients, but tolerance is generally good.',
    sensitive:
      'Sensitive skin is reactive and easily irritated. Seek: calming ingredients (centella, allantoin, panthenol), minimal ingredient lists, fragrance-free. Avoid: fragrance, essential oils, harsh preservatives, high-concentration actives.',
  };
  return contexts[skinType] || contexts.normal;
}

function buildRecommendPrompt(profile: SkinProfile, groundingContext: string): string {
  return `You are a cosmetic chemist AI. Given a skin profile and a database of real ingredient data, recommend 5-8 ingredients to SEEK and 5-8 ingredients to AVOID.

IMPORTANT RULES:
1. ONLY recommend ingredients that appear in the database context below — do not invent ingredients not listed.
2. Use the exact ingredient NAMES as they appear in the database (ALL CAPS format).
3. Base your reasoning on the actual scores and notes from the database.
4. Tailor recommendations to the specific skin type and concerns.
5. Assign confidence: "high" for well-established ingredient-concern matches, "medium" for generally accepted, "low" for emerging evidence.

SKIN PROFILE:
- Skin type: ${profile.skinType}
- Top concerns: ${profile.topConcerns.join(', ')}
- All concerns: ${profile.concerns.map((c) => `${c.name} (severity: ${c.score}/10)`).join(', ')}

${groundingContext}

Respond in STRICT JSON format only (no markdown, no explanation outside JSON):
{
  "seek": [
    { "ingredient": "INGREDIENT_NAME", "reason": "Why this ingredient helps for their specific concerns", "confidence": "high|medium|low" }
  ],
  "avoid": [
    { "ingredient": "INGREDIENT_NAME", "reason": "Why this ingredient is bad for their skin type/concerns", "confidence": "high|medium|low" }
  ]
}`;
}

function parseRecommendResponse(raw: string, profile: SkinProfile): RecommendResponse {
  // Extract JSON from response (handle potential markdown wrapping)
  let jsonStr = raw.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const parsed = JSON.parse(jsonStr) as {
    seek: RecommendationItem[];
    avoid: RecommendationItem[];
  };

  // Validate structure
  if (!Array.isArray(parsed.seek) || !Array.isArray(parsed.avoid)) {
    throw new Error('Invalid response structure from AI');
  }

  return {
    skin_type: profile.skinType,
    top_concerns: profile.topConcerns,
    seek: parsed.seek.slice(0, 8),
    avoid: parsed.avoid.slice(0, 8),
  };
}

export { ingredientRoutes };
