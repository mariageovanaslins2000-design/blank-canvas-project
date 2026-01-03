import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, X, Image as ImageIcon, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { PlanLimitIndicator } from "@/components/Subscription/PlanLimitIndicator";
import { UpgradePrompt } from "@/components/Subscription/UpgradePrompt";

interface PortfolioImage {
  id: string;
  image_url: string;
  title: string | null;
  description: string | null;
}

const Portfolio = () => {
  const { user } = useAuth();
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [barbershopId, setBarbershopId] = useState<string>();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { 
    plan, 
    hasPortfolioAccess, 
    canAddPortfolioImage, 
    getPortfolioLimit, 
    refreshUsage,
    loading: subscriptionLoading 
  } = useSubscription();

  useEffect(() => {
    loadPortfolio();
  }, [user]);

  const loadPortfolio = async () => {
    if (!user) return;

    try {
      const { data: barbershop } = await supabase
        .from("barbershops")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!barbershop) return;
      
      setBarbershopId(barbershop.id);

      const { data, error } = await supabase
        .from("portfolio_images")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .order("display_order");

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error("Error loading portfolio:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !barbershopId) return;

    if (!canAddPortfolioImage()) {
      setShowUpgradePrompt(true);
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${barbershopId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('portfolio')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from("portfolio_images")
        .insert({
          barbershop_id: barbershopId,
          image_url: publicUrl,
          title: title || null,
          description: description || null,
        });

      if (insertError) throw insertError;

      toast({
        title: "Imagem adicionada!",
        description: "A imagem foi adicionada ao portfólio.",
      });

      setTitle("");
      setDescription("");
      setOpen(false);
      loadPortfolio();
      refreshUsage();
    } catch (error: any) {
      toast({
        title: "Erro ao fazer upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (image: PortfolioImage) => {
    try {
      const fileName = image.image_url.split('/').pop();
      
      await supabase.storage.from('portfolio').remove([fileName!]);
      
      const { error } = await supabase
        .from("portfolio_images")
        .delete()
        .eq("id", image.id);

      if (error) throw error;

      toast({
        title: "Imagem removida",
        description: "A imagem foi removida do portfólio.",
      });

      loadPortfolio();
      refreshUsage();
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading || subscriptionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Block access for plans without portfolio
  if (!hasPortfolioAccess()) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-medium">Portfólio</h1>
          <p className="text-sm text-muted-foreground">Mostre seus melhores trabalhos</p>
        </div>
        
        <Card className="p-8 text-center">
          <Lock className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="text-base font-medium mb-1">Portfólio não disponível</h3>
          <p className="text-sm text-muted-foreground mb-3">
            O portfólio está disponível nos planos Profissional e Premium.
          </p>
          <Button size="sm" onClick={() => setShowUpgradePrompt(true)}>
            Ver Planos
          </Button>
        </Card>

        <UpgradePrompt 
          open={showUpgradePrompt} 
          onOpenChange={setShowUpgradePrompt}
          feature="portfolio"
          currentPlan={plan?.name}
        />
      </div>
    );
  }

  const limits = getPortfolioLimit();

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium">Portfólio</h1>
          <p className="text-sm text-muted-foreground">Mostre seus melhores trabalhos</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <PlanLimitIndicator current={limits.current} max={limits.max} label="Imagens" />
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                onClick={(e) => {
                  if (!canAddPortfolioImage()) {
                    e.preventDefault();
                    setShowUpgradePrompt(true);
                  }
                }}
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-base">Adicionar ao Portfólio</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-sm">Título (opcional)</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Corte Degradê"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-sm">Descrição (opcional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva o trabalho..."
                    rows={2}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Imagem</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    {uploading ? "Enviando..." : "Escolher Imagem"}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {images.length === 0 ? (
        <Card className="p-8 text-center">
          <ImageIcon className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="text-base font-medium mb-1">Nenhuma imagem no portfólio</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Adicione fotos dos seus melhores trabalhos
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {images.map((image) => (
            <Card key={image.id} className="group relative overflow-hidden hover:shadow-md transition-all">
              <CardContent className="p-0">
                <div className="relative aspect-square">
                  <img
                    src={image.image_url}
                    alt={image.title || "Portfolio image"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(image)}
                      className="h-8 text-xs"
                    >
                      <X className="w-3.5 h-3.5 mr-1.5" />
                      Remover
                    </Button>
                  </div>
                </div>
                {(image.title || image.description) && (
                  <div className="p-3">
                    {image.title && (
                      <h3 className="text-sm font-medium mb-0.5">{image.title}</h3>
                    )}
                    {image.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{image.description}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <UpgradePrompt 
        open={showUpgradePrompt} 
        onOpenChange={setShowUpgradePrompt}
        feature="portfolio_images"
        currentPlan={plan?.name}
      />
    </div>
  );
};

export default Portfolio;
