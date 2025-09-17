import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Globe, Folder, ArrowRight, Database } from 'lucide-react';

interface DatabaseConfig {
  id: string;
  name: string;
  type: 'mysql' | 'redis' | 'clickhouse';
  host: string;
  port: number;
}

interface InheritanceLevel {
  level: 'global' | 'folder';
  name: string;
  databases: DatabaseConfig[];
}

interface InheritanceChainProps {
  chain: InheritanceLevel[];
  currentLevel: 'global' | 'folder';
  className?: string;
}

export const InheritanceChain = ({ chain, currentLevel, className = "" }: InheritanceChainProps) => {
  if (chain.length === 0) return null;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'mysql': return 'bg-blue-500';
      case 'redis': return 'bg-red-500';
      case 'clickhouse': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={`p-3 bg-muted/30 rounded-lg border ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Database className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Configuration Inheritance</span>
      </div>
      
      <div className="space-y-3">
        {chain.map((level, index) => (
          <div key={`${level.level}-${level.name}`}>
            <div className="flex items-center gap-2 mb-2">
              {level.level === 'global' ? (
                <Globe className="h-3 w-3 text-blue-500" />
              ) : (
                <Folder className="h-3 w-3 text-orange-500" />
              )}
              <Badge 
                variant={level.level === currentLevel ? 'default' : 'outline'}
                className="text-xs"
              >
                {level.level === 'global' ? 'Global' : level.name}
              </Badge>
              {level.databases.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({level.databases.length} config{level.databases.length !== 1 ? 's' : ''})
                </span>
              )}
            </div>
            
            {level.databases.length > 0 && (
              <div className="ml-5 space-y-1">
                {level.databases.map((db) => (
                  <div key={db.id} className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full ${getTypeColor(db.type)}`} />
                    <span className={level.level === currentLevel ? 'font-medium' : 'text-muted-foreground'}>
                      {db.name}
                    </span>
                    <span className="text-muted-foreground">
                      ({db.host}:{db.port})
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {index < chain.length - 1 && (
              <div className="flex items-center justify-center my-2">
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
      </div>
      
      <Separator className="my-3" />
      
      <div className="text-xs text-muted-foreground">
        {currentLevel === 'folder' 
          ? 'Folder configurations override global settings for this folder and its test cases.'
          : 'Global configurations apply to all folders unless overridden at the folder level.'
        }
      </div>
    </div>
  );
};