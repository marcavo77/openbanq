import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  const { userId, newBalance } = req.body || {};
  if (!userId || typeof newBalance !== 'number') {
    return res.status(400).json({ error: 'userId and numeric newBalance are required' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://qodpfcallckvlxxlhrlc.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const balanceString = Number(newBalance).toFixed(2);

    const { data, error } = await supabase
      .from('users')
      .update({ balance: balanceString, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Error updating balance:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      balance: balanceString,
      user: data?.[0] || null
    });
  } catch (err: any) {
    console.error('Error in update-balance API:', err);
    return res.status(500).json({ error: err.message || 'Failed to update balance' });
  }
}
