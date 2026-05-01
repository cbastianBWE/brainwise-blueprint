export type MarketingCardCTA =
  | { label: string; action: "open-briefing" }
  | { label: string; action: "navigate"; to: string };

export type MarketingCardData = {
  id: string;
  title: string;
  summary: string;
  body: string;
  benefits: string[];
  status?: "available" | "coming_soon";
  cta: MarketingCardCTA;
};
