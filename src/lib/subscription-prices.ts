import { FreeTierDescription } from "@/components/prices/FreeTierDescription";
import { StandardTierDescription } from "@/components/prices/StandardTierDescription";
import { EnterpriseTierDescription } from "@/components/prices/EnterpriseTierDescription";

export const subscriptionPrices = [
  {
    name: "Free Tier",
    id: "free",
    description: FreeTierDescription,
    price: 0,
    currency: "USD",
    stripePriceId: "",
    billingInterval: "MONTHLY",
  },
  {
    name: "Standard Tier",
    id: "standard",
    description: StandardTierDescription,
    price: 15,
    currency: "USD",
    stripePriceId: "price_1QSAcoK0eQ0Y39horWvdPMdy",
    billingInterval: "MONTHLY",
  },
  {
    name: "Enterprise Tier",
    id: "enterprise",
    description: EnterpriseTierDescription,
    price: 60,
    currency: "USD",
    stripePriceId: "price_1QVT99K0eQ0Y39holLxNEwGu",
    billingInterval: "MONTHLY",
  }
];
