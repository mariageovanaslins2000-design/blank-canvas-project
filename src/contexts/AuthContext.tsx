import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type UserRole = "owner" | "client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: UserRole[];
  loading: boolean;
  hasRole: (role: UserRole) => boolean;
  signUp: (email: string, password: string, fullName: string, phone: string, role: UserRole, barbershopName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const hasRole = (role: UserRole) => roles.includes(role);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user roles
          setTimeout(async () => {
            const { data: rolesData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id);
            
            setRoles(rolesData?.map(r => r.role as UserRole) || []);
          }, 0);
        } else {
          setRoles([]);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          const { data: rolesData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id);
          
          setRoles(rolesData?.map(r => r.role as UserRole) || []);
          setLoading(false);
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    role: UserRole,
    barbershopName?: string
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
            phone,
            role,
            barbershop_name: barbershopName,
          },
        },
      });

      if (error) throw error;

      toast.success("Conta criada com sucesso!");
      
      // Redirect based on role
      if (role === "owner") {
        navigate("/admin");
      } else {
        navigate("/client");
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      if (error.message.includes("already registered")) {
        toast.error("Este email já está cadastrado");
      } else {
        toast.error(error.message || "Erro ao criar conta");
      }
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Fetch user roles to redirect appropriately
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);

      const userRoles = rolesData?.map(r => r.role as UserRole) || [];

      toast.success("Login realizado com sucesso!");

      // Redirect based on roles (priority: owner > client)
      if (userRoles.includes("owner")) {
        navigate("/admin");
      } else if (userRoles.includes("client")) {
        navigate("/client");
      }
    } catch (error: any) {
      console.error("Signin error:", error);
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Email ou senha incorretos");
      } else {
        toast.error(error.message || "Erro ao fazer login");
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success("Logout realizado com sucesso!");
      
      // Redirect based on user role
      if (hasRole("client")) {
        navigate("/login-cliente");
      } else if (hasRole("owner")) {
        navigate("/auth");
      } else {
        navigate("/");
      }
    } catch (error: any) {
      console.error("Signout error:", error);
      toast.error("Erro ao fazer logout");
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, session, roles, loading, hasRole, signUp, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
