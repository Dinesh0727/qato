import { ThemeToggle } from '@/components/ThemeToggle';
import { GlobalSettingsDialog } from '@/components/GlobalSettingsDialog';
import { ConfigurationStatusSummary } from '@/components/ConfigurationStatusSummary';

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
  folderDatabases?: DatabaseConfig[];
}

export const Header = ({ 
  title = 'QATO Visual Builder', 
  subtitle,
  globalConfig,
  onUpdateGlobalConfig,
  folderDatabases = []
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
        {globalConfig && onUpdateGlobalConfig && (
          <>
            <ConfigurationStatusSummary
              globalDatabases={globalConfig.databases || []}
              folderDatabases={folderDatabases}
              onOpenGlobalSettings={() => {
                // This will be handled by the GlobalSettingsDialog trigger
              }}
            />
            <GlobalSettingsDialog
              globalConfig={globalConfig}
              onUpdateGlobalConfig={onUpdateGlobalConfig}
            />
          </>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
};