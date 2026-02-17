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
import { Plus, Pencil, Trash2, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';

type Category = Tables<'categories'>;
type Product = Tables<'products'>;

export function MenuPanel() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productDialog, setProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    ingredients: '',
    active: true,
    image_url: null as string | null,
  });

  const fetchData = async () => {
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('products').select('*').order('sort_order'),
    ]);
    if (cats) setCategories(cats);
    if (prods) setProducts(prods);
  };

  useEffect(() => { fetchData(); }, []);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  const openNew = () => {
    setEditingProduct(null);
    setForm({ name: '', description: '', price: '', category_id: categories[0]?.id || '', ingredients: '', active: true, image_url: null });
    setImageFile(null);
    setImagePreview(null);
    setProductDialog(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      description: p.description || '',
      price: String(p.price),
      category_id: p.category_id,
      ingredients: p.ingredients?.join(', ') || '',
      active: p.active,
      image_url: p.image_url,
    });
    setImageFile(null);
    setImagePreview(p.image_url || null);
    setProductDialog(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 2MB');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setForm({ ...form, image_url: null });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadImage = async (productId: string): Promise<string | null> => {
    if (!imageFile) return form.image_url;
    const ext = imageFile.name.split('.').pop();
    const path = `${productId}.${ext}`;

    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, imageFile, { upsert: true });

    if (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar imagem');
      return form.image_url;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(path);

    return `${publicUrl}?t=${Date.now()}`;
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.category_id) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setUploading(true);
    try {
      const data: any = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: parseFloat(form.price),
        category_id: form.category_id,
        ingredients: form.ingredients ? form.ingredients.split(',').map((s) => s.trim()).filter(Boolean) : null,
        active: form.active,
      };

      if (editingProduct) {
        const imageUrl = await uploadImage(editingProduct.id);
        data.image_url = imageUrl;
        const { error } = await supabase.from('products').update(data).eq('id', editingProduct.id);
        if (error) { toast.error('Erro ao atualizar'); return; }
        toast.success('Produto atualizado');
      } else {
        // Create product first to get ID, then upload image
        const { data: newProduct, error } = await supabase.from('products').insert(data).select('id').single();
        if (error || !newProduct) { toast.error('Erro ao criar'); return; }

        if (imageFile) {
          const imageUrl = await uploadImage(newProduct.id);
          await supabase.from('products').update({ image_url: imageUrl }).eq('id', newProduct.id);
        }
        toast.success('Produto criado');
      }

      setProductDialog(false);
      fetchData();
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Produto excluído');
    fetchData();
  };

  const toggleActive = async (p: Product) => {
    await supabase.from('products').update({ active: !p.active }).eq('id', p.id);
    fetchData();
  };

  const getCategoryName = (id: string) => categories.find((c) => c.id === id)?.name || '';

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">Produtos ({products.length})</h2>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo Produto
        </Button>
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
              <p className="font-medium text-sm truncate">{p.name}</p>
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

      <Dialog open={productDialog} onOpenChange={setProductDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Image upload */}
            <div>
              <Label>Imagem</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
              {imagePreview ? (
                <div className="relative mt-2 w-full">
                  <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg border" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={removeImage}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 w-full h-32 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors"
                >
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
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Ingredientes (separados por vírgula)</Label>
              <Input value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} placeholder="queijo, tomate, cebola" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>Ativo no cardápio</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} className="w-full" disabled={uploading}>
              {uploading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
