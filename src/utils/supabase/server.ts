import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";


export const createClient = async (cookieStore: ReturnType<typeof cookies>, userId?: string) => {
  const cs = await cookieStore;
  
  // Use service role key for admin access
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  const supabase = createServerClient(
    supabaseUrl,
    supabaseServiceKey,
    {
      cookies: {
        get(name: string) {
          return cs.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cs.set(name, value, options)
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cs.set(name, '', { ...options, maxAge: 0 })
          } catch (error) {
            // The `remove` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      }
    }
  );

  return supabase;
};
