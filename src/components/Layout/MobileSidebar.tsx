import { useState } from "react";
import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Briefcase,
  DollarSign, 
  Settings,
  Image,
  LogOut,
  Menu
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import logoGreen from "@/assets/logo-green.png";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Calendar, label: "Agenda", path: "/admin/appointments" },
  { icon: Users, label: "Profissionais", path: "/admin/professionals" },
  { icon: Briefcase, label: "Serviços", path: "/admin/services" },
  { icon: Users, label: "Clientes", path: "/admin/clients" },
  { icon: DollarSign, label: "Financeiro", path: "/admin/financial" },
  { icon: Image, label: "Portfólio", path: "/admin/portfolio" },
  { icon: Settings, label: "Configurações", path: "/admin/settings" },
];

export const MobileSidebar = () => {
  const { user, signOut } = useAuth();
  const [clinicName, setClinicName] = useState("Clínica");
  const [sidebarLogo, setSidebarLogo] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const loadClinic = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("barbershops")
        .select("name, logo_url")
        .eq("owner_id", user.id)
        .maybeSingle();
      
      if (data) {
        setClinicName(data.name);
        if (data.logo_url) {
          setSidebarLogo(data.logo_url);
        }
      }
    };

    loadClinic();
  }, [user]);

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <img src={logoGreen} alt="iClinic" className="w-8 h-8 rounded-lg object-cover" />
          <div>
            <h1 className="text-sm font-display font-semibold text-sidebar-foreground">iClinic</h1>
          </div>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
            <div className="flex flex-col h-full">
              {/* Logo */}
              <div className="p-6 border-b border-sidebar-border">
                <div className="flex items-center gap-3">
                  <img src={logoGreen} alt="iClinic" className="w-10 h-10 rounded-lg object-cover" />
                  <div>
                    <h1 className="text-lg font-display font-semibold text-sidebar-foreground">iClinic</h1>
                    <p className="text-xs text-sidebar-foreground/60">Gestão Inteligente</p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 p-4">
                <ul className="space-y-1">
                  {menuItems.map((item) => (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                          }`
                        }
                      >
                        <item.icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* User Profile */}
              <div className="p-4 border-t border-sidebar-border space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent/50">
                  {sidebarLogo ? (
                    <img src={sidebarLogo} alt={clinicName} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-sidebar-primary flex items-center justify-center">
                      <span className="text-sm font-semibold text-sidebar-primary-foreground">
                        {clinicName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {clinicName}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60">Admin</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  onClick={signOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
