import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AddProfessionalDialogProps {
  onProfessionalAdded: () => void;
  disabled?: boolean;
  onDisabledClick?: () => void;
}

export function AddProfessionalDialog({ onProfessionalAdded, disabled, onDisabledClick }: AddProfessionalDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({ name: "", specialty: "", phone: "", commission_percent: "50" });

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('professional-photos').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('professional-photos').getPublicUrl(fileName);
      setPhotoUrl(publicUrl);
      toast.success("Foto carregada!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer upload");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: clinic } = await supabase.from("barbershops").select("id").eq("owner_id", user?.id).single();
      if (!clinic) { toast.error("Clínica não encontrada"); return; }
      const { error } = await supabase.from("barbers").insert({
        barbershop_id: clinic.id, name: formData.name, specialty: formData.specialty || null,
        phone: formData.phone || null, photo_url: photoUrl || null,
        commission_percent: parseFloat(formData.commission_percent), is_active: true,
      });
      if (error) throw error;
      toast.success("Profissional adicionado!");
      setFormData({ name: "", specialty: "", phone: "", commission_percent: "50" });
      setPhotoUrl("");
      setOpen(false);
      onProfessionalAdded();
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          onClick={(e) => {
            if (disabled) {
              e.preventDefault();
              onDisabledClick?.();
            }
          }}
        >
          <Plus className="w-4 h-4 mr-2" />Adicionar Profissional
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-display">Adicionar Profissional</DialogTitle>
          <DialogDescription>Preencha os dados do profissional</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-24 h-24">{photoUrl && <AvatarImage src={photoUrl} />}<AvatarFallback className="bg-secondary text-2xl text-icon">{formData.name.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}</AvatarFallback></Avatar>
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}><Upload className="w-4 h-4 mr-2" />{uploading ? "Enviando..." : "Foto"}</Button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          </div>
          <div className="space-y-2"><Label>Nome *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
          <div className="space-y-2"><Label>Especialidade</Label><Input placeholder="Ex: Fisioterapia" value={formData.specialty} onChange={(e) => setFormData({ ...formData, specialty: e.target.value })} /></div>
          <div className="space-y-2"><Label>Telefone</Label><Input placeholder="(11) 98765-4321" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
          <div className="space-y-2"><Label>Comissão (%)</Label><Input type="number" min="0" max="100" value={formData.commission_percent} onChange={(e) => setFormData({ ...formData, commission_percent: e.target.value })} /></div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1" disabled={loading}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={loading}>{loading ? "Salvando..." : "Adicionar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
