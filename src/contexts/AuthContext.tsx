import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'player' | 'super_admin';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
  profileCompleted: boolean;
  playerStatus: string;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setProfileCompleted: (v: boolean) => void;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileCompleted, setProfileCompleted] = useState(true);
  const [playerStatus, setPlayerStatus] = useState('active');

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    setRole((data?.role as UserRole) || 'player');
  };

  const checkProfileCompleted = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('name, nickname, phone, state, city, birth_date, gender, pronouns, status')
      .eq('id', userId)
      .single();
    if (data) {
      const status = (data as any).status || 'pending';
      setPlayerStatus(status);

      // If disabled, sign out
      if (status === 'disabled') {
        await supabase.auth.signOut();
        return;
      }

      const complete = !!((data as any).nickname && data.name && data.phone && data.state && data.city && data.birth_date && data.gender && (data as any).pronouns);
      
      // pending = needs to complete profile (admin/script created)
      // pending_approval = community signup, profile complete, waiting admin approval
      // active = fully approved
      if (status === 'pending') {
        setProfileCompleted(complete); // redirect to complete profile if not complete
      } else if (status === 'pending_approval') {
        setProfileCompleted(true); // profile IS complete, just waiting approval
      } else {
        setProfileCompleted(status === 'active');
      }
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchRole(user.id);
      await checkProfileCompleted(user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          fetchRole(session.user.id);
          checkProfileCompleted(session.user.id);
        }, 0);
      } else {
        setRole(null);
        setProfileCompleted(true);
        setPlayerStatus('active');
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
        checkProfileCompleted(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name }, emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, profileCompleted, playerStatus, signUp, signIn, signOut, setProfileCompleted, isAdmin: role === 'admin' || role === 'super_admin', refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
