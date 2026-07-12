/**
 * Extract JSON from an LLM response that may be wrapped in markdown code fences.
 * Handles: bare JSON, ```json ... ```, ``` ... ```, or JSON embedded in text.
 */
export function extractJson(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  return raw.trim();
}
