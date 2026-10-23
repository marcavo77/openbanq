import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const ADMIN_FALLBACK_ID = '3d17191d-ed09-4bd6-844d-f22a705bddc7';

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

  const { userId, amount, setExactBalance, type, recipientName, adminName, adminId } = req.body || {};

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

    // 1. Fetch current target user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('Target user not found:', userError);
      return res.status(404).json({ error: 'User not found in database' });
    }

    const currentBalance = typeof user.balance === 'string' ? parseFloat(user.balance) : (user.balance || 0);

    let newBalance: number;
    let shouldCreateTransaction = false;
    let numericAmount = 0;

    if (setExactBalance !== undefined && !isNaN(Number(setExactBalance))) {
      newBalance = Number(setExactBalance);
      numericAmount = newBalance - currentBalance;
    } else if (amount !== undefined && !isNaN(Number(amount))) {
      numericAmount = Number(amount);
      newBalance = currentBalance + numericAmount;
      shouldCreateTransaction = true;
    } else {
      return res.status(400).json({ error: 'Either amount or setExactBalance must be provided' });
    }

    // 2. Update user's balance
    const { data: updatedUserData, error: updateError } = await supabase
      .from('users')
      .update({
        balance: newBalance.toFixed(2),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update balance in database:', updateError);
      return res.status(500).json({ error: updateError.message || 'Failed to update balance in database' });
    }

    // 3. Create transaction record if this was a deposit/withdrawal
    let createdTx: any = null;
    if (shouldCreateTransaction) {
      const isCredit = numericAmount >= 0;
      const txType = type || (isCredit ? 'CREDIT' : 'DEBIT');
      const txRecipient = recipientName || (isCredit ? 'Dépôt Admin' : 'Retrait Admin');

      const { data: tx, error: txError } = await supabase
        .from('transactions')
        .insert([{
          user_id: userId,
          type: txType,
          recipient_name: txRecipient,
          recipient_bank: 'Open Banque System',
          recipient_iban: 'N/A',
          amount: Math.abs(numericAmount).toFixed(2),
          status: 'COMPLETED'
        }])
        .select()
        .single();

      if (txError) {
        console.error('Warning: transaction insert failed:', txError);
      } else {
        createdTx = tx;
      }

      // 4. Create admin log entry
      try {
        const actionDesc = isCredit 
          ? `Crédit de ${Math.abs(numericAmount)} € ajouté au compte.` 
          : `Débit de ${Math.abs(numericAmount)} € retiré du compte.`;

        await supabase.from('admin_logs').insert([{
          admin_id: adminId || ADMIN_FALLBACK_ID,
          admin_name: adminName || 'Super Administrator',
          action_type: 'BALANCE_UPDATE',
          target_user_name: user.name,
          description: actionDesc
        }]);
      } catch (logErr) {
        console.warn('Could not record admin log:', logErr);
      }
    }

    console.log(`✅ Balance successfully updated for user ${userId}: ${currentBalance} -> ${newBalance}`);

    return res.status(200).json({
      success: true,
      newBalance,
      user: updatedUserData,
      transaction: createdTx ? {
        id: createdTx.id,
        userId: createdTx.user_id,
        type: createdTx.type,
        recipientName: createdTx.recipient_name,
        recipientBank: createdTx.recipient_bank,
        recipientIban: createdTx.recipient_iban,
        amount: parseFloat(createdTx.amount),
        date: createdTx.created_at,
        status: createdTx.status
      } : null
    });
  } catch (err: any) {
    console.error('Error in admin-update-balance handler:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
