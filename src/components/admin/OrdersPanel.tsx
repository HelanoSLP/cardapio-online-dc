import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

type Order = Tables<'orders'>;
type OrderItem = Tables<'order_items'>;

const statusLabels: Record<string, { label: string; color: string }> = {
  received: { label: '🟡 Recebido', color: 'bg-yellow-100 text-yellow-800' },
  preparing: { label: '🟠 Em Preparo', color: 'bg-orange-100 text-orange-800' },
  out_for_delivery: { label: '🔵 Saiu p/ Entrega', color: 'bg-blue-100 text-blue-800' },
  delivered: { label: '🟢 Entregue', color: 'bg-green-100 text-green-800' },
};

const paymentLabels: Record<string, string> = {
  cash: '💵 Dinheiro',
  card_debit: '💳 Débito',
  card_credit: '💳 Crédito',
  pix: '📱 Pix',
};

const maskWhatsApp = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  return digits.slice(0, 2) + '****' + digits.slice(-4);
};

const escHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const sendWhatsApp = async (phone: string, message: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: { phone, message },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Failed');
    return true;
  } catch (err) {
    console.error('WhatsApp send error:', err);
    return false;
  }
};

export function OrdersPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [filter, setFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  const formatDate = (date: string) =>
    new Date(date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  const formatDateLabel = (date: Date) =>
    date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });

  const isToday = useMemo(() => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  }, [selectedDate]);

  const fetchOrders = async () => {
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);

    let query = supabase
      .from('orders')
      .select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter as any);
    }
    if (paymentFilter !== 'all') {
      query = query.eq('payment_method', paymentFilter as any);
    }

    const { data } = await query;
    if (data) {
      setOrders(data);
      const ids = data.map((o) => o.id);
      if (ids.length > 0) {
        const { data: items } = await supabase.from('order_items').select('*').in('order_id', ids);
        if (items) {
          const grouped: Record<string, OrderItem[]> = {};
          items.forEach((item) => {
            if (!grouped[item.order_id]) grouped[item.order_id] = [];
            grouped[item.order_id].push(item);
          });
          setOrderItems(grouped);
        }
      } else {
        setOrderItems({});
      }
    }
  };

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGY/Oj+Yx+mxYjU3R5e/4LNfOj1Ik7/drV08RFiPv+CsYEBDVJW+3KtiQz5DV5K73KVfPz1EWpG+2qJdOjxCX5e716FeNzdBaZ633KxeNjdAaJ+43axfNjZBaZ+43a5hOjlEap+43K1fNjhDap+43K1fNjhDap+43K1fNjhDap+43K1fNjhD');
          audio.play().catch(() => {});
        } catch {}
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [filter, paymentFilter, selectedDate]);

  const getWhatsAppMessage = (order: Order, status: string): string => {
    const statusMessages: Record<string, string> = {
      received: `✅ Olá ${order.customer_name}! Seu pedido foi recebido com sucesso! Em breve começaremos a preparar. 😊`,
      preparing: `👨‍🍳 Olá ${order.customer_name}! Seu pedido já está sendo preparado! 🍕`,
      out_for_delivery: `🛵 Olá ${order.customer_name}! Seu pedido saiu para entrega! Aguarde em breve! 📦`,
      delivered: `🎉 Olá ${order.customer_name}! Seu pedido foi entregue! Bom apetite! 😋🍕`,
    };
    return statusMessages[status] || '';
  };

  const updateStatus = async (orderId: string, status: string) => {
    const order = orders.find((o) => o.id === orderId);

    const { error } = await supabase
      .from('orders')
      .update({ status: status as any })
      .eq('id', orderId);

    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      toast.success('Status atualizado');
      fetchOrders();

      if (order) {
        const msg = getWhatsAppMessage(order, status);
        if (msg) {
          const sent = await sendWhatsApp(order.customer_whatsapp, msg);
          if (sent) {
            toast.success('Notificação WhatsApp enviada ao cliente');
          } else {
            toast.error('Erro ao enviar WhatsApp. Verifique as credenciais Z-API.');
          }
        }
      }
    }
  };

  const handlePrint = (order: Order) => {
    const items = orderItems[order.id] || [];
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html><head><title>Pedido</title>
      <style>
        body { font-family: monospace; font-size: 12px; width: 280px; margin: 0 auto; padding: 10px; }
        h1 { font-size: 16px; text-align: center; margin: 5px 0; }
        hr { border: 1px dashed #000; }
        .item { display: flex; justify-content: space-between; margin: 3px 0; }
        .total { font-size: 14px; font-weight: bold; }
        .notes { font-style: italic; font-size: 11px; margin-left: 10px; }
      </style></head><body>
      <h1>😋 Delícias Caseiras</h1>
      <p style="text-align:center">${escHtml(formatDate(order.created_at))}</p>
      <hr/>
      <p><b>Cliente:</b> ${escHtml(order.customer_name)}</p>
      <p><b>Endereço:</b> ${escHtml(order.address_street)}, ${escHtml(order.address_number)} - ${escHtml(order.address_neighborhood)}</p>
      ${order.address_reference ? `<p><b>Ref:</b> ${escHtml(order.address_reference)}</p>` : ''}
      <hr/>
      ${items.map((i) => `
        <div class="item"><span>${i.quantity}x ${escHtml(i.product_name)}</span><span>${formatPrice(i.unit_price * i.quantity)}</span></div>
        ${i.notes ? `<div class="notes">${escHtml(i.notes)}</div>` : ''}
      `).join('')}
      <hr/>
      <div class="item total"><span>TOTAL</span><span>${formatPrice(order.total)}</span></div>
      <p><b>Pagamento:</b> ${escHtml(paymentLabels[order.payment_method])}</p>
      ${order.change_for ? `<p><b>Troco para:</b> ${formatPrice(order.change_for)}</p>` : ''}
      ${order.notes ? `<p><b>Obs:</b> ${escHtml(order.notes)}</p>` : ''}
      <hr/>
      <p style="text-align:center">Obrigado pela preferência!</p>
      <script>window.print();window.close();</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  // Payment method summaries
  const paymentSummaries = useMemo(() => {
    const methods = ['pix', 'cash', 'card_debit', 'card_credit'] as const;
    return methods.map((m) => {
      const filtered = orders.filter((o) => o.payment_method === m);
      return {
        method: m,
        label: paymentLabels[m],
        count: filtered.length,
        total: filtered.reduce((s, o) => s + Number(o.total), 0),
      };
    });
  }, [orders]);

  const dayTotal = orders.reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <div className="space-y-4 mt-4">
      {/* Date picker */}
      <div className="flex items-center gap-3 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn('justify-start text-left font-normal', !selectedDate && 'text-muted-foreground')}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {isToday ? 'Hoje' : formatDateLabel(selectedDate)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {!isToday && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())}>Voltar p/ hoje</Button>
        )}
      </div>

      {/* Summary cards by payment */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-primary">{formatPrice(dayTotal)}</p>
          <p className="text-xs text-muted-foreground">Total ({orders.length} pedidos)</p>
        </div>
        {paymentSummaries.map((ps) => (
          <div key={ps.method} className="rounded-xl border bg-card p-3 text-center">
            <p className="text-lg font-bold">{formatPrice(ps.total)}</p>
            <p className="text-xs text-muted-foreground">{ps.label} ({ps.count})</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar por status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="received">Recebido</SelectItem>
            <SelectItem value="preparing">Em Preparo</SelectItem>
            <SelectItem value="out_for_delivery">Saiu p/ Entrega</SelectItem>
            <SelectItem value="delivered">Entregue</SelectItem>
          </SelectContent>
        </Select>

        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar por pagamento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os pagamentos</SelectItem>
            <SelectItem value="pix">📱 Pix</SelectItem>
            <SelectItem value="cash">💵 Dinheiro</SelectItem>
            <SelectItem value="card_debit">💳 Débito</SelectItem>
            <SelectItem value="card_credit">💳 Crédito</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {orders.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhum pedido encontrado</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold">{order.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                </div>
                <Badge className={statusLabels[order.status]?.color}>
                  {statusLabels[order.status]?.label}
                </Badge>
              </div>

              <div className="text-sm space-y-1">
                <p><b>WhatsApp:</b> {maskWhatsApp(order.customer_whatsapp)}</p>
                <p><b>Endereço:</b> {order.address_street}, {order.address_number} - {order.address_neighborhood}</p>
                {order.address_reference && <p><b>Ref:</b> {order.address_reference}</p>}
              </div>

              {orderItems[order.id] && (
                <div className="text-sm border-t pt-2">
                  {orderItems[order.id].map((item) => (
                    <div key={item.id} className="flex justify-between py-0.5">
                      <span>{item.quantity}x {item.product_name} {item.notes ? <span className="text-muted-foreground text-xs">({item.notes})</span> : null}</span>
                      <span>{formatPrice(item.unit_price * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold pt-1 border-t mt-1">
                    <span>Total</span>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                  <p className="text-xs mt-1">{paymentLabels[order.payment_method]}
                    {order.change_for ? ` • Troco p/ ${formatPrice(order.change_for)}` : ''}
                  </p>
                  {order.notes && <p className="text-xs text-muted-foreground mt-1">Obs: {order.notes}</p>}
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <Select value={order.status} onValueChange={(v) => updateStatus(order.id, v)}>
                  <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="received">🟡 Recebido</SelectItem>
                    <SelectItem value="preparing">🟠 Em Preparo</SelectItem>
                    <SelectItem value="out_for_delivery">🔵 Saiu p/ Entrega</SelectItem>
                    <SelectItem value="delivered">🟢 Entregue</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => handlePrint(order)}>
                  <Printer className="h-3 w-3 mr-1" /> Imprimir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
