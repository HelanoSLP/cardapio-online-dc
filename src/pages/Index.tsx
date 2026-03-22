import { useState, useMemo } from 'react';
import { useCategories, useProducts, useCategoryBarItems } from '@/hooks/useMenu';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { CategoryBar } from '@/components/menu/CategoryBar';
import { ProductCard } from '@/components/menu/ProductCard';
import { CartFloatingButton } from '@/components/cart/CartFloatingButton';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const Index = () => {
  const [activeKey, setActiveKey] = useState<string | undefined>();
  const { data: categories, isLoading: loadingCategories } = useCategories();
  const { data: settings } = useStoreSettings();
  const barItems = useCategoryBarItems(categories);

  const activeSlugs = useMemo(() => {
    if (!activeKey) return undefined;
    const item = barItems.find((i) => i.key === activeKey);
    return item?.slugs;
  }, [activeKey, barItems]);

  const { data: products, isLoading: loadingProducts } = useProducts(activeSlugs);

  // Fetch active banner promotions
  const { data: bannerPromos } = useQuery({
    queryKey: ['active-banners'],
    queryFn: async () => {
      const { data } = await supabase
        .from('promotions')
        .select('*')
        .eq('type', 'banner')
        .eq('active', true)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const isGrouped = activeSlugs && activeSlugs.length > 1;
  const groupedProducts = useMemo(() => {
    if (!isGrouped || !products) return null;
    const groups: Record<string, typeof products> = {};
    for (const p of products) {
      const catName = p.categories.name;
      if (!groups[catName]) groups[catName] = [];
      groups[catName].push(p);
    }
    return Object.entries(groups).sort(
      (a, b) => (a[1][0]?.categories.sort_order ?? 0) - (b[1][0]?.categories.sort_order ?? 0)
    );
  }, [isGrouped, products]);

  const hasWallpaper = settings?.wallpaper_url && settings.wallpaper_url.length > 0;
  const isOpen = settings?.store_open !== false;

  const [mobileTab, setMobileTab] = useState<'menu' | 'promos'>('menu');

  const promoBannersContent = bannerPromos && bannerPromos.length > 0 ? (
    <div className="space-y-3">
      {bannerPromos.map((promo: any) => (
        <div key={promo.id} className="rounded-xl overflow-hidden border">
          {promo.banner_image_url ? (
            <div className="relative">
              <img src={promo.banner_image_url} alt={promo.title} className="w-full h-32 object-cover" />
              {promo.banner_text && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-3">
                  <p className="text-sm font-bold text-white">{promo.banner_text}</p>
                </div>
              )}
            </div>
          ) : promo.banner_text ? (
            <div className="bg-gradient-to-r from-primary to-secondary p-4 text-center">
              <p className="text-sm font-bold text-primary-foreground">{promo.banner_text}</p>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  ) : (
    <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma promoção ativa no momento.</p>
  );

  const productsContent = (
    <>
      {loadingProducts ? (
        <div className="grid grid-cols-1 landscape:grid-cols-2 lg:grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : groupedProducts ? (
        <div className="space-y-6">
          {groupedProducts.map(([catName, items]) => (
            <div key={catName}>
              <h2 className="text-lg font-bold text-foreground mb-3">{catName}</h2>
              <div className="grid grid-cols-1 landscape:grid-cols-2 lg:grid-cols-2 gap-3">
                {items.map((product) => (
                  <ProductCard key={product.id} product={product} categories={categories} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 landscape:grid-cols-2 lg:grid-cols-2 gap-3">
          {products?.map((product) => (
            <ProductCard key={product.id} product={product} categories={categories} />
          ))}
          {products?.length === 0 && (
            <p className="text-center text-muted-foreground py-12 col-span-full">
              Nenhum produto encontrado nesta categoria.
            </p>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen pb-24 bg-white">
      {/* Logo centered at top */}
      <div className="flex justify-center py-4 bg-white">
        {settings?.logo_url ? (
          <img src={settings.logo_url} alt={settings.store_name} className="h-28 object-contain" />
        ) : (
          <img src="/images/logo-dc.png" alt="Delícias Caseiras" className="h-28 object-contain" />
        )}
      </div>

      {/* Store closed banner */}
      {!isOpen && (
        <div className="bg-destructive text-destructive-foreground text-center py-3 px-4">
          <p className="text-sm font-bold">🔴 Estamos fechados no momento</p>
          <p className="text-xs opacity-80 mt-0.5">Confira nosso cardápio e volte quando estivermos abertos!</p>
        </div>
      )}

      {/* Categories */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-5xl">
          {loadingCategories ? (
            <div className="flex gap-2 p-3 overflow-x-auto">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-9 w-24 rounded-full shrink-0" />)}
            </div>
          ) : (
            <CategoryBar
              items={barItems}
              active={activeKey}
              onSelect={setActiveKey}
            />
          )}
        </div>
      </div>

      {/* Desktop/Landscape: 2-col products + sidebar promos */}
      <div className="hidden landscape:flex lg:flex mx-auto max-w-5xl px-4 py-4 gap-6">
        <main className="flex-1 min-w-0">
          {productsContent}
        </main>
        <aside className="w-72 shrink-0">
          <h2 className="text-lg font-bold text-foreground mb-3">🔥 Promoções</h2>
          {promoBannersContent}
        </aside>
      </div>

      {/* Mobile Portrait: tabs for menu/promos */}
      <div className="landscape:hidden lg:hidden">
        <div className="flex border-b bg-white">
          <button
            onClick={() => setMobileTab('menu')}
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
              mobileTab === 'menu'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground'
            }`}
          >
            🍽️ Cardápio
          </button>
          <button
            onClick={() => setMobileTab('promos')}
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
              mobileTab === 'promos'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground'
            }`}
          >
            🔥 Promoções
          </button>
        </div>

        <main className="mx-auto max-w-lg px-4 py-4">
          {mobileTab === 'menu' ? productsContent : promoBannersContent}
        </main>
      </div>

      <CartFloatingButton />
      <CartDrawer />
    </div>
  );
};

export default Index;
