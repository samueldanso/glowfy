import { Hono } from 'hono';
import { invokeClaude } from '../lib/bedrock.js';
import { extractJson } from '../lib/parse.js';
import { lookupIngredient } from '../lib/scoring.js';

interface RoutineBuildInput {
  skin_profile: {
    skin_type: string;
    concerns?: { name: string; score: number }[];
    top_concerns: string[];
  };
  budget?: string;
  goals?: string[];
  time_available?: string;
}

interface RoutineStepOutput {
  order: number;
  step: string;
  product_type: string;
  why: string;
  ingredients_to_seek: string[];
  ingredients_to_avoid: string[];
  duration: string;
}

interface WeeklyAddition {
  step: string;
  frequency: string;
  why: string;
}

interface CompliancePlan {
  week_1: string;
  week_2: string;
  week_3: string;
  week_4: string;
  tracking: string[];
}

interface RoutineBuildResult {
  morning_routine: RoutineStepOutput[];
  evening_routine: RoutineStepOutput[];
  weekly_additions: WeeklyAddition[];
  compliance_plan: CompliancePlan;
  total_steps_morning: number;
  total_steps_evening: number;
  estimated_time_morning: string;
  estimated_time_evening: string;
}

function getIngredientContext(concerns: string[]): string {
  // Provide relevant ingredient data from our database as grounding context
  const relevantIngredients: string[] = [];

  const concernToIngredients: Record<string, string[]> = {
    acne: [
      'SALICYLIC ACID',
      'NIACINAMIDE',
      'TEA TREE OIL',
      'BENZOYL PEROXIDE',
      'ZINC OXIDE',
      'AZELAIC ACID',
    ],
    oiliness: ['NIACINAMIDE', 'SALICYLIC ACID', 'ZINC OXIDE', 'KAOLIN'],
    dryness: [
      'GLYCERIN',
      'SODIUM HYALURONATE',
      'SQUALANE',
      'PANTHENOL',
      'UREA',
      'BUTYROSPERMUM PARKII BUTTER',
    ],
    sensitivity: [
      'PANTHENOL',
      'CENTELLA ASIATICA EXTRACT',
      'ALOE BARBADENSIS LEAF JUICE',
      'ALLANTOIN',
    ],
    hyperpigmentation: [
      'NIACINAMIDE',
      'ASCORBIC ACID',
      'ALPHA-ARBUTIN',
      'AZELAIC ACID',
      'KOJIC ACID',
    ],
    fine_lines: ['RETINOL', 'ASCORBIC ACID', 'SODIUM HYALURONATE', 'PEPTIDES'],
    dark_spots: ['NIACINAMIDE', 'ASCORBIC ACID', 'ALPHA-ARBUTIN', 'AZELAIC ACID'],
    redness: ['CENTELLA ASIATICA EXTRACT', 'PANTHENOL', 'ALLANTOIN', 'NIACINAMIDE'],
    large_pores: ['NIACINAMIDE', 'SALICYLIC ACID', 'RETINOL'],
    dehydration: ['GLYCERIN', 'SODIUM HYALURONATE', 'PANTHENOL', 'SQUALANE'],
  };

  for (const concern of concerns) {
    const key = concern.toLowerCase().replace(/[^a-z_]/g, '_');
    const ingredientNames = concernToIngredients[key] || [];
    for (const name of ingredientNames) {
      if (!relevantIngredients.includes(name)) {
        relevantIngredients.push(name);
      }
    }
  }

  const entries: string[] = [];
  for (const name of relevantIngredients) {
    const data = lookupIngredient(name);
    if (data) {
      entries.push(
        `- ${data.name} [${data.category}]: safety=${data.safety}/10, comedogenic=${data.comedogenic}/5, irritation=${data.irritation}/5. ${data.notes}`,
      );
    }
  }

  return entries.length > 0
    ? `\n## Ingredient Database (verified data — use these for recommendations):\n${entries.join('\n')}`
    : '';
}

function buildRoutinePrompt(input: RoutineBuildInput): string {
  const { skin_profile, budget, goals, time_available } = input;
  const ingredientContext = getIngredientContext(skin_profile.top_concerns);

  const sections: string[] = [];

  sections.push(
    `You are a professional skincare formulation expert. Build a complete AM/PM skincare routine based on the client profile below.`,
  );

  sections.push(`\n## Client Profile:`);
  sections.push(`- Skin type: ${skin_profile.skin_type}`);
  sections.push(`- Top concerns: ${skin_profile.top_concerns.join(', ')}`);

  if (skin_profile.concerns && skin_profile.concerns.length > 0) {
    const scored = skin_profile.concerns.filter((c) => c.score > 20);
    if (scored.length > 0) {
      sections.push(`- Concern scores: ${scored.map((c) => `${c.name}=${c.score}`).join(', ')}`);
    }
  }
  if (budget) sections.push(`- Budget: ${budget}`);
  if (goals && goals.length > 0) sections.push(`- Goals: ${goals.join(', ')}`);
  if (time_available) sections.push(`- Time available: ${time_available}`);

  sections.push(ingredientContext);

  sections.push(`\n## Instructions:
Build a complete routine with:
1. Morning routine (ordered steps with product types and timing)
2. Evening routine (ordered steps)
3. Weekly additions (masks, exfoliants)
4. A 30-day compliance plan (gradual product introduction to avoid irritation)

Rules:
- Reference REAL ingredients from the database above
- Each step must specify: product type, WHY it addresses the concern, ingredients to seek, ingredients to avoid
- Order matters (thinnest to thickest, actives before moisturizer)
- Morning MUST include SPF as final step
- Evening can include stronger actives (retinol, AHAs)
- Compliance plan introduces products gradually (1 new product per week)
- Be specific and actionable — not generic advice

Return as JSON with this exact structure (no markdown, no code blocks, just raw JSON):
{
  "morning_routine": [
    {
      "order": 1,
      "step": "step name",
      "product_type": "specific product type",
      "why": "explanation of why this step addresses their concerns",
      "ingredients_to_seek": ["INGREDIENT 1", "INGREDIENT 2"],
      "ingredients_to_avoid": ["INGREDIENT X"],
      "duration": "time in seconds or minutes"
    }
  ],
  "evening_routine": [...],
  "weekly_additions": [
    {"step": "treatment name", "frequency": "Nx/week", "why": "reason"}
  ],
  "compliance_plan": {
    "week_1": "Start with basics only...",
    "week_2": "Add one active...",
    "week_3": "Add second active...",
    "week_4": "Full routine...",
    "tracking": ["tracking method 1", "tracking method 2"]
  },
  "total_steps_morning": 5,
  "total_steps_evening": 6,
  "estimated_time_morning": "X minutes",
  "estimated_time_evening": "Y minutes"
}

Return ONLY valid JSON.`);

  return sections.join('\n');
}

function parseRoutineResponse(raw: string): RoutineBuildResult {
  const jsonStr = extractJson(raw);
  const data = JSON.parse(jsonStr) as Record<string, unknown>;

  if (!Array.isArray(data.morning_routine) || data.morning_routine.length === 0) {
    throw new Error('Missing or invalid morning_routine');
  }
  if (!Array.isArray(data.evening_routine) || data.evening_routine.length === 0) {
    throw new Error('Missing or invalid evening_routine');
  }
  if (!data.compliance_plan || typeof data.compliance_plan !== 'object') {
    throw new Error('Missing or invalid compliance_plan');
  }

  const morning_routine = (data.morning_routine as Record<string, unknown>[]).map((step, i) => ({
    order: Number(step.order) || i + 1,
    step: String(step.step || ''),
    product_type: String(step.product_type || ''),
    why: String(step.why || ''),
    ingredients_to_seek: Array.isArray(step.ingredients_to_seek)
      ? (step.ingredients_to_seek as string[]).map(String)
      : [],
    ingredients_to_avoid: Array.isArray(step.ingredients_to_avoid)
      ? (step.ingredients_to_avoid as string[]).map(String)
      : [],
    duration: String(step.duration || ''),
  }));

  const evening_routine = (data.evening_routine as Record<string, unknown>[]).map((step, i) => ({
    order: Number(step.order) || i + 1,
    step: String(step.step || ''),
    product_type: String(step.product_type || ''),
    why: String(step.why || ''),
    ingredients_to_seek: Array.isArray(step.ingredients_to_seek)
      ? (step.ingredients_to_seek as string[]).map(String)
      : [],
    ingredients_to_avoid: Array.isArray(step.ingredients_to_avoid)
      ? (step.ingredients_to_avoid as string[]).map(String)
      : [],
    duration: String(step.duration || ''),
  }));

  const weekly_additions = Array.isArray(data.weekly_additions)
    ? (data.weekly_additions as Record<string, unknown>[]).map((w) => ({
        step: String(w.step || ''),
        frequency: String(w.frequency || ''),
        why: String(w.why || ''),
      }))
    : [];

  const plan = data.compliance_plan as Record<string, unknown>;
  const compliance_plan: CompliancePlan = {
    week_1: String(plan.week_1 || ''),
    week_2: String(plan.week_2 || ''),
    week_3: String(plan.week_3 || ''),
    week_4: String(plan.week_4 || ''),
    tracking: Array.isArray(plan.tracking) ? (plan.tracking as string[]).map(String) : [],
  };

  return {
    morning_routine,
    evening_routine,
    weekly_additions,
    compliance_plan,
    total_steps_morning: morning_routine.length,
    total_steps_evening: evening_routine.length,
    estimated_time_morning: String(
      data.estimated_time_morning || `${morning_routine.length * 2} minutes`,
    ),
    estimated_time_evening: String(
      data.estimated_time_evening || `${evening_routine.length * 2} minutes`,
    ),
  };
}

const routineRoutes = new Hono();

routineRoutes.get('/build', (c) => {
  return c.json({
    endpoint: '/routine/build',
    description: 'Generate a complete AM/PM skincare routine with 30-day compliance plan',
    usage: {
      method: 'POST',
      body: {
        skin_profile: '(required) Object with skin_type (string) and top_concerns (string[])',
        budget: '(optional) "budget" | "moderate" | "premium"',
        goals: '(optional) Array of goals e.g. ["clear acne", "reduce oiliness"]',
        time_available: '(optional) String e.g. "10 minutes morning, 15 minutes evening"',
      },
    },
    price: '$0.05',
  });
});

routineRoutes.post('/build', async (c) => {
  let body: RoutineBuildInput;
  try {
    body = await c.req.json<RoutineBuildInput>();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
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

  const prompt = buildRoutinePrompt(body);

  let rawResponse: string;
  try {
    rawResponse = await invokeClaude(prompt, undefined, 2048, true);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: 'AI routine generation failed', detail: message }, 500);
  }

  let result: RoutineBuildResult;
  try {
    result = parseRoutineResponse(rawResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to parse AI response';
    return c.json({ error: 'Failed to parse routine result', detail: message }, 500);
  }

  return c.json(result);
});

export { routineRoutes };
