import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, X, LayoutDashboard, ClipboardList, UtensilsCrossed, Megaphone, Settings } from 'lucide-react';
import { OrdersPanel } from '@/components/admin/OrdersPanel';
import { MenuPanel } from '@/components/admin/MenuPanel';
import { SettingsPanel } from '@/components/admin/SettingsPanel';
import { PromotionsPanel } from '@/components/admin/PromotionsPanel';
import { DashboardPanel } from '@/components/admin/DashboardPanel';
import { toast } from 'sonner';

const tabs = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'orders', label: 'Pedidos', icon: ClipboardList },
  { key: 'menu', label: 'Cardápio', icon: UtensilsCrossed },
  { key: 'promos', label: 'Promoções', icon: Megaphone },
  { key: 'settings', label: 'Configurações', icon: Settings },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/admin/login'); return; }
      const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      if (!isAdmin) { await supabase.auth.signOut(); navigate('/admin/login'); toast.error('Acesso negado'); return; }
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const selectTab = (key: string) => {
    setActiveTab(key);
    setMenuOpen(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  const ActiveIcon = tabs.find(t => t.key === activeTab)?.icon || LayoutDashboard;
  const activeLabel = tabs.find(t => t.key === activeTab)?.label || '';

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar with menu button */}
      <header className="sticky top-0 z-40 bg-sidebar-background text-sidebar-foreground border-b border-sidebar-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setMenuOpen(!menuOpen)} className="text-sidebar-foreground hover:bg-sidebar-accent">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <ActiveIcon className="h-4 w-4" />
              <span className="text-sm font-medium">{activeLabel}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-sidebar-foreground hover:bg-sidebar-accent">
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </header>

      {/* Slide-down menu */}
      {menuOpen && (
        <div className="sticky top-[53px] z-30 bg-sidebar-background border-b border-sidebar-border shadow-lg">
          <nav className="max-w-5xl mx-auto px-4 py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => selectTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm transition-colors ${
                    activeTab === tab.key
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-4">
        {activeTab === 'dashboard' && <DashboardPanel />}
        {activeTab === 'orders' && <OrdersPanel />}
        {activeTab === 'menu' && <MenuPanel />}
        {activeTab === 'promos' && <PromotionsPanel />}
        {activeTab === 'settings' && <SettingsPanel />}
      </main>
    </div>
  );
}
