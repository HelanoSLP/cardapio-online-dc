import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export default function OrderConfirmed() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <CheckCircle className="h-20 w-20 text-accent mb-6" />
      <h1 className="text-2xl mb-2">Pedido Confirmado! 🎉</h1>
      <p className="text-muted-foreground mb-8 max-w-sm">
        Seu pedido foi enviado com sucesso! Você receberá atualizações pelo WhatsApp.
      </p>
      <Button onClick={() => navigate('/')} className="px-8">
        Voltar ao Cardápio
      </Button>
    </div>
  );
}
