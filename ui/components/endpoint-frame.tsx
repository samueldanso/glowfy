"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Endpoint {
  id: string;
  label: string;
  price: string;
  description: string;
  output: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    id: "analyze",
    label: "/skin/analyze",
    price: "$0.05",
    description: "Photo URL or text description → skin type + 10 concern scores (0–100)",
    output: `{
  "skin_type": "combination",
  "top_concerns": ["oiliness", "acne", "dehydration"],
  "concerns": [
    { "name": "acne",        "score": 72 },
    { "name": "oiliness",    "score": 65 },
    { "name": "dehydration", "score": 48 }
  ],
  "confidence": 0.84,
  "analysis": "Combination skin with oily T-zone and dry patches.
Primary concerns are active acne and excess sebum production."
}`,
  },
  {
    id: "quiz",
    label: "/skin/quiz",
    price: "$0.03",
    description: "Lifestyle survey → full skin profile — no photo needed",
    output: `{
  "skin_type": "oily",
  "top_concerns": ["acne", "large_pores", "oiliness"],
  "confidence": 0.68,
  "analysis": "Oily skin in a humid climate — sebum overproduction
is the root cause of both acne and enlarged pores.",
  "recommendations_summary": "Focus on BHAs to control sebum.
Niacinamide 10% morning, salicylic acid 2% evening."
}`,
  },
  {
    id: "routine",
    label: "/routine/build",
    price: "$0.05",
    description: "Skin profile → complete AM/PM routine + 30-day compliance plan",
    output: `{
  "morning_routine": [
    { "order": 1, "step": "Cleanser",
      "product_type": "Gel cleanser",
      "why": "Removes overnight sebum without stripping.",
      "ingredients_to_seek": ["SALICYLIC ACID", "GLYCERIN"] },
    { "order": 2, "step": "Niacinamide serum",
      "why": "Controls oil, reduces pore appearance.",
      "ingredients_to_seek": ["NIACINAMIDE"] },
    { "order": 3, "step": "SPF 50",
      "why": "Mandatory. Prevents hyperpigmentation." }
  ],
  "estimated_time_morning": "7 min",
  "compliance_plan": { "week_1": "Cleanser + SPF only." }
}`,
  },
  {
    id: "check",
    label: "/ingredients/check",
    price: "$0.02",
    description: "Raw ingredient list → per-ingredient safety, comedogenic, and irritation scores",
    output: `{
  "overall_score": 88,
  "total_ingredients": 12,
  "flagged_count": 1,
  "flagged": ["SODIUM LAURYL SULFATE"],
  "ingredients": [
    { "name": "GLYCERIN",    "safety": 1, "comedogenic": 0,
      "irritation": 0, "notes": "Humectant — safe for all." },
    { "name": "NIACINAMIDE", "safety": 1, "comedogenic": 0,
      "irritation": 1, "notes": "Controls sebum. Excellent." }
  ],
  "summary": "88/100 — SLS flagged for irritation potential."
}`,
  },
  {
    id: "recommend",
    label: "/ingredients/recommend",
    price: "$0.02",
    description: "Skin profile → top 5 ingredients to seek + top 5 to avoid",
    output: `{
  "skin_type": "oily",
  "top_concerns": ["acne", "oiliness"],
  "seek": [
    { "ingredient": "NIACINAMIDE",    "confidence": "high",
      "reason": "Regulates sebum, anti-inflammatory, reduces pores." },
    { "ingredient": "SALICYLIC ACID", "confidence": "high",
      "reason": "BHA — dissolves pore-clogging debris." },
    { "ingredient": "AZELAIC ACID",   "confidence": "high",
      "reason": "Kills acne bacteria, fades post-acne marks." }
  ],
  "avoid": [
    { "ingredient": "COCONUT OIL", "confidence": "high",
      "reason": "Comedogenic rating 4/5 — will worsen acne." }
  ]
}`,
  },
  {
    id: "match",
    label: "/product/match",
    price: "$0.02",
    description: "Product + skin profile → compatibility score (0–100) and verdict",
    output: `{
  "product_name": "CeraVe Moisturizing Cream",
  "score": 78,
  "verdict": "good",
  "reasons": [
    "Ceramides restore compromised skin barrier.",
    "No comedogenic actives — safe for acne-prone skin.",
    "Hyaluronic acid provides hydration without oil."
  ],
  "watch_for": ["May feel heavy for very oily skin types."],
  "ingredient_highlights": {
    "beneficial": ["CERAMIDE NP", "SODIUM HYALURONATE"],
    "concerning": []
  },
  "recommendation": "Apply at night after treatment serums."
}`,
  },
];

export function EndpointFrame() {
  const [activeId, setActiveId] = useState(ENDPOINTS[0].id);
  const [copied, setCopied] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  const active = ENDPOINTS.find((e) => e.id === activeId)!;

  // Move the pill to sit under the active tab — same technique as prose.ami.rip
  useEffect(() => {
    const tabs = tabsRef.current;
    const pill = pillRef.current;
    if (!tabs || !pill) return;

    const idx = ENDPOINTS.findIndex((e) => e.id === activeId);
    const tabEls = tabs.querySelectorAll<HTMLButtonElement>("[role=tab]");
    const tab = tabEls[idx];
    if (!tab) return;

    Object.assign(pill.style, {
      left: tab.offsetLeft + "px",
      top: tab.offsetTop + "px",
      width: tab.offsetWidth + "px",
      height: tab.offsetHeight + "px",
    });
  }, [activeId]);

  // Initial pill position after mount
  useEffect(() => {
    const tabs = tabsRef.current;
    const pill = pillRef.current;
    if (!tabs || !pill) return;

    const tabEls = tabs.querySelectorAll<HTMLButtonElement>("[role=tab]");
    const first = tabEls[0];
    if (!first) return;

    // No transition on initial placement
    pill.style.transition = "none";
    Object.assign(pill.style, {
      left: first.offsetLeft + "px",
      top: first.offsetTop + "px",
      width: first.offsetWidth + "px",
      height: first.offsetHeight + "px",
    });

    // Re-enable transition after next paint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (pillRef.current) {
          pillRef.current.style.transition = "";
        }
      });
    });
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(active.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable — fail silently
    }
  }

  return (
    <div className="frame">
      {/* Tab bar */}
      <div
        className="frame-tabs"
        ref={tabsRef}
        role="tablist"
        aria-label="Endpoint"
      >
        <span className="tab-pill" ref={pillRef} aria-hidden="true" />

        {ENDPOINTS.map((ep) => (
          <button
            key={ep.id}
            className={`frame-tab${ep.id === activeId ? " active" : ""}`}
            role="tab"
            aria-selected={ep.id === activeId}
            onClick={() => setActiveId(ep.id)}
          >
            <span className="tab-price">{ep.price}</span>
            {ep.label}
          </button>
        ))}
      </div>

      {/* Panel body */}
      <div className="frame-panel" role="tabpanel">
        <div className="panel-meta">
          <span className="meta-method">POST</span>
          <span className="meta-desc">{active.description}</span>
        </div>

        <div className="panel-output">
          <button
            className="copy-btn"
            onClick={handleCopy}
            title={copied ? "Copied" : "Copy response"}
            aria-label={copied ? "Copied" : "Copy sample response"}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
          <pre>
            <code>{active.output}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
