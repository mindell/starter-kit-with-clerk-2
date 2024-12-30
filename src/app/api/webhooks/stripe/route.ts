import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { resend } from "@/lib/resend";
import { PaidSubscriptionEmail } from "@/emails/paid-subscription";
import { ExpandedCustomer } from "@/types/stripe";
import { subscriptionPrices } from "@/lib/subscription-prices";

// Helper function to get Supabase client
async function getSupabase() {
  const cookieStore = cookies();
  return await createClient(cookieStore);
}

// Helper function to get plan details
function getPlanFromPrice(priceId: string) {
  const price = subscriptionPrices.find(p => p.stripePriceId === priceId);
  if (!price) throw new Error('Invalid price ID');
  return price;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const supabase = await getSupabase();
  
  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  const price = subscription.items.data[0].price;
  const plan = getPlanFromPrice(price.id);

  // Update subscription in database with initial credits
  const { data: updatedSub, error: updateError } = await supabase
    .from('subscription')
    .update({
      subscription_id: subscription.id,
      plan_id: plan.id,
      billing_interval: price.recurring?.interval.toUpperCase(),
      amount: price.unit_amount ? price.unit_amount / 100 : 0,
      currency: price.currency.toUpperCase(),
      start_date: new Date(subscription.current_period_start * 1000).toISOString(),
      end_date: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelled: false,
      credits_limit: plan.credits.maximum,
      credits_remaining: plan.credits.monthly,
      credits_reset_count: 0
    })
    .eq('user_id', session.client_reference_id)
    .select()
    .single();

  if (updateError) throw updateError;

  // Log initial credit allocation
  const { error: auditError } = await supabase
    .from('subscription_audit_log')
    .insert({
      subscription_id: updatedSub.id,
      action: 'initial_credit_allocation',
      details: {
        plan_id: plan.id,
        credits_allocated: plan.credits.monthly,
        credits_limit: plan.credits.maximum,
        subscription_id: subscription.id,
        billing_interval: price.recurring?.interval.toUpperCase()
      }
    });

  if (auditError) {
    console.error('Audit log error:', auditError);
    // Don't throw, as the main operation succeeded
  }

  // Send welcome email
  const customer = await stripe.customers.retrieve(session.customer as string) as ExpandedCustomer;
  if (customer.email) {
    await resend.emails.send({
      from: `${process.env.MAIL_FROM_NAME} <${process.env.MAIL_FROM_EMAIL}>`,
      to: customer.email,
      subject: 'Welcome to Your New Subscription!',
      react: PaidSubscriptionEmail({
        username: customer.email.split('@')[0],
        planName: plan.name,
        amount: plan.price,
        currency: plan.currency,
        credits: plan.credits.monthly,
        billingInterval: plan.billingInterval,
        nextBillingDate: new Date(subscription.current_period_end * 1000).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })
      })
    });
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const supabase = await getSupabase();
  
  const price = subscription.items.data[0].price;
  const plan = getPlanFromPrice(price.id);
  
  // Get current subscription from database
  const { data: currentSub } = await supabase
    .from('subscription')
    .select('credits_remaining, plan_id, id')
    .eq('subscription_id', subscription.id)
    .single();

  // Calculate new credits based on plan change
  let newCredits = plan.credits.monthly;
  if (currentSub && currentSub.plan_id !== plan.id) {
    // If upgrading and plan allows rollover, keep existing credits up to new maximum
    if (plan.credits.rollover) {
      newCredits = Math.min(
        currentSub.credits_remaining + plan.credits.monthly,
        plan.credits.maximum
      );
    }
  }

  // Update subscription in database
  const { error: updateError } = await supabase
    .from('subscription')
    .update({
      plan_id: plan.id,
      credits_remaining: newCredits,
      credits_limit: plan.credits.maximum
    })
    .eq('subscription_id', subscription.id);

  if (updateError) throw updateError;

  // Log plan change and credit adjustment
  if (currentSub) {
    const { error: auditError } = await supabase
      .from('subscription_audit_log')
      .insert({
        subscription_id: currentSub.id,
        action: 'plan_change',
        details: {
          previous_plan: currentSub.plan_id,
          new_plan: plan.id,
          previous_credits: currentSub.credits_remaining,
          new_credits: newCredits,
          new_limit: plan.credits.maximum,
          rollover_applied: plan.credits.rollover
        }
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
      // Don't throw, as the main operation succeeded
    }
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const supabase = await getSupabase();
  
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
  const price = subscription.items.data[0].price;
  const plan = getPlanFromPrice(price.id);

  // Get current subscription from database
  const { data: currentSub } = await supabase
    .from('subscription')
    .select('credits_remaining, credits_limit, id, credits_reset_count')
    .eq('subscription_id', subscription.id)
    .single();

  if (!currentSub) throw new Error('Subscription not found');

  // Calculate new credits (monthly allocation + rollover if applicable)
  const newCredits = plan.credits.rollover
    ? Math.min(currentSub.credits_remaining + plan.credits.monthly, plan.credits.maximum)
    : plan.credits.monthly;

  // Update subscription in database
  const { error: updateError } = await supabase
    .from('subscription')
    .update({
      credits_remaining: newCredits,
      end_date: new Date(subscription.current_period_end * 1000).toISOString(),
      credits_reset_count: (currentSub.credits_reset_count || 0) + 1
    })
    .eq('subscription_id', subscription.id);

  if (updateError) throw updateError;

  // Log monthly credit refresh
  const { error: auditError } = await supabase
    .from('subscription_audit_log')
    .insert({
      subscription_id: currentSub.id,
      action: 'monthly_credit_refresh',
      details: {
        previous_credits: currentSub.credits_remaining,
        monthly_allocation: plan.credits.monthly,
        new_credits: newCredits,
        rollover_applied: plan.credits.rollover,
        invoice_id: invoice.id
      }
    });

  if (auditError) {
    console.error('Audit log error:', auditError);
    // Don't throw, as the main operation succeeded
  }

  // Send payment confirmation email
  if (invoice.customer_email) {
    await resend.emails.send({
      from: `${process.env.MAIL_FROM_NAME} <${process.env.MAIL_FROM_EMAIL}>`,
      to: invoice.customer_email,
      subject: 'Payment Received - Credits Updated',
      react: PaidSubscriptionEmail({
        username: invoice.customer_email.split('@')[0],
        planName: plan.name,
        currency: plan.currency,
        amount: plan.price,
        credits: newCredits - (currentSub?.credits_remaining || 0), // Show only new credits added
        billingInterval: plan.billingInterval,
        nextBillingDate: new Date(subscription.current_period_end * 1000).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        }),
      })
    });
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const headrs = await headers();
  const signature = headrs.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new NextResponse(
      `Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new NextResponse(
      `Webhook Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 400 }
    );
  }
}
