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
  const { error: updateError } = await supabase
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
    .eq('user_id', session.client_reference_id);

  if (updateError) throw updateError;

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
    .select('credits_remaining, plan_id')
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

  // Update subscription
  const { error: updateError } = await supabase
    .from('subscription')
    .update({
      plan_id: plan.id,
      billing_interval: price.recurring?.interval.toUpperCase(),
      amount: price.unit_amount ? price.unit_amount / 100 : 0,
      currency: price.currency.toUpperCase(),
      start_date: new Date(subscription.current_period_start * 1000).toISOString(),
      end_date: new Date(subscription.current_period_end * 1000).toISOString(),
      credits_limit: plan.credits.maximum,
      credits_remaining: newCredits
    })
    .eq('subscription_id', subscription.id);

  if (updateError) throw updateError;
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const supabase = await getSupabase();
  
  // Only handle subscription invoices
  if (!invoice.subscription) return;
  
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
  const price = subscription.items.data[0].price;
  const plan = getPlanFromPrice(price.id);

  // For renewals, reset or update credits
  const { error: updateError } = await supabase
    .from('subscription')
    .update({
      credits_remaining: plan.credits.monthly,
      credits_reset_count: subscription.metadata.credits_reset_count 
        ? parseInt(subscription.metadata.credits_reset_count) + 1 
        : 1,
      end_date: new Date(subscription.current_period_end * 1000).toISOString()
    })
    .eq('subscription_id', subscription.id);

  if (updateError) throw updateError;

  // Send payment confirmation email
  if (invoice.customer_email) {
    await resend.emails.send({
      from: `${process.env.MAIL_FROM_NAME} <${process.env.MAIL_FROM_EMAIL}>`,
      to: invoice.customer_email,
      subject: 'Payment Received - Credits Renewed',
      react: PaidSubscriptionEmail({
        username: invoice.customer_email.split('@')[0],
        planName: plan.name,
        amount: plan.price,
        credits: plan.credits.monthly,
        currency: plan.currency,
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
