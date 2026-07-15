/**
 * Extract JSON from an LLM response that may be wrapped in markdown code fences.
 * Handles: bare JSON, ```json ... ```, ``` ... ```, or JSON embedded in text.
 */
export function extractJson(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    return repairJson(fenceMatch[1].trim());
  }
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return repairJson(jsonMatch[0]);
  }
  return repairJson(raw.trim());
}

/**
 * Attempt to repair truncated JSON from LLM responses that hit token limits.
 * Closes unclosed brackets/braces and removes trailing commas.
 */
function repairJson(json: string): string {
  try {
    JSON.parse(json);
    return json;
  } catch {
    // Remove trailing comma before attempting repair
    let repaired = json.replace(/,\s*$/, '');

    // Remove incomplete key-value pairs at the end (e.g. `"key": "trun`)
    repaired = repaired.replace(/,\s*"[^"]*":\s*"[^"]*$/, '');
    repaired = repaired.replace(/,\s*"[^"]*":\s*$/, '');
    repaired = repaired.replace(/,\s*"[^"]*$/, '');

    // Count unclosed brackets
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escaped = false;

    for (const ch of repaired) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\' && inString) {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === '{') openBraces++;
      else if (ch === '}') openBraces--;
      else if (ch === '[') openBrackets++;
      else if (ch === ']') openBrackets--;
    }

    // Close unclosed strings
    if (inString) repaired += '"';

    // Remove trailing comma after closing incomplete strings
    repaired = repaired.replace(/,\s*$/, '');

    // Close brackets/braces in correct order by scanning from end
    while (openBrackets > 0) {
      repaired += ']';
      openBrackets--;
    }
    while (openBraces > 0) {
      repaired += '}';
      openBraces--;
    }

    return repaired;
  }
}
