import { useState, useEffect } from "react";
import { Download, Smartphone, Monitor, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstalled(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
            <Download className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold">Instale o IABarber</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tenha acesso rápido ao sistema de gestão da sua barbearia direto da tela inicial do seu dispositivo
          </p>
        </div>

        {/* Install Button */}
        {isInstalled ? (
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="flex items-center justify-center gap-3 py-8">
              <Check className="w-6 h-6 text-primary" />
              <span className="text-lg font-semibold">App já está instalado!</span>
            </CardContent>
          </Card>
        ) : deferredPrompt ? (
          <Card className="border-2 border-primary/20">
            <CardContent className="flex flex-col items-center gap-4 py-8">
              <p className="text-center text-muted-foreground">
                Pronto para instalar! Clique no botão abaixo:
              </p>
              <Button size="lg" onClick={handleInstall} className="min-w-[200px]">
                <Download className="w-5 h-5 mr-2" />
                Instalar Agora
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-muted">
            <CardContent className="py-8 text-center text-muted-foreground">
              O navegador não suporta instalação automática. Veja as instruções abaixo para instalar manualmente.
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Acesso Rápido</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Abra o app direto da tela inicial, como qualquer outro aplicativo nativo
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Monitor className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Funciona Offline</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Continue trabalhando mesmo sem conexão com a internet
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Download className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Sem Loja de Apps</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Instale diretamente do navegador, sem precisar de app store
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Manual Instructions */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-center">Como Instalar Manualmente</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* iOS/Safari */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  iPhone / iPad (Safari)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Abra este site no Safari</li>
                  <li>Toque no ícone de compartilhar (quadrado com seta)</li>
                  <li>Role para baixo e toque em "Adicionar à Tela de Início"</li>
                  <li>Toque em "Adicionar" no canto superior direito</li>
                </ol>
              </CardContent>
            </Card>

            {/* Android/Chrome */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Android (Chrome)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Abra este site no Chrome</li>
                  <li>Toque no menu (três pontos) no canto superior direito</li>
                  <li>Toque em "Instalar app" ou "Adicionar à tela inicial"</li>
                  <li>Confirme tocando em "Instalar"</li>
                </ol>
              </CardContent>
            </Card>

            {/* Desktop Chrome */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Windows / Mac (Chrome)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Abra este site no Chrome</li>
                  <li>Clique no ícone de instalação na barra de endereço</li>
                  <li>Ou vá em Menu → Instalar IABarber</li>
                  <li>Clique em "Instalar" na janela que aparecer</li>
                </ol>
              </CardContent>
            </Card>

            {/* Desktop Edge */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Windows (Edge)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Abra este site no Edge</li>
                  <li>Clique no ícone de instalação na barra de endereço</li>
                  <li>Ou vá em Menu (três pontos) → Aplicativos → Instalar este site como um app</li>
                  <li>Clique em "Instalar"</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
