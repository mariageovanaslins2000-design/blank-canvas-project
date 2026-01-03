import { Upload, Bell, User, Image, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { ClientLinkGenerator } from "@/components/Clients/ClientLinkGenerator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradePrompt } from "@/components/Subscription/UpgradePrompt";
import { PlanBadge } from "@/components/Subscription/PlanBadge";

const DAYS_OF_WEEK = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

const generateTimeOptions = () => {
  const options = [];
  for (let h = 6; h <= 23; h++) {
    options.push(`${h.toString().padStart(2, "0")}:00`);
    if (h < 23) options.push(`${h.toString().padStart(2, "0")}:30`);
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [clinic, setClinic] = useState({ 
    name: "", 
    phone: "", 
    address: "", 
    logo_url: "", 
    primary_color: "#D4AF37", 
    secondary_color: "#1A1A1A",
    opening_time: "09:00",
    closing_time: "18:00",
    working_days: [1, 2, 3, 4, 5, 6] as number[],
    saturday_opening_time: "" as string,
    saturday_closing_time: "" as string
  });

  const { plan, hasFeature, loading: subscriptionLoading } = useSubscription();
  
  useEffect(() => { loadClinic(); }, [user]);

  const loadClinic = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from("barbershops").select("*").eq("owner_id", user.id).single();
      if (error) throw error;
      if (data) setClinic({ 
        name: data.name || "", 
        phone: data.phone || "", 
        address: data.address || "", 
        logo_url: data.logo_url || "",
        primary_color: data.primary_color || "#D4AF37", 
        secondary_color: data.secondary_color || "#1A1A1A",
        opening_time: data.opening_time?.slice(0, 5) || "09:00",
        closing_time: data.closing_time?.slice(0, 5) || "18:00",
        working_days: data.working_days || [1, 2, 3, 4, 5, 6],
        saturday_opening_time: data.saturday_opening_time?.slice(0, 5) || "",
        saturday_closing_time: data.saturday_closing_time?.slice(0, 5) || ""
      });
    } catch { }
  };

  const uploadLogo = async (file: File) => {
    if (!user) return null;
    const { data: clinicData } = await supabase.from("barbershops").select("id").eq("owner_id", user.id).single();
    if (!clinicData) return null;
    
    try {
      if (clinic.logo_url) {
        const oldPath = clinic.logo_url.split("/").pop();
        if (oldPath) await supabase.storage.from("logos").remove([`${clinicData.id}/${oldPath}`]);
      }
      
      const fileExt = file.name.split(".").pop();
      const fileName = `${clinicData.id}/main-logo-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("logos").upload(fileName, file, { cacheControl: "3600", upsert: true });
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(fileName);
      return publicUrl;
    } catch {
      toast.error("Erro ao enviar logo");
      return null;
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploadingLogo(true);
    const url = await uploadLogo(file);
    if (url) {
      setClinic({ ...clinic, logo_url: url });
      toast.success("Logo enviada!");
    }
    setUploadingLogo(false);
  };


  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("barbershops").update({ 
        name: clinic.name, 
        phone: clinic.phone, 
        address: clinic.address, 
        logo_url: clinic.logo_url, 
        primary_color: clinic.primary_color,
        secondary_color: clinic.secondary_color,
        opening_time: clinic.opening_time,
        closing_time: clinic.closing_time,
        working_days: clinic.working_days,
        saturday_opening_time: clinic.saturday_opening_time || null,
        saturday_closing_time: clinic.saturday_closing_time || null
      }).eq("owner_id", user.id);
      if (error) throw error;
      toast.success("Configurações salvas!");
      setTimeout(() => window.location.reload(), 1000);
    } catch { toast.error("Erro ao salvar"); } finally { setLoading(false); }
  };

  const canEditColors = true; // Cores disponíveis em todos os planos

  if (subscriptionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Configurações</h1>
          <p className="text-sm text-muted-foreground">Personalize seu sistema</p>
        </div>
        <PlanBadge planName={plan?.name || null} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="p-4 pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium"><User className="w-4 h-4" />Informações do Negócio</CardTitle>
            <CardDescription className="text-xs">Dados principais do seu estabelecimento</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Nome do Estabelecimento</Label><Input value={clinic.name} onChange={(e) => setClinic({ ...clinic, name: e.target.value })} placeholder="Meu Negócio" className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Telefone</Label><Input value={clinic.phone} onChange={(e) => setClinic({ ...clinic, phone: e.target.value })} placeholder="(11) 98765-4321" className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Endereço</Label><Input value={clinic.address} onChange={(e) => setClinic({ ...clinic, address: e.target.value })} placeholder="Rua Example, 123" className="h-9" /></div>
            <Button className="w-full h-9 text-sm" onClick={handleSave} disabled={loading}>{loading ? "Salvando..." : "Salvar Alterações"}</Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="p-4 pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium"><Image className="w-4 h-4" />Logo</CardTitle>
            <CardDescription className="text-xs">Logo do seu estabelecimento</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Logo Principal</Label>
              <p className="text-xs text-muted-foreground">Tamanho recomendado: 200x200 pixels</p>
              <div className="flex items-center gap-3">
                {clinic.logo_url ? (
                  <div className="w-14 h-14 rounded-lg overflow-hidden border bg-background">
                    <img src={clinic.logo_url} alt="Logo" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-lg border border-dashed flex items-center justify-center bg-muted/50">
                    <Image className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo} className="w-full h-8 text-xs">
                    <Upload className="w-3.5 h-3.5 mr-1.5" />{uploadingLogo ? "Enviando..." : "Enviar Logo"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
            
        
        <Card>
          <CardHeader className="p-4 pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium"><Upload className="w-4 h-4" />Cores e Identidade</CardTitle>
            <CardDescription className="text-xs">Personalize a aparência do seu sistema</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Cores do Tema</Label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Primária</Label>
                  <div className="flex gap-1.5 mt-1">
                    <Input 
                      type="color" 
                      value={clinic.primary_color} 
                      onChange={(e) => setClinic({ ...clinic, primary_color: e.target.value })} 
                      className="w-10 h-8 p-1 cursor-pointer" 
                    />
                    <Input 
                      value={clinic.primary_color} 
                      onChange={(e) => setClinic({ ...clinic, primary_color: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Secundária</Label>
                  <div className="flex gap-1.5 mt-1">
                    <Input 
                      type="color" 
                      value={clinic.secondary_color} 
                      onChange={(e) => setClinic({ ...clinic, secondary_color: e.target.value })} 
                      className="w-10 h-8 p-1 cursor-pointer"
                    />
                    <Input 
                      value={clinic.secondary_color} 
                      onChange={(e) => setClinic({ ...clinic, secondary_color: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium"><Clock className="w-4 h-4" />Horário de Funcionamento</CardTitle>
            <CardDescription className="text-xs">Configure o expediente da sua agenda</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Abre às</Label>
                <Select value={clinic.opening_time} onValueChange={(v) => setClinic({ ...clinic, opening_time: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha às</Label>
                <Select value={clinic.closing_time} onValueChange={(v) => setClinic({ ...clinic, closing_time: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Dias de funcionamento</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.value} className="flex items-center gap-1.5">
                    <Checkbox 
                      id={`day-${day.value}`}
                      checked={clinic.working_days.includes(day.value)}
                      onCheckedChange={(checked) => {
                        setClinic({
                          ...clinic,
                          working_days: checked 
                            ? [...clinic.working_days, day.value]
                            : clinic.working_days.filter((d) => d !== day.value)
                        });
                      }}
                    />
                    <Label htmlFor={`day-${day.value}`} className="text-xs cursor-pointer">{day.label}</Label>
                  </div>
                ))}
              </div>
            </div>
            
            {clinic.working_days.includes(6) && (
              <div className="border-t pt-3 space-y-2">
                <Label className="text-xs font-medium">Horário especial para Sábado</Label>
                <p className="text-xs text-muted-foreground">Deixe em branco para usar o horário padrão</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Abre às</Label>
                    <Select 
                      value={clinic.saturday_opening_time || "__default__"} 
                      onValueChange={(v) => setClinic({ ...clinic, saturday_opening_time: v === "__default__" ? "" : v })}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Padrão" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">Usar padrão</SelectItem>
                        {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fecha às</Label>
                    <Select 
                      value={clinic.saturday_closing_time || "__default__"} 
                      onValueChange={(v) => setClinic({ ...clinic, saturday_closing_time: v === "__default__" ? "" : v })}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Padrão" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">Usar padrão</SelectItem>
                        {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <ClientLinkGenerator />
        
        <Card>
          <CardHeader className="p-4 pb-3"><CardTitle className="flex items-center gap-2 text-base font-medium"><Bell className="w-4 h-4" />Notificações</CardTitle><CardDescription className="text-xs">Configure alertas</CardDescription></CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50"><div className="flex-1"><p className="text-sm font-medium">Novos Agendamentos</p><p className="text-xs text-muted-foreground">Receba alertas</p></div><Switch defaultChecked /></div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50"><div className="flex-1"><p className="text-sm font-medium">Lembretes de Cliente</p><p className="text-xs text-muted-foreground">Enviar lembretes automáticos</p></div><Switch defaultChecked /></div>
          </CardContent>
        </Card>
      </div>

      <UpgradePrompt 
        open={showUpgradePrompt} 
        onOpenChange={setShowUpgradePrompt}
        feature={upgradeFeature}
        currentPlan={plan?.name}
      />
    </div>
  );
};

export default Settings;
