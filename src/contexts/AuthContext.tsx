import {createContext, type ReactNode, useContext, useEffect, useState} from "react";
import {supabase} from "@/integrations/supabase/client";
import type {Session, User} from "@supabase/supabase-js";
import type {UserRole} from "@/hooks/useUserProfile";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: UserRole | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  userRole: null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  /**
   * Fetches the user role from the profiles table.
   * Defaults to 'psychologist' if the query fails (e.g. migration not yet applied).
   * Always resolves – never leaves userRole as null after auth completes.
   */
  const fetchRole = async (userId: string): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      if (error) throw error;
      setUserRole(((data as { role?: string })?.role as UserRole) ?? "psychologist");
    } catch {
      // Role column may not exist yet (pending migration) – fall back gracefully
      setUserRole("psychologist");
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Fetch role first, then clear loading so RoleBasedHome always gets a role
          fetchRole(session.user.id).finally(() => setLoading(false));
        } else {
          setUserRole(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, userRole, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
