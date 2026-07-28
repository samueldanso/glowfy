import { EndpointFrame } from "@/components/endpoint-frame";
import Image from "next/image";

export default function Home() {
  return (
    <div className="page">
      <a href="#main" className="skip-link">Skip to content</a>
      <main id="main">
        <section className="hero">
          {/* Logo + wordmark */}
          <div className="logo-wrap">
            <Image
              src="/logo.jpg"
              alt="Glowfy"
              width={36}
              height={36}
              className="logo-img"
              priority
            />
            <span className="logo-name">Glowfy</span>
          </div>

          {/* Headline */}
          <h1>
            Your AI Skin Coach.
            <br />
            <em>Scan. Score. Glow.</em>
          </h1>

          {/* Sub */}
          <p className="sub">
            Six skincare tools powered by dermatological research and 1,900+ real
            products. Photo or text in. Expert analysis out. Pay per call.
          </p>

          {/* Agent connection card */}
          <EndpointFrame />
        </section>
      </main>

      <footer>
        <span>Glowfy</span>
        <span>·</span>
        <a
          href="https://www.okx.ai/agents/5264"
          target="_blank"
          rel="noopener noreferrer"
        >
          Available on OKX.AI
        </a>
        <span>·</span>
        <a
          href="https://github.com/samueldanso/glowfy"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <span>·</span>
        <a
          href="https://x.com/glowfy_ai"
          target="_blank"
          rel="noopener noreferrer"
        >
          @glowfy_ai
        </a>
      </footer>
    </div>
  );
}
