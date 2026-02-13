import { useState } from 'react';
import { Product } from '@/hooks/useMenu';
import { useCartStore } from '@/stores/cartStore';
import { Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [open, setOpen] = useState(false);
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((s) => s.addItem);

  const handleAdd = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      notes: notes.trim() || undefined,
      removedIngredients: removedIngredients.length > 0 ? removedIngredients : undefined,
    });
    toast.success(`${product.name} adicionado ao carrinho!`);
    setOpen(false);
    setRemovedIngredients([]);
    setNotes('');
    setQuantity(1);
  };

  const toggleIngredient = (ing: string) => {
    setRemovedIngredients((prev) =>
      prev.includes(ing) ? prev.filter((i) => i !== ing) : [...prev, ing]
    );
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
          <img
            src={product.image_url}
            alt={product.name}
            className="h-20 w-20 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-muted text-3xl shrink-0">
            🍽️
          </div>
        )}
        <div className="flex flex-col justify-between min-w-0 flex-1">
          <div>
            <h3 className="font-semibold text-card-foreground line-clamp-1">{product.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {product.description}
            </p>
          </div>
          <p className="font-bold text-primary text-lg">{formatPrice(product.price)}</p>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>{product.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{product.description}</p>
          <p className="font-bold text-primary text-xl">{formatPrice(product.price)}</p>

          {product.ingredients && product.ingredients.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Remover ingredientes:</p>
              <div className="grid grid-cols-2 gap-2">
                {product.ingredients.map((ing) => (
                  <label
                    key={ing}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
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
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-xl font-bold w-8 text-center">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <DialogFooter>
            <Button onClick={handleAdd} className="w-full text-base py-5">
              Adicionar {formatPrice(product.price * quantity)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
