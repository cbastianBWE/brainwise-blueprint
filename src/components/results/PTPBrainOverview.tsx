import React from "react";

interface PTPBrainOverviewProps {
  contextTab: "professional" | "personal" | "combined" | null;
}

const FULL_OVERVIEW = `Your brain is constantly scanning for two things: what threatens you, and what rewards you. It does this whether you're aware of it or not, and the answers shape how you respond, what you notice, and what you avoid.

The Personal Threat Profile maps that scanning across five dimensions. Three are about threat — **Protection** (the need to feel safe and secure), **Participation** (the need to belong and be welcomed), and **Prediction** (the need to understand what's happening and what comes next). Two are about reward — **Purpose** (a sense of meaning) and **Pleasure** (the experience of genuine enjoyment).

One principle is worth holding in mind as you read: your brain only fully engages with reward when it feels sufficiently safe. Until the three threat dimensions are adequately met, Purpose and Pleasure stay largely out of reach.

You took the full Personal Threat Profile, covering all five domains across 89 items. What follows shows you where your sensitivities are highest and lowest. The items where you scored very high or very low are the ones most likely to trigger a stress response, and the ones most likely to shape how you behave under pressure. Pay particular attention to those — they are your major drivers.

This report is the starting point, not the conclusion. It doesn't interpret your results for you. That work is yours, ideally with a coach or someone who knows you well. The sections that follow give you a place to begin.`;

const PERSONAL_OVERVIEW = `Your brain is constantly scanning for two things: what threatens you, and what rewards you. It does this whether you're aware of it or not, and the answers shape how you respond, what you notice, and what you avoid.

The Personal Threat Profile maps that scanning across five dimensions. Three are about threat — **Protection** (the need to feel safe and secure), **Participation** (the need to belong and be welcomed), and **Prediction** (the need to understand what's happening and what comes next). Two are about reward — **Purpose** (a sense of meaning) and **Pleasure** (the experience of genuine enjoyment).

One principle is worth holding in mind as you read: your brain only fully engages with reward when it feels sufficiently safe. Until the three threat dimensions are adequately met, Purpose and Pleasure stay largely out of reach.

You took the personal context of the Personal Threat Profile, covering all five domains across 42 items focused on your life outside work — relationships, identity, meaning, and the experiences that bring you alive. What follows shows you where your sensitivities are highest and lowest. The items where you scored very high or very low are the ones most likely to trigger a stress response, and the ones most likely to shape how you show up in your personal world. Pay particular attention to those — they are your major drivers.

This report is the starting point, not the conclusion. It doesn't interpret your results for you. That work is yours, ideally with a coach or someone who knows you well. The sections that follow give you a place to begin.`;

const PROFESSIONAL_OVERVIEW = `Your brain is constantly scanning for two things at work: what threatens you, and what rewards you. It does this whether you're aware of it or not, and the answers shape how you respond to colleagues, how you handle pressure, and how you make decisions under stress.

The full Personal Threat Profile maps that scanning across five dimensions — three threats and two rewards. The professional context you took focuses on the three threat dimensions, the ones most likely to surface in workplace settings: **Protection** (the need to feel safe and secure), **Participation** (the need to belong and be welcomed), and **Prediction** (the need to understand what's happening and what comes next).

One principle is worth holding in mind: your brain can only fully engage at work when it feels sufficiently safe in these three areas. When Protection, Participation, or Prediction is activated, your capacity to do your best work narrows.

You took the professional context of the Personal Threat Profile, covering the three threat domains across 47 items. What follows shows you where your sensitivities are highest and lowest. The items where you scored very high or very low are the ones most likely to trigger a stress response at work, and the ones most likely to shape how you behave under pressure. Pay particular attention to those — they are your major drivers.

This report is the starting point, not the conclusion. It doesn't interpret your results for you. That work is yours, ideally with a coach or someone who knows you well. The sections that follow give you a place to begin.`;

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} style={{ fontWeight: 600, color: "var(--fg-1)" }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export default function PTPBrainOverview({ contextTab }: PTPBrainOverviewProps) {
  let body: string;
  if (contextTab === "professional") body = PROFESSIONAL_OVERVIEW;
  else if (contextTab === "personal") body = PERSONAL_OVERVIEW;
  else body = FULL_OVERVIEW;

  const paragraphs = body.split("\n\n").filter((p) => p.trim().length > 0);

  return (
    <div
      style={{
        background: "var(--bw-white)",
        border: "1px solid var(--border-1)",
        borderLeft: "4px solid var(--bw-navy)",
        borderRadius: "var(--r-md)",
        padding: "var(--s-6)",
        boxShadow: "var(--shadow-sm)",
        fontFamily: "var(--font-primary)",
      }}
    >
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 18,
          fontWeight: 600,
          color: "var(--fg-1)",
          margin: 0,
          marginBottom: "var(--s-4)",
          letterSpacing: "-0.01em",
        }}
      >
        The brain at work behind your results
      </h3>
      <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--fg-2)" }}>
        {paragraphs.map((p, i) => (
          <p
            key={i}
            style={{
              margin: 0,
              marginBottom: i < paragraphs.length - 1 ? "var(--s-3)" : 0,
            }}
          >
            {renderInline(p)}
          </p>
        ))}
      </div>
    </div>
  );
}
