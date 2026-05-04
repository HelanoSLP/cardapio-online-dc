import { useState, useMemo } from 'react';
import { Product, Category, isPizzaCategory, isComboCategory, detectPizzaSizeFromName, getPizzaCategoryIds, PIZZA_SIZES, PizzaSize } from '@/hooks/useMenu';
import { useCartStore, ExtraIngredientItem } from '@/stores/cartStore';
import { Plus, Minus, Check, Heart, ShoppingBag } from 'lucide-react';
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
  isFavorite?: boolean;
  onToggleFavorite?: (productId: string) => void;
}

export function ProductCard({ product, categories, isFavorite, onToggleFavorite }: ProductCardProps) {
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

  const smallestPizzaPrice = useMemo(() => {
    if (!pizzaPrices) return null;
    const prices = Object.values(pizzaPrices).filter((p) => p > 0);
    return prices.length > 0 ? Math.min(...prices) : null;
  }, [pizzaPrices]);

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

  const handleOpen = () => {
    setOpen(true);
    if (isPizza) {
      setSelectedFlavors([product.name]);
    }
  };

  const sizePrice = effectiveSize && pizzaPrices && pizzaPrices[effectiveSize]
    ? pizzaPrices[effectiveSize]
    : null;
  const activePrice = sizePrice ?? displayPrice;

  const extrasTotal = addedExtras.reduce((s, e) => s + e.price, 0);
  const itemTotal = (activePrice + extrasTotal) * quantity;

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
      price: activePrice,
      quantity,
      notes: notes.trim() || undefined,
      extraIngredients: addedExtras.length > 0 ? addedExtras : undefined,
    });
    toast.success(`${product.name} adicionado ao carrinho!`);
    resetAndClose();
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    // For pizzas/combos with size selection, open dialog instead
    if (isPizza || comboNeedsSizeSelection) {
      handleOpen();
      return;
    }
    addItem({
      productId: product.id,
      name: product.name,
      price: displayPrice,
      quantity: 1,
    });
    toast.success(`${product.name} adicionado ao carrinho!`);
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
        className="group relative flex gap-3 rounded-2xl border border-border/60 bg-card p-4 text-left transition-all duration-200 hover:shadow-card-hover shadow-card"
      >
        {/* Badges */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
          {hasPromo && (
            <span className="bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              🔥 Promoção
            </span>
          )}
          {cashbackActive && (
            <span className="bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              💰 Cashback {cashbackPercent}%
            </span>
          )}
        </div>

        {/* Favorite button */}
        {onToggleFavorite && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(product.id); }}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-card/80 backdrop-blur-sm shadow-sm hover:scale-110 transition-transform"
          >
            <Heart className={cn('h-4 w-4 transition-colors', isFavorite ? 'fill-destructive text-destructive' : 'text-muted-foreground')} />
          </button>
        )}

        {/* Image */}
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-24 w-24 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-muted text-3xl shrink-0">🍽️</div>
        )}

        {/* Content */}
        <div className="flex flex-col justify-between min-w-0 flex-1 py-0.5">
          <div>
            <h3 className="font-bold text-base text-card-foreground leading-tight break-words">{product.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{product.description}</p>
          </div>
          <div className="flex items-end justify-between mt-2">
            <div className="flex items-center gap-2">
              {isPizza && smallestPizzaPrice ? (
                <span className="font-extrabold text-primary text-xl leading-none">
                  {formatPrice(smallestPizzaPrice)}
                </span>
              ) : hasPromo ? (
                <>
                  <span className="text-xs text-muted-foreground line-through">{formatPrice(product.price)}</span>
                  <span className="font-extrabold text-xl text-accent leading-none">{formatPrice(promoPrice)}</span>
                </>
              ) : (
                <span className="font-extrabold text-primary text-xl leading-none">{formatPrice(product.price)}</span>
              )}
            </div>
            {/* Quick add button */}
            <button
              onClick={handleQuickAdd}
              className="flex items-center justify-center h-9 w-9 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-105 active:scale-95 transition-transform"
            >
              <Plus className="h-5 w-5" />
            </button>
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
          
          {isPizza && !selectedSize ? (
            <p className="text-sm text-muted-foreground italic">Selecione um tamanho para ver o preço</p>
          ) : isPizza && selectedSize ? (
            <div className="flex items-center gap-2">
              {hasPromo ? (
                <>
                  <span className="text-base text-muted-foreground line-through">{formatPrice(sizePrice ?? product.price)}</span>
                  <span className="font-bold text-xl text-accent">{formatPrice(promoPrice)}</span>
                  <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-semibold">PROMO</span>
                </>
              ) : (
                <p className="font-bold text-primary text-xl">{formatPrice(sizePrice ?? product.price)}</p>
              )}
            </div>
          ) : hasPromo ? (
            <div className="flex items-center gap-2">
              <span className="text-base text-muted-foreground line-through">{formatPrice(product.price)}</span>
              <span className="font-bold text-xl text-accent">{formatPrice(promoPrice)}</span>
              <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-semibold">PROMO</span>
            </div>
          ) : (
            <p className="font-bold text-primary text-xl">{formatPrice(product.price)}</p>
          )}

          {cashbackActive && (
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-2 text-center">
              <p className="text-sm font-semibold text-accent">💰 Cashback ativo: {cashbackPercent}%</p>
              <p className="text-xs text-accent/80">Ganhe {formatPrice(displayPrice * cashbackPercent / 100)} de volta!</p>
            </div>
          )}

          {showSizeSelector && (
            <div>
              <p className="text-sm font-medium mb-2">Tamanho:</p>
              <div className="grid grid-cols-2 gap-2">
                {PIZZA_SIZES.map((size) => {
                  const sPrice = pizzaPrices && pizzaPrices[size.key] ? pizzaPrices[size.key] : null;
                  return (
                    <button
                      key={size.key}
                      onClick={() => {
                        setSelectedSize(size.key);
                        if (isPizza) {
                          setSelectedFlavors([product.name]);
                        } else {
                          setSelectedFlavors([]);
                        }
                      }}
                      className={cn(
                        'rounded-xl border p-2 text-sm font-medium transition-colors text-center',
                        selectedSize === size.key
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card hover:bg-muted'
                      )}
                    >
                      {size.label}
                      {sPrice != null && (
                        <span className="block text-xs font-bold">{formatPrice(sPrice)}</span>
                      )}
                      <span className="block text-xs opacity-70">até {size.maxFlavors} sabores</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {comboHasPizza && !comboNeedsSizeSelection && (
            <div className="rounded-lg bg-accent/20 p-3">
              <p className="text-sm font-medium">
                🍕 Pizza {PIZZA_SIZES.find((s) => s.key === comboDetectedSize)?.label} — até {maxFlavors} sabores
              </p>
            </div>
          )}

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
                        'w-full flex items-center gap-2 rounded-xl border p-2 text-sm transition-colors text-left',
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

          {extraIngredients && extraIngredients.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Adicionar ingredientes:</p>
              <div className="grid grid-cols-1 gap-1.5">
                {extraIngredients.map((extra) => {
                  const isAdded = addedExtras.some((e) => e.name === extra.name);
                  return (
                    <label key={extra.id} className="flex items-center justify-between gap-2 text-sm cursor-pointer rounded-xl border p-2 hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isAdded}
                          onCheckedChange={() => toggleExtra(extra)}
                        />
                        <span>{extra.name}</span>
                      </div>
                      <span className="text-xs font-medium text-accent">+{formatPrice(extra.price)}</span>
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