import { useCartStore } from '@/stores/cartStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CartDrawer() {
  const { items, isOpen, setOpen, updateQuantity, removeItem, total } = useCartStore();
  const navigate = useNavigate();

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent side="bottom" className="max-h-[80vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Seu Carrinho</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Seu carrinho está vazio</p>
        ) : (
          <div className="space-y-3 overflow-y-auto max-h-[50vh] py-4">
            {items.map((item, idx) => (
              <div key={`${item.productId}-${idx}`} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  {item.removedIngredients && item.removedIngredients.length > 0 && (
                    <p className="text-xs text-destructive">Sem: {item.removedIngredients.join(', ')}</p>
                  )}
                  {item.extraIngredients && item.extraIngredients.length > 0 && (
                    <p className="text-xs text-green-600">+{item.extraIngredients.map(e => e.name).join(', ')}</p>
                  )}
                  {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                  <p className="text-sm font-bold text-primary mt-1">{formatPrice((item.price + (item.extraIngredients?.reduce((s, e) => s + e.price, 0) || 0)) * item.quantity)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-5 text-center text-sm font-medium">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => removeItem(item.productId)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <SheetFooter className="flex-col gap-2 pt-2">
            <div className="flex justify-between w-full text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">{formatPrice(total())}</span>
            </div>
            <Button
              className="w-full py-5 text-base"
              onClick={() => {
                setOpen(false);
                navigate('/checkout');
              }}
            >
              Finalizar Pedido
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
