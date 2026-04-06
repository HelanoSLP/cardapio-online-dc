import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, ImagePlus, X, FolderTree, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { ExtraIngredientsPanel } from './ExtraIngredientsPanel';

type Category = Tables<'categories'> & { parent_id?: string | null };
type Product = Tables<'products'> & { cashback_active?: boolean; cashback_percent?: number };

export function MenuPanel() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Product dialog state
  const [productDialog, setProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: '', description: '', price: '', category_id: '', ingredients: '', active: true, image_url: null as string | null,
    hasPromo: false, promo_price: '',
    hasCashback: false, cashback_percent: '',
    pizza_prices: { small: '', medium: '', large: '', giant: '' } as Record<string, string>,
  });

  // Category dialog state
  const [catDialog, setCatDialog] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({
    name: '', slug: '', icon: '', sort_order: '0', active: true, parent_id: '' as string,
  });

  const fetchData = async () => {
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('products').select('*').order('sort_order'),
    ]);
    if (cats) setCategories(cats as Category[]);
    if (prods) setProducts(prods as Product[]);
  };

  useEffect(() => { fetchData(); }, []);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  // ── Category functions ──
  const parentCategories = categories.filter((c) => !c.parent_id);
  const getChildCategories = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  const openNewCat = () => {
    setEditingCat(null);
    setCatForm({ name: '', slug: '', icon: '', sort_order: '0', active: true, parent_id: '' });
    setCatDialog(true);
  };

  const openEditCat = (c: Category) => {
    setEditingCat(c);
    setCatForm({
      name: c.name, slug: c.slug, icon: c.icon || '', sort_order: String(c.sort_order),
      active: c.active, parent_id: c.parent_id || '',
    });
    setCatDialog(true);
  };

  const handleSaveCat = async () => {
    if (!catForm.name) {
      toast.error('Nome é obrigatório');
      return;
    }
    const slug = catForm.slug.trim() || catForm.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const data: any = {
      name: catForm.name.trim(),
      slug,
      icon: catForm.icon.trim() || null,
      sort_order: parseInt(catForm.sort_order) || 0,
      active: catForm.active,
      parent_id: catForm.parent_id || null,
    };

    if (editingCat) {
      const { error } = await supabase.from('categories').update(data).eq('id', editingCat.id);
      if (error) { toast.error('Erro ao atualizar categoria'); return; }
      toast.success('Categoria atualizada');
    } else {
      const { error } = await supabase.from('categories').insert(data);
      if (error) { toast.error('Erro ao criar categoria'); return; }
      toast.success('Categoria criada');
    }
    setCatDialog(false);
    fetchData();
  };

  const handleDeleteCat = async (id: string) => {
    const hasProducts = products.some((p) => p.category_id === id);
    const hasChildren = categories.some((c) => c.parent_id === id);
    if (hasProducts) { toast.error('Remova os produtos desta categoria primeiro'); return; }
    if (hasChildren) { toast.error('Remova as subcategorias primeiro'); return; }
    if (!confirm('Excluir esta categoria?')) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Categoria excluída');
    fetchData();
  };

  const moveSubcategory = async (sub: Category, direction: 'up' | 'down') => {
    if (!sub.parent_id) return;
    const siblings = getChildCategories(sub.parent_id).sort((a, b) => a.sort_order - b.sort_order);
    const idx = siblings.findIndex((s) => s.id === sub.id);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= siblings.length) return;

    const other = siblings[targetIdx];
    await Promise.all([
      supabase.from('categories').update({ sort_order: other.sort_order }).eq('id', sub.id),
      supabase.from('categories').update({ sort_order: sub.sort_order }).eq('id', other.id),
    ]);
    fetchData();
  };

  // ── Product functions ──
  const openNew = () => {
    setEditingProduct(null);
    setForm({ name: '', description: '', price: '', category_id: categories[0]?.id || '', ingredients: '', active: true, image_url: null, hasPromo: false, promo_price: '', hasCashback: false, cashback_percent: '', pizza_prices: { small: '', medium: '', large: '', giant: '' } });
    setImageFile(null); setImagePreview(null);
    setProductDialog(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    const promoPrice = (p as any).promo_price;
    const pp = (p as any).pizza_prices as Record<string, number> | null;
    setForm({
      name: p.name, description: p.description || '', price: String(p.price),
      category_id: p.category_id, ingredients: p.ingredients?.join(', ') || '', active: p.active, image_url: p.image_url,
      hasPromo: promoPrice != null && promoPrice > 0, promo_price: promoPrice ? String(promoPrice) : '',
      hasCashback: (p as any).cashback_active ?? false,
      cashback_percent: (p as any).cashback_percent ? String((p as any).cashback_percent) : '',
      pizza_prices: {
        small: pp?.small ? String(pp.small) : '',
        medium: pp?.medium ? String(pp.medium) : '',
        large: pp?.large ? String(pp.large) : '',
        giant: pp?.giant ? String(pp.giant) : '',
      },
    });
    setImageFile(null); setImagePreview(p.image_url || null);
    setProductDialog(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione um arquivo de imagem'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Imagem deve ter no máximo 10MB'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null); setImagePreview(null);
    setForm({ ...form, image_url: null });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadImage = async (productId: string): Promise<string | null> => {
    if (!imageFile) return form.image_url;
    const ext = imageFile.name.split('.').pop();
    const path = `${productId}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(path, imageFile, { upsert: true });
    if (error) { toast.error('Erro ao enviar imagem'); return form.image_url; }
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);
    return `${publicUrl}?t=${Date.now()}`;
  };

  const handleSave = async () => {
    const isCatPizza = isCategoryPizza(form.category_id);
    if (!form.name || !form.category_id) { toast.error('Preencha os campos obrigatórios'); return; }
    if (isCatPizza) {
      const hasAnyPrice = Object.values(form.pizza_prices).some(v => v && parseFloat(v) > 0);
      if (!hasAnyPrice) { toast.error('Preencha pelo menos um preço por tamanho'); return; }
    } else {
      if (!form.price) { toast.error('Preencha o preço'); return; }
    }
    setUploading(true);
    try {
      const pizzaPricesData = isCatPizza ? {
        small: form.pizza_prices.small ? parseFloat(form.pizza_prices.small) : null,
        medium: form.pizza_prices.medium ? parseFloat(form.pizza_prices.medium) : null,
        large: form.pizza_prices.large ? parseFloat(form.pizza_prices.large) : null,
        giant: form.pizza_prices.giant ? parseFloat(form.pizza_prices.giant) : null,
      } : null;
      // For pizza, use smallest pizza price as the base price
      const basePrice = isCatPizza
        ? Math.min(...Object.values(form.pizza_prices).filter(v => v && parseFloat(v) > 0).map(v => parseFloat(v)))
        : parseFloat(form.price);
      const data: any = {
        name: form.name.trim(), description: form.description.trim() || null,
        price: basePrice, category_id: form.category_id,
        ingredients: form.ingredients ? form.ingredients.split(',').map((s) => s.trim()).filter(Boolean) : null,
        active: form.active,
        promo_price: form.hasPromo && form.promo_price ? parseFloat(form.promo_price) : null,
        cashback_active: form.hasCashback,
        cashback_percent: form.hasCashback && form.cashback_percent ? parseFloat(form.cashback_percent) : 0,
        pizza_prices: pizzaPricesData,
      };
      if (editingProduct) {
        data.image_url = await uploadImage(editingProduct.id);
        const { error } = await supabase.from('products').update(data).eq('id', editingProduct.id);
        if (error) { toast.error('Erro ao atualizar'); return; }
        toast.success('Produto atualizado');
      } else {
        const { data: newProduct, error } = await supabase.from('products').insert(data).select('id').single();
        if (error || !newProduct) { toast.error('Erro ao criar'); return; }
        if (imageFile) {
          const imageUrl = await uploadImage(newProduct.id);
          await supabase.from('products').update({ image_url: imageUrl }).eq('id', newProduct.id);
        }
        toast.success('Produto criado');
      }
      setProductDialog(false); fetchData();
    } finally { setUploading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este produto?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Produto excluído'); fetchData();
  };

  const toggleActive = async (p: Product) => {
    await supabase.from('products').update({ active: !p.active }).eq('id', p.id);
    fetchData();
  };

  const getCategoryName = (id: string) => categories.find((c) => c.id === id)?.name || '';

  const leafCategories = categories.filter((c) => !categories.some((child) => child.parent_id === c.id));

  const isCategoryPizza = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return false;
    const slug = cat.slug.toLowerCase();
    if (slug.includes('pizza')) return true;
    if (cat.parent_id) {
      const parent = categories.find((c) => c.id === cat.parent_id);
      if (parent && parent.slug.toLowerCase().includes('pizza')) return true;
    }
    return false;
  };

  const formIsPizza = isCategoryPizza(form.category_id);

  const isEditingParentCategory = editingCat ? !editingCat.parent_id && categories.some(c => c.parent_id === editingCat.id) : false;
  const isEditingSubcategory = editingCat ? !!editingCat.parent_id : false;

  return (
    <div className="space-y-4 mt-4">
      <Tabs defaultValue="products">
        <TabsList className="w-full">
          <TabsTrigger value="products" className="flex-1">Produtos</TabsTrigger>
          <TabsTrigger value="categories" className="flex-1">Categorias</TabsTrigger>
          <TabsTrigger value="extras" className="flex-1">Adicionais</TabsTrigger>
        </TabsList>

        {/* ── Products Tab ── */}
        <TabsContent value="products">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold">Produtos ({products.length})</h2>
            <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Produto</Button>
          </div>
          <div className="space-y-2">
            {products.map((p) => (
              <div key={p.id} className={`flex items-center gap-3 rounded-lg border p-3 ${!p.active ? 'opacity-50' : ''}`}>
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded-md object-cover flex-shrink-0" />
                ) : (
                  <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                    <ImagePlus className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    {(p as any).cashback_active && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap">
                        💰 {(p as any).cashback_percent}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{getCategoryName(p.category_id)} • {formatPrice(p.price)}</p>
                </div>
                <Switch checked={p.active} onCheckedChange={() => toggleActive(p)} />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── Categories Tab ── */}
        <TabsContent value="categories">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold">Categorias ({categories.length})</h2>
            <Button size="sm" onClick={openNewCat}><Plus className="h-4 w-4 mr-1" /> Nova Categoria</Button>
          </div>
          <div className="space-y-2">
            {parentCategories.map((cat) => (
              <div key={cat.id}>
                <div className={`flex items-center gap-3 rounded-lg border p-3 ${!cat.active ? 'opacity-50' : ''}`}>
                  <span className="text-xl">{cat.icon || '📁'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">slug: {cat.slug} • ordem: {cat.sort_order}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditCat(cat)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteCat(cat.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {getChildCategories(cat.id).sort((a, b) => a.sort_order - b.sort_order).map((sub, idx, arr) => (
                  <div key={sub.id} className={`flex items-center gap-3 rounded-lg border p-3 ml-6 mt-1 ${!sub.active ? 'opacity-50' : ''}`}>
                    <FolderTree className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-lg">{sub.icon || '📄'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{sub.name}</p>
                      <p className="text-xs text-muted-foreground">slug: {sub.slug}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditCat(sub)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteCat(sub.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </TabsContent>
        {/* ── Extra Ingredients Tab ── */}
        <TabsContent value="extras">
          <ExtraIngredientsPanel />
        </TabsContent>
      </Tabs>

      {/* ── Product Dialog ── */}
      <Dialog open={productDialog} onOpenChange={setProductDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Imagem</Label>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              {imagePreview ? (
                <div className="relative mt-2 w-full">
                  <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg border" />
                  <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={removeImage} type="button">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 w-full h-32 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors">
                  <ImagePlus className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Clique para adicionar imagem</span>
                </button>
              )}
            </div>
            <div>
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={300} className="resize-none" />
            </div>
            {formIsPizza ? (
              <div className="space-y-3 rounded-lg border p-3">
                <Label className="font-semibold">🍕 Preço por tamanho *</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Pequena</Label>
                    <Input type="number" step="0.01" placeholder="Ex: 25.00" value={form.pizza_prices.small} onChange={(e) => setForm({ ...form, pizza_prices: { ...form.pizza_prices, small: e.target.value } })} />
                  </div>
                  <div>
                    <Label className="text-xs">Média</Label>
                    <Input type="number" step="0.01" placeholder="Ex: 35.00" value={form.pizza_prices.medium} onChange={(e) => setForm({ ...form, pizza_prices: { ...form.pizza_prices, medium: e.target.value } })} />
                  </div>
                  <div>
                    <Label className="text-xs">Grande</Label>
                    <Input type="number" step="0.01" placeholder="Ex: 45.00" value={form.pizza_prices.large} onChange={(e) => setForm({ ...form, pizza_prices: { ...form.pizza_prices, large: e.target.value } })} />
                  </div>
                  <div>
                    <Label className="text-xs">Gigante</Label>
                    <Input type="number" step="0.01" placeholder="Ex: 55.00" value={form.pizza_prices.giant} onChange={(e) => setForm({ ...form, pizza_prices: { ...form.pizza_prices, giant: e.target.value } })} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Preço *</Label>
                  <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div>
                  <Label>Categoria *</Label>
                  <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {leafCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            {formIsPizza && (
              <div>
                <Label>Categoria *</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {leafCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Ingredientes (separados por vírgula)</Label>
              <Input value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} placeholder="queijo, tomate, cebola" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>Ativo no cardápio</Label>
            </div>

            {/* Promoção */}
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Switch checked={form.hasPromo} onCheckedChange={(v) => setForm({ ...form, hasPromo: v, promo_price: v ? form.promo_price : '' })} />
                <Label className="font-semibold">🏷️ Promoção</Label>
              </div>
              {form.hasPromo && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Valor atual: {form.price ? formatPrice(parseFloat(form.price)) : 'R$ 0,00'}</p>
                  <div>
                    <Label>Valor promocional *</Label>
                    <Input type="number" step="0.01" value={form.promo_price} onChange={(e) => setForm({ ...form, promo_price: e.target.value })} placeholder="Ex: 29.90" />
                  </div>
                </div>
              )}
            </div>

            {/* Cashback */}
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Switch checked={form.hasCashback} onCheckedChange={(v) => setForm({ ...form, hasCashback: v, cashback_percent: v ? form.cashback_percent : '' })} />
                <Label className="font-semibold">💰 Cashback</Label>
              </div>
              {form.hasCashback && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Valor do produto: {form.price ? formatPrice(parseFloat(form.price)) : 'R$ 0,00'}
                    {form.cashback_percent && form.price ? ` → Cashback: ${formatPrice(parseFloat(form.price) * parseFloat(form.cashback_percent) / 100)}` : ''}
                  </p>
                  <div>
                    <Label>Porcentagem de cashback (%)</Label>
                    <Input type="number" step="1" min="1" max="100" value={form.cashback_percent} onChange={(e) => setForm({ ...form, cashback_percent: e.target.value })} placeholder="Ex: 10" />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} className="w-full" disabled={uploading}>
              {uploading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Category Dialog ── */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCat ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} maxLength={100} placeholder="Ex: Pizzas Salgadas" />
            </div>

            {/* Show full form for new categories or parent categories being edited */}
            {!editingCat && (
              <>
                <div>
                  <Label>Slug</Label>
                  <Input value={catForm.slug} onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })} maxLength={50} placeholder="Gerado automaticamente se vazio" />
                  <p className="text-xs text-muted-foreground mt-1">Identificador único (sem espaços)</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Emoji/Ícone</Label>
                    <Input value={catForm.icon} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })} placeholder="🍕" />
                  </div>
                  <div>
                    <Label>Ordem</Label>
                    <Input type="number" value={catForm.sort_order} onChange={(e) => setCatForm({ ...catForm, sort_order: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Categoria Pai (opcional)</Label>
                  <Select value={catForm.parent_id} onValueChange={(v) => setCatForm({ ...catForm, parent_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Nenhuma (categoria principal)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma (categoria principal)</SelectItem>
                      {parentCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={catForm.active} onCheckedChange={(v) => setCatForm({ ...catForm, active: v })} />
                  <Label>Ativa</Label>
                </div>
              </>
            )}

            {/* Editing parent category with children: rename + reorder subcategories */}
            {editingCat && isEditingParentCategory && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Emoji/Ícone</Label>
                    <Input value={catForm.icon} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })} placeholder="🍕" />
                  </div>
                  <div>
                    <Label>Ordem</Label>
                    <Input type="number" value={catForm.sort_order} onChange={(e) => setCatForm({ ...catForm, sort_order: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label className="font-semibold">Ordenar subcategorias</Label>
                  <div className="space-y-1 mt-2">
                    {getChildCategories(editingCat.id).sort((a, b) => a.sort_order - b.sort_order).map((sub, idx, arr) => (
                      <div key={sub.id} className="flex items-center gap-2 rounded-lg border p-2">
                        <span className="text-sm flex-1">{sub.icon || '📄'} {sub.name}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === 0} onClick={() => moveSubcategory(sub, 'up')}>
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === arr.length - 1} onClick={() => moveSubcategory(sub, 'down')}>
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Editing subcategory: only rename */}
            {editingCat && isEditingSubcategory && (
              <p className="text-xs text-muted-foreground">Apenas o nome pode ser alterado para subcategorias.</p>
            )}

            {/* Editing standalone parent (no children): full form */}
            {editingCat && !isEditingParentCategory && !isEditingSubcategory && (
              <>
                <div>
                  <Label>Slug</Label>
                  <Input value={catForm.slug} onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })} maxLength={50} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Emoji/Ícone</Label>
                    <Input value={catForm.icon} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })} placeholder="🍕" />
                  </div>
                  <div>
                    <Label>Ordem</Label>
                    <Input type="number" value={catForm.sort_order} onChange={(e) => setCatForm({ ...catForm, sort_order: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Categoria Pai (opcional)</Label>
                  <Select value={catForm.parent_id} onValueChange={(v) => setCatForm({ ...catForm, parent_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Nenhuma (categoria principal)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma (categoria principal)</SelectItem>
                      {parentCategories.filter(c => c.id !== editingCat?.id).map((c) => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={catForm.active} onCheckedChange={(v) => setCatForm({ ...catForm, active: v })} />
                  <Label>Ativa</Label>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleSaveCat} className="w-full">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
