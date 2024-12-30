import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { CreditOperation } from "@/types/subscription";
import { subscriptionPrices } from "./subscription-prices";

interface CreditUpdateResult {
  credits_remaining: number;
  credits_limit: number;
  plan_id: string;
}

/**
 * Track credit usage and maintain audit trail
 * @param operation Credit operation details
 * @returns Updated credit information
 */
export async function trackCreditUsage(operation: CreditOperation): Promise<CreditUpdateResult> {
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);

  try {
    // Lock the subscription row for update
    const { data: subscription, error: subError } = await supabase
      .from('subscription')
      .select('id, credits_remaining, credits_limit, plan_id')
      .eq('id', operation.subscriptionId)
      .single();

    if (subError || !subscription) {
      throw new Error('Failed to fetch subscription');
    }

    const plan = subscriptionPrices.find(p => p.id === subscription.plan_id);
    if (!plan) throw new Error('Invalid subscription plan');

    // Calculate new remaining credits
    let newRemaining = subscription.credits_remaining;
    let auditAction: string;
    let auditDetails: Record<string, any> = {
      previous_credits: subscription.credits_remaining,
      operation: operation.operation,
      amount: operation.amount
    };

    switch (operation.operation) {
      case 'USE':
        // Verify sufficient credits
        if (subscription.credits_remaining < operation.amount) {
          throw new Error('Insufficient credits');
        }
        newRemaining -= operation.amount;
        auditAction = 'credit_usage';
        break;

      case 'RESET':
        newRemaining = plan.credits.monthly;
        auditAction = 'credit_reset';
        auditDetails.reset_to = plan.credits.monthly;
        break;

      case 'BONUS':
        newRemaining = Math.min(
          newRemaining + operation.amount,
          subscription.credits_limit
        );
        auditAction = 'bonus_credits';
        break;

      default:
        throw new Error('Invalid operation type');
    }

    // Start transaction
    const { data: result, error: txError } = await supabase.rpc('handle_credit_operation', {
      p_subscription_id: subscription.id,
      p_new_remaining: newRemaining,
      p_operation: operation.operation,
      p_amount: operation.amount,
      p_description: operation.description
    });

    if (txError) {
      throw new Error(`Transaction failed: ${txError.message}`);
    }

    // Log to audit trail
    const { error: auditError } = await supabase
      .from('subscription_audit_log')
      .insert({
        subscription_id: subscription.id,
        action: auditAction,
        details: {
          ...auditDetails,
          new_credits: newRemaining,
          description: operation.description
        }
      });

    if (auditError) {
      console.error('Failed to create audit log:', auditError);
      // Don't throw, as the main operation succeeded
    }

    return {
      credits_remaining: newRemaining,
      credits_limit: subscription.credits_limit,
      plan_id: subscription.plan_id
    };

  } catch (error) {
    console.error('Credit operation failed:', error);
    throw error;
  }
}
