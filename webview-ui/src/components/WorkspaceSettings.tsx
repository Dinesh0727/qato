import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DatabaseConfigEditor } from './DatabaseConfigEditor';
import { Settings, ChevronDown, ChevronRight, Save } from 'lucide-react';

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

interface WorkspaceTree {
  rootPath: string;
  folders: Array<{
    id: string;
    name: string;
    path: string;
    config?: FolderConfig;
  }>;
  globalConfig?: GlobalConfig;
}

interface WorkspaceSettingsProps {
  workspaceTree: WorkspaceTree | null;
  onUpdateGlobalConfig: (config: GlobalConfig) => void;
  onUpdateFolderConfig: (folderPath: string, config: FolderConfig) => void;
}

export const WorkspaceSettings = ({
  workspaceTree,
  onUpdateGlobalConfig,
  onUpdateFolderConfig
}: WorkspaceSettingsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  if (!workspaceTree) {
    return null;
  }

  const globalConfig = workspaceTree.globalConfig || {
    version: '1.0.0',
    databases: [],
    defaultDatabaseConnections: {}
  };

  const handleGlobalDatabasesChange = (databases: DatabaseConfig[]) => {
    const updatedConfig = {
      ...globalConfig,
      databases
    };
    onUpdateGlobalConfig(updatedConfig);
  };

  const handleFolderDatabasesChange = (folderPath: string, databases: DatabaseConfig[]) => {
    const folder = workspaceTree.folders.find(f => f.path === folderPath);
    if (!folder) return;

    const updatedConfig = {
      ...folder.config,
      databases
    };
    onUpdateFolderConfig(folderPath, updatedConfig);
  };

  return (
    <Card className="w-full">
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="p-0 w-6 h-6">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Workspace Settings
              </CardTitle>
              {!isExpanded && (
                <CardDescription className="text-xs">
                  Database configurations and workspace settings • Click to manage
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {(globalConfig.databases?.length || 0) + 
               workspaceTree.folders.reduce((acc, f) => acc + (f.config?.databases?.length || 0), 0)} DB Configs
            </Badge>
          </div>
        </div>
        {isExpanded && (
          <CardDescription>
            Manage database connections and workspace-level settings
          </CardDescription>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Global Database Configuration */}
          <DatabaseConfigEditor
            databases={globalConfig.databases || []}
            onDatabasesChange={handleGlobalDatabasesChange}
            level="global"
            title="Global Database Configurations"
            description="These database connections are available to all test cases in this workspace"
          />

          <Separator />

          {/* Folder-Level Database Configurations */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Folder-Level Database Configurations</h3>
              <p className="text-sm text-muted-foreground">
                Configure database connections specific to individual folders
              </p>
            </div>

            {workspaceTree.folders.map((folder) => (
              <DatabaseConfigEditor
                key={folder.id}
                databases={folder.config?.databases || []}
                onDatabasesChange={(databases) => handleFolderDatabasesChange(folder.path, databases)}
                level="folder"
                title={`${folder.name} Database Configurations`}
                description={`Database connections specific to the "${folder.name}" folder`}
              />
            ))}
          </div>

          <Separator />

          {/* Workspace Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Workspace Root: {workspaceTree.rootPath}</div>
            <div>Configuration Version: {globalConfig.version}</div>
            <div>Total Folders: {workspaceTree.folders.length}</div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};