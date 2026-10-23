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

  const { userId, amount, adminId, adminName, description } = req.body || {};
  if (!userId || typeof amount !== 'number') {
    return res.status(400).json({ error: 'userId and numeric amount are required' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://qodpfcallckvlxxlhrlc.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch target user to get current balance and name
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, name, balance')
      .eq('id', userId)
      .single();

    if (userError || !targetUser) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    const currentBalance = typeof targetUser.balance === 'string'
      ? parseFloat(targetUser.balance)
      : (Number(targetUser.balance) || 0);

    const newBalance = currentBalance + amount;
    const balanceString = newBalance.toFixed(2);

    // 2. Update user balance in database
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        balance: balanceString,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user balance:', updateError);
      return res.status(500).json({ error: 'Failed to update user balance in database' });
    }

    // 3. Create transaction record in database
    const isCredit = amount > 0;
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert([{
        user_id: userId,
        type: isCredit ? 'CREDIT' : 'DEBIT',
        recipient_name: isCredit ? 'Dépôt Admin' : 'Retrait Admin',
        recipient_bank: 'Open Banque System',
        recipient_iban: 'N/A',
        amount: Math.abs(amount).toFixed(2),
        status: 'COMPLETED'
      }])
      .select()
      .single();

    if (txError) {
      console.error('Error inserting transaction in database:', txError);
      return res.status(500).json({ error: 'Failed to create transaction record: ' + txError.message });
    }

    // 4. Log admin action
    const actionDesc = description || (isCredit 
      ? `Crédit de ${Math.abs(amount)} € ajouté au compte.` 
      : `Débit de ${Math.abs(amount)} € retiré du compte.`);

    await supabase.from('admin_logs').insert([{
      admin_id: adminId || null,
      admin_name: adminName || 'Super Administrator',
      action_type: 'BALANCE_UPDATE',
      target_user_id: userId,
      target_user_name: targetUser.name,
      description: actionDesc
    }]).then(({ error: logErr }) => {
      if (logErr) console.warn('Admin log warning:', logErr);
    });

    console.log(`✅ Successfully updated balance for user ${userId} (${targetUser.name}): was ${currentBalance}, added ${amount}, now ${newBalance}`);

    return res.status(200).json({
      success: true,
      newBalance,
      transaction: transaction ? {
        id: transaction.id,
        userId: transaction.user_id,
        type: transaction.type,
        recipientName: transaction.recipient_name,
        recipientBank: transaction.recipient_bank,
        recipientIban: transaction.recipient_iban,
        amount: parseFloat(transaction.amount),
        date: transaction.created_at,
        status: transaction.status
      } : null
    });
  } catch (err: any) {
    console.error('Error in admin-update-balance:', err);
    return res.status(500).json({ error: err.message || 'Internal error updating balance' });
  }
}
