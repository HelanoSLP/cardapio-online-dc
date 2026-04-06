import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StoreSettings {
  store_name: string;
  store_name_type: 'text' | 'logo';
  logo_url: string;
  wallpaper_url: string;
  delivery_fee: number;
  store_open: boolean;
  estimated_delivery_time: string;
}

const DEFAULTS: StoreSettings = {
  store_name: 'Delícias Caseiras',
  store_name_type: 'logo',
  logo_url: '',
  wallpaper_url: '',
  delivery_fee: 7,
  store_open: true,
  estimated_delivery_time: '',
};

export function useStoreSettings() {
  return useQuery({
    queryKey: ['store-settings'],
    queryFn: async (): Promise<StoreSettings> => {
      const { data, error } = await supabase
        .from('store_settings')
        .select('key, value');
      if (error || !data) return DEFAULTS;
      const map: Record<string, string> = {};
      data.forEach((row: any) => { map[row.key] = row.value; });
      return {
        store_name: map.store_name || DEFAULTS.store_name,
        store_name_type: (map.store_name_type as 'text' | 'logo') || 'logo',
        logo_url: map.logo_url || '',
        wallpaper_url: map.wallpaper_url || map.banner_url || '',
        delivery_fee: parseFloat(map.delivery_fee) || DEFAULTS.delivery_fee,
        store_open: map.store_open !== 'false',
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
