import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@/stores/cartStore';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const checkoutSchema = z.object({
  name: z.string().trim().min(2, 'Nome é obrigatório').max(100),
  whatsapp: z.string().trim().min(10, 'WhatsApp inválido').max(20),
  street: z.string().trim().min(3, 'Rua é obrigatória').max(200),
  number: z.string().trim().min(1, 'Número é obrigatório').max(20),
  neighborhood: z.string().trim().min(2, 'Bairro é obrigatório').max(100),
  reference: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
  paymentMethod: z.enum(['cash', 'card_debit', 'card_credit', 'pix']),
  changeFor: z.string().optional(),
});

type PaymentMethod = 'cash' | 'card_debit' | 'card_credit' | 'pix';

const paymentLabels: Record<PaymentMethod, string> = {
  cash: '💵 Dinheiro',
  card_debit: '💳 Cartão Débito',
  card_credit: '💳 Cartão Crédito',
  pix: '📱 Pix',
};

export default function Checkout() {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: '',
    whatsapp: '',
    street: '',
    number: '',
    neighborhood: '',
    reference: '',
    notes: '',
    paymentMethod: 'pix' as PaymentMethod,
    changeFor: '',
  });

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">Seu carrinho está vazio</p>
        <Button onClick={() => navigate('/')}>Voltar ao cardápio</Button>
      </div>
    );
  }

  const handleSubmit = async () => {
    const result = checkoutSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const orderTotal = total();

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: form.name.trim(),
          customer_whatsapp: form.whatsapp.trim(),
          address_street: form.street.trim(),
          address_number: form.number.trim(),
          address_neighborhood: form.neighborhood.trim(),
          address_reference: form.reference.trim() || null,
          notes: form.notes.trim() || null,
          payment_method: form.paymentMethod,
          change_for: form.paymentMethod === 'cash' && form.changeFor ? parseFloat(form.changeFor) : null,
          total: orderTotal,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        notes: [
          item.removedIngredients?.length ? `Sem: ${item.removedIngredients.join(', ')}` : '',
          item.notes || '',
        ].filter(Boolean).join(' | ') || null,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      // Build WhatsApp message
      const itemsText = items
        .map((i) => {
          let line = `• ${i.quantity}x ${i.name} - ${formatPrice(i.price * i.quantity)}`;
          if (i.removedIngredients?.length) line += `\n  _Sem: ${i.removedIngredients.join(', ')}_`;
          if (i.notes) line += `\n  _Obs: ${i.notes}_`;
          return line;
        })
        .join('\n');

      const msg = encodeURIComponent(
        `🍕 *NOVO PEDIDO #${order.order_number}*\n\n` +
        `👤 *Cliente:* ${form.name}\n` +
        `📱 *WhatsApp:* ${form.whatsapp}\n\n` +
        `📍 *Endereço:*\n${form.street}, ${form.number} - ${form.neighborhood}\n` +
        (form.reference ? `📌 *Ref:* ${form.reference}\n` : '') +
        `\n🛒 *Itens:*\n${itemsText}\n\n` +
        `💰 *Total: ${formatPrice(orderTotal)}*\n` +
        `💳 *Pagamento:* ${paymentLabels[form.paymentMethod]}` +
        (form.paymentMethod === 'cash' && form.changeFor ? `\n💵 *Troco para:* ${formatPrice(parseFloat(form.changeFor))}` : '') +
        (form.notes ? `\n\n📝 *Obs:* ${form.notes}` : '')
      );

      // Open WhatsApp with the formatted message
      // Replace with the pizzaria's WhatsApp number
      window.open(`https://wa.me/5500000000000?text=${msg}`, '_blank');

      clearCart();
      toast.success('Pedido realizado com sucesso!');
      navigate('/pedido-confirmado');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao realizar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg">Finalizar Pedido</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-4 space-y-6 pb-32">
        {/* Order summary */}
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-base font-bold mb-3">Resumo do Pedido</h2>
          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm py-1">
              <span>{item.quantity}x {item.name}</span>
              <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold text-lg mt-3 pt-3 border-t">
            <span>Total</span>
            <span className="text-primary">{formatPrice(total())}</span>
          </div>
        </section>

        {/* Customer info */}
        <section className="space-y-4">
          <h2 className="text-base font-bold">Seus Dados</h2>
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Seu nome" maxLength={100} />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>
          <div>
            <Label htmlFor="whatsapp">WhatsApp *</Label>
            <Input id="whatsapp" value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} placeholder="(00) 00000-0000" maxLength={20} />
            {errors.whatsapp && <p className="text-xs text-destructive mt-1">{errors.whatsapp}</p>}
          </div>
        </section>

        {/* Address */}
        <section className="space-y-4">
          <h2 className="text-base font-bold">Endereço de Entrega</h2>
          <div>
            <Label htmlFor="street">Rua *</Label>
            <Input id="street" value={form.street} onChange={(e) => update('street', e.target.value)} placeholder="Nome da rua" maxLength={200} />
            {errors.street && <p className="text-xs text-destructive mt-1">{errors.street}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="number">Número *</Label>
              <Input id="number" value={form.number} onChange={(e) => update('number', e.target.value)} placeholder="Nº" maxLength={20} />
              {errors.number && <p className="text-xs text-destructive mt-1">{errors.number}</p>}
            </div>
            <div>
              <Label htmlFor="neighborhood">Bairro *</Label>
              <Input id="neighborhood" value={form.neighborhood} onChange={(e) => update('neighborhood', e.target.value)} placeholder="Bairro" maxLength={100} />
              {errors.neighborhood && <p className="text-xs text-destructive mt-1">{errors.neighborhood}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="reference">Ponto de Referência</Label>
            <Input id="reference" value={form.reference} onChange={(e) => update('reference', e.target.value)} placeholder="Próximo ao..." maxLength={200} />
          </div>
        </section>

        {/* Payment */}
        <section className="space-y-4">
          <h2 className="text-base font-bold">Forma de Pagamento</h2>
          <RadioGroup value={form.paymentMethod} onValueChange={(v) => update('paymentMethod', v)}>
            {(Object.entries(paymentLabels) as [PaymentMethod, string][]).map(([value, label]) => (
              <label key={value} className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value={value} />
                <span className="text-sm font-medium">{label}</span>
              </label>
            ))}
          </RadioGroup>
          {form.paymentMethod === 'cash' && (
            <div>
              <Label htmlFor="changeFor">Troco para quanto?</Label>
              <Input id="changeFor" type="number" value={form.changeFor} onChange={(e) => update('changeFor', e.target.value)} placeholder="Ex: 50.00" />
            </div>
          )}
        </section>

        {/* Notes */}
        <section>
          <Label htmlFor="notes">Observações do Pedido</Label>
          <Textarea id="notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Alguma observação geral?" maxLength={500} className="resize-none" />
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t p-4">
        <div className="mx-auto max-w-lg">
          <Button className="w-full py-5 text-base" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Enviando...' : `Confirmar Pedido - ${formatPrice(total())}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
