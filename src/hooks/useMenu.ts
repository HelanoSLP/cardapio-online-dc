import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type Category = Tables<'categories'> & { parent_id?: string | null };
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

/** Build category bar items using parent_id relationships */
export function useCategoryBarItems(categories: Category[] | undefined) {
  if (!categories) return [];

  const items: { key: string; label: string; icon: string; slugs: string[]; isParent: boolean }[] = [];

  // Find parent categories (no parent_id) that have children
  const parents = categories.filter((c) => !c.parent_id);
  const children = categories.filter((c) => c.parent_id);

  for (const cat of parents) {
    const childCats = children.filter((c) => c.parent_id === cat.id);
    if (childCats.length > 0) {
      // This is a group - show parent label, slugs are the children's slugs
      items.push({
        key: cat.slug,
        label: cat.name,
        icon: cat.icon || '',
        slugs: childCats.map((c) => c.slug),
        isParent: true,
      });
    } else {
      // Standalone category
      items.push({
        key: cat.slug,
        label: cat.name,
        icon: cat.icon || '',
        slugs: [cat.slug],
        isParent: false,
      });
    }
  }

  return items;
}

/** Check if a category slug belongs to a pizza category */
export function isPizzaCategory(categories: Category[] | undefined, categoryId: string): boolean {
  if (!categories) return false;
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return false;
  const slug = cat.slug.toLowerCase();
  if (slug.includes('pizza')) return true;
  if (cat.parent_id) {
    const parent = categories.find((c) => c.id === cat.parent_id);
    if (parent && parent.slug.toLowerCase().includes('pizza')) return true;
  }
  return false;
}

/** Check if a category is a combo category */
export function isComboCategory(categories: Category[] | undefined, categoryId: string): boolean {
  if (!categories) return false;
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return false;
  const slug = cat.slug.toLowerCase();
  if (slug.includes('combo')) return true;
  if (cat.parent_id) {
    const parent = categories.find((c) => c.id === cat.parent_id);
    if (parent && parent.slug.toLowerCase().includes('combo')) return true;
  }
  return false;
}

/** Detect pizza size from product name (for combos) */
export function detectPizzaSizeFromName(name: string): PizzaSize | null {
  const lower = name.toLowerCase();
  if (lower.includes('brutona')) return 'brutona';
  if (lower.includes('gigante')) return 'giant';
  if (lower.includes('grande')) return 'large';
  if (lower.includes('média') || lower.includes('media')) return 'medium';
  if (lower.includes('pequena')) return 'small';
  return null;
}

/** Get all pizza category IDs */
export function getPizzaCategoryIds(categories: Category[] | undefined): string[] {
  if (!categories) return [];
  return categories
    .filter((c) => {
      const slug = c.slug.toLowerCase();
      if (slug.includes('pizza')) return true;
      if (c.parent_id) {
        const parent = categories.find((p) => p.id === c.parent_id);
        if (parent && parent.slug.toLowerCase().includes('pizza')) return true;
      }
      return false;
    })
    .map((c) => c.id);
}

export const PIZZA_SIZES = [
  { key: 'small', label: 'Pequena', maxFlavors: 2 },
  { key: 'medium', label: 'Média', maxFlavors: 3 },
  { key: 'large', label: 'Grande', maxFlavors: 4 },
  { key: 'giant', label: 'Gigante', maxFlavors: 4 },
  { key: 'brutona', label: 'BRUTONA', maxFlavors: 4 },
] as const;

export type PizzaSize = typeof PIZZA_SIZES[number]['key'];

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
