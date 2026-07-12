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
  let body: { photo_url?: string; description?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

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

// --- /skin/quiz ---

interface QuizInput {
  age?: number;
  gender?: string;
  skin_concerns: string[];
  climate?: string;
  lifestyle?: string;
  current_routine?: string;
  allergies?: string[];
  budget?: string;
}

function buildQuizPrompt(input: QuizInput): string {
  const sections: string[] = [];

  sections.push(
    `You are a professional dermatology-trained skin analyst. Based on the lifestyle quiz data below, generate a comprehensive skin profile assessment.`,
  );

  sections.push(`\n## Quiz Responses:`);
  sections.push(`- Skin concerns: ${input.skin_concerns.join(', ')}`);

  if (input.age) {
    sections.push(
      `- Age: ${input.age} (${input.age < 20 ? 'teen skin — higher sebum, acne-prone' : input.age < 30 ? 'young adult — maintenance focus' : input.age < 40 ? 'early aging prevention important' : input.age < 50 ? 'collagen loss accelerating, hydration critical' : 'mature skin — barrier repair and hydration priority'})`,
    );
  }
  if (input.gender) sections.push(`- Gender: ${input.gender}`);
  if (input.climate)
    sections.push(
      `- Climate: ${input.climate} (${input.climate.toLowerCase().includes('humid') ? 'increases sebum production, may worsen oiliness/acne' : input.climate.toLowerCase().includes('dry') || input.climate.toLowerCase().includes('arid') ? 'increases TEWL, may worsen dehydration/dryness' : input.climate.toLowerCase().includes('cold') ? 'compromises barrier function' : 'moderate impact on skin'})`,
    );
  if (input.lifestyle) sections.push(`- Lifestyle: ${input.lifestyle}`);
  if (input.current_routine) sections.push(`- Current routine: ${input.current_routine}`);
  if (input.allergies && input.allergies.length > 0)
    sections.push(`- Known allergies/sensitivities: ${input.allergies.join(', ')}`);
  if (input.budget) sections.push(`- Budget: ${input.budget}`);

  sections.push(`\n## Instructions:
Analyze the quiz data holistically:
- Cross-reference concerns with climate and lifestyle factors
- Consider age-related skin changes
- Factor in current routine gaps
- Be CONSERVATIVE with confidence — text-only assessment without photos warrants 0.55-0.75 max confidence
- Score all 10 standard concerns even if not mentioned (infer from context)

Return your assessment as JSON with this exact structure (no markdown, no code blocks, just raw JSON):
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
  "confidence": 0.65,
  "analysis": "2-3 sentence summary of the skin assessment based on quiz data.",
  "recommendations_summary": "2-3 sentences of key actionable recommendations based on the profile."
}

Rules:
- Score ALL 10 concerns (0-100 scale, most should be 20-60 range)
- topConcerns = top 3 concerns by score
- confidence MUST be between 0.55 and 0.75 for text-only quiz input
- recommendations_summary should reference specific ingredient types or routine changes
- Return ONLY valid JSON`);

  return sections.join('\n');
}

interface QuizResult extends SkinProfile {
  analysis: string;
  recommendations_summary: string;
}

function parseQuizResponse(raw: string): QuizResult {
  const jsonStr = extractJson(raw);
  const data = JSON.parse(jsonStr) as Record<string, unknown>;

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
  if (typeof data.recommendations_summary !== 'string') {
    throw new Error('Missing or invalid recommendations_summary');
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
    confidence: Math.min(0.75, Math.max(0.55, Number(data.confidence))),
    analysis: String(data.analysis),
    recommendations_summary: String(data.recommendations_summary),
  };
}

skinRoutes.get('/quiz', (c) => {
  return c.json({
    endpoint: '/skin/quiz',
    description: 'Generate a full skin profile from lifestyle quiz responses (no photo needed)',
    usage: {
      method: 'POST',
      body: {
        skin_concerns: '(required) Array of skin concerns e.g. ["acne", "oiliness", "dark spots"]',
        age: '(optional) Number — age in years',
        gender: '(optional) String — e.g. "female", "male"',
        climate: '(optional) String — e.g. "tropical humid", "dry arid"',
        lifestyle: '(optional) String — exercise, sleep, work description',
        current_routine: '(optional) String — current skincare routine',
        allergies: '(optional) Array of known sensitivities e.g. ["fragrance"]',
        budget: '(optional) String — "budget", "moderate", "premium"',
      },
    },
    price: '$0.03',
  });
});

skinRoutes.post('/quiz', async (c) => {
  let body: QuizInput;
  try {
    body = await c.req.json<QuizInput>();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (
    !body.skin_concerns ||
    !Array.isArray(body.skin_concerns) ||
    body.skin_concerns.length === 0
  ) {
    return c.json({ error: 'skin_concerns is required and must be a non-empty array' }, 400);
  }

  const prompt = buildQuizPrompt(body);

  let rawResponse: string;
  try {
    rawResponse = await invokeClaude(prompt);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: 'AI analysis failed', detail: message }, 500);
  }

  let parsed: QuizResult;
  try {
    parsed = parseQuizResponse(rawResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to parse AI response';
    return c.json({ error: 'Failed to parse quiz result', detail: message }, 500);
  }

  return c.json({
    skin_type: parsed.skinType,
    concerns: parsed.concerns,
    top_concerns: parsed.topConcerns,
    confidence: parsed.confidence,
    analysis: parsed.analysis,
    input_type: 'quiz',
    recommendations_summary: parsed.recommendations_summary,
  });
});

export { skinRoutes };
