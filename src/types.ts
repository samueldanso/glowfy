export interface SkinProfile {
  skinType: 'oily' | 'dry' | 'combination' | 'normal' | 'sensitive';
  concerns: { name: string; score: number }[];
  topConcerns: string[];
  confidence: number;
}

export interface IngredientScore {
  name: string;
  safety: number; // 1-10 (1=safest)
  comedogenic: number; // 0-5
  irritation: number; // 0-5
  category: string;
  notes: string;
}

export interface RoutineStep {
  order: number;
  step: string;
  productType: string;
  why: string;
  ingredients_to_seek: string[];
}

export interface ProductMatch {
  score: number; // 0-100
  verdict: 'excellent' | 'good' | 'caution' | 'avoid';
  reasons: string[];
  watchFor: string[];
}
