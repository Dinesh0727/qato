import { ThemeToggle } from '@/components/ThemeToggle';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header = ({ title = 'QATO Visual Builder', subtitle }: HeaderProps) => {
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-background border-b border-border">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">Q</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
};