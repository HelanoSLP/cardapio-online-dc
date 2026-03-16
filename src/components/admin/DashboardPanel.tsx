import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';

type Order = Tables<'orders'>;

const paymentLabels: Record<string, string> = {
  cash: '💵 Dinheiro',
  card_debit: '💳 Débito',
  card_credit: '💳 Crédito',
  pix: '📱 Pix',
};

export function DashboardPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

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

    const { data } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false });

    if (data) setOrders(data);
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedDate]);

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

  const statusCounts = useMemo(() => {
    const counts = { received: 0, preparing: 0, out_for_delivery: 0, delivered: 0 };
    orders.forEach((o) => { if (counts[o.status as keyof typeof counts] !== undefined) counts[o.status as keyof typeof counts]++; });
    return counts;
  }, [orders]);

  return (
    <div className="space-y-4">
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
              locale={ptBR}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {!isToday && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())}>Voltar p/ hoje</Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl border bg-card p-3 text-center col-span-2 sm:col-span-1">
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

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-yellow-50 p-3 text-center">
          <p className="text-2xl font-bold text-yellow-700">{statusCounts.received}</p>
          <p className="text-xs text-yellow-600">🟡 Recebidos</p>
        </div>
        <div className="rounded-xl border bg-orange-50 p-3 text-center">
          <p className="text-2xl font-bold text-orange-700">{statusCounts.preparing}</p>
          <p className="text-xs text-orange-600">🟠 Em Preparo</p>
        </div>
        <div className="rounded-xl border bg-blue-50 p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{statusCounts.out_for_delivery}</p>
          <p className="text-xs text-blue-600">🔵 Saiu p/ Entrega</p>
        </div>
        <div className="rounded-xl border bg-green-50 p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{statusCounts.delivered}</p>
          <p className="text-xs text-green-600">🟢 Entregues</p>
        </div>
      </div>
    </div>
  );
}
