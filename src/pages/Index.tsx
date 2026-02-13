import { useState } from 'react';
import { useCategories, useProducts } from '@/hooks/useMenu';
import { CategoryBar } from '@/components/menu/CategoryBar';
import { ProductCard } from '@/components/menu/ProductCard';
import { CartFloatingButton } from '@/components/cart/CartFloatingButton';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const [activeCategory, setActiveCategory] = useState<string | undefined>();
  const { data: categories, isLoading: loadingCategories } = useCategories();
  const { data: products, isLoading: loadingProducts } = useProducts(activeCategory);

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
              categories={categories || []}
              active={activeCategory}
              onSelect={setActiveCategory}
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
