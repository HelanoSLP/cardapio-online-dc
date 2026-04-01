import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ExtraIngredient {
  id: string;
  name: string;
  price: number;
  active: boolean;
  sort_order: number;
}

export function ExtraIngredientsPanel() {
  const [items, setItems] = useState<ExtraIngredient[]>([]);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<ExtraIngredient | null>(null);
  const [form, setForm] = useState({ name: '', price: '', active: true });

  const fetchData = async () => {
    const { data } = await supabase.from('extra_ingredients').select('*').order('sort_order');
    if (data) setItems(data as ExtraIngredient[]);
  };

  useEffect(() => { fetchData(); }, []);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', price: '', active: true });
    setDialog(true);
  };

  const openEdit = (item: ExtraIngredient) => {
    setEditing(item);
    setForm({ name: item.name, price: String(item.price), active: item.active });
    setDialog(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) { toast.error('Nome e preço são obrigatórios'); return; }
    const data: any = {
      name: form.name.trim(),
      price: parseFloat(form.price),
      active: form.active,
    };
    if (editing) {
      const { error } = await supabase.from('extra_ingredients').update(data).eq('id', editing.id);
      if (error) { toast.error('Erro ao atualizar'); return; }
      toast.success('Ingrediente atualizado');
    } else {
      data.sort_order = items.length;
      const { error } = await supabase.from('extra_ingredients').insert(data);
      if (error) { toast.error('Erro ao criar'); return; }
      toast.success('Ingrediente criado');
    }
    setDialog(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este ingrediente?')) return;
    const { error } = await supabase.from('extra_ingredients').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Ingrediente excluído');
    fetchData();
  };

  const toggleActive = async (item: ExtraIngredient) => {
    await supabase.from('extra_ingredients').update({ active: !item.active }).eq('id', item.id);
    fetchData();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold">Ingredientes Adicionais ({items.length})</h2>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo</Button>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className={`flex items-center gap-3 rounded-lg border p-3 ${!item.active ? 'opacity-50' : ''}`}>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{item.name}</p>
              <p className="text-xs text-muted-foreground">{formatPrice(item.price)}</p>
            </div>
            <Switch checked={item.active} onCheckedChange={() => toggleActive(item)} />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum ingrediente adicional cadastrado</p>}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Ingrediente' : 'Novo Ingrediente'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Bacon" maxLength={100} />
            </div>
            <div>
              <Label>Preço *</Label>
              <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="5.00" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} className="w-full">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
