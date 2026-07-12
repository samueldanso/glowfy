import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/bedrock', () => ({
  invokeClaude: vi.fn(),
}));

import { Hono } from 'hono';
import { invokeClaude } from '../lib/bedrock';
import { routineRoutes } from './routine';

const mockInvoke = vi.mocked(invokeClaude);

const testApp = new Hono();
testApp.route('/routine', routineRoutes);

function post(path: string, body: unknown) {
  return testApp.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const MOCK_ROUTINE_RESPONSE = JSON.stringify({
  morning_routine: [
    {
      order: 1,
      step: 'Cleanse',
      product_type: 'Gel cleanser',
      why: 'Remove overnight sebum without stripping',
      ingredients_to_seek: ['SALICYLIC ACID', 'NIACINAMIDE'],
      ingredients_to_avoid: ['SODIUM LAURYL SULFATE'],
      duration: '60 seconds',
    },
    {
      order: 2,
      step: 'Moisturize',
      product_type: 'Lightweight gel moisturizer',
      why: 'Maintain hydration barrier without clogging pores',
      ingredients_to_seek: ['GLYCERIN', 'NIACINAMIDE'],
      ingredients_to_avoid: ['COCONUT OIL'],
      duration: '30 seconds',
    },
  ],
  evening_routine: [
    {
      order: 1,
      step: 'Double cleanse',
      product_type: 'Oil cleanser followed by gel cleanser',
      why: 'Remove sunscreen and daily buildup',
      ingredients_to_seek: ['SQUALANE'],
      ingredients_to_avoid: ['ISOPROPYL MYRISTATE'],
      duration: '90 seconds',
    },
  ],
  weekly_additions: [{ step: 'Clay mask', frequency: '2x/week', why: 'Deep pore cleansing' }],
  compliance_plan: {
    week_1: 'Start with cleanser and moisturizer only',
    week_2: 'Add morning SPF',
    week_3: 'Introduce evening treatment',
    week_4: 'Full routine with weekly additions',
    tracking: ['Take weekly photos', 'Note breakouts in journal'],
  },
  total_steps_morning: 2,
  total_steps_evening: 1,
  estimated_time_morning: '4 minutes',
  estimated_time_evening: '3 minutes',
});

describe('/routine/build', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue(MOCK_ROUTINE_RESPONSE);
  });

  it('POST with valid input returns 200 with full routine', async () => {
    const res = await post('/routine/build', {
      skin_profile: {
        skin_type: 'oily',
        top_concerns: ['acne', 'oiliness', 'large_pores'],
      },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.morning_routine).toHaveLength(2);
    expect(data.evening_routine).toHaveLength(1);
    expect(data.compliance_plan).toBeDefined();
    expect(data.compliance_plan.week_1).toBeDefined();
    expect(data.total_steps_morning).toBe(2);
    expect(data.total_steps_evening).toBe(1);
  });

  it('POST with missing skin_profile returns 400', async () => {
    const res = await post('/routine/build', {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('skin_profile is required');
  });

  it('POST with missing skin_type returns 400', async () => {
    const res = await post('/routine/build', {
      skin_profile: {
        top_concerns: ['acne'],
      },
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('skin_type');
  });

  it('POST with empty top_concerns returns 400', async () => {
    const res = await post('/routine/build', {
      skin_profile: {
        skin_type: 'oily',
        top_concerns: [],
      },
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('top_concerns');
  });

  it('GET returns usage docs', async () => {
    const res = await testApp.request('/routine/build', { method: 'GET' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.endpoint).toBe('/routine/build');
    expect(data.price).toBe('$0.05');
  });

  it('returns 500 when Claude fails', async () => {
    mockInvoke.mockRejectedValue(new Error('Bedrock error'));
    const res = await post('/routine/build', {
      skin_profile: {
        skin_type: 'oily',
        top_concerns: ['acne'],
      },
    });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain('AI routine generation failed');
  });
});
