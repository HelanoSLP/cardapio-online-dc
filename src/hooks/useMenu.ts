import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type Category = Tables<'categories'>;
export type Product = Tables<'products'>;

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('active', true)
        .order('sort_order');
      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useProducts(categorySlug?: string) {
  return useQuery({
    queryKey: ['products', categorySlug],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*, categories!inner(slug)')
        .eq('active', true)
        .order('sort_order');
      
      if (categorySlug) {
        query = query.eq('categories.slug', categorySlug);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as (Product & { categories: { slug: string } })[];
    },
  });
}
