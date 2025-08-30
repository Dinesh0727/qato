import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Database, Save, X } from 'lucide-react';

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

interface SimpleDatabaseConfigProps {
  databases: DatabaseConfig[];
  onDatabasesChange: (databases: DatabaseConfig[]) => void;
  level: 'global' | 'folder';
  title?: string;
  description?: string;
}

export const SimpleDatabaseConfig = ({
  databases,
  onDatabasesChange,
  level,
  title = "Database Configurations",
  description = "Configure database connections for your test cases"
}: SimpleDatabaseConfigProps) => {
  const [configs, setConfigs] = useState<{
    mysql?: DatabaseConfig;
    redis?: DatabaseConfig;
    clickhouse?: DatabaseConfig;
  }>(() => {
    const configMap: any = {};
    databases.forEach(db => {
      if (db.type === 'mysql' || db.type === 'redis' || db.type === 'clickhouse') {
        configMap[db.type] = db;
      }
    });
    return configMap;
  });

  const getDefaultPort = (type: string): number => {
    switch (type) {
      case 'mysql': return 3306;
      case 'redis': return 6379;
      case 'clickhouse': return 9000;
      default: return 3306;
    }
  };

  const createDefaultConfig = (type: 'mysql' | 'redis' | 'clickhouse'): DatabaseConfig => ({
    id: `${type}-${Date.now()}`,
    name: `${type.charAt(0).toUpperCase() + type.slice(1)} Connection`,
    type,
    host: 'localhost',
    port: getDefaultPort(type),
    database: type !== 'redis' ? 'test_db' : undefined,
    username: type !== 'redis' ? 'root' : undefined,
    password: type !== 'redis' ? '' : undefined,
    timeout: 30000,
    maxConnections: 10,
    ssl: false,
    description: `${type.charAt(0).toUpperCase() + type.slice(1)} database connection`
  });

  const handleConfigChange = (type: 'mysql' | 'redis' | 'clickhouse', updates: Partial<DatabaseConfig>) => {
    const currentConfig = configs[type] || createDefaultConfig(type);
    const updatedConfig = { ...currentConfig, ...updates };
    
    const newConfigs = { ...configs, [type]: updatedConfig };
    setConfigs(newConfigs);
    
    // Update the databases array
    const updatedDatabases = databases.filter(db => db.type !== type);
    updatedDatabases.push(updatedConfig);
    onDatabasesChange(updatedDatabases);
  };

  const handleRemoveConfig = (type: 'mysql' | 'redis' | 'clickhouse') => {
    const newConfigs = { ...configs };
    delete newConfigs[type];
    setConfigs(newConfigs);
    
    // Update the databases array
    const updatedDatabases = databases.filter(db => db.type !== type);
    onDatabasesChange(updatedDatabases);
  };

  const handleAddConfig = (type: 'mysql' | 'redis' | 'clickhouse') => {
    const newConfig = createDefaultConfig(type);
    const newConfigs = { ...configs, [type]: newConfig };
    setConfigs(newConfigs);
    
    // Update the databases array
    const updatedDatabases = [...databases.filter(db => db.type !== type), newConfig];
    onDatabasesChange(updatedDatabases);
  };

  const DatabaseForm = ({ 
    type, 
    config 
  }: { 
    type: 'mysql' | 'redis' | 'clickhouse'; 
    config: DatabaseConfig;
  }) => (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            type === 'mysql' ? 'bg-blue-500' :
            type === 'redis' ? 'bg-red-500' :
            'bg-yellow-500'
          }`} />
          <h4 className="font-medium">{type.charAt(0).toUpperCase() + type.slice(1)} Configuration</h4>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleRemoveConfig(type)}
          className="text-destructive hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${type}-name`}>Connection Name</Label>
          <Input
            id={`${type}-name`}
            value={config.name}
            onChange={(e) => handleConfigChange(type, { name: e.target.value })}
            placeholder={`${type.charAt(0).toUpperCase() + type.slice(1)} Connection`}
          />
        </div>
        <div>
          <Label htmlFor={`${type}-host`}>Host</Label>
          <Input
            id={`${type}-host`}
            value={config.host}
            onChange={(e) => handleConfigChange(type, { host: e.target.value })}
            placeholder="localhost"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${type}-port`}>Port</Label>
          <Input
            id={`${type}-port`}
            type="number"
            value={config.port}
            onChange={(e) => handleConfigChange(type, { port: parseInt(e.target.value) || getDefaultPort(type) })}
            placeholder={getDefaultPort(type).toString()}
          />
        </div>
        {type !== 'redis' && (
          <div>
            <Label htmlFor={`${type}-database`}>Database Name</Label>
            <Input
              id={`${type}-database`}
              value={config.database || ''}
              onChange={(e) => handleConfigChange(type, { database: e.target.value })}
              placeholder="test_db"
            />
          </div>
        )}
      </div>

      {type !== 'redis' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`${type}-username`}>Username</Label>
            <Input
              id={`${type}-username`}
              value={config.username || ''}
              onChange={(e) => handleConfigChange(type, { username: e.target.value })}
              placeholder="root"
            />
          </div>
          <div>
            <Label htmlFor={`${type}-password`}>Password</Label>
            <Input
              id={`${type}-password`}
              type="password"
              value={config.password || ''}
              onChange={(e) => handleConfigChange(type, { password: e.target.value })}
              placeholder="••••••••"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${type}-timeout`}>Timeout (ms)</Label>
          <Input
            id={`${type}-timeout`}
            type="number"
            value={config.timeout || ''}
            onChange={(e) => handleConfigChange(type, { timeout: parseInt(e.target.value) || 30000 })}
            placeholder="30000"
          />
        </div>
        <div>
          <Label htmlFor={`${type}-maxConnections`}>Max Connections</Label>
          <Input
            id={`${type}-maxConnections`}
            type="number"
            value={config.maxConnections || ''}
            onChange={(e) => handleConfigChange(type, { maxConnections: parseInt(e.target.value) || 10 })}
            placeholder="10"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id={`${type}-ssl`}
          checked={config.ssl || false}
          onCheckedChange={(checked) => handleConfigChange(type, { ssl: checked })}
        />
        <Label htmlFor={`${type}-ssl`}>Enable SSL</Label>
      </div>

      <div>
        <Label htmlFor={`${type}-description`}>Description</Label>
        <Textarea
          id={`${type}-description`}
          value={config.description || ''}
          onChange={(e) => handleConfigChange(type, { description: e.target.value })}
          placeholder={`Optional description for this ${type} connection`}
          rows={2}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-5 w-5" />
          <h3 className="text-lg font-medium">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-4">
        {/* MySQL Configuration */}
        {configs.mysql ? (
          <DatabaseForm type="mysql" config={configs.mysql} />
        ) : (
          <div className="p-4 border-2 border-dashed rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm font-medium">MySQL Configuration</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddConfig('mysql')}
            >
              Add MySQL Connection
            </Button>
          </div>
        )}

        {/* Redis Configuration */}
        {configs.redis ? (
          <DatabaseForm type="redis" config={configs.redis} />
        ) : (
          <div className="p-4 border-2 border-dashed rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm font-medium">Redis Configuration</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddConfig('redis')}
            >
              Add Redis Connection
            </Button>
          </div>
        )}

        {/* ClickHouse Configuration */}
        {configs.clickhouse ? (
          <DatabaseForm type="clickhouse" config={configs.clickhouse} />
        ) : (
          <div className="p-4 border-2 border-dashed rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-sm font-medium">ClickHouse Configuration</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddConfig('clickhouse')}
            >
              Add ClickHouse Connection
            </Button>
          </div>
        )}
      </div>

      <Separator />
      <div className="text-xs text-muted-foreground">
        These database connections will be available for {level === 'global' ? 'all test cases in this workspace' : 'test cases in this folder'}.
      </div>
    </div>
  );
};