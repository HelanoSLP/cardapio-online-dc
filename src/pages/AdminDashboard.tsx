import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { OrdersPanel } from '@/components/admin/OrdersPanel';
import { MenuPanel } from '@/components/admin/MenuPanel';
import { SettingsPanel } from '@/components/admin/SettingsPanel';
import { PromotionsPanel } from '@/components/admin/PromotionsPanel';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/admin/login');
        return;
      }
      const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      if (!isAdmin) {
        await supabase.auth.signOut();
        navigate('/admin/login');
        toast.error('Acesso negado');
        return;
      }
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-sidebar-background text-sidebar-foreground border-b border-sidebar-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg">🍕 Painel Admin</h1>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-sidebar-foreground hover:bg-sidebar-accent">
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4">
        <Tabs defaultValue="orders">
          <TabsList className="w-full">
            <TabsTrigger value="orders" className="flex-1">Pedidos</TabsTrigger>
            <TabsTrigger value="menu" className="flex-1">Cardápio</TabsTrigger>
            <TabsTrigger value="promos" className="flex-1">Promoções</TabsTrigger>
            <TabsTrigger value="settings" className="flex-1">Config</TabsTrigger>
          </TabsList>
          <TabsContent value="orders">
            <OrdersPanel />
          </TabsContent>
          <TabsContent value="menu">
            <MenuPanel />
          </TabsContent>
          <TabsContent value="promos">
            <PromotionsPanel />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
