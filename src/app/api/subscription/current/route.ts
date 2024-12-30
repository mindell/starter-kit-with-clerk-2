import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { subscriptionPrices } from "@/lib/subscription-prices";
import { cookies } from 'next/headers';
import { generateDeterministicUUID } from "@/utils/supabase/auth";
import { resend } from "@/lib/resend";
import { FreeSubscriptionEmail } from "@/emails/free-subscription";

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    const cookieStore = cookies();
    
    if (!clerkUserId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Generate deterministic UUID for Supabase
    const supabaseUserId = generateDeterministicUUID(clerkUserId);
    // console.log('Clerk User ID:', clerkUserId);
    // console.log('Supabase User ID:', supabaseUserId);
    
    // Create Supabase client with service role
    const supabase = await createClient(cookieStore);

    try {
      const { data: currentSubscription, error } = await supabase
        .from('subscription')
        .select('*')
        .eq('user_id', supabaseUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Subscription Query Error:', error);
        throw error;
      }
      
      if (!currentSubscription) {
        const freeTier = subscriptionPrices.find(price => price.id === 'free');
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);

        // console.log('Creating subscription with user_id:', supabaseUserId);
        
        const user = await currentUser();
        if (!user) {
          throw new Error('User not found');
        }

        const primaryEmail = user.emailAddresses.find(
          (email) => email.id === user.primaryEmailAddressId
        )?.emailAddress;

        if (!primaryEmail) {
          throw new Error('Email not found');
        }

        const { data: newSubscription, error: createError } = await supabase
          .from('subscription')
          .insert([{
            user_id: supabaseUserId,
            plan_id: freeTier?.id,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            email: primaryEmail,
            billing_interval: 'MONTHLY',
            amount: 0,
            credits_limit: freeTier?.credits.maximum || 0,
            credits_remaining: freeTier?.credits.monthly || 0,
            credits_reset_count: 0
          }])
          .select()
          .single();

        if (createError) throw createError;

        // Log initial free subscription creation
        const { error: auditError } = await supabase
          .from('subscription_audit_log')
          .insert({
            subscription_id: newSubscription.id,
            action: 'free_subscription_created',
            details: {
              initial_credits: freeTier?.credits.monthly,
              credits_limit: freeTier?.credits.maximum,
              end_date: endDate.toISOString(),
              user_email: primaryEmail
            }
          });

        if (auditError) {
          console.error('Audit log error:', auditError);
          // Don't throw, as the main operation succeeded
        }

        // Send welcome email for free subscription
        await resend.emails.send({
          from: `${process.env.MAIL_FROM_NAME} <${process.env.MAIL_FROM_EMAIL}>`,
          to: primaryEmail,
          subject: 'Welcome to Your Free Subscription!',
          react: FreeSubscriptionEmail({
            username: primaryEmail.split('@')[0],
            endDate: endDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          })
        });
        // console.log('resendResponse', resendResponse);
        return NextResponse.json(newSubscription);
      }

      return new NextResponse(JSON.stringify(currentSubscription));
    } catch (error) {
      console.error('[SUBSCRIPTION_GET_ERROR]', error);
      return new NextResponse(
        JSON.stringify({ error: 'Failed to get subscription' }), 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[SUBSCRIPTION_ERROR]', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }), 
      { status: 500 }
    );
  }
}
