import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, LogOut, User, Gift, Clock, Heart, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const statusLabels: Record<string, string> = {
  received: '📥 Recebido',
  preparing: '👨‍🍳 Em Preparo',
  out_for_delivery: '🛵 Saiu p/ Entrega',
  delivered: '✅ Entregue',
};

const formatPrice = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function CustomerAccount() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'coupons' | 'favorites'>('profile');

  useEffect(() => {
    if (!authLoading && !user) navigate('/conta/login');
  }, [user, authLoading, navigate]);

  // Profile
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const [profileForm, setProfileForm] = useState({ name: '', whatsapp: '' });
  useEffect(() => {
    if (profile) setProfileForm({ name: profile.name || '', whatsapp: profile.whatsapp || '' });
  }, [profile]);

  const saveProfile = async () => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({
      name: profileForm.name,
      whatsapp: profileForm.whatsapp,
    }).eq('user_id', user.id);
    if (error) toast.error('Erro ao salvar');
    else {
      toast.success('Perfil atualizado!');
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    }
  };

  // Orders
  const { data: orders, isLoading: loadingOrders } = useQuery({
    queryKey: ['my-orders', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  // Coupons via WhatsApp
  const { data: coupons, isLoading: loadingCoupons } = useQuery({
    queryKey: ['my-coupons', profileForm.whatsapp],
    queryFn: async () => {
      if (!profileForm.whatsapp) return [];
      const { data } = await supabase.rpc('validate_coupon', {
        p_code: '__LIST__',
        p_whatsapp: profileForm.whatsapp,
      });
      return [];
    },
    enabled: !!profileForm.whatsapp && activeTab === 'coupons',
  });

  // Favorites
  const { data: favoriteProducts, isLoading: loadingFavorites } = useQuery({
    queryKey: ['my-favorites', user?.id],
    queryFn: async () => {
      const { data: favs } = await supabase
        .from('favorites')
        .select('product_id, products(id, name, price, promo_price, image_url)')
        .eq('user_id', user!.id);
      return favs?.map((f: any) => f.products).filter(Boolean) || [];
    },
    enabled: !!user,
  });

  const removeFavorite = async (productId: string) => {
    if (!user) return;
    await supabase.from('favorites').delete().eq('user_id', user.id).eq('product_id', productId);
    queryClient.invalidateQueries({ queryKey: ['my-favorites'] });
    toast.success('Removido dos favoritos');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Skeleton className="h-10 w-40" /></div>;

  const tabs = [
    { key: 'profile' as const, icon: User, label: 'Perfil' },
    { key: 'orders' as const, icon: Clock, label: 'Pedidos' },
    { key: 'coupons' as const, icon: Gift, label: 'Cupons' },
    { key: 'favorites' as const, icon: Heart, label: 'Favoritos' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b bg-primary text-primary-foreground">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-bold flex-1">Minha Conta</span>
          <button onClick={handleSignOut} className="flex items-center gap-1 text-sm opacity-80 hover:opacity-100">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b bg-card">
        <div className="max-w-5xl mx-auto flex">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-3 text-xs font-medium text-center flex flex-col items-center gap-1 transition-colors ${
                activeTab === t.key ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Meus Dados</h2>
            <div>
              <Label>E-mail</Label>
              <Input value={user?.email || ''} disabled className="bg-muted" />
            </div>
            <div>
              <Label>Nome</Label>
              <Input value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} placeholder="Seu nome" />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input value={profileForm.whatsapp} onChange={e => setProfileForm(p => ({ ...p, whatsapp: e.target.value }))} placeholder="(00) 00000-0000" />
            </div>
            <Button onClick={saveProfile} className="w-full gap-2">
              <Save className="h-4 w-4" /> Salvar
            </Button>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Meus Pedidos</h2>
            {loadingOrders ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
            ) : orders && orders.length > 0 ? (
              orders.map((order: any) => (
                <div key={order.id} className="bg-card rounded-xl border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Pedido #{order.order_number}</span>
                    <Badge variant="secondary" className="text-xs">
                      {statusLabels[order.status] || order.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-sm text-foreground space-y-1">
                    {order.order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between">
                        <span>{item.quantity}x {item.product_name}</span>
                        <span>{formatPrice(item.unit_price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-foreground">
                    <span>Total</span>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum pedido encontrado.</p>
            )}
          </div>
        )}

        {/* Coupons Tab */}
        {activeTab === 'coupons' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Meus Cupons</h2>
            {!profileForm.whatsapp ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-muted-foreground text-sm">Cadastre seu WhatsApp no perfil para ver seus cupons.</p>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('profile')}>Ir para Perfil</Button>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">
                Seus cupons de cashback aparecerão aqui após suas compras.
              </p>
            )}
          </div>
        )}

        {/* Favorites Tab */}
        {activeTab === 'favorites' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Meus Favoritos</h2>
            {loadingFavorites ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
            ) : favoriteProducts && favoriteProducts.length > 0 ? (
              favoriteProducts.map((product: any) => (
                <div key={product.id} className="bg-card rounded-xl border p-3 flex items-center gap-3">
                  {product.image_url && (
                    <img src={product.image_url} alt={product.name} className="h-14 w-14 rounded-lg object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{product.name}</p>
                    <p className="text-sm font-bold text-primary">
                      {product.promo_price ? formatPrice(product.promo_price) : formatPrice(product.price)}
                    </p>
                  </div>
                  <button onClick={() => removeFavorite(product.id)} className="p-2 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">
                Nenhum favorito ainda. Toque no ❤️ nos produtos do cardápio!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
