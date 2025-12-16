import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import supabase from '../services/supabaseClient';

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  authError: null,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
  clearAuthError: () => {},
  updateBaseResume: async () => {},
});

const isMissingProfile = profile => !profile || Object.keys(profile).length === 0;

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const fetchProfile = async userId => {
    if (!userId) {
      setProfile(null);
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    setProfile(data);
    return data;
  };

  const createProfileRecord = async ({ userId, firstName, lastName }) => {
    if (!userId) {
      throw new Error('Missing user ID for profile creation.');
    }

    const payload = {
      user_id: userId,
      first_name: firstName?.trim() || 'Friend',
      last_name: lastName?.trim() || 'of TuneIt',
    };

    const { data, error } = await supabase
      .from('profiles')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        // Profile already exists for this user; fetch the latest copy.
        return fetchProfile(userId);
      }

      throw error;
    }

    setProfile(data);
    return data;
  };

  const ensureProfile = async (user, overrides = {}) => {
    if (!user) {
      return null;
    }

    const existing = await fetchProfile(user.id);
    if (!isMissingProfile(existing)) {
      return existing;
    }

    const firstName = overrides.firstName ?? user.user_metadata?.first_name ?? '';
    const lastName = overrides.lastName ?? user.user_metadata?.last_name ?? '';

    return createProfileRecord({ userId: user.id, firstName, lastName });
  };

  useEffect(() => {
    const init = async () => {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      setSession(initialSession);
      if (initialSession?.user) {
        try {
          await ensureProfile(initialSession.user);
        } catch (profileError) {
          console.error('[TuneIt] Unable to load profile on init.', profileError);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    };

    init();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) {
        ensureProfile(nextSession.user).catch(profileError => {
          console.error('[TuneIt] Unable to ensure profile after auth change.', profileError);
        });
      } else {
        setProfile(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signUp = async ({ email, password, firstName, lastName }) => {
    setAuthError(null);

    const {
      data: { user, session: signUpSession },
      error,
    } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (error) {
      setAuthError(error);
      throw error;
    }

    const targetUser = signUpSession?.user || user;
    if (targetUser) {
      try {
        await ensureProfile(targetUser, {
          firstName,
          lastName,
        });
      } catch (profileError) {
        console.error('[TuneIt] Unable to create profile after sign up.', profileError);
        throw profileError;
      }
    }

    return { user, session: signUpSession };
  };

  const signIn = async ({ email, password }) => {
    setAuthError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError(error);
      throw error;
    }

    if (data.user) {
      await ensureProfile(data.user);
    }

    return data;
  };

  const signOut = async () => {
    setAuthError(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error);
      throw error;
    }
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (!session?.user) {
      setProfile(null);
      return null;
    }
    return fetchProfile(session.user.id);
  };

  const updateBaseResume = async baseResumeMarkdown => {
    if (!session?.user) {
      throw new Error('You must be signed in to update your base resume.');
    }

    const payload = { base_resume: baseResumeMarkdown?.trim() || '' };
    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('user_id', session.user.id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    setProfile(data);
    return data;
  };

  const clearAuthError = () => setAuthError(null);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      profile,
      loading,
      authError,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      clearAuthError,
      updateBaseResume,
    }),
    [session?.user, profile, loading, authError, updateBaseResume],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
