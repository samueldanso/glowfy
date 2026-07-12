import { Hono } from 'hono';
import { invokeClaude } from '../lib/bedrock.js';
import { extractJson } from '../lib/parse.js';
import type { IngredientListResult } from '../lib/scoring.js';
import { scoreIngredientList } from '../lib/scoring.js';

interface ProductMatchInput {
  product_name: string;
  ingredients?: string[];
  skin_profile: {
    skin_type: string;
    top_concerns: string[];
    concerns?: { name: string; score: number }[];
  };
}

type Verdict = 'excellent' | 'good' | 'caution' | 'avoid';

interface ProductMatchResult {
  product_name: string;
  score: number;
  verdict: Verdict;
  reasons: string[];
  watch_for: string[];
  ingredient_highlights: {
    beneficial: string[];
    neutral: string[];
    concerning: string[];
  };
  confidence: number;
  recommendation: string;
}

function scoreToVerdict(score: number): Verdict {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 40) return 'caution';
  return 'avoid';
}

function buildMatchPromptWithIngredients(
  input: ProductMatchInput,
  ingredientData: IngredientListResult,
): string {
  const { product_name, ingredients, skin_profile } = input;

  const scoredList = ingredientData.scores
    .map(
      (s) =>
        `- ${s.name} [${s.category}]: safety=${s.safety}/10, comedogenic=${s.comedogenic}/5, irritation=${s.irritation}/5. ${s.notes}`,
    )
    .join('\n');

  const flaggedList =
    ingredientData.flagged.length > 0
      ? `\nFlagged ingredients (safety>=7 or comedogenic>=3): ${ingredientData.flagged.join(', ')}`
      : '\nNo flagged ingredients.';

  const unknownList =
    ingredientData.unknown.length > 0
      ? `\nUnknown ingredients (not in database): ${ingredientData.unknown.join(', ')}`
      : '';

  return `You are a professional cosmetic chemist. Assess the compatibility of a product with the client's skin profile.

## Product: ${product_name}
## Full Ingredient List: ${(ingredients || []).join(', ')}

## Database Scores (verified):
${scoredList}
${flaggedList}
${unknownList}

## Database Overall Safety Score: ${ingredientData.overall}/100

## Client Skin Profile:
- Skin type: ${skin_profile.skin_type}
- Top concerns: ${skin_profile.top_concerns.join(', ')}
${
  skin_profile.concerns
    ? `- Concern scores: ${skin_profile.concerns
        .filter((c) => c.score > 20)
        .map((c) => `${c.name}=${c.score}`)
        .join(', ')}`
    : ''
}

## Instructions:
Assess compatibility considering:
1. Does this product's ingredient profile suit the skin type?
2. Do any ingredients worsen the top concerns? (e.g., comedogenic ingredients for acne-prone skin)
3. Are there beneficial actives that address the concerns?
4. Overall safety and suitability

Return as JSON with this exact structure (no markdown, no code blocks, just raw JSON):
{
  "score": 72,
  "verdict": "good",
  "reasons": ["reason 1 why this product is good/bad for their skin", "reason 2", "reason 3"],
  "watch_for": ["potential issue 1", "potential issue 2"],
  "ingredient_highlights": {
    "beneficial": ["INGREDIENT A", "INGREDIENT B"],
    "neutral": ["INGREDIENT C"],
    "concerning": ["INGREDIENT D"]
  },
  "confidence": 0.90,
  "recommendation": "Concise recommendation on how to use this product for their skin type."
}

Rules:
- score: 0-100 integer (use database overall as baseline, adjust based on skin-type compatibility)
- verdict: "excellent" (90-100), "good" (70-89), "caution" (40-69), "avoid" (0-39)
- reasons: 3-5 specific reasons (reference actual ingredients)
- watch_for: potential concerns (0-3 items, can be empty array)
- ingredient_highlights: categorize key ingredients from the ACTUAL list provided
- confidence: 0.85-0.95 (high because we have the full ingredient list)
- recommendation: 1-2 sentences, actionable
- Return ONLY valid JSON`;
}

function buildMatchPromptNameOnly(input: ProductMatchInput): string {
  return `You are a professional cosmetic chemist. Assess the likely compatibility of a product with the client's skin profile.

## Product: ${input.product_name}
(No ingredient list provided — assess based on known typical formulation of this product)

## Client Skin Profile:
- Skin type: ${input.skin_profile.skin_type}
- Top concerns: ${input.skin_profile.top_concerns.join(', ')}
${
  input.skin_profile.concerns
    ? `- Concern scores: ${input.skin_profile.concerns
        .filter((c) => c.score > 20)
        .map((c) => `${c.name}=${c.score}`)
        .join(', ')}`
    : ''
}

## Instructions:
Based on your knowledge of this product's typical formulation, assess compatibility.
NOTE: Without a confirmed ingredient list, be conservative with your confidence score.

Return as JSON with this exact structure (no markdown, no code blocks, just raw JSON):
{
  "score": 65,
  "verdict": "caution",
  "reasons": ["reason 1", "reason 2", "reason 3"],
  "watch_for": ["potential concern 1"],
  "ingredient_highlights": {
    "beneficial": ["LIKELY INGREDIENT A"],
    "neutral": ["LIKELY INGREDIENT B"],
    "concerning": []
  },
  "confidence": 0.55,
  "recommendation": "Recommendation with caveat about unconfirmed ingredients."
}

Rules:
- confidence MUST be 0.45-0.65 (lower because ingredient list not confirmed)
- verdict scale: "excellent" (90-100), "good" (70-89), "caution" (40-69), "avoid" (0-39)
- Be conservative — without confirmed ingredients, lean toward "caution" unless the product is very well-known
- Clearly note in recommendation that confidence is limited without ingredient verification
- Return ONLY valid JSON`;
}

function parseMatchResponse(raw: string, productName: string): ProductMatchResult {
  const jsonStr = extractJson(raw);
  const data = JSON.parse(jsonStr) as Record<string, unknown>;

  if (typeof data.score !== 'number') {
    throw new Error('Missing or invalid score');
  }
  if (!Array.isArray(data.reasons) || data.reasons.length === 0) {
    throw new Error('Missing or invalid reasons');
  }
  if (typeof data.confidence !== 'number') {
    throw new Error('Missing or invalid confidence');
  }
  if (typeof data.recommendation !== 'string') {
    throw new Error('Missing or invalid recommendation');
  }

  const score = Math.max(0, Math.min(100, Math.round(Number(data.score))));
  const verdict = scoreToVerdict(score);

  const highlights = data.ingredient_highlights as Record<string, unknown> | undefined;

  return {
    product_name: productName,
    score,
    verdict,
    reasons: (data.reasons as string[]).map(String),
    watch_for: Array.isArray(data.watch_for) ? (data.watch_for as string[]).map(String) : [],
    ingredient_highlights: {
      beneficial: Array.isArray(highlights?.beneficial)
        ? (highlights.beneficial as string[]).map(String)
        : [],
      neutral: Array.isArray(highlights?.neutral)
        ? (highlights.neutral as string[]).map(String)
        : [],
      concerning: Array.isArray(highlights?.concerning)
        ? (highlights.concerning as string[]).map(String)
        : [],
    },
    confidence: Math.max(0, Math.min(1, Number(data.confidence))),
    recommendation: String(data.recommendation),
  };
}

const productRoutes = new Hono();

productRoutes.get('/match', (c) => {
  return c.json({
    endpoint: '/product/match',
    description: 'Score how well a product matches your skin profile',
    usage: {
      method: 'POST',
      body: {
        product_name: '(required) Product name e.g. "CeraVe Moisturizing Cream"',
        ingredients: '(optional) Array of INCI ingredient names — improves accuracy significantly',
        skin_profile: '(required) Object with skin_type (string) and top_concerns (string[])',
      },
    },
    price: '$0.02',
  });
});

productRoutes.post('/match', async (c) => {
  let body: ProductMatchInput;
  try {
    body = await c.req.json<ProductMatchInput>();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (
    !body.product_name ||
    typeof body.product_name !== 'string' ||
    body.product_name.trim().length === 0
  ) {
    return c.json({ error: 'product_name is required' }, 400);
  }
  if (!body.skin_profile) {
    return c.json({ error: 'skin_profile is required' }, 400);
  }
  if (!body.skin_profile.skin_type || typeof body.skin_profile.skin_type !== 'string') {
    return c.json({ error: 'skin_profile.skin_type is required' }, 400);
  }
  if (
    !Array.isArray(body.skin_profile.top_concerns) ||
    body.skin_profile.top_concerns.length === 0
  ) {
    return c.json(
      { error: 'skin_profile.top_concerns is required and must be a non-empty array' },
      400,
    );
  }

  let prompt: string;
  if (body.ingredients && Array.isArray(body.ingredients) && body.ingredients.length > 0) {
    const ingredientData = scoreIngredientList(body.ingredients);
    prompt = buildMatchPromptWithIngredients(body, ingredientData);
  } else {
    prompt = buildMatchPromptNameOnly(body);
  }

  let rawResponse: string;
  try {
    rawResponse = await invokeClaude(prompt);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: 'AI product assessment failed', detail: message }, 500);
  }

  let result: ProductMatchResult;
  try {
    result = parseMatchResponse(rawResponse, body.product_name.trim());
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to parse AI response';
    return c.json({ error: 'Failed to parse product match result', detail: message }, 500);
  }

  return c.json(result);
});

export { productRoutes };
