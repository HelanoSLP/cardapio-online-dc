import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type Category = Tables<'categories'>;
export type Product = Tables<'products'>;

// Category group definitions
export interface CategoryGroup {
  label: string;
  icon: string;
  slugs: string[];
}

export const CATEGORY_GROUPS: Record<string, CategoryGroup> = {
  pizzas: { label: 'Pizzas', icon: '🍕', slugs: ['pizzas', 'pizzas-doces'] },
  bebidas: { label: 'Bebidas', icon: '🥤', slugs: ['refrigerantes', 'sucos'] },
};

// Slugs that are part of a group (should not appear individually)
const GROUPED_SLUGS = new Set(
  Object.values(CATEGORY_GROUPS).flatMap((g) => g.slugs)
);

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

/** Build the list of items to show in the category bar */
export function useCategoryBarItems(categories: Category[] | undefined) {
  if (!categories) return [];

  const items: { key: string; label: string; icon: string; slugs: string[] }[] = [];
  const addedGroups = new Set<string>();

  for (const cat of categories) {
    // Check if this category belongs to a group
    const groupKey = Object.entries(CATEGORY_GROUPS).find(([, g]) =>
      g.slugs.includes(cat.slug)
    );

    if (groupKey) {
      if (!addedGroups.has(groupKey[0])) {
        addedGroups.add(groupKey[0]);
        items.push({
          key: groupKey[0],
          label: groupKey[1].label,
          icon: groupKey[1].icon,
          slugs: groupKey[1].slugs,
        });
      }
    } else {
      items.push({
        key: cat.slug,
        label: cat.name,
        icon: cat.icon || '',
        slugs: [cat.slug],
      });
    }
  }

  return items;
}

export function useProducts(categorySlugs?: string[]) {
  return useQuery({
    queryKey: ['products', categorySlugs],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*, categories!inner(slug, name, sort_order)')
        .eq('active', true)
        .order('sort_order');
      
      if (categorySlugs && categorySlugs.length > 0) {
        query = query.in('categories.slug', categorySlugs);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as (Product & { categories: { slug: string; name: string; sort_order: number } })[];
    },
  });
}
