import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock } from 'lucide-react';
import { useStoreSettings } from '@/hooks/useStoreSettings';

export default function OrderConfirmed() {
  const navigate = useNavigate();
  const { data: settings } = useStoreSettings();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <CheckCircle className="h-20 w-20 text-accent mb-6" />
      <h1 className="text-2xl mb-2">Pedido Confirmado! 🎉</h1>
      <p className="text-muted-foreground mb-4 max-w-sm">
        Seu pedido foi enviado com sucesso! Você receberá atualizações pelo WhatsApp.
      </p>

      {settings?.estimated_delivery_time && (
        <div className="flex items-center gap-2 bg-primary/10 text-primary rounded-lg px-4 py-3 mb-8">
          <Clock className="h-5 w-5" />
          <span className="text-sm font-medium">
            Tempo estimado de entrega: <strong>{settings.estimated_delivery_time}</strong>
          </span>
        </div>
      )}

      <Button onClick={() => navigate('/')} className="px-8">
        Voltar ao Cardápio
      </Button>
    </div>
  );
}
