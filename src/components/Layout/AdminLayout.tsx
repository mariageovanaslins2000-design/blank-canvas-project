import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { MobileSidebar } from "@/components/Layout/MobileSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useClinicTheme } from "@/hooks/useClinicTheme";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AdminLayout() {
  const { user } = useAuth();
  const [empresaId, setEmpresaId] = useState<string>();

  useEffect(() => {
    const loadEmpresa = async () => {
      if (!user) return;

      // Buscar empresa através da funcao_usuario
      const { data } = await supabase
        .from("funcao_usuario")
        .select("empresa_id")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (data?.empresa_id) {
        setEmpresaId(data.empresa_id);
      }
    };

    loadEmpresa();
  }, [user]);

  useClinicTheme(empresaId);

  return (
    <div className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      <Sidebar />
      <MobileSidebar />
      <div className="flex-1 lg:ml-64 pt-16 lg:pt-0 w-full max-w-full overflow-x-hidden">
        <Header />
        <main className="p-4 lg:p-8 w-full max-w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}