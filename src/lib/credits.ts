import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { CreditOperation } from "@/types/subscription";
import { subscriptionPrices } from "./subscription-prices";

export async function trackCreditUsage(operation: CreditOperation) {
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);

  // Start a transaction
  const { data: subscription, error: subError } = await supabase
    .from('subscription')
    .select('credits_remaining, credits_limit, plan_id')
    .eq('id', operation.subscriptionId)
    .single();

  if (subError || !subscription) {
    throw new Error('Failed to fetch subscription');
  }

  // For 'USE' operations, check if enough credits
  if (operation.operation === 'USE') {
    if (subscription.credits_remaining < operation.amount) {
      throw new Error('Insufficient credits');
    }
  }

  // Calculate new remaining credits
  let newRemaining = subscription.credits_remaining;
  if (operation.operation === 'USE') {
    newRemaining -= operation.amount;
  } else if (operation.operation === 'RESET' || operation.operation === 'BONUS') {
    const plan = subscriptionPrices.find(p => p.id === subscription.plan_id);
    if (!plan) throw new Error('Invalid plan');
    
    // For RESET, set to monthly amount, for BONUS add to existing
    newRemaining = operation.operation === 'RESET' 
      ? plan.credits.monthly 
      : newRemaining + operation.amount;

    // Ensure we don't exceed the maximum
    newRemaining = Math.min(newRemaining, plan.credits.maximum);
  }

  // Update subscription and record history
  const { error: updateError } = await supabase
    .from('subscription')
    .update({ credits_remaining: newRemaining })
    .eq('id', operation.subscriptionId);

  if (updateError) {
    throw new Error('Failed to update credits');
  }

  const { error: historyError } = await supabase
    .from('credit_history')
    .insert({
      subscription_id: operation.subscriptionId,
      amount: operation.amount,
      operation: operation.operation,
      description: operation.description
    });

  if (historyError) {
    throw new Error('Failed to record credit history');
  }

  return { credits_remaining: newRemaining };
}
