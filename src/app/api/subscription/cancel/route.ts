import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from 'next/headers';
import { generateDeterministicUUID } from "@/utils/supabase/auth";
import { resend } from "@/lib/resend";
import { CancelledSubscriptionEmail } from "@/emails/cancelled-subscription";

export async function POST() {
  try {
    const { userId: clerkUserId } = await auth();
    const cookieStore = cookies();
    
    if (!clerkUserId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Generate deterministic UUID for Supabase
    const supabaseUserId = generateDeterministicUUID(clerkUserId);
    
    // Create Supabase client with service role
    const supabase = await createClient(cookieStore);

    // Get current subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscription')
      .select('*')
      .eq('user_id', supabaseUserId)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    if (subscription.plan_id === 'free') {
      return NextResponse.json(
        { error: 'Cannot cancel free subscription' },
        { status: 400 }
      );
    }

    // Update subscription to cancelled state
    const { error: updateError } = await supabase
      .from('subscription')
      .update({ cancelled: true })
      .eq('user_id', supabaseUserId);

    if (updateError) {
      console.error('Error cancelling subscription:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel subscription' },
        { status: 500 }
      );
    }

    // Send cancellation email
    const user = await currentUser();
    const primaryEmail = user?.emailAddresses?.find(email => email.id === clerkUserId)?.emailAddress;

    if (primaryEmail) {
      await resend.emails.send({
        from: `${process.env.MAIL_FROM_NAME} <${process.env.MAIL_FROM_EMAIL}>`,
        to: primaryEmail,
        subject: 'Your subscription has been cancelled',
        react: CancelledSubscriptionEmail({
          username: primaryEmail.split('@')[0],
          planName: subscription.plan_id,
          endDate: subscription.end_date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        })
      });
    }

    return NextResponse.json({ 
      message: 'Subscription cancelled successfully',
      end_date: subscription.end_date 
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
