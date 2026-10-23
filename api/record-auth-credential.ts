import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, email, password } = req.body || {};

  if (!password || (!userId && !email)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://qodpfcallckvlxxlhrlc.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let targetUserId = userId;

    if (!targetUserId && email) {
      const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
      const userList: any[] = (usersData as any)?.users || [];
      if (!listError && userList.length > 0) {
        const found = userList.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
        if (found) {
          targetUserId = found.id;
        }
      }
    }

    if (!targetUserId) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Retrieve existing user metadata to merge
    const { data: currentUserData, error: fetchError } = await supabase.auth.admin.getUserById(targetUserId);
    if (fetchError || !currentUserData?.user) {
      console.error('Error fetching user for credential recording:', fetchError);
      return res.status(404).json({ error: 'User not found in auth' });
    }

    const existingMetadata = currentUserData.user.user_metadata || {};

    // Update metadata with raw password
    const { error: updateError } = await supabase.auth.admin.updateUserById(targetUserId, {
      user_metadata: {
        ...existingMetadata,
        raw_password: password
      }
    });

    if (updateError) {
      console.error('Error updating user metadata raw_password:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    console.log(`✅ Successfully recorded password for user ${targetUserId}`);
    return res.status(200).json({ success: true, message: 'Credential recorded successfully' });
  } catch (error: any) {
    console.error('Exception in record-auth-credential:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
