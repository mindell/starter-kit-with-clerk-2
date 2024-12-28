export type BillingInterval = 'MONTHLY' | 'YEARLY';

export interface Credits {
  monthly: number;    // Credits given per month
  rollover: boolean;  // Can unused credits roll over?
  maximum: number;    // Maximum credits that can be accumulated
}

export interface SubscriptionTier {
  id: string;
  name: string;
  description: React.ComponentType;  // Component for rendering description
  price: number;
  currency: string;
  stripePriceId: string;
  billingInterval: BillingInterval;
  credits: Credits;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  subscription_id: string | null;
  start_date: string;
  end_date: string;
  billing_interval: BillingInterval;
  amount: number;
  currency: string;
  email: string;
  cancelled: boolean;
  credits_limit: number;
  credits_remaining: number;
  credits_reset_count: number;
  created_at: string;
  updated_at: string;
}

export type CreditOperation = {
  subscriptionId: string;
  amount: number;
  operation: 'USE' | 'RESET' | 'BONUS';
  description: string;
};
