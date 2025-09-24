import { ThemeToggle } from '@/components/ThemeToggle';
import { GlobalSettingsDialog } from '@/components/GlobalSettingsDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings } from 'lucide-react';

interface DatabaseConfig {
  id: string;
  name: string;
  type: 'mysql' | 'postgresql' | 'redis' | 'clickhouse';
  host: string;
  port: number;
  database?: string;
  username?: string;
  password?: string;
  connectionString?: string;
  timeout?: number;
  maxConnections?: number;
  ssl?: boolean;
  description?: string;
}

interface GlobalConfig {
  version: string;
  defaultSettings?: {
    timeout?: number;
    retryCount?: number;
  };
  databases?: DatabaseConfig[];
  defaultDatabaseConnections?: {
    sql?: string;
    redis?: string;
    clickhouse?: string;
  };
}

interface HeaderProps {
  title?: string;
  subtitle?: string;
  globalConfig?: GlobalConfig;
  onUpdateGlobalConfig?: (config: GlobalConfig) => void;
  onOpenTemplateManagement?: () => void;
  templateCount?: number;
}

export const Header = ({ 
  title = 'QATO Visual Builder', 
  subtitle,
  globalConfig,
  onUpdateGlobalConfig,
  onOpenTemplateManagement,
  templateCount
}: HeaderProps) => {
  const defaultGlobalConfig: GlobalConfig = {
    version: '1.0.0',
    databases: [],
    defaultDatabaseConnections: {}
  };

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
        {typeof onOpenTemplateManagement === 'function' && (
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={onOpenTemplateManagement}
          >
            <Settings className="h-4 w-4" />
            Manage Templates
            {typeof templateCount === 'number' && (
              <Badge variant="secondary" className="ml-1">{templateCount}</Badge>
            )}
          </Button>
        )}
        {globalConfig && onUpdateGlobalConfig && (
          <GlobalSettingsDialog
            globalConfig={globalConfig}
            onUpdateGlobalConfig={onUpdateGlobalConfig}
          />
        )}
        <ThemeToggle />
      </div>
    </header>
  );
};