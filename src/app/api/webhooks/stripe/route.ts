import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { generateDeterministicUUID } from "@/utils/supabase/auth";
import Stripe from "stripe";

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('handleSubscriptionCreated', subscription);
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);
  
  const { userId } = subscription.metadata;
  const supabaseUserId = generateDeterministicUUID(userId);
  
  const subscriptionData = {
    user_id: supabaseUserId,
    plan_id: subscription.metadata.planId,
    subscription_id: subscription.id,
    start_date: new Date(subscription.current_period_start * 1000),
    end_date: new Date(subscription.current_period_end * 1000),
    billing_interval: subscription.items.data[0].price.recurring?.interval.toUpperCase()+'LY' as 'MONTHLY' | 'YEARLY',
    amount: subscription.items.data[0].price.unit_amount! / 100,
    currency: subscription.currency.toUpperCase(),
    next_billing_date: new Date(subscription.current_period_end * 1000),
    payment_method: subscription.default_payment_method as string,
    trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
  };

  // First try to update existing subscription
  const { error: updateError } = await supabase
    .from('subscription')
    .update(subscriptionData)
    .eq('user_id', supabaseUserId);

  // If no subscription exists (no rows updated), then insert
  if (updateError?.code === 'PGRST116') {
    const { error: insertError } = await supabase
      .from('subscription')
      .insert(subscriptionData);
    
    if (insertError) throw insertError;
  } else if (updateError) {
    throw updateError;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);
  
  const { userId } = subscription.metadata;
  const supabaseUserId = generateDeterministicUUID(userId);

  const subscriptionData = {
    end_date: new Date(subscription.current_period_end * 1000),
    next_billing_date: new Date(subscription.current_period_end * 1000),
    payment_method: subscription.default_payment_method as string,
    cancelled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
  };

  const { error } = await supabase
    .from('subscription')
    .update(subscriptionData)
    .eq('subscription_id', subscription.id)
    .eq('user_id', supabaseUserId);

  if (error) throw error;
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);
  
  const { userId } = subscription.metadata;
  const supabaseUserId = generateDeterministicUUID(userId);

  const { error } = await supabase
    .from('subscription')
    .update({
      cancelled_at: new Date(),
      end_date: new Date(subscription.current_period_end * 1000)
    })
    .eq('subscription_id', subscription.id)
    .eq('user_id', supabaseUserId);

  if (error) throw error;
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);
  
  if (!invoice.subscription) return;
  
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
  const { userId } = subscription.metadata;
  const supabaseUserId = generateDeterministicUUID(userId);

  // Create base invoice data without optional fields
  const invoiceData: Record<string, any> = {
    user_id: supabaseUserId,
    subscription_id: invoice.subscription,
    invoice_id: invoice.id,
    amount: invoice.amount_paid / 100,
    currency: invoice.currency.toUpperCase(),
    status: invoice.status,
    invoice_pdf: invoice.invoice_pdf,
    hosted_invoice_url: invoice.hosted_invoice_url,
    payment_intent_id: invoice.payment_intent as string,
    period_start: new Date(invoice.period_start * 1000),
    period_end: new Date(invoice.period_end * 1000)
  };

  // Add optional fields only if they exist in schema and have values
  if (invoice.billing_reason) {
    invoiceData.billing_reason = invoice.billing_reason;
  }

  const { error } = await supabase
    .from('invoice')
    .upsert(invoiceData);

  if (error) throw error;
}

export async function POST(req: Request) {
  const body = await req.text();
  const headrs = await headers();
  const signature = headrs.get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}
