import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/stores/cartStore';

export function CartFloatingButton() {
  const itemCount = useCartStore((s) => s.itemCount());
  const total = useCartStore((s) => s.total());
  const toggleCart = useCartStore((s) => s.toggleCart);

  if (itemCount === 0) return null;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  return (
    <button
      onClick={toggleCart}
      className="no-print fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full bg-primary px-6 py-3 text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
    >
      <ShoppingCart className="h-5 w-5" />
      <span className="font-semibold">{itemCount} {itemCount === 1 ? 'item' : 'itens'}</span>
      <span className="border-l border-primary-foreground/30 pl-3 font-bold">
        {formatPrice(total)}
      </span>
    </button>
  );
}
