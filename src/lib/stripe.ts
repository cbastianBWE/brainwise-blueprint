// Stripe configuration — price and product IDs
export const STRIPE_PUBLISHABLE_KEY = "pk_test_51TK2PzCMQX1silSQ4JJjibsxxJh0kLpTS74zqIIWKQxMGYfGHckb8gsG4V63K9Kot4CEBN4qMVwbqN5Cuq9ZPcuF008JCHffCG";

export const PLANS = {
  base: {
    name: "Base",
    product_id: "prod_UJ0cysJxUCxn4a",
    monthly: {
      price_id: "price_1TKObgCMQX1silSQMZ71bNuM",
      price: 14,
    },
    annual: {
      price_id: "price_1TKOd1CMQX1silSQigrP4JGm",
      price: 130,
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
    product_id: "prod_UJ0fZEaEn6S9Vu",
    monthly: {
      price_id: "price_1TKOdhCMQX1silSQYicToumr",
      price: 24,
    },
    annual: {
      price_id: "price_1TKOdzCMQX1silSQSPWiE7ac",
      price: 220,
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
  product_id: "prod_UJ0fo5LTXmz9Y3",
  price_id: "price_1TKOeMCMQX1silSQ7tzQLso6",
  price: 29.99,
  instruments: ["NAI", "AIRSA", "HSS", "PTP"],
} as const;

export type PlanTier = keyof typeof PLANS;
export type BillingInterval = "monthly" | "annual";
