import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, LogOut, Store, Scissors } from "lucide-react";

export const Header = () => {
  const { user, hasRole, signOut } = useAuth();
  const [barbershop, setBarbershop] = useState<{ name: string; logo_url: string } | null>(null);

  useEffect(() => {
    const loadBarbershop = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("barbershops")
        .select("name, logo_url")
        .eq("owner_id", user.id)
        .single();

      if (data) {
        setBarbershop(data);
      }
    };

    loadBarbershop();
  }, [user]);
  
  return (
    <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="flex items-center justify-between px-4 lg:px-8 py-4">
        {/* Logo and Name */}
        <div className="flex items-center gap-3">
          {barbershop?.logo_url ? (
            <img src={barbershop.logo_url} alt={barbershop.name} className="h-10 w-10 object-contain rounded-lg" />
          ) : (
            <div className="p-2 bg-primary rounded-full">
              <Scissors className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          <span className="hidden lg:block text-lg font-bold">{barbershop?.name || "BarberShop Admin"}</span>
        </div>

        {/* Search */}
        <div className="hidden lg:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar agendamentos, clientes..."
              className="pl-10"
            />
          </div>
        </div>
        
        {/* Mobile spacer */}
        <div className="flex-1 lg:hidden"></div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar>
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(hasRole("owner") || hasRole("client")) && (
                <DropdownMenuItem asChild>
                  <Link to="/client" className="cursor-pointer">
                    <Store className="mr-2 h-4 w-4" />
                    Área do Cliente
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
