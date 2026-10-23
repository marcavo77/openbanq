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

  const { userId } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://qodpfcallckvlxxlhrlc.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Delete user from auth.users (triggers ON DELETE CASCADE for public.users and all related tables)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      console.warn('Auth admin deleteUser note:', authError);
    }

    // 2. Also ensure deletion directly from all public tables with service role key
    await Promise.allSettled([
      supabase.from('active_transfers').delete().eq('user_id', userId),
      supabase.from('messages').delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
      supabase.from('transactions').delete().eq('user_id', userId),
      supabase.from('users').delete().eq('id', userId)
    ]);

    console.log(`✅ Successfully deleted user ${userId}`);
    return res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (err: any) {
    console.error('Error in admin-delete-user:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete user' });
  }
}
