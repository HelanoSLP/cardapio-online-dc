import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productId: string;
  productName: string;
  orderId: string;
  userId: string;
  existingRating?: number;
  existingComment?: string;
}

export function ReviewDialog({ open, onOpenChange, productId, productName, orderId, userId, existingRating, existingComment }: ReviewDialogProps) {
  const [rating, setRating] = useState(existingRating ?? 0);
  const [comment, setComment] = useState(existingComment ?? '');
  const [hover, setHover] = useState(0);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (open) {
      setRating(existingRating ?? 0);
      setComment(existingComment ?? '');
    }
  }, [open, existingRating, existingComment]);

  const handleSave = async () => {
    if (rating < 1) {
      toast.error('Escolha de 1 a 5 estrelas');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('product_reviews' as any)
      .upsert(
        { product_id: productId, order_id: orderId, user_id: userId, rating, comment: comment.trim() || null },
        { onConflict: 'product_id,order_id,user_id' }
      );
    setSaving(false);
    if (error) {
      toast.error('Não foi possível salvar a avaliação');
      return;
    }
    toast.success('Avaliação enviada! Obrigado 💛');
    qc.invalidateQueries({ queryKey: ['product-ratings'] });
    qc.invalidateQueries({ queryKey: ['my-reviews', userId] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle>Avaliar {productName}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center gap-2 py-2">
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = (hover || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star className={cn('h-9 w-9', filled ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40')} />
              </button>
            );
          })}
        </div>
        <Textarea
          placeholder="Conte como foi sua experiência (opcional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={300}
          rows={3}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {existingRating ? 'Atualizar' : 'Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
