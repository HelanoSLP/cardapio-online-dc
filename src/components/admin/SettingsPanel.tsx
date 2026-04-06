import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ImagePlus, X, Save } from 'lucide-react';
import { toast } from 'sonner';

interface Settings {
  store_name: string;
  logo_url: string;
  delivery_fee: string;
  store_open: string;
  estimated_delivery_time: string;
}

export function SettingsPanel() {
  const [settings, setSettings] = useState<Settings>({
    store_name: 'Delícias Caseiras',
    logo_url: '',
    delivery_fee: '7',
    store_open: 'true',
    estimated_delivery_time: '',
  });
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('store_settings').select('key, value');
    if (data) {
      const s: any = { ...settings };
      data.forEach((row: any) => {
        if (row.key in s) s[row.key] = row.value;
      });
      setSettings(s);
      if (s.logo_url) setLogoPreview(s.logo_url);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Máximo 10MB'); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File, name: string): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `store/${name}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);
    return `${publicUrl}?t=${Date.now()}`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let logoUrl = settings.logo_url;
      if (logoFile) logoUrl = await uploadImage(logoFile, 'logo');

      const updates = [
        { key: 'store_name', value: settings.store_name },
        { key: 'store_name_type', value: 'logo' },
        { key: 'logo_url', value: logoUrl },
        { key: 'delivery_fee', value: settings.delivery_fee },
        { key: 'store_open', value: settings.store_open },
      ];

      for (const u of updates) {
        await supabase.from('store_settings').upsert({ key: u.key, value: u.value, updated_at: new Date().toISOString() });
      }

      setLogoFile(null);
      toast.success('Configurações salvas!');
      fetchSettings();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof Settings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6 mt-4">
      {/* Store Open/Closed */}
      <section className="rounded-xl border bg-card p-4 space-y-4">
        <h2 className="text-base font-bold">🕐 Status do Estabelecimento</h2>
        <div className="flex items-center gap-3">
          <Switch
            checked={settings.store_open === 'true'}
            onCheckedChange={(v) => update('store_open', v ? 'true' : 'false')}
          />
          <Label className="text-sm">
            {settings.store_open === 'true' ? (
              <span className="text-green-600 font-semibold">🟢 Aberto</span>
            ) : (
              <span className="text-destructive font-semibold">🔴 Fechado</span>
            )}
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Quando desativado, os clientes verão um aviso de que o estabelecimento está fechado.
        </p>
      </section>

      {/* Store Identity - Logo only */}
      <section className="rounded-xl border bg-card p-4 space-y-4">
        <h2 className="text-base font-bold">🏪 Identidade da Loja</h2>
        <div>
          <Label>Logo (máx. 10MB)</Label>
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
          {logoPreview ? (
            <div className="relative mt-2">
              <img src={logoPreview} alt="Logo" className="h-20 object-contain rounded-lg border p-2" />
              <Button variant="destructive" size="icon" className="absolute top-0 right-0 h-6 w-6" onClick={() => { setLogoFile(null); setLogoPreview(null); update('logo_url', ''); }}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <button type="button" onClick={() => logoInputRef.current?.click()} className="mt-2 w-full h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center gap-2 hover:border-primary/50 transition-colors">
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Upload logo</span>
            </button>
          )}
        </div>
      </section>

      {/* Delivery Fee */}
      <section className="rounded-xl border bg-card p-4 space-y-4">
        <h2 className="text-base font-bold">🛵 Taxa de Entrega</h2>
        <div>
          <Label>Valor da taxa (R$)</Label>
          <Input type="number" step="0.50" min="0" value={settings.delivery_fee} onChange={(e) => update('delivery_fee', e.target.value)} placeholder="7.00" />
        </div>
      </section>

      <Button onClick={handleSave} disabled={saving} className="w-full py-5 text-base">
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Salvando...' : 'Salvar Configurações'}
      </Button>
    </div>
  );
}
