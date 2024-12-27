import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { subscriptionPrices } from "@/lib/subscription-prices";
import { cookies } from 'next/headers';
import { generateDeterministicUUID } from "@/utils/supabase/auth";

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    const cookieStore = cookies();
    
    if (!clerkUserId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Generate deterministic UUID for Supabase
    const supabaseUserId = generateDeterministicUUID(clerkUserId);
    console.log('Clerk User ID:', clerkUserId);
    console.log('Supabase User ID:', supabaseUserId);
    
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

        console.log('Creating subscription with user_id:', supabaseUserId);
        
        const { data: newSubscription, error: createError } = await supabase
          .from('subscription')
          .insert([{
            user_id: supabaseUserId,
            plan_id: freeTier?.id,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            billing_interval: freeTier?.billingInterval,
            amount: freeTier?.price,
            currency: freeTier?.currency,
          }])
          .select()
          .single();

        if (createError) {
          console.error('[SUBSCRIPTION_CREATE_ERROR]', createError);
          return new NextResponse(
            JSON.stringify({ error: 'Failed to create subscription' }), 
            { status: 500 }
          );
        }

        return new NextResponse(JSON.stringify(newSubscription));
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
