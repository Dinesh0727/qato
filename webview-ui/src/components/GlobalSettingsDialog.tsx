import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Settings, Download, Upload, FileText } from 'lucide-react';
import { SimpleDatabaseConfig } from './SimpleDatabaseConfig';
import { ConfigurationImportExport } from './ConfigurationImportExport';

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
  databases: DatabaseConfigSet;
}

interface DatabaseConfigSet {
  mysql?: DatabaseConfig;
  redis?: DatabaseConfig;
  clickhouse?: DatabaseConfig;
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

  const handleGlobalDatabasesChange = (databases: DatabaseConfig[]) => {
    // Convert array to DatabaseConfigSet format
    const databaseConfigSet: DatabaseConfigSet = {};
    databases.forEach(db => {
      if (db.type === 'mysql' || db.type === 'redis' || db.type === 'clickhouse') {
        databaseConfigSet[db.type] = db;
      }
    });
    
    const updatedConfig = {
      ...globalConfig,
      databases: databaseConfigSet
    };
    onUpdateGlobalConfig(updatedConfig);
  };

  const handleConfigurationImported = (importedConfig: GlobalConfig) => {
    onUpdateGlobalConfig(importedConfig);
  };

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
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">GLOBAL</span>
            </div>
            <Settings className="h-5 w-5" />
            Global Workspace Settings
          </DialogTitle>
          <DialogDescription>
            Configure global database connections and workspace-level settings that apply to all test cases.
            These settings serve as defaults and can be overridden at the folder level.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          <SimpleDatabaseConfig
            databases={globalConfig.databases ? Object.values(globalConfig.databases).filter(Boolean) : []}
            onDatabasesChange={handleGlobalDatabasesChange}
            level="global"
            title="Global Database Configurations"
            description="These database connections are available to all test cases in this workspace"
          />
          
          <div className="border-t pt-6">
            <ConfigurationImportExport
              onConfigurationImported={handleConfigurationImported}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};