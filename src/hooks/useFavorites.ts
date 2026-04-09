import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'dc-favorites';

function loadLocal(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function saveLocal(favs: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...favs]));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(loadLocal);
  const [userId, setUserId] = useState<string | null>(null);

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Sync from DB when logged in
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('favorites')
      .select('product_id')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const dbFavs = new Set(data.map((f: any) => f.product_id));
          // Merge local into DB
          const localFavs = loadLocal();
          const toAdd = [...localFavs].filter(id => !dbFavs.has(id));
          if (toAdd.length > 0) {
            supabase.from('favorites').insert(
              toAdd.map(product_id => ({ user_id: userId, product_id }))
            ).then(() => {});
            toAdd.forEach(id => dbFavs.add(id));
          }
          setFavorites(dbFavs);
          saveLocal([...dbFavs] as any);
        } else {
          // Push local favorites to DB
          const localFavs = loadLocal();
          if (localFavs.size > 0) {
            supabase.from('favorites').insert(
              [...localFavs].map(product_id => ({ user_id: userId, product_id }))
            ).then(() => {});
          }
        }
      });
  }, [userId]);

  const toggleFavorite = useCallback((productId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
        if (userId) {
          supabase.from('favorites').delete().eq('user_id', userId).eq('product_id', productId).then(() => {});
        }
      } else {
        next.add(productId);
        if (userId) {
          supabase.from('favorites').insert({ user_id: userId, product_id: productId }).then(() => {});
        }
      }
      saveLocal([...next] as any);
      return next;
    });
  }, [userId]);

  const isFavorite = useCallback(
    (productId: string) => favorites.has(productId),
    [favorites]
  );

  return { favorites, toggleFavorite, isFavorite };
}
