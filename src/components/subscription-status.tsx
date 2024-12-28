'use client';

import { useEffect, useState } from "react";
import { subscriptionPrices } from "@/lib/subscription-prices";
import { SubscriptionManagement } from "./subscription-management";
import { Card } from "./ui/card";
import Link from "next/link";

interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  subscription_id: string | null;
  start_date: string;
  end_date: string;
  billing_interval: string;
  amount: number;
  currency: string;
  last_billing_date: string | null;
  next_billing_date: string | null;
  cancelled: boolean;
  cancelled_at: string | null;
  trial_ends_at: string | null;
  payment_method: string | null;
  payment_method_id: string | null;
  created_at: string;
  updated_at: string;
}

export function SubscriptionStatus() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await fetch('/api/subscription/current');
        if (!response.ok) {
          throw new Error('Failed to fetch subscription');
        }
        const data = await response.json();
        setSubscription(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load subscription');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-red-500">Error: {error}</div>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card className="p-6">
        <div>No subscription found</div>
      </Card>
    );
  }

  const currentPlan = subscriptionPrices.find(
    (plan) => plan.id === subscription.plan_id
  );

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Subscription Details</h2>
        <div className="space-y-2">
          <p>
            <span className="font-medium">Current Plan:</span>{" "}
            {currentPlan?.name || "Unknown"}
          </p>
          <p>
            <span className="font-medium">Billing Interval:</span>{" "}
            {subscription.billing_interval.toLowerCase()}
          </p>
          {subscription.amount > 0 && (
            <p>
              <span className="font-medium">Amount:</span>{" "}
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: subscription.currency
              }).format(subscription.amount)}
            </p>
          )}
          {subscription.next_billing_date && (
            <p>
              <span className="font-medium">Next Billing Date:</span>{" "}
              {new Date(subscription.next_billing_date).toLocaleDateString()}
            </p>
          )}
          {subscription.plan_id === 'free' && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">
                Upgrade to a paid plan to access premium features and support our service.
              </p>
              <Link 
                href="/pricing" 
                className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/90"
              >
                View Available Plans →
              </Link>
            </div>
          )}
        </div>
      </Card>

      <SubscriptionManagement subscription={subscription} />
    </div>
  );
}
