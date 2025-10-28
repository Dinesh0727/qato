import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { SimpleDatabaseConfig } from './SimpleDatabaseConfig';

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

interface GlobalSettingsDialogProps {
  globalConfig: GlobalConfig;
  onUpdateGlobalConfig: (config: GlobalConfig) => void;
}

export const GlobalSettingsDialog = ({
  globalConfig,
  onUpdateGlobalConfig
}: GlobalSettingsDialogProps) => {
  const [open, setOpen] = useState(false);

  const handleGlobalDatabasesChange = useCallback((databases: DatabaseConfig[]) => {
    console.log('🔧 GlobalSettingsDialog: handleGlobalDatabasesChange called with:', databases);
    
    // Build defaultDatabaseConnections mapping based on saved databases
    const defaultDatabaseConnections: { sql?: string; redis?: string; clickhouse?: string } = {};
    
    databases.forEach(db => {
      if (db.type === 'mysql') {
        defaultDatabaseConnections.sql = db.id;
      } else if (db.type === 'redis') {
        defaultDatabaseConnections.redis = db.id;
      } else if (db.type === 'clickhouse') {
        defaultDatabaseConnections.clickhouse = db.id;
      }
    });
    
    const updatedConfig = {
      ...globalConfig,
      databases,
      defaultDatabaseConnections
    };
    
    console.log('🔧 GlobalSettingsDialog: calling onUpdateGlobalConfig with:', updatedConfig);
    console.log('🔧 GlobalSettingsDialog: defaultDatabaseConnections:', defaultDatabaseConnections);
    onUpdateGlobalConfig(updatedConfig);
  }, [globalConfig, onUpdateGlobalConfig]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="max-w-4xl max-h-[80vh] overflow-y-auto" 
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()} // ADD THIS
        onEscapeKeyDown={(e) => e.preventDefault()} // ADD THIS
        onInteractOutside={(e) => e.preventDefault()} // ADD THIS
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Global Workspace Settings
          </DialogTitle>
          <DialogDescription>
            Configure global database connections and workspace-level settings that apply to all test cases.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <SimpleDatabaseConfig
            databases={globalConfig.databases || []}
            onDatabasesChange={handleGlobalDatabasesChange}
            level="global"
            title="Global Database Configurations"
            description="These database connections are available to all test cases in this workspace"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};