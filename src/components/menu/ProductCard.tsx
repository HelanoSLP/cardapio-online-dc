import { useState, useMemo } from 'react';
import { Product, Category, isPizzaCategory, isComboCategory, detectPizzaSizeFromName, getPizzaCategoryIds, PIZZA_SIZES, PizzaSize } from '@/hooks/useMenu';
import { useCartStore, ExtraIngredientItem } from '@/stores/cartStore';
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
  const [addedExtras, setAddedExtras] = useState<ExtraIngredientItem[]>([]);
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<PizzaSize | null>(null);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const addItem = useCartStore((s) => s.addItem);

  const promoPrice = (product as any).promo_price as number | null;
  const hasPromo = promoPrice != null && promoPrice > 0;
  const cashbackActive = (product as any).cashback_active as boolean;
  const cashbackPercent = (product as any).cashback_percent as number;
  const pizzaPrices = (product as any).pizza_prices as Record<string, number> | null;
  const displayPrice = hasPromo ? promoPrice : product.price;

  const isPizza = useMemo(
    () => isPizzaCategory(categories, product.category_id),
    [categories, product.category_id]
  );

  const isCombo = useMemo(
    () => isComboCategory(categories, product.category_id),
    [categories, product.category_id]
  );

  const comboDetectedSize = useMemo(() => {
    if (!isCombo) return null;
    return detectPizzaSizeFromName(product.name);
  }, [isCombo, product.name]);

  const comboMentionsPizza = useMemo(() => {
    if (!isCombo) return false;
    return product.name.toLowerCase().includes('pizza');
  }, [isCombo, product.name]);

  const comboHasPizza = isCombo && (comboDetectedSize !== null || comboMentionsPizza);
  const comboNeedsSizeSelection = comboHasPizza && comboDetectedSize === null;

  const effectiveSize = isPizza
    ? selectedSize
    : comboNeedsSizeSelection
      ? selectedSize
      : comboDetectedSize;

  const maxFlavors = effectiveSize
    ? PIZZA_SIZES.find((s) => s.key === effectiveSize)?.maxFlavors || 1
    : 1;

  const pizzaCategoryIds = useMemo(
    () => getPizzaCategoryIds(categories),
    [categories]
  );

  const flavorCategoryIds = isPizza ? [product.category_id] : pizzaCategoryIds;
  const { data: flavorProducts } = useQuery({
    queryKey: ['flavor-products', flavorCategoryIds],
    queryFn: async () => {
      if (flavorCategoryIds.length === 0) return [];
      const { data } = await supabase
        .from('products')
        .select('id, name, ingredients')
        .in('category_id', flavorCategoryIds)
        .eq('active', true)
        .order('sort_order');
      return data || [];
    },
    enabled: (isPizza || comboHasPizza) && open,
  });

  const { data: extraIngredients } = useQuery({
    queryKey: ['extra-ingredients'],
    queryFn: async () => {
      const { data } = await supabase
        .from('extra_ingredients')
        .select('*')
        .eq('active', true)
        .order('sort_order');
      return (data || []) as { id: string; name: string; price: number }[];
    },
    enabled: open,
  });

  const showSizeSelector = isPizza || comboNeedsSizeSelection;
  const showFlavorSelector = ((isPizza || comboHasPizza) && effectiveSize && flavorProducts && flavorProducts.length > 1);

  // Pre-select current product flavor when opening
  const handleOpen = () => {
    setOpen(true);
    // For pizzas, pre-select the current product as a flavor
    if (isPizza) {
      setSelectedFlavors([product.name]);
    }
  };

  const extrasTotal = addedExtras.reduce((s, e) => s + e.price, 0);
  const itemTotal = (displayPrice + extrasTotal) * quantity;

  const handleAdd = () => {
    const flavorNames = selectedFlavors.length > 1
      ? selectedFlavors.join(' / ')
      : selectedFlavors.length === 1
        ? selectedFlavors[0]
        : undefined;
    const sizeLabel = effectiveSize
      ? PIZZA_SIZES.find((s) => s.key === effectiveSize)?.label
      : undefined;

    const displayName = [
      product.name,
      (isPizza || comboNeedsSizeSelection) && sizeLabel ? `(${sizeLabel})` : '',
      flavorNames && selectedFlavors.length > 1 ? `- ${flavorNames}` : '',
    ].filter(Boolean).join(' ');

    addItem({
      productId: product.id,
      name: displayName,
      price: displayPrice,
      quantity,
      notes: notes.trim() || undefined,
      extraIngredients: addedExtras.length > 0 ? addedExtras : undefined,
    });
    toast.success(`${product.name} adicionado ao carrinho!`);
    resetAndClose();
  };

  const resetAndClose = () => {
    setOpen(false);
    setAddedExtras([]);
    setNotes('');
    setQuantity(1);
    setSelectedSize(null);
    setSelectedFlavors([]);
  };

  const toggleExtra = (extra: { name: string; price: number }) => {
    setAddedExtras((prev) => {
      const exists = prev.find((e) => e.name === extra.name);
      if (exists) return prev.filter((e) => e.name !== extra.name);
      return [...prev, { name: extra.name, price: extra.price }];
    });
  };

  const toggleFlavor = (name: string) => {
    // Don't allow deselecting the original product flavor
    if (isPizza && name === product.name) return;
    
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

  const canAdd = (isPizza || comboNeedsSizeSelection) ? !!selectedSize : true;

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex gap-3 rounded-xl border bg-card p-3 text-left transition-shadow hover:shadow-md relative"
      >
        {/* Cashback badge */}
        {cashbackActive && (
          <div className="absolute top-0 left-0 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-tl-xl rounded-br-xl z-10">
            💰 Cashback {cashbackPercent}%
          </div>
        )}
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
          <div className="flex items-center gap-2">
            {hasPromo ? (
              <>
                <span className="text-sm text-muted-foreground line-through">{formatPrice(product.price)}</span>
                <span className="font-bold text-lg text-green-600">{formatPrice(promoPrice)}</span>
              </>
            ) : (
              <p className="font-bold text-primary text-lg">{formatPrice(product.price)}</p>
            )}
          </div>
        </div>
      </button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); else handleOpen(); }}>
        <DialogContent className="max-w-sm mx-auto max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{product.name}</DialogTitle>
          </DialogHeader>
          {product.image_url && (
            <img src={product.image_url} alt={product.name} className="w-full h-40 object-cover rounded-lg" />
          )}
          <p className="text-sm text-muted-foreground">{product.description}</p>
          
          {hasPromo ? (
            <div className="flex items-center gap-2">
              <span className="text-base text-muted-foreground line-through">{formatPrice(product.price)}</span>
              <span className="font-bold text-xl text-green-600">{formatPrice(promoPrice)}</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">PROMO</span>
            </div>
          ) : (
            <p className="font-bold text-primary text-xl">{formatPrice(product.price)}</p>
          )}

          {cashbackActive && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
              <p className="text-sm font-semibold text-green-700">💰 Cashback ativo: {cashbackPercent}%</p>
              <p className="text-xs text-green-600">Ganhe {formatPrice(displayPrice * cashbackPercent / 100)} de volta!</p>
            </div>
          )}

          {/* Pizza/Combo Size Selection */}
          {showSizeSelector && (
            <div>
              <p className="text-sm font-medium mb-2">Tamanho:</p>
              <div className="grid grid-cols-2 gap-2">
                {PIZZA_SIZES.map((size) => (
                  <button
                    key={size.key}
                    onClick={() => {
                      setSelectedSize(size.key);
                      // Keep the original flavor selected, reset others
                      if (isPizza) {
                        setSelectedFlavors([product.name]);
                      } else {
                        setSelectedFlavors([]);
                      }
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

          {/* Combo pizza info (when size is auto-detected) */}
          {comboHasPizza && !comboNeedsSizeSelection && (
            <div className="rounded-lg bg-accent/30 p-3">
              <p className="text-sm font-medium">
                🍕 Pizza {PIZZA_SIZES.find((s) => s.key === comboDetectedSize)?.label} — até {maxFlavors} sabores
              </p>
            </div>
          )}

          {/* Multi-flavor Selection */}
          {showFlavorSelector && (
            <div>
              <p className="text-sm font-medium mb-2">
                Sabores (escolha até {maxFlavors}):
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {flavorProducts!.map((sp) => {
                  const isSelected = selectedFlavors.includes(sp.name);
                  const isOriginal = isPizza && sp.name === product.name;
                  return (
                    <button
                      key={sp.id}
                      onClick={() => toggleFlavor(sp.name)}
                      disabled={isOriginal}
                      className={cn(
                        'w-full flex items-center gap-2 rounded-lg border p-2 text-sm transition-colors text-left',
                        isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted',
                        isOriginal ? 'opacity-80 cursor-default' : ''
                      )}
                    >
                      <div className={cn(
                        'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0',
                        isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      {sp.name}
                      {isOriginal && <span className="text-xs text-muted-foreground ml-auto">(selecionado)</span>}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedFlavors.length}/{maxFlavors} selecionados
              </p>
            </div>
          )}

          {/* Extra ingredients */}
          {extraIngredients && extraIngredients.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Adicionar ingredientes:</p>
              <div className="grid grid-cols-1 gap-1.5">
                {extraIngredients.map((extra) => {
                  const isAdded = addedExtras.some((e) => e.name === extra.name);
                  return (
                    <label key={extra.id} className="flex items-center justify-between gap-2 text-sm cursor-pointer rounded-lg border p-2 hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isAdded}
                          onCheckedChange={() => toggleExtra(extra)}
                        />
                        <span>{extra.name}</span>
                      </div>
                      <span className="text-xs font-medium text-green-600">+{formatPrice(extra.price)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <Textarea
            placeholder="Observações (ex: sem cebola, borda recheada, bem passado...)"
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
              disabled={!canAdd}
            >
              {!canAdd
                ? 'Selecione um tamanho'
                : `Adicionar ${formatPrice(itemTotal)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
