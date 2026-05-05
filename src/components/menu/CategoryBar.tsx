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
    <div className="flex gap-2.5 px-4 py-3 overflow-x-auto no-scrollbar">
      {items.map((item) => {
        const isActive = active === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onSelect(item.key)}
            className={cn(
              'shrink-0 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ring-1',
              isActive
                ? 'bg-primary text-primary-foreground ring-primary shadow-md shadow-primary/20 scale-[1.02]'
                : 'bg-card text-muted-foreground ring-border hover:bg-muted hover:text-foreground'
            )}
          >
            <span className="mr-1">{item.icon}</span>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
