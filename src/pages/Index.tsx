import { useState, useMemo } from 'react';
import { useCategories, useProducts, useCategoryBarItems, CATEGORY_GROUPS } from '@/hooks/useMenu';
import { CategoryBar } from '@/components/menu/CategoryBar';
import { ProductCard } from '@/components/menu/ProductCard';
import { CartFloatingButton } from '@/components/cart/CartFloatingButton';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const [activeKey, setActiveKey] = useState<string | undefined>();
  const { data: categories, isLoading: loadingCategories } = useCategories();
  const barItems = useCategoryBarItems(categories);

  // Resolve active key to slugs
  const activeSlugs = useMemo(() => {
    if (!activeKey) return undefined;
    const item = barItems.find((i) => i.key === activeKey);
    return item?.slugs;
  }, [activeKey, barItems]);

  const { data: products, isLoading: loadingProducts } = useProducts(activeSlugs);

  // Group products by subcategory when viewing a group with multiple slugs
  const isGrouped = activeSlugs && activeSlugs.length > 1;
  const groupedProducts = useMemo(() => {
    if (!isGrouped || !products) return null;
    const groups: Record<string, typeof products> = {};
    for (const p of products) {
      const catName = p.categories.name;
      if (!groups[catName]) groups[catName] = [];
      groups[catName].push(p);
    }
    // Sort groups by category sort_order
    return Object.entries(groups).sort(
      (a, b) => (a[1][0]?.categories.sort_order ?? 0) - (b[1][0]?.categories.sort_order ?? 0)
    );
  }, [isGrouped, products]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-lg px-4 py-4">
          <h1 className="text-2xl tracking-tight">🍕 Pizzaria Delícia</h1>
          <p className="text-sm opacity-80">Peça pelo cardápio digital</p>
        </div>
      </header>

      {/* Categories */}
      <div className="sticky top-[72px] z-30 bg-background/95 backdrop-blur-sm border-b">
        <div className="mx-auto max-w-lg">
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

      {/* Products */}
      <main className="mx-auto max-w-lg px-4 py-4">
        {loadingProducts ? (
          <div className="grid grid-cols-1 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : groupedProducts ? (
          <div className="space-y-6">
            {groupedProducts.map(([catName, items]) => (
              <div key={catName}>
                <h2 className="text-lg font-bold text-foreground mb-3">{catName}</h2>
                <div className="grid grid-cols-1 gap-3">
                  {items.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {products?.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
            {products?.length === 0 && (
              <p className="text-center text-muted-foreground py-12">
                Nenhum produto encontrado nesta categoria.
              </p>
            )}
          </div>
        )}
      </main>

      <CartFloatingButton />
      <CartDrawer />
    </div>
  );
};

export default Index;
