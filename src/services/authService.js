import { supabase } from '@/lib/supabase';

export const authService = {
  loginAdmin: async (username, password) => {
    try {
      const cleanUsername = String(username || '').trim();
      const { data, error } = await supabase
        .from('event_admins')
        .select('*')
        .eq('username', cleanUsername)
        .eq('password', password)
        .maybeSingle();

      if (error) {
        console.error('Supabase Admin Login error:', error);
        return { success: false, message: 'Database query failed during login.' };
      }

      if (!data) {
        return { success: false, message: 'Invalid Admin username or password.' };
      }

      if (data.is_active === false) {
        return { success: false, message: 'Your account is inactive. Please contact an administrator.' };
      }

      return {
        success: true,
        user: {
          id: data.id,
          username: data.username,
          name: data.username === 'admin' ? 'System Admin' : data.username,
          role: data.role || 'admin',
          is_active: data.is_active !== false
        }
      };
    } catch (err) {
      console.error('Admin Login exception:', err);
      return { success: false, message: err.message || 'An unexpected error occurred during sign in.' };
    }
  },

  registerAdmin: async (username, password) => {
    try {
      const cleanUsername = String(username || '').trim();
      if (!cleanUsername || !password) {
        return { success: false, message: 'Username and password are required.' };
      }

      // Check if username already exists
      const { data: existing } = await supabase
        .from('event_admins')
        .select('id')
        .eq('username', cleanUsername)
        .maybeSingle();

      if (existing) {
        return { success: false, message: 'Username is already registered. Please choose another or sign in.' };
      }

      const { data, error } = await supabase
        .from('event_admins')
        .insert([{ username: cleanUsername, password }])
        .select()
        .single();

      if (error) {
        console.error('Supabase Admin Register error:', error);
        return { success: false, message: 'Failed to create admin account.' };
      }

      return {
        success: true,
        user: {
          id: data.id,
          username: data.username,
          name: data.username,
          role: data.role || 'admin'
        }
      };
    } catch (err) {
      console.error('Admin Register exception:', err);
      return { success: false, message: err.message || 'An unexpected error occurred during signup.' };
    }
  },

  getAllAdmins: async () => {
    try {
      const { data, error } = await supabase
        .from('event_admins')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching event_admins:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('getAllAdmins exception:', err);
      return [];
    }
  },

  addAdmin: async ({ username, password, role = 'admin', is_active = true }) => {
    try {
      const cleanUsername = String(username || '').trim();
      if (!cleanUsername || !password) {
        return { success: false, message: 'Username and password are required.' };
      }

      const { data: existing } = await supabase
        .from('event_admins')
        .select('id')
        .eq('username', cleanUsername)
        .maybeSingle();

      if (existing) {
        return { success: false, message: 'Username already exists.' };
      }

      const payload = {
        username: cleanUsername,
        password: String(password).trim(),
        role: role || 'admin',
        is_active: Boolean(is_active)
      };

      const { data, error } = await supabase
        .from('event_admins')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('Error inserting into event_admins:', error);
        return { success: false, message: error.message || 'Failed to create user.' };
      }

      return { success: true, data };
    } catch (err) {
      console.error('addAdmin exception:', err);
      return { success: false, message: err.message || 'Unexpected error adding admin.' };
    }
  },

  updateAdmin: async (id, { username, password, role, is_active }) => {
    try {
      if (!id) return { success: false, message: 'User ID is required.' };

      const updates = {};
      if (username !== undefined) updates.username = String(username).trim();
      if (password !== undefined) updates.password = String(password).trim();
      if (role !== undefined) updates.role = role;
      if (is_active !== undefined) updates.is_active = Boolean(is_active);

      const { data, error } = await supabase
        .from('event_admins')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating event_admins:', error);
        return { success: false, message: error.message || 'Failed to update user.' };
      }

      return { success: true, data };
    } catch (err) {
      console.error('updateAdmin exception:', err);
      return { success: false, message: err.message || 'Unexpected error updating admin.' };
    }
  },

  deleteAdmin: async (id) => {
    try {
      if (!id) return { success: false, message: 'User ID is required.' };

      const { error } = await supabase
        .from('event_admins')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting from event_admins:', error);
        return { success: false, message: error.message || 'Failed to delete user.' };
      }

      return { success: true };
    } catch (err) {
      console.error('deleteAdmin exception:', err);
      return { success: false, message: err.message || 'Unexpected error deleting admin.' };
    }
  }
};
