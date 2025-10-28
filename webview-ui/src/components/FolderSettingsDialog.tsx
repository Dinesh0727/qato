import { useState } from 'react';
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

interface FolderConfig {
  description?: string;
  defaultCollectionSettings?: {
    timeout?: number;
  };
  databases?: DatabaseConfig[];
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
}

export const FolderSettingsDialog = ({
  folderName,
  folderPath,
  folderConfig,
  onUpdateFolderConfig
}: FolderSettingsDialogProps) => {
  const [open, setOpen] = useState(false);

  const handleFolderDatabasesChange = (databases: DatabaseConfig[]) => {
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
      ...folderConfig,
      databases,
      defaultDatabaseConnections
    };
    
    console.log('🔧 FolderSettingsDialog: Saving folder config with defaultDatabaseConnections:', defaultDatabaseConnections);
    onUpdateFolderConfig(folderPath, updatedConfig);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="p-0 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <Settings className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="max-w-4xl max-h-[80vh] overflow-y-auto" 
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {folderName} Folder Settings
          </DialogTitle>
          <DialogDescription>
            Configure database connections and settings specific to the "{folderName}" folder.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <SimpleDatabaseConfig
            databases={folderConfig.databases || []}
            onDatabasesChange={handleFolderDatabasesChange}
            level="folder"
            title={`${folderName} Database Configurations`}
            description={`Database connections specific to the "${folderName}" folder`}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};