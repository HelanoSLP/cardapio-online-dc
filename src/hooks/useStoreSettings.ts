import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StoreSettings {
  store_name: string;
  store_name_type: 'text' | 'logo';
  logo_url: string;
  banner_url: string;
  delivery_fee: number;
  cashback_enabled: boolean;
  cashback_threshold: number;
  cashback_value: number;
}

const DEFAULTS: StoreSettings = {
  store_name: 'Delícias Caseiras',
  store_name_type: 'text',
  logo_url: '',
  banner_url: '',
  delivery_fee: 7,
  cashback_enabled: false,
  cashback_threshold: 100,
  cashback_value: 10,
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
        store_name_type: (map.store_name_type as 'text' | 'logo') || 'text',
        logo_url: map.logo_url || '',
        banner_url: map.banner_url || '',
        delivery_fee: parseFloat(map.delivery_fee) || DEFAULTS.delivery_fee,
        cashback_enabled: map.cashback_enabled === 'true',
        cashback_threshold: parseFloat(map.cashback_threshold) || DEFAULTS.cashback_threshold,
        cashback_value: parseFloat(map.cashback_value) || DEFAULTS.cashback_value,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
