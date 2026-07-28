"use client";

import { Copy, Check } from "@phosphor-icons/react";
import { useState } from "react";

const AGENTS = [
  { id: "codex", label: "Codex" },
  { id: "opencode", label: "OpenCode" },
  { id: "gemini", label: "Gemini" },
  { id: "claude", label: "Claude Code" },
  { id: "cursor", label: "Cursor" },
];

interface Service {
  id: string;
  label: string;
  prompt: string;
}

const SERVICES: Service[] = [
  {
    id: "analyze",
    label: "Skin Analysis",
    prompt: `I'd like to use the service provided by Agent 5264:

Service title: Skin Analysis
Service type: A2MCP
Endpoint: https://glowfy.onrender.com/skin/analyze
Please use OKX Agent Payments Protocol to send a request to this endpoint`,
  },
  {
    id: "quiz",
    label: "Skin Quiz",
    prompt: `I'd like to use the service provided by Agent 5264:

Service title: Skin Quiz
Service type: A2MCP
Endpoint: https://glowfy.onrender.com/skin/quiz
Please use OKX Agent Payments Protocol to send a request to this endpoint`,
  },
  {
    id: "routine",
    label: "Routine Builder",
    prompt: `I'd like to use the service provided by Agent 5264:

Service title: Routine Builder
Service type: A2MCP
Endpoint: https://glowfy.onrender.com/routine/build
Please use OKX Agent Payments Protocol to send a request to this endpoint`,
  },
  {
    id: "check",
    label: "Safety Check",
    prompt: `I'd like to use the service provided by Agent 5264:

Service title: Ingredient Safety Check
Service type: A2MCP
Endpoint: https://glowfy.onrender.com/ingredients/check
Please use OKX Agent Payments Protocol to send a request to this endpoint`,
  },
  {
    id: "recommend",
    label: "Ingredients",
    prompt: `I'd like to use the service provided by Agent 5264:

Service title: Ingredient Recommendations
Service type: A2MCP
Endpoint: https://glowfy.onrender.com/ingredients/recommend
Please use OKX Agent Payments Protocol to send a request to this endpoint`,
  },
  {
    id: "match",
    label: "Product Match",
    prompt: `I'd like to use the service provided by Agent 5264:

Service title: Product Match
Service type: A2MCP
Endpoint: https://glowfy.onrender.com/product/match
Please use OKX Agent Payments Protocol to send a request to this endpoint`,
  },
];

export function EndpointFrame() {
  const [agentId, setAgentId] = useState(AGENTS[0].id);
  const [serviceId, setServiceId] = useState(SERVICES[0].id);
  const [copied, setCopied] = useState(false);

  const active = SERVICES.find((s) => s.id === serviceId)!;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(active.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <div className="frame">
      {/* Agent tabs */}
      <div className="frame-tabs" role="tablist" aria-label="Agent">
        {AGENTS.map((agent) => (
          <button
            key={agent.id}
            className={`frame-tab${agent.id === agentId ? " active" : ""}`}
            role="tab"
            aria-selected={agent.id === agentId}
            onClick={() => setAgentId(agent.id)}
          >
            {agent.label}
          </button>
        ))}
      </div>

      {/* Service tabs */}
      <div className="frame-tabs service-row" role="tablist" aria-label="Service">
        {SERVICES.map((svc) => (
          <button
            key={svc.id}
            className={`frame-tab service${svc.id === serviceId ? " active" : ""}`}
            role="tab"
            aria-selected={svc.id === serviceId}
            onClick={() => setServiceId(svc.id)}
          >
            {svc.label}
          </button>
        ))}
      </div>

      {/* Prompt body */}
      <div className="frame-panel" role="tabpanel">
        <div className="panel-output">
          <button
            className="copy-btn"
            onClick={handleCopy}
            title={copied ? "Copied" : "Copy"}
            aria-label={copied ? "Copied" : "Copy prompt"}
          >
            {copied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="regular" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <pre>
            <code>{active.prompt}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
