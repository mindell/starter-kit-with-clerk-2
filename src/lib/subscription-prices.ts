import { FreeTierDescription } from "@/components/prices/FreeTierDescription";
import { StandardTierDescription } from "@/components/prices/StandardTierDescription";
import { EnterpriseTierDescription } from "@/components/prices/EnterpriseTierDescription";
import { SubscriptionTier } from "@/types/subscription";

export const subscriptionPrices: SubscriptionTier[] = [
  {
    name: "Free Tier",
    id: "free",
    description: FreeTierDescription,
    price: 0,
    currency: "USD",
    stripePriceId: "",
    billingInterval: "MONTHLY",
    credits: {
      monthly: 100,    // 100 free credits per month
      rollover: false, // Credits don't roll over
      maximum: 100     // Can't accumulate more than 100
    }
  },
  {
    name: "Standard Tier",
    id: "standard",
    description: StandardTierDescription,
    price: 15,
    currency: "USD",
    stripePriceId: "price_1QSAcoK0eQ0Y39horWvdPMdy",
    billingInterval: "MONTHLY",
    credits: {
      monthly: 1000,   // 1000 credits per month
      rollover: true,  // Unused credits roll over
      maximum: 3000    // Can accumulate up to 3000
    }
  },
  {
    name: "Enterprise Tier",
    id: "enterprise",
    description: EnterpriseTierDescription,
    price: 60,
    currency: "USD",
    stripePriceId: "price_1QVT99K0eQ0Y39holLxNEwGu",
    billingInterval: "MONTHLY",
    credits: {
      monthly: 5000,   // 5000 credits per month
      rollover: true,  // Unused credits roll over
      maximum: 15000   // Can accumulate up to 15000
    }
  }
];
