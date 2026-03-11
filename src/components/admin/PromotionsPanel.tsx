import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, ImagePlus, X, Tag, Image } from 'lucide-react';
import { toast } from 'sonner';

interface Promotion {
  id: string;
  type: string;
  title: string;
  product_id: string | null;
  discount_type: string | null;
  discount_value: number | null;
  banner_image_url: string | null;
  banner_text: string | null;
  active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

export function PromotionsPanel() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    type: 'product_discount',
    title: '',
    product_id: '',
    discount_type: 'percentage',
    discount_value: '',
    banner_text: '',
    active: true,
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [{ data: promos }, { data: prods }] = await Promise.all([
      supabase.from('promotions').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('id, name, price').eq('active', true).order('name'),
    ]);
    if (promos) setPromotions(promos as Promotion[]);
    if (prods) setProducts(prods);
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  const openNew = (type: string) => {
    setEditing(null);
    setForm({ type, title: '', product_id: '', discount_type: 'percentage', discount_value: '', banner_text: '', active: true });
    setBannerFile(null);
    setBannerPreview(null);
    setDialog(true);
  };

  const openEdit = (p: Promotion) => {
    setEditing(p);
    setForm({
      type: p.type,
      title: p.title,
      product_id: p.product_id || '',
      discount_type: p.discount_type || 'percentage',
      discount_value: String(p.discount_value || ''),
      banner_text: p.banner_text || '',
      active: p.active,
    });
    setBannerFile(null);
    setBannerPreview(p.banner_image_url || null);
    setDialog(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Máximo 2MB'); return; }
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const uploadBanner = async (promoId: string): Promise<string | null> => {
    if (!bannerFile) return editing?.banner_image_url || null;
    const ext = bannerFile.name.split('.').pop();
    const path = `promotions/${promoId}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(path, bannerFile, { upsert: true });
    if (error) { toast.error('Erro ao enviar imagem'); return null; }
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);
    return `${publicUrl}?t=${Date.now()}`;
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Título é obrigatório'); return; }

    const data: any = {
      type: form.type,
      title: form.title.trim(),
      product_id: form.type === 'product_discount' && form.product_id ? form.product_id : null,
      discount_type: form.type === 'product_discount' ? form.discount_type : null,
      discount_value: form.type === 'product_discount' && form.discount_value ? parseFloat(form.discount_value) : null,
      banner_text: form.type === 'banner' ? form.banner_text.trim() || null : null,
      active: form.active,
    };

    if (editing) {
      if (bannerFile) data.banner_image_url = await uploadBanner(editing.id);
      const { error } = await supabase.from('promotions').update(data).eq('id', editing.id);
      if (error) { toast.error('Erro ao atualizar'); return; }
      toast.success('Promoção atualizada');
    } else {
      const { data: newPromo, error } = await supabase.from('promotions').insert(data).select('id').single();
      if (error || !newPromo) { toast.error('Erro ao criar'); return; }
      if (bannerFile) {
        const url = await uploadBanner(newPromo.id);
        if (url) await supabase.from('promotions').update({ banner_image_url: url }).eq('id', newPromo.id);
      }
      toast.success('Promoção criada');
    }
    setDialog(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta promoção?')) return;
    const { error } = await supabase.from('promotions').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Promoção excluída');
    fetchData();
  };

  const toggleActive = async (p: Promotion) => {
    await supabase.from('promotions').update({ active: !p.active }).eq('id', p.id);
    fetchData();
  };

  const discountPromos = promotions.filter((p) => p.type === 'product_discount');
  const bannerPromos = promotions.filter((p) => p.type === 'banner');

  return (
    <div className="space-y-4 mt-4">
      <Tabs defaultValue="discounts">
        <TabsList className="w-full">
          <TabsTrigger value="discounts" className="flex-1">🏷️ Descontos</TabsTrigger>
          <TabsTrigger value="banners" className="flex-1">🖼️ Banners</TabsTrigger>
        </TabsList>

        <TabsContent value="discounts">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold">Descontos ({discountPromos.length})</h2>
            <Button size="sm" onClick={() => openNew('product_discount')}><Plus className="h-4 w-4 mr-1" /> Novo</Button>
          </div>
          <div className="space-y-2">
            {discountPromos.map((p) => (
              <div key={p.id} className={`flex items-center gap-3 rounded-lg border p-3 ${!p.active ? 'opacity-50' : ''}`}>
                <Tag className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.discount_type === 'percentage' ? `${p.discount_value}%` : formatPrice(p.discount_value || 0)} de desconto
                    {p.product_id && ` • ${products.find((pr) => pr.id === p.product_id)?.name || 'Produto'}`}
                  </p>
                </div>
                <Switch checked={p.active} onCheckedChange={() => toggleActive(p)} />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
            {discountPromos.length === 0 && <p className="text-center text-muted-foreground py-6">Nenhum desconto criado</p>}
          </div>
        </TabsContent>

        <TabsContent value="banners">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold">Banners ({bannerPromos.length})</h2>
            <Button size="sm" onClick={() => openNew('banner')}><Plus className="h-4 w-4 mr-1" /> Novo</Button>
          </div>
          <div className="space-y-2">
            {bannerPromos.map((p) => (
              <div key={p.id} className={`flex items-center gap-3 rounded-lg border p-3 ${!p.active ? 'opacity-50' : ''}`}>
                <Image className="h-5 w-5 text-secondary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{p.title}</p>
                  {p.banner_text && <p className="text-xs text-muted-foreground truncate">{p.banner_text}</p>}
                </div>
                <Switch checked={p.active} onCheckedChange={() => toggleActive(p)} />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
            {bannerPromos.length === 0 && <p className="text-center text-muted-foreground py-6">Nenhum banner criado</p>}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Nova'} {form.type === 'banner' ? 'Banner' : 'Promoção'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={100} placeholder="Ex: Pizza em dobro!" />
            </div>

            {form.type === 'product_discount' && (
              <>
                <div>
                  <Label>Produto (opcional - deixe vazio para desconto geral)</Label>
                  <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
                    <SelectContent>
                      {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} - {formatPrice(p.price)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo de desconto</Label>
                    <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                        <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Valor</Label>
                    <Input type="number" step="0.01" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} placeholder={form.discount_type === 'percentage' ? '10' : '5.00'} />
                  </div>
                </div>
              </>
            )}

            {form.type === 'banner' && (
              <>
                <div>
                  <Label>Texto do banner</Label>
                  <Input value={form.banner_text} onChange={(e) => setForm({ ...form, banner_text: e.target.value })} maxLength={200} placeholder="Ex: 🔥 Promoção de terça!" />
                </div>
                <div>
                  <Label>Imagem do banner</Label>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                  {bannerPreview ? (
                    <div className="relative mt-2">
                      <img src={bannerPreview} alt="Banner" className="w-full h-32 object-cover rounded-lg border" />
                      <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => { setBannerFile(null); setBannerPreview(null); }}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 w-full h-24 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors">
                      <ImagePlus className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Upload imagem</span>
                    </button>
                  )}
                </div>
              </>
            )}

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
