import { EndpointFrame } from "@/components/endpoint-frame";
import Image from "next/image";

export default function Home() {
  return (
    <div className="page">
      <main>
        <section className="hero">
          {/* Logo + wordmark */}
          <div className="logo-wrap">
            <Image
              src="/logo.jpg"
              alt="Glowfy"
              width={42}
              height={42}
              className="logo-img"
              priority
            />
            <span className="logo-name">Glowfy</span>
          </div>

          {/* Headline */}
          <h1>
            The AI Skin Coach.
            <br />
            <em>Scan. Score. Glow.</em>
          </h1>

          {/* Sub */}
          <p className="sub">
            Database-backed skincare intelligence — no subscriptions,
            no login, no guessing.
            <br />
            Six tools. Photo or text in. Expert analysis out. Pay per call.
          </p>

          {/* Interactive endpoint explorer */}
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
        <span>Lifestyle Companion</span>
      </footer>
    </div>
  );
}
