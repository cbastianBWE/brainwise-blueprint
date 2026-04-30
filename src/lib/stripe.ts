// Stripe configuration — price and product IDs (LIVE MODE)
// Updated: Session 36 — pricing amendment per E-Q2, switched from test to live mode
export const STRIPE_PUBLISHABLE_KEY = "pk_live_51TK2Pl2FY7qIyIXALOqrfqTUpaluzl3V3hj59mz9E4qG5rdaYGjfGc6WKi6e6rZKippRJjYgwDiSgNIhaJg0Vct30052dAT8Sn";

export const PLANS = {
  base: {
    name: "Base",
    monthly: {
      price_id: "price_1TS3WV2FY7qIyIXA5L2Gs71D",
      price: 10,
    },
    annual: {
      price_id: "price_1TS3WU2FY7qIyIXAPG37X3eg",
      price: 100,
    },
    features: [
      "PTP instrument unlimited",
      "NAI, AIRSA, HSS — pay per assessment ($29.99)",
      "30 AI chat messages/month",
      "Access to base resources",
    ],
    ai_limit: 30,
  },
  premium: {
    name: "Premium",
    monthly: {
      price_id: "price_1TS3WY2FY7qIyIXA6aO8QZfO",
      price: 18,
    },
    annual: {
      price_id: "price_1TS3WY2FY7qIyIXAUrBknGRQ",
      price: 180,
    },
    features: [
      "All 4 instruments unlimited",
      "150 AI chat messages/month",
      "Access to premium resources",
      "Priority support",
    ],
    ai_limit: 150,
  },
} as const;

export const ASSESSMENT_PURCHASE = {
  price_id: "price_1TS3WY2FY7qIyIXAalOKbxdZ",
  price: 29.99,
  instruments: ["NAI", "AIRSA", "HSS", "PTP"],
} as const;

export type PlanTier = keyof typeof PLANS;
export type BillingInterval = "monthly" | "annual";
