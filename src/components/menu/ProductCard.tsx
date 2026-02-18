import { useState, useMemo } from 'react';
import { Product, Category, isPizzaCategory, PIZZA_SIZES, PizzaSize } from '@/hooks/useMenu';
import { useCartStore } from '@/stores/cartStore';
import { Plus, Minus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  categories?: Category[];
}

export function ProductCard({ product, categories }: ProductCardProps) {
  const [open, setOpen] = useState(false);
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<PizzaSize | null>(null);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const addItem = useCartStore((s) => s.addItem);

  const isPizza = useMemo(
    () => isPizzaCategory(categories, product.category_id),
    [categories, product.category_id]
  );

  // Fetch sibling pizza products for flavor selection
  const { data: siblingProducts } = useQuery({
    queryKey: ['sibling-products', product.category_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name')
        .eq('category_id', product.category_id)
        .eq('active', true)
        .order('sort_order');
      return data || [];
    },
    enabled: isPizza && open,
  });

  const maxFlavors = selectedSize
    ? PIZZA_SIZES.find((s) => s.key === selectedSize)?.maxFlavors || 1
    : 1;

  const handleAdd = () => {
    const flavorNames = selectedFlavors.length > 1
      ? selectedFlavors.join(' / ')
      : undefined;
    const sizeLabel = selectedSize
      ? PIZZA_SIZES.find((s) => s.key === selectedSize)?.label
      : undefined;

    const displayName = [
      product.name,
      sizeLabel ? `(${sizeLabel})` : '',
      flavorNames ? `- ${flavorNames}` : '',
    ].filter(Boolean).join(' ');

    addItem({
      productId: product.id,
      name: displayName,
      price: product.price,
      quantity,
      notes: notes.trim() || undefined,
      removedIngredients: removedIngredients.length > 0 ? removedIngredients : undefined,
    });
    toast.success(`${product.name} adicionado ao carrinho!`);
    resetAndClose();
  };

  const resetAndClose = () => {
    setOpen(false);
    setRemovedIngredients([]);
    setNotes('');
    setQuantity(1);
    setSelectedSize(null);
    setSelectedFlavors([]);
  };

  const toggleIngredient = (ing: string) => {
    setRemovedIngredients((prev) =>
      prev.includes(ing) ? prev.filter((i) => i !== ing) : [...prev, ing]
    );
  };

  const toggleFlavor = (name: string) => {
    setSelectedFlavors((prev) => {
      if (prev.includes(name)) return prev.filter((f) => f !== name);
      if (prev.length >= maxFlavors) {
        toast.error(`Máximo de ${maxFlavors} sabores para este tamanho`);
        return prev;
      }
      return [...prev, name];
    });
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex gap-3 rounded-xl border bg-card p-3 text-left transition-shadow hover:shadow-md"
      >
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-20 w-20 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-muted text-3xl shrink-0">🍽️</div>
        )}
        <div className="flex flex-col justify-between min-w-0 flex-1">
          <div>
            <h3 className="font-semibold text-card-foreground line-clamp-1">{product.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{product.description}</p>
          </div>
          <p className="font-bold text-primary text-lg">{formatPrice(product.price)}</p>
        </div>
      </button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); else setOpen(true); }}>
        <DialogContent className="max-w-sm mx-auto max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{product.name}</DialogTitle>
          </DialogHeader>
          {product.image_url && (
            <img src={product.image_url} alt={product.name} className="w-full h-40 object-cover rounded-lg" />
          )}
          <p className="text-sm text-muted-foreground">{product.description}</p>
          <p className="font-bold text-primary text-xl">{formatPrice(product.price)}</p>

          {/* Pizza Size Selection */}
          {isPizza && (
            <div>
              <p className="text-sm font-medium mb-2">Tamanho:</p>
              <div className="grid grid-cols-2 gap-2">
                {PIZZA_SIZES.map((size) => (
                  <button
                    key={size.key}
                    onClick={() => {
                      setSelectedSize(size.key);
                      setSelectedFlavors([]);
                    }}
                    className={cn(
                      'rounded-lg border p-2 text-sm font-medium transition-colors text-center',
                      selectedSize === size.key
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card hover:bg-muted'
                    )}
                  >
                    {size.label}
                    <span className="block text-xs opacity-70">até {size.maxFlavors} sabores</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Multi-flavor Selection */}
          {isPizza && selectedSize && siblingProducts && siblingProducts.length > 1 && (
            <div>
              <p className="text-sm font-medium mb-2">
                Sabores (escolha até {maxFlavors}):
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {siblingProducts.map((sp) => {
                  const isSelected = selectedFlavors.includes(sp.name);
                  return (
                    <button
                      key={sp.id}
                      onClick={() => toggleFlavor(sp.name)}
                      className={cn(
                        'w-full flex items-center gap-2 rounded-lg border p-2 text-sm transition-colors text-left',
                        isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                      )}
                    >
                      <div className={cn(
                        'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0',
                        isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      {sp.name}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedFlavors.length}/{maxFlavors} selecionados (opcional)
              </p>
            </div>
          )}

          {product.ingredients && product.ingredients.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Remover ingredientes:</p>
              <div className="grid grid-cols-2 gap-2">
                {product.ingredients.map((ing) => (
                  <label key={ing} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={removedIngredients.includes(ing)}
                      onCheckedChange={() => toggleIngredient(ing)}
                    />
                    <span className={removedIngredients.includes(ing) ? 'line-through text-muted-foreground' : ''}>
                      {ing}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <Textarea
            placeholder="Observações (ex: borda recheada, bem passado...)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={200}
            className="resize-none"
          />

          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-xl font-bold w-8 text-center">{quantity}</span>
            <Button variant="outline" size="icon" onClick={() => setQuantity(quantity + 1)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <DialogFooter>
            <Button
              onClick={handleAdd}
              className="w-full text-base py-5"
              disabled={isPizza && !selectedSize}
            >
              {isPizza && !selectedSize
                ? 'Selecione um tamanho'
                : `Adicionar ${formatPrice(product.price * quantity)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
