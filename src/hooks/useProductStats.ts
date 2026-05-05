import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Top selling product IDs (last 30 days) */
export function useTopProducts(limit = 5) {
  return useQuery({
    queryKey: ['top-products', limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_top_products', { p_limit: limit });
      if (error) throw error;
      return new Set((data || []).map((r: any) => r.product_id as string));
    },
    staleTime: 5 * 60 * 1000,
  });
}

export type RatingSummary = { product_id: string; avg_rating: number; reviews_count: number };

/** Map of productId -> rating summary */
export function useProductRatings() {
  return useQuery({
    queryKey: ['product-ratings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_ratings_summary' as any)
        .select('*');
      if (error) throw error;
      const map = new Map<string, RatingSummary>();
      (data || []).forEach((r: any) => map.set(r.product_id, r));
      return map;
    },
    staleTime: 2 * 60 * 1000,
  });
}
