import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Database, Globe, Folder, CheckCircle, AlertCircle } from 'lucide-react';

interface DatabaseConfig {
  id: string;
  name: string;
  type: 'mysql' | 'redis' | 'clickhouse';
  host: string;
  port: number;
}

interface DatabaseStatusIndicatorProps {
  databases: DatabaseConfig[];
  level: 'global' | 'folder';
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  showTypes?: boolean;
}

export const DatabaseStatusIndicator = ({
  databases,
  level,
  size = 'sm',
  showCount = true,
  showTypes = false
}: DatabaseStatusIndicatorProps) => {
  if (databases.length === 0) return null;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'mysql': return 'bg-blue-500';
      case 'redis': return 'bg-red-500';
      case 'clickhouse': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeCount = (type: 'mysql' | 'redis' | 'clickhouse') => {
    return databases.filter(db => db.type === type).length;
  };

  const iconSize = size === 'lg' ? 'h-4 w-4' : size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3';
  const dotSize = size === 'lg' ? 'w-3 h-3' : size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2';

  const tooltipContent = (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {level === 'global' ? (
          <>
            <Globe className="h-3 w-3" />
            <span className="text-xs font-medium">Global Configurations</span>
          </>
        ) : (
          <>
            <Folder className="h-3 w-3" />
            <span className="text-xs font-medium">Folder Configurations</span>
          </>
        )}
      </div>
      <div className="space-y-1">
        {databases.map((db) => (
          <div key={db.id} className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${getTypeColor(db.type)}`} />
            <span>{db.name}</span>
            <span className="text-muted-foreground">({db.host}:{db.port})</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            <div className={`${dotSize} rounded-full bg-green-500 animate-pulse`} />
            <Database className={`${iconSize} text-green-500`} />
            {showCount && (
              <span className="text-xs text-green-600 font-medium">{databases.length}</span>
            )}
            {showTypes && (
              <div className="flex items-center gap-1">
                {getTypeCount('mysql') > 0 && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mr-1" />
                    M
                  </Badge>
                )}
                {getTypeCount('redis') > 0 && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    <div className="w-2 h-2 rounded-full bg-red-500 mr-1" />
                    R
                  </Badge>
                )}
                {getTypeCount('clickhouse') > 0 && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 mr-1" />
                    C
                  </Badge>
                )}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};