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

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://qodpfcallckvlxxlhrlc.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // GET: Fetch map of userId -> password
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (error) {
        console.error('Error listing auth users:', error);
        return res.status(500).json({ error: error.message });
      }

      const passwords: Record<string, string> = {};
      data?.users?.forEach(u => {
        const raw = u.user_metadata?.raw_password || u.user_metadata?.password;
        if (raw) {
          passwords[u.id] = raw;
        }
      });

      return res.status(200).json({ success: true, passwords });
    } catch (err: any) {
      console.error('Exception in GET admin-users-passwords:', err);
      return res.status(500).json({ error: err.message || 'Failed to list passwords' });
    }
  }

  // POST: Admin updates client password directly
  if (req.method === 'POST') {
    try {
      const { userId, newPassword } = req.body || {};
      if (!userId || !newPassword) {
        return res.status(400).json({ error: 'userId and newPassword are required' });
      }

      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      // Fetch user metadata to preserve other fields
      const { data: userData, error: fetchError } = await supabase.auth.admin.getUserById(userId);
      if (fetchError || !userData?.user) {
        return res.status(404).json({ error: 'User not found in auth' });
      }

      const existingMetadata = userData.user.user_metadata || {};

      // Update both real auth password and metadata raw_password
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
        user_metadata: {
          ...existingMetadata,
          raw_password: newPassword
        }
      });

      if (updateError) {
        console.error('Error updating user password:', updateError);
        return res.status(500).json({ error: updateError.message });
      }

      console.log(`✅ Admin updated password for user ${userId}`);
      return res.status(200).json({ success: true, password: newPassword });
    } catch (err: any) {
      console.error('Exception in POST admin-users-passwords:', err);
      return res.status(500).json({ error: err.message || 'Failed to update password' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
