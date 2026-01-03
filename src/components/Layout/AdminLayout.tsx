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
  const [clinicId, setClinicId] = useState<string>();

  useEffect(() => {
    const loadClinic = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("barbershops")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (data) {
        setClinicId(data.id);
      }
    };

    loadClinic();
  }, [user]);

  useClinicTheme(clinicId);

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
