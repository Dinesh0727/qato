import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Database, Globe, Folder, Settings, CheckCircle, AlertTriangle } from 'lucide-react';

interface DatabaseConfig {
  id: string;
  name: string;
  type: 'mysql' | 'redis' | 'clickhouse';
  host: string;
  port: number;
}

interface ConfigurationStatusSummaryProps {
  globalDatabases: DatabaseConfig[];
  folderDatabases: DatabaseConfig[];
  onOpenGlobalSettings: () => void;
  className?: string;
}

export const ConfigurationStatusSummary = ({
  globalDatabases,
  folderDatabases,
  onOpenGlobalSettings,
  className = ""
}: ConfigurationStatusSummaryProps) => {
  const totalConfigurations = globalDatabases.length + folderDatabases.length;
  const hasGlobalConfigs = globalDatabases.length > 0;
  const hasFolderConfigs = folderDatabases.length > 0;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'mysql': return 'bg-blue-500';
      case 'redis': return 'bg-red-500';
      case 'clickhouse': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getConfigsByType = (databases: DatabaseConfig[], type: 'mysql' | 'redis' | 'clickhouse') => {
    return databases.filter(db => db.type === type);
  };

  const tooltipContent = (
    <div className="space-y-3 max-w-sm">
      <div className="text-sm font-medium">Database Configuration Summary</div>
      
      {hasGlobalConfigs && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Globe className="h-3 w-3" />
            <span className="text-xs font-medium">Global ({globalDatabases.length})</span>
          </div>
          <div className="space-y-1 ml-5">
            {globalDatabases.map((db) => (
              <div key={db.id} className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${getTypeColor(db.type)}`} />
                <span>{db.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasFolderConfigs && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Folder className="h-3 w-3" />
            <span className="text-xs font-medium">Folder Overrides ({folderDatabases.length})</span>
          </div>
          <div className="space-y-1 ml-5">
            {folderDatabases.map((db) => (
              <div key={db.id} className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${getTypeColor(db.type)}`} />
                <span>{db.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasGlobalConfigs && !hasFolderConfigs && (
        <div className="text-xs text-muted-foreground">
          No database configurations found. Click to set up global configurations.
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenGlobalSettings}
            className={`flex items-center gap-2 ${className}`}
          >
            <Database className="h-4 w-4" />
            {totalConfigurations > 0 ? (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span className="text-xs font-medium">{totalConfigurations}</span>
                {hasGlobalConfigs && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    <Globe className="h-2 w-2 mr-1" />
                    {globalDatabases.length}
                  </Badge>
                )}
                {hasFolderConfigs && (
                  <Badge variant="secondary" className="text-xs px-1 py-0">
                    <Folder className="h-2 w-2 mr-1" />
                    {folderDatabases.length}
                  </Badge>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                <span className="text-xs text-muted-foreground">Setup</span>
              </div>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};