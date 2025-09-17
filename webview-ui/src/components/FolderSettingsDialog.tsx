import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { SimpleDatabaseConfig } from './SimpleDatabaseConfig';
import { InheritanceChain } from './InheritanceChain';

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

interface DatabaseConfigSet {
  mysql?: DatabaseConfig;
  redis?: DatabaseConfig;
  clickhouse?: DatabaseConfig;
}

interface FolderConfig {
  description?: string;
  defaultCollectionSettings?: {
    timeout?: number;
  };
  databases?: DatabaseConfigSet;
  defaultDatabaseConnections?: {
    sql?: string;
    redis?: string;
    clickhouse?: string;
  };
}

interface FolderSettingsDialogProps {
  folderName: string;
  folderPath: string;
  folderConfig: FolderConfig;
  onUpdateFolderConfig: (folderPath: string, config: FolderConfig) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  globalDatabases?: DatabaseConfig[];
}

export const FolderSettingsDialog = ({
  folderName,
  folderPath,
  folderConfig,
  onUpdateFolderConfig,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  globalDatabases = []
}: FolderSettingsDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use external open state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  const handleFolderDatabasesChange = (databases: DatabaseConfig[]) => {
    // Convert array to DatabaseConfigSet
    const databaseConfigSet: DatabaseConfigSet = {};
    databases.forEach(db => {
      if (db.type === 'mysql' || db.type === 'redis' || db.type === 'clickhouse') {
        databaseConfigSet[db.type] = db;
      }
    });
    
    const updatedConfig = {
      ...folderConfig,
      databases: databaseConfigSet
    };
    onUpdateFolderConfig(folderPath, updatedConfig);
  };

  // Convert DatabaseConfigSet to array for SimpleDatabaseConfig
  const databasesArray: DatabaseConfig[] = [];
  if (folderConfig.databases) {
    const { mysql, redis, clickhouse } = folderConfig.databases;
    if (mysql) databasesArray.push(mysql);
    if (redis) databasesArray.push(redis);
    if (clickhouse) databasesArray.push(clickhouse);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!externalOpen && (
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-0 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            onClick={(e) => e.stopPropagation()}
            title="Database Configuration"
          >
            <Settings className="h-3 w-3" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent 
        className="max-w-4xl max-h-[80vh] overflow-y-auto" 
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 rounded-full">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-xs font-medium text-orange-700 dark:text-orange-300">FOLDER</span>
            </div>
            <Settings className="h-5 w-5" />
            {folderName} Folder Settings
          </DialogTitle>
          <DialogDescription>
            Configure database connections and settings specific to the "{folderName}" folder.
            These settings override global configurations for this folder and its test cases.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          {globalDatabases.length > 0 && (
            <InheritanceChain
              chain={[
                {
                  level: 'global',
                  name: 'Global',
                  databases: globalDatabases
                },
                {
                  level: 'folder',
                  name: folderName,
                  databases: databasesArray
                }
              ]}
              currentLevel="folder"
            />
          )}
          
          <SimpleDatabaseConfig
            databases={databasesArray}
            onDatabasesChange={handleFolderDatabasesChange}
            level="folder"
            title={`${folderName} Database Configurations`}
            description={`Database connections specific to the "${folderName}" folder`}
            inheritedDatabases={globalDatabases}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};