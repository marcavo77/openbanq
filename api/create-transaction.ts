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

  const { userId, type, recipientName, recipientBank, recipientIban, amount, status } = req.body || {};

  if (!userId || !type || amount === undefined) {
    return res.status(400).json({ error: 'userId, type, and amount are required' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://qodpfcallckvlxxlhrlc.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from('transactions')
      .insert([{
        user_id: userId,
        type,
        recipient_name: recipientName || '',
        recipient_bank: recipientBank || '',
        recipient_iban: recipientIban || '',
        amount: parseFloat(amount).toFixed(2),
        status: status || 'COMPLETED'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating transaction via service role:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      transaction: {
        id: data.id,
        userId: data.user_id,
        type: data.type,
        recipientName: data.recipient_name,
        recipientBank: data.recipient_bank,
        recipientIban: data.recipient_iban,
        amount: parseFloat(data.amount),
        date: data.created_at,
        status: data.status
      }
    });
  } catch (err: any) {
    console.error('Error in create-transaction:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
