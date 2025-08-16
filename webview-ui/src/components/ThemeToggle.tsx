import { useState, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { themeManager, ThemeMode } from '@/services/ThemeManager';

export const ThemeToggle = () => {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>('auto');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Initialize theme state
    setCurrentTheme(themeManager.getCurrentTheme());
    setResolvedTheme(themeManager.getResolvedTheme());

    // Listen for theme changes
    const handleThemeChange = (theme: ThemeMode, resolved: 'light' | 'dark') => {
      setCurrentTheme(theme);
      setResolvedTheme(resolved);
    };

    themeManager.addThemeChangeListener(handleThemeChange);

    return () => {
      themeManager.removeThemeChangeListener(handleThemeChange);
    };
  }, []);

  const handleThemeSelect = (theme: ThemeMode) => {
    themeManager.setTheme(theme);
  };

  const getThemeIcon = (theme: ThemeMode) => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'auto':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getCurrentIcon = () => {
    return getThemeIcon(currentTheme);
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-accent transition-all duration-200"
          title={`Current theme: ${themeManager.getThemeDisplayName()}`}
          aria-label="Toggle theme"
        >
          {getCurrentIcon()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 z-50" sideOffset={5}>
        <DropdownMenuItem
          onClick={() => handleThemeSelect('light')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Sun className="h-4 w-4" />
          <span>Light</span>
          {currentTheme === 'light' && (
            <div className="ml-auto w-2 h-2 bg-primary rounded-full" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleThemeSelect('dark')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Moon className="h-4 w-4" />
          <span>Dark</span>
          {currentTheme === 'dark' && (
            <div className="ml-auto w-2 h-2 bg-primary rounded-full" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleThemeSelect('auto')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Monitor className="h-4 w-4" />
          <span>System</span>
          {currentTheme === 'auto' && (
            <div className="ml-auto w-2 h-2 bg-primary rounded-full" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}; 