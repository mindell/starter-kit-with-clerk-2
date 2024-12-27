import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from 'next/headers';
import { generateDeterministicUUID } from "@/utils/supabase/auth";

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
