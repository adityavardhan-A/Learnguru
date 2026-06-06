import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Build a normalized user object from a Supabase session + profile row
const buildUser = (sessionUser, profile) => ({
  id: sessionUser.id,
  email: sessionUser.email,
  name: profile?.name || sessionUser.user_metadata?.name || 'User',
  role: profile?.role || sessionUser.user_metadata?.role || 'student',
  xp: profile?.xp || 0,
  level: profile?.level || 1,
  approved: profile?.approved ?? true
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch the public.users profile row for a session user
  const loadProfile = async (sessionUser) => {
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', sessionUser.id)
      .single();
    return buildUser(sessionUser, profile);
  };

  // Initialize auth from the current Supabase session
  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && active) {
          setUser(await loadProfile(session.user));
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(await loadProfile(session.user));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Email / password login
  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const loggedInUser = await loadProfile(data.user);
      setUser(loggedInUser);
      return { success: true, user: loggedInUser };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Email / password signup. The handle_new_user trigger creates the
  // public.users profile automatically; we upsert as a safety net.
  const signup = async (name, email, password, role) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role } }
      });
      if (error) throw error;

      if (data.user) {
        await supabase.from('users').upsert(
          {
            id: data.user.id,
            name,
            email,
            role,
            approved: role !== 'teacher'
          },
          { onConflict: 'id' }
        );
      }

      // If email confirmation is disabled, a session is returned immediately.
      if (data.session?.user) {
        setUser(await loadProfile(data.session.user));
        return { success: true, user: user };
      }

      return { success: true, message: 'Account created. Please check your inbox to verify your email, then sign in.' };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
