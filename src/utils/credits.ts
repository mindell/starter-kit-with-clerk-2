import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { generateDeterministicUUID } from "@/utils/supabase/auth";
import { subscriptionPrices } from "@/lib/subscription-prices";

export async function checkCredits(
  operation: string,
  requiredCredits: number
) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return { error: 'Unauthorized', hasCredits: false };
    }

    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const supabaseUserId = generateDeterministicUUID(clerkUserId);

    const { data: subscription, error } = await supabase
      .from('subscription')
      .select('id, credits_remaining, plan_id')
      .eq('user_id', supabaseUserId)
      .single();

    if (error || !subscription) {
      return { error: 'No active subscription found', hasCredits: false };
    }

    // Get the subscription plan details
    const plan = subscriptionPrices.find(p => p.id === subscription.plan_id);
    if (!plan) {
      return { error: 'Invalid subscription plan', hasCredits: false };
    }

    // If it's free tier and requires credits, return upgrade message
    if (plan.id === 'free' && plan.credits.monthly === 0) {
      return {
        hasCredits: false,
        subscription_id: subscription.id,
        credits_remaining: 0,
        error: 'This feature requires a paid subscription. Please upgrade your plan.',
        requiresUpgrade: true
      };
    }

    const hasEnoughCredits = subscription.credits_remaining >= requiredCredits;

    return {
      hasCredits: hasEnoughCredits,
      subscription_id: subscription.id,
      credits_remaining: subscription.credits_remaining,
      error: hasEnoughCredits ? null : 'Insufficient credits',
      requiresUpgrade: !hasEnoughCredits && plan.id === 'free'
    };
  } catch (error) {
    console.error('Error checking credits:', error);
    return { error: 'Failed to check credits', hasCredits: false };
  }
}
