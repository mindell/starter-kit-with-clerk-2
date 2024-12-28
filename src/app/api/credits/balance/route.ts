import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from 'next/headers';
import { generateDeterministicUUID } from "@/utils/supabase/auth";

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    const cookieStore = cookies();
    
    if (!clerkUserId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const supabaseUserId = generateDeterministicUUID(clerkUserId);
    const supabase = await createClient(cookieStore);

    const { data: subscription, error } = await supabase
      .from('subscription')
      .select('credits_remaining, credits_limit, plan_id')
      .eq('user_id', supabaseUserId)
      .single();

    if (error) {
      console.error('Error fetching credits:', error);
      return NextResponse.json(
        { error: 'Failed to fetch credits' },
        { status: 500 }
      );
    }

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Error in credits balance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
