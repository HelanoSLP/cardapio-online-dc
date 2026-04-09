import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCategories, useProducts, useCategoryBarItems } from "@/hooks/useMenu";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/hooks/useAuth";
import { CategoryBar } from "@/components/menu/CategoryBar";
import { ProductCard } from "@/components/menu/ProductCard";
import { CartFloatingButton } from "@/components/cart/CartFloatingButton";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Heart, User } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeKey, setActiveKey] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: categories, isLoading: loadingCategories } = useCategories();
  const { data: settings } = useStoreSettings();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const barItems = useCategoryBarItems(categories);

  const activeSlugs = useMemo(() => {
    if (!activeKey) return undefined;
    const item = barItems.find((i) => i.key === activeKey);
    return item?.slugs;
  }, [activeKey, barItems]);

  const { data: products, isLoading: loadingProducts } = useProducts(activeSlugs);

  // Fetch all products for search and favorites
  const { data: allProducts } = useQuery({
    queryKey: ["all-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, categories!inner(slug, name, sort_order)")
        .eq("active", true)
        .order("sort_order");
      return data || [];
    },
  });

  // Fetch products with active cashback or promo for the "Promoções" tab
  const { data: promoProducts } = useQuery({
    queryKey: ["promo-cashback-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, categories!inner(slug, name, sort_order)")
        .eq("active", true)
        .order("sort_order");
      return (data || []).filter((p: any) => 
        (p.promo_price != null && p.promo_price > 0) || p.cashback_active
      );
    },
  });

  // Search filtering
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !allProducts) return null;
    const q = searchQuery.toLowerCase().trim();
    return allProducts.filter((p: any) => p.name.toLowerCase().includes(q));
  }, [searchQuery, allProducts]);

  // Favorite products
  const favoriteProducts = useMemo(() => {
    if (!allProducts || favorites.size === 0) return [];
    return allProducts.filter((p: any) => favorites.has(p.id));
  }, [allProducts, favorites]);

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
      (a, b) => (a[1][0]?.categories.sort_order ?? 0) - (b[1][0]?.categories.sort_order ?? 0),
    );
  }, [isGrouped, products]);

  const isOpen = settings?.store_open !== false;

  const [mobileTab, setMobileTab] = useState<"menu" | "promos">("menu");

  const promoContent =
    promoProducts && promoProducts.length > 0 ? (
      <div className="grid grid-cols-1 landscape:grid-cols-2 lg:grid-cols-2 gap-3">
        {promoProducts.map((product: any) => (
          <ProductCard key={product.id} product={product} categories={categories} isFavorite={isFavorite(product.id)} onToggleFavorite={toggleFavorite} />
        ))}
      </div>
    ) : (
      <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma promoção ativa no momento.</p>
    );

  const renderProductGrid = (items: any[]) => (
    <div className="grid grid-cols-1 landscape:grid-cols-2 lg:grid-cols-2 gap-3">
      {items.map((product: any) => (
        <ProductCard key={product.id} product={product} categories={categories} isFavorite={isFavorite(product.id)} onToggleFavorite={toggleFavorite} />
      ))}
    </div>
  );

  const productsContent = (
    <>
      {/* Favorites section */}
      {!searchQuery && favoriteProducts.length > 0 && !activeSlugs && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
            <Heart className="h-5 w-5 fill-red-500 text-red-500" /> Favoritos
          </h2>
          {renderProductGrid(favoriteProducts)}
        </div>
      )}

      {/* Search results */}
      {searchQuery && searchResults ? (
        <>
          {searchResults.length > 0 ? (
            renderProductGrid(searchResults)
          ) : (
            <p className="text-center text-muted-foreground py-12">
              Nenhum produto encontrado para "{searchQuery}".
            </p>
          )}
        </>
      ) : (
        <>
          {loadingProducts ? (
            <div className="grid grid-cols-1 landscape:grid-cols-2 lg:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : groupedProducts ? (
            <div className="space-y-6">
              {groupedProducts.map(([catName, items]) => (
                <div key={catName}>
                  <h2 className="text-lg font-bold text-foreground mb-3">{catName}</h2>
                  <div className="grid grid-cols-1 landscape:grid-cols-2 lg:grid-cols-2 gap-3">
                    {items.map((product) => (
                      <ProductCard key={product.id} product={product} categories={categories} isFavorite={isFavorite(product.id)} onToggleFavorite={toggleFavorite} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 landscape:grid-cols-2 lg:grid-cols-2 gap-3">
              {products?.map((product) => (
                <ProductCard key={product.id} product={product} categories={categories} isFavorite={isFavorite(product.id)} onToggleFavorite={toggleFavorite} />
              ))}
              {products?.length === 0 && (
                <p className="text-center text-muted-foreground py-12 col-span-full">
                  Nenhum produto encontrado nesta categoria.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </>
  );

  return (
    <div className="min-h-screen pb-24 bg-white">
      {/* Sticky top section: header + categories + search + tabs */}
      <div className="sticky top-0 z-40">
        {/* Header bar */}
        <header className="border-b bg-primary text-primary-foreground">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt={settings.store_name} className="h-12 object-contain" />
            ) : (
              <img src="/images/logo-dc.png" alt="Delícias Caseiras" className="h-12 object-contain" />
            )}
            <span className="text-sm font-bold text-primary-foreground flex-1">Cardápio online da DC</span>
            {/* User account button */}
            <button
              onClick={() => navigate(user ? '/conta' : '/conta/login')}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              title={user ? 'Minha Conta' : 'Entrar'}
            >
              <User className="h-4 w-4" />
            </button>
            {/* Open/Closed badge */}
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              isOpen 
                ? 'bg-green-500/20 text-green-100' 
                : 'bg-red-500/20 text-red-100'
            }`}>
              {isOpen ? '🟢 Aberto' : '🔴 Fechado'}
            </span>
          </div>
        </header>

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
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-9 w-24 rounded-full shrink-0" />
                ))}
              </div>
            ) : (
              <CategoryBar items={barItems} active={activeKey} onSelect={setActiveKey} />
            )}
          </div>
        </div>

        {/* Search bar */}
        <div className="border-b bg-white">
          <div className="mx-auto max-w-5xl px-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar no cardápio..."
                className="w-full pl-9 pr-9 py-2 text-sm rounded-full border border-border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="landscape:hidden lg:hidden flex border-b bg-white">
          <button
            onClick={() => setMobileTab("menu")}
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
              mobileTab === "menu" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            }`}
          >
            🍽️ Cardápio
          </button>
          <button
            onClick={() => setMobileTab("promos")}
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
              mobileTab === "promos" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            }`}
          >
            🔥 Promoções
          </button>
        </div>
      </div>

      {/* Desktop/Landscape: 2-col products + sidebar promos */}
      <div className="hidden landscape:flex lg:flex mx-auto max-w-5xl px-4 py-4 gap-6">
        <main className="flex-1 min-w-0">{productsContent}</main>
        <aside className="w-72 shrink-0">
          <h2 className="text-lg font-bold text-foreground mb-3">🔥 Promoções</h2>
          {promoContent}
        </aside>
      </div>

      {/* Mobile Portrait: content */}
      <div className="landscape:hidden lg:hidden">
        <main className="mx-auto max-w-lg px-4 py-4">
          {mobileTab === "menu" ? productsContent : promoContent}
        </main>
      </div>

      <CartFloatingButton />
      <CartDrawer />
    </div>
  );
};

export default Index;
