import { cn } from '@/lib/utils';

export interface CategoryBarItem {
  key: string;
  label: string;
  icon: string;
  slugs: string[];
}

interface CategoryBarProps {
  items: CategoryBarItem[];
  active?: string;
  onSelect: (key: string | undefined) => void;
}

export function CategoryBar({ items, active, onSelect }: CategoryBarProps) {
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
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onSelect(item.key)}
          className={cn(
            'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
            active === item.key
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          {item.icon} {item.label}
        </button>
      ))}
    </div>
  );
}
