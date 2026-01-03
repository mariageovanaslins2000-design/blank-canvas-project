import { Outlet } from "react-router-dom";
import { ClientHeader } from "./ClientHeader";
import { useClinicTheme } from "@/hooks/useClinicTheme";
import { useClientClinic } from "@/hooks/useClientClinic";

export function ClientLayout() {
  const { clinicId } = useClientClinic();
  useClinicTheme(clinicId || undefined);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      <ClientHeader />
      <main className="w-full max-w-full px-4 py-6 overflow-x-hidden">
        <div className="container mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
