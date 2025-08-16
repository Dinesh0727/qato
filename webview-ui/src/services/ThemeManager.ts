import { ThemeConfig } from '@/types';

export type ThemeMode = 'light' | 'dark' | 'auto';

export class ThemeManager {
  private currentTheme: ThemeMode = 'auto';
  private systemTheme: 'light' | 'dark' = 'dark';
  private listeners: Set<(theme: ThemeMode, resolvedTheme: 'light' | 'dark') => void> = new Set();

  constructor() {
    this.initializeTheme();
    this.setupSystemThemeListener();
  }

  /**
   * Initialize theme from localStorage or system preference
   */
  private initializeTheme(): void {
    const savedTheme = localStorage.getItem('qato-theme') as ThemeMode;
    if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
      this.currentTheme = savedTheme;
    } else {
      this.currentTheme = 'auto';
    }

    this.systemTheme = this.getSystemPreference();
    this.applyTheme();
  }

  /**
   * Set up listener for system theme changes
   */
  private setupSystemThemeListener(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e: MediaQueryListEvent) => {
        this.systemTheme = e.matches ? 'dark' : 'light';
        if (this.currentTheme === 'auto') {
          this.applyTheme();
        }
      };

      mediaQuery.addEventListener('change', handleChange);
    }
  }

  /**
   * Get system theme preference
   */
  getSystemPreference(): 'light' | 'dark' {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark'; // Default fallback
  }

  /**
   * Get current theme mode
   */
  getCurrentTheme(): ThemeMode {
    return this.currentTheme;
  }

  /**
   * Get resolved theme (actual light/dark theme being used)
   */
  getResolvedTheme(): 'light' | 'dark' {
    return this.currentTheme === 'auto' ? this.systemTheme : this.currentTheme;
  }

  /**
   * Set theme mode
   */
  setTheme(theme: ThemeMode): void {
    this.currentTheme = theme;
    localStorage.setItem('qato-theme', theme);
    this.applyTheme();
  }

  /**
   * Apply theme to document
   */
  private applyTheme(): void {
    const resolvedTheme = this.getResolvedTheme();
    
    // Apply theme class to document
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolvedTheme);

    // Apply theme-specific CSS custom properties
    this.applyThemeColors(resolvedTheme);

    // Notify listeners
    this.listeners.forEach(listener => {
      listener(this.currentTheme, resolvedTheme);
    });
  }

  /**
   * Apply theme-specific colors
   */
  private applyThemeColors(theme: 'light' | 'dark'): void {
    const themeConfig = this.getThemeConfig(theme);
    const root = document.documentElement;

    // Apply CSS custom properties
    Object.entries(themeConfig.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
  }

  /**
   * Get theme configuration
   */
  getThemeConfig(theme: 'light' | 'dark'): ThemeConfig {
    return theme === 'light' ? this.getLightThemeConfig() : this.getDarkThemeConfig();
  }

  /**
   * Get light theme configuration
   */
  private getLightThemeConfig(): ThemeConfig {
    return {
      name: 'QATO Light',
      colors: {
        primary: 'hsl(210, 100%, 50%)', // Professional blue
        secondary: 'hsl(210, 15%, 85%)', // Light gray-blue
        success: 'hsl(142, 76%, 36%)', // Professional green
        warning: 'hsl(38, 92%, 50%)', // Amber warning
        error: 'hsl(0, 84%, 60%)', // Clear red for errors
        background: 'hsl(0, 0%, 100%)', // Pure white
        foreground: 'hsl(210, 15%, 15%)', // Dark text
        muted: 'hsl(210, 15%, 95%)', // Very light gray
        accent: 'hsl(210, 40%, 96%)', // Subtle accent
      },
      accessibility: {
        contrastRatio: 4.5,
        wcagCompliant: true
      }
    };
  }

  /**
   * Get dark theme configuration
   */
  private getDarkThemeConfig(): ThemeConfig {
    return {
      name: 'QATO Dark',
      colors: {
        primary: 'hsl(210, 100%, 60%)', // Brighter blue for dark mode
        secondary: 'hsl(210, 15%, 25%)', // Dark gray-blue
        success: 'hsl(142, 76%, 45%)', // Brighter green for dark mode
        warning: 'hsl(38, 92%, 60%)', // Brighter amber
        error: 'hsl(0, 84%, 70%)', // Brighter red for dark mode
        background: 'hsl(210, 15%, 8%)', // Very dark blue-gray
        foreground: 'hsl(210, 15%, 92%)', // Light text
        muted: 'hsl(210, 15%, 15%)', // Dark muted
        accent: 'hsl(210, 15%, 12%)', // Subtle dark accent
      },
      accessibility: {
        contrastRatio: 4.5,
        wcagCompliant: true
      }
    };
  }

  /**
   * Validate theme accessibility
   */
  validateAccessibility(theme: ThemeConfig): boolean {
    // Basic validation - in a real implementation, you'd calculate actual contrast ratios
    return theme.accessibility.wcagCompliant && theme.accessibility.contrastRatio >= 4.5;
  }

  /**
   * Add theme change listener
   */
  addThemeChangeListener(listener: (theme: ThemeMode, resolvedTheme: 'light' | 'dark') => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove theme change listener
   */
  removeThemeChangeListener(listener: (theme: ThemeMode, resolvedTheme: 'light' | 'dark') => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme(): void {
    const currentResolved = this.getResolvedTheme();
    const newTheme = currentResolved === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  /**
   * Cycle through all theme modes
   */
  cycleTheme(): void {
    const modes: ThemeMode[] = ['light', 'dark', 'auto'];
    const currentIndex = modes.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.setTheme(modes[nextIndex]);
  }

  /**
   * Get theme display name
   */
  getThemeDisplayName(theme?: ThemeMode): string {
    const targetTheme = theme || this.currentTheme;
    switch (targetTheme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'auto':
        return `Auto (${this.systemTheme === 'dark' ? 'Dark' : 'Light'})`;
      default:
        return 'Unknown';
    }
  }

  /**
   * Check if theme is system-based
   */
  isSystemTheme(): boolean {
    return this.currentTheme === 'auto';
  }

  /**
   * Get theme icon name
   */
  getThemeIcon(theme?: ThemeMode): string {
    const targetTheme = theme || this.currentTheme;
    const resolvedTheme = targetTheme === 'auto' ? this.systemTheme : targetTheme;
    
    switch (resolvedTheme) {
      case 'light':
        return 'sun';
      case 'dark':
        return 'moon';
      default:
        return 'monitor';
    }
  }
}

// Create singleton instance
export const themeManager = new ThemeManager();