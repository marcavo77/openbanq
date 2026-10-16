-- ============================================================================
-- Open Banque Database Schema for Supabase
-- Exécutez ce script complet dans le SQL Editor de votre projet Supabase neuf
-- ============================================================================

-- 1. Extensions requises
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. Tables principales
-- ============================================================================

-- Table des utilisateurs (liée à auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  avatar_url TEXT,
  
  -- Informations bancaires
  account_type TEXT NOT NULL DEFAULT 'CURRENT' CHECK (account_type IN ('CURRENT', 'SAVINGS')),
  card_number TEXT NOT NULL,
  card_expiry TEXT NOT NULL,
  card_cvc TEXT NOT NULL,
  joined_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Informations personnelles
  birth_date DATE NOT NULL,
  phone TEXT NOT NULL,
  
  -- Adresse
  address TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL,
  country_flag TEXT NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('CREDIT', 'DEBIT')),
  recipient_name TEXT NOT NULL,
  recipient_bank TEXT NOT NULL,
  recipient_iban TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des messages (Chat client / support)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (LENGTH(content) <= 2000),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table d'archive des messages (Optimisation de stockage)
CREATE TABLE IF NOT EXISTS public.messages_archive (
  id UUID PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL CHECK (LENGTH(content) <= 2000),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des journaux d'administration (Audit / Logs)
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  admin_name TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('BALANCE_UPDATE', 'USER_DELETION', 'SYSTEM')),
  target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  target_user_name TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des transferts actifs (Processus de virement par étapes)
CREATE TABLE IF NOT EXISTS public.active_transfers (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  is_paused BOOLEAN NOT NULL DEFAULT FALSE,
  required_code TEXT,
  recipient_name TEXT NOT NULL DEFAULT '',
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  current_step_description TEXT NOT NULL DEFAULT '',
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des paramètres de messagerie admin
CREATE TABLE IF NOT EXISTS public.admin_chat_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  show_read_receipts_to_user BOOLEAN NOT NULL DEFAULT true,
  show_typing_to_user BOOLEAN NOT NULL DEFAULT true,
  show_online_status_to_user BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(admin_id)
);

-- ============================================================================
-- 3. Stockage (Storage Buckets)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. Sécurité Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_chat_settings ENABLE ROW LEVEL SECURITY;

-- 4.1 Politiques public.users
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view all users for chat purposes" ON public.users;
CREATE POLICY "Users can view all users for chat purposes"
  ON public.users FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update any user" ON public.users;
CREATE POLICY "Admins can update any user"
  ON public.users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Service role can insert users" ON public.users;
CREATE POLICY "Service role can insert users"
  ON public.users FOR INSERT
  WITH CHECK (true);

-- 4.2 Politiques public.transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own transactions" ON public.transactions;
CREATE POLICY "Users can create their own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can create transactions for any user" ON public.transactions;
CREATE POLICY "Admins can create transactions for any user"
  ON public.transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
CREATE POLICY "Admins can view all transactions"
  ON public.transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- 4.3 Politiques public.messages
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON public.messages;
CREATE POLICY "Users can view messages they sent or received"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can update their received messages" ON public.messages;
CREATE POLICY "Users can update their received messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- 4.4 Politiques public.messages_archive
DROP POLICY IF EXISTS "Users can view archived messages they sent or received" ON public.messages_archive;
CREATE POLICY "Users can view archived messages they sent or received"
  ON public.messages_archive FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 4.5 Politiques public.admin_logs
DROP POLICY IF EXISTS "Admins can view all logs" ON public.admin_logs;
CREATE POLICY "Admins can view all logs"
  ON public.admin_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Admins can create logs" ON public.admin_logs;
CREATE POLICY "Admins can create logs"
  ON public.admin_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- 4.6 Politiques public.active_transfers
DROP POLICY IF EXISTS "Users can view their own active transfer" ON public.active_transfers;
CREATE POLICY "Users can view their own active transfer"
  ON public.active_transfers FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own active transfer" ON public.active_transfers;
CREATE POLICY "Users can update their own active transfer"
  ON public.active_transfers FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own active transfer" ON public.active_transfers;
CREATE POLICY "Users can insert their own active transfer"
  ON public.active_transfers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all active transfers" ON public.active_transfers;
CREATE POLICY "Admins can view all active transfers"
  ON public.active_transfers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- 4.7 Politiques public.admin_chat_settings
DROP POLICY IF EXISTS "All users can view admin chat settings" ON public.admin_chat_settings;
CREATE POLICY "All users can view admin chat settings"
  ON public.admin_chat_settings FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can update their own chat settings" ON public.admin_chat_settings;
CREATE POLICY "Admins can update their own chat settings"
  ON public.admin_chat_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Admins can insert their own chat settings" ON public.admin_chat_settings;
CREATE POLICY "Admins can insert their own chat settings"
  ON public.admin_chat_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
    AND admin_id = auth.uid()
  );

-- 4.8 Politiques Storage pour les avatars
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================================
-- 5. Index pour les performances
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread_recent ON public.messages(created_at DESC) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON public.admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_archive_sender ON public.messages_archive(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_archive_receiver ON public.messages_archive(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_archive_created ON public.messages_archive(created_at);

-- ============================================================================
-- 6. Fonctions et Triggers
-- ============================================================================

-- Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_active_transfers_updated_at ON public.active_transfers;
CREATE TRIGGER update_active_transfers_updated_at BEFORE UPDATE ON public.active_transfers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_chat_settings_updated_at ON public.admin_chat_settings;
CREATE TRIGGER update_admin_chat_settings_updated_at BEFORE UPDATE ON public.admin_chat_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Suppression complète d'un utilisateur (Appelable par les administrateurs)
CREATE OR REPLACE FUNCTION delete_user(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  caller_user_id UUID;
  caller_role TEXT;
  target_user_name TEXT;
  target_user_email TEXT;
  deleted_count INTEGER := 0;
BEGIN
  caller_user_id := auth.uid();
  
  IF caller_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be authenticated to delete users';
  END IF;
  
  SELECT role INTO caller_role
  FROM public.users
  WHERE id = caller_user_id;
  
  IF caller_role IS NULL OR caller_role != 'ADMIN' THEN
    RAISE EXCEPTION 'Only administrators can delete users';
  END IF;
  
  IF caller_user_id = target_user_id THEN
    RAISE EXCEPTION 'You cannot delete your own account';
  END IF;
  
  SELECT name, email INTO target_user_name, target_user_email
  FROM public.users
  WHERE id = target_user_id;
  
  IF target_user_name IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = target_user_id AND role = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Cannot delete administrator accounts';
  END IF;
  
  BEGIN
    DELETE FROM auth.users WHERE id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
  EXCEPTION
    WHEN insufficient_privilege THEN
      DELETE FROM public.users WHERE id = target_user_id;
      GET DIAGNOSTICS deleted_count = ROW_COUNT;
      
      RETURN json_build_object(
        'success', true,
        'warning', 'User profile deleted, but auth record may remain. Manual cleanup may be required.',
        'deleted_user', json_build_object(
          'id', target_user_id,
          'name', target_user_name,
          'email', target_user_email
        )
      );
  END;
  
  RETURN json_build_object(
    'success', true,
    'message', 'User deleted successfully',
    'deleted_user', json_build_object(
      'id', target_user_id,
      'name', target_user_name,
      'email', target_user_email
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;
GRANT EXECUTE ON FUNCTION delete_user(UUID) TO authenticated;

-- Mise à jour des identifiants utilisateur (Email / Mot de passe)
CREATE OR REPLACE FUNCTION update_user_credentials(
  old_email TEXT,
  new_email TEXT DEFAULT NULL,
  new_password TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  user_record RECORD;
  encrypted_pwd TEXT;
BEGIN
  SELECT * INTO user_record
  FROM auth.users
  WHERE email = old_email
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User with email % not found', old_email;
  END IF;
  
  IF new_email IS NOT NULL AND new_email != old_email THEN
    UPDATE auth.users
    SET
      email = new_email,
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW()
    WHERE id = user_record.id;
    
    UPDATE public.users
    SET email = new_email
    WHERE id = user_record.id;
  END IF;
  
  IF new_password IS NOT NULL THEN
    encrypted_pwd := crypt(new_password, gen_salt('bf'));
    UPDATE auth.users
    SET
      encrypted_password = encrypted_pwd,
      updated_at = NOW()
    WHERE id = user_record.id;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION update_user_credentials(TEXT, TEXT, TEXT) TO authenticated;

-- Fonctions d'optimisation et d'archivage des messages
CREATE OR REPLACE FUNCTION archive_old_messages()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  INSERT INTO public.messages_archive (id, sender_id, receiver_id, content, is_read, created_at)
  SELECT id, sender_id, receiver_id, content, is_read, created_at
  FROM public.messages
  WHERE created_at < NOW() - INTERVAL '6 months';
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  DELETE FROM public.messages
  WHERE created_at < NOW() - INTERVAL '6 months';
  
  RETURN archived_count;
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_read_messages()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.messages
  WHERE is_read = TRUE 
    AND created_at < NOW() - INTERVAL '3 months';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION delete_very_old_messages()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.messages_archive
  WHERE created_at < NOW() - INTERVAL '1 year';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION get_messages_storage_stats()
RETURNS TABLE (
  total_messages BIGINT,
  archived_messages BIGINT,
  oldest_message_date TIMESTAMPTZ,
  messages_to_archive BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.messages)::BIGINT,
    (SELECT COUNT(*) FROM public.messages_archive)::BIGINT,
    (SELECT MIN(created_at) FROM public.messages),
    (SELECT COUNT(*) FROM public.messages WHERE created_at < NOW() - INTERVAL '6 months')::BIGINT;
END;
$$;
