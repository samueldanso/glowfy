import { Hono } from 'hono';
import { invokeClaude } from '../lib/bedrock.js';
import type { SkinProfile } from '../types.js';

interface SkinAnalysisResult extends SkinProfile {
  analysis: string;
}

function buildAnalyzePrompt(inputType: string, description?: string): string {
  const inputDesc =
    inputType === 'both'
      ? 'photo and text description'
      : inputType === 'photo'
        ? 'photo'
        : 'text description';

  const descriptionBlock = description
    ? `\n\nUser's description of their skin: "${description}"`
    : '';

  return `You are a professional skin analyst. Analyze the provided ${inputDesc} and return a structured skin assessment.

Evaluate these skin concerns on a scale of 0-100 (0 = not present, 100 = severe):
- acne
- oiliness
- dryness
- sensitivity
- hyperpigmentation
- fine_lines
- redness
- large_pores
- uneven_texture
- dehydration

Return your analysis as JSON with this exact structure (no markdown, no code blocks, just raw JSON):
{
  "skinType": "oily" | "dry" | "combination" | "normal" | "sensitive",
  "concerns": [
    {"name": "acne", "score": 0},
    {"name": "oiliness", "score": 0},
    {"name": "dryness", "score": 0},
    {"name": "sensitivity", "score": 0},
    {"name": "hyperpigmentation", "score": 0},
    {"name": "fine_lines", "score": 0},
    {"name": "redness", "score": 0},
    {"name": "large_pores", "score": 0},
    {"name": "uneven_texture", "score": 0},
    {"name": "dehydration", "score": 0}
  ],
  "topConcerns": ["top1", "top2", "top3"],
  "confidence": 0.85,
  "analysis": "Brief 2-3 sentence summary of overall skin condition and key observations."
}

Rules:
- Score ALL 10 concerns even if they are 0
- topConcerns = the top 3 concerns by score (names only)
- confidence = how confident you are in this assessment (0.0-1.0) — lower if the photo is blurry, description is vague, or information is limited
- Be conservative with scores — most people are in the 20-60 range, not 80-100
- skinType should reflect the dominant characteristic observed
- Return ONLY valid JSON — no markdown fences, no explanation outside the JSON${descriptionBlock}`;
}

function extractJson(raw: string): string {
  // Try to extract JSON from markdown code blocks if present
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  // Try to find a JSON object directly
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  return raw.trim();
}

function parseClaudeResponse(raw: string): SkinAnalysisResult {
  const jsonStr = extractJson(raw);
  const data = JSON.parse(jsonStr) as Record<string, unknown>;

  // Validate required fields
  if (!data.skinType || typeof data.skinType !== 'string') {
    throw new Error('Missing or invalid skinType');
  }
  if (!Array.isArray(data.concerns) || data.concerns.length === 0) {
    throw new Error('Missing or invalid concerns array');
  }
  if (!Array.isArray(data.topConcerns) || data.topConcerns.length === 0) {
    throw new Error('Missing or invalid topConcerns');
  }
  if (typeof data.confidence !== 'number') {
    throw new Error('Missing or invalid confidence');
  }
  if (typeof data.analysis !== 'string') {
    throw new Error('Missing or invalid analysis');
  }

  const validSkinTypes = ['oily', 'dry', 'combination', 'normal', 'sensitive'] as const;
  const skinType = data.skinType as string;
  if (!validSkinTypes.includes(skinType as (typeof validSkinTypes)[number])) {
    throw new Error(`Invalid skinType: ${skinType}`);
  }

  const concerns = (data.concerns as { name: string; score: number }[]).map((c) => ({
    name: String(c.name),
    score: Number(c.score),
  }));

  const topConcerns = (data.topConcerns as string[]).map(String);

  return {
    skinType: skinType as SkinProfile['skinType'],
    concerns,
    topConcerns,
    confidence: Number(data.confidence),
    analysis: String(data.analysis),
  };
}

const skinRoutes = new Hono();

// --- /skin/analyze ---

skinRoutes.get('/analyze', (c) => {
  return c.json({
    endpoint: '/skin/analyze',
    description: 'Analyze skin from photo or text description',
    usage: {
      method: 'POST',
      body: {
        photo_url: 'URL to face/skin photo (optional if description provided)',
        description: 'Text description of skin (optional if photo_url provided)',
      },
    },
    price: '$0.05',
  });
});

skinRoutes.post('/analyze', async (c) => {
  const body = await c.req.json<{ photo_url?: string; description?: string }>();

  const { photo_url, description } = body;

  if (!photo_url && !description) {
    return c.json({ error: 'At least one of photo_url or description is required' }, 400);
  }

  const inputType = photo_url && description ? 'both' : photo_url ? 'photo' : 'text';

  const prompt = buildAnalyzePrompt(inputType, description);

  let rawResponse: string;
  try {
    rawResponse = await invokeClaude(prompt, photo_url);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: 'AI analysis failed', detail: message }, 500);
  }

  let parsed: SkinAnalysisResult;
  try {
    parsed = parseClaudeResponse(rawResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to parse AI response';
    return c.json({ error: 'Failed to parse analysis result', detail: message }, 500);
  }

  return c.json({
    skin_type: parsed.skinType,
    concerns: parsed.concerns,
    top_concerns: parsed.topConcerns,
    confidence: parsed.confidence,
    analysis: parsed.analysis,
    input_type: inputType,
  });
});

skinRoutes.on(['GET', 'POST'], '/quiz', (c) => {
  return c.json({ message: 'skin quiz — payment verified', status: 'stub' });
});

export { skinRoutes };
