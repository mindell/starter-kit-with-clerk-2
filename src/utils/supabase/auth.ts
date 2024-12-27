import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Function to generate a deterministic UUID v4 from Clerk user ID
export const generateDeterministicUUID = (clerkUserId: string) => {
  // Create a namespace for consistent UUID generation
  const namespace = 'clerk-user-id';
  
  // Create a hash of the clerk user ID with the namespace
  const hash = crypto.createHash('md5').update(`${namespace}-${clerkUserId}`).digest('hex');
  
  // Convert to UUID v4 format
  const uuid = [
    hash.substring(0, 8),
    hash.substring(8, 12),
    // Version 4 UUID - Replace first character with '4'
    '4' + hash.substring(13, 16),
    // Variant bits - Replace first character with '8', '9', 'a', or 'b'
    (parseInt(hash.substring(16, 17), 16) & 0x3 | 0x8).toString(16) + hash.substring(17, 20),
    hash.substring(20, 32)
  ].join('-');

  return uuid;
};

export const generateSupabaseToken = (clerkUserId: string, email?: string) => {
  // Generate a deterministic UUID from Clerk user ID
  const supabaseUUID = generateDeterministicUUID(clerkUserId);
  
  // For debugging
  console.log('Generated UUID:', supabaseUUID);
  
  const payload = {
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
    sub: supabaseUUID,
    email: email ? email : undefined, // Optional but sometimes needed
    role: 'authenticated',
  };

  // For debugging
  console.log('JWT Payload:', payload);
  
  return jwt.sign(
    payload,
    process.env.SUPABASE_JWT_SECRET!,
    { algorithm: 'HS256' }
  );
};
