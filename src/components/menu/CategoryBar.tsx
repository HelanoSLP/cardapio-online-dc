import { Category } from '@/hooks/useMenu';
import { cn } from '@/lib/utils';

interface CategoryBarProps {
  categories: Category[];
  active?: string;
  onSelect: (slug: string | undefined) => void;
}

export function CategoryBar({ categories, active, onSelect }: CategoryBarProps) {
  return (
    <div className="flex gap-2 p-3 overflow-x-auto no-scrollbar">
      <button
        onClick={() => onSelect(undefined)}
        className={cn(
          'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
          !active
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        )}
      >
        Todos
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.slug)}
          className={cn(
            'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
            active === cat.slug
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          {cat.icon} {cat.name}
        </button>
      ))}
    </div>
  );
}
