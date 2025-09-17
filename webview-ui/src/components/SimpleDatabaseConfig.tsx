import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, X, Zap, CheckCircle, XCircle, Loader2, ArrowDown, Edit3, Globe, Folder } from 'lucide-react';
import { DatabaseConfig } from '../types';

interface SimpleDatabaseConfigProps {
  databases: DatabaseConfig[];
  onDatabasesChange: (databases: DatabaseConfig[]) => void;
  level: 'global' | 'folder';
  title?: string;
  description?: string;
  inheritedDatabases?: DatabaseConfig[];
}

export const SimpleDatabaseConfig = ({
  databases,
  onDatabasesChange,
  level,
  title = "Database Configurations",
  description = "Configure database connections for your test cases",
  inheritedDatabases = []
}: SimpleDatabaseConfigProps) => {
  const [configs, setConfigs] = useState<{
    mysql?: DatabaseConfig;
    redis?: DatabaseConfig;
    clickhouse?: DatabaseConfig;
  }>(() => {
    const configMap: { [key: string]: DatabaseConfig } = {};
    databases.forEach(db => {
      if (db.type === 'mysql' || db.type === 'redis' || db.type === 'clickhouse') {
        configMap[db.type] = db;
      }
    });
    return configMap;
  });

  const [testingConnections, setTestingConnections] = useState<Set<string>>(new Set());
  type ConnectionTestDetails = {
    host?: string;
    port?: number;
    response?: string;
    code?: string;
    statusCode?: number;
  };
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; error?: string; details?: ConnectionTestDetails }>>({});
  const [savingConfigs, setSavingConfigs] = useState<Set<string>>(new Set());

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
    database: type === 'redis' ? '0' : 'test_db',
    username: type !== 'redis' ? 'root' : undefined,
    password: type !== 'redis' ? '' : undefined,
    timeout: 30000,
    maxConnections: 10,
    ssl: false,
    description: `${type.charAt(0).toUpperCase() + type.slice(1)} database connection`
  });

  // Keep local configs in sync if parent-provided databases change (e.g., import/reset)
  useEffect(() => {
    const configMap: { [key: string]: DatabaseConfig } = {};
    databases.forEach(db => {
      if (db.type === 'mysql' || db.type === 'redis' || db.type === 'clickhouse') {
        configMap[db.type] = db;
      }
    });
    setConfigs(configMap);
  }, [databases]);

  // Update only local state while typing; do not propagate to parent yet
  const updateLocalConfig = (type: 'mysql' | 'redis' | 'clickhouse', updates: Partial<DatabaseConfig>) => {
    const currentConfig = configs[type] || createDefaultConfig(type);
    const updatedConfig = { ...currentConfig, ...updates };
    setConfigs(prev => ({ ...prev, [type]: updatedConfig }));
  };

  // Commit current local config to parent (called onBlur or explicit actions)
  const commitConfig = (type: 'mysql' | 'redis' | 'clickhouse') => {
    const currentConfig = configs[type] || createDefaultConfig(type);
    setSavingConfigs(prev => new Set([...prev, type]));
    const updatedDatabases = databases.filter(db => db.type !== type);
    updatedDatabases.push(currentConfig);
    onDatabasesChange(updatedDatabases);
    setTimeout(() => {
      setSavingConfigs(prev => {
        const newSet = new Set(prev);
        newSet.delete(type);
        return newSet;
      });
    }, 300);
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

  const handleTestConnection = async (type: 'mysql' | 'redis' | 'clickhouse', config: DatabaseConfig) => {
    const testKey = `${type}-${config.id}`;
    setTestingConnections(prev => new Set([...prev, testKey]));
    setTestResults(prev => ({ ...prev, [testKey]: { success: false } }));

    try {
      // Send test connection message to extension
      const vscode = (window as unknown as { acquireVsCodeApi: () => { postMessage: (msg: unknown) => void } }).acquireVsCodeApi();
      vscode.postMessage({
        command: 'testDatabaseConnection',
        payload: { config }
      });

      // Listen for response
      const handleMessage = (event: MessageEvent) => {
        const message = event.data;
        if (message.command === 'databaseConnectionTestResult') {
          setTestResults(prev => ({ ...prev, [testKey]: message.payload }));
          setTestingConnections(prev => {
            const newSet = new Set(prev);
            newSet.delete(testKey);
            return newSet;
          });
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);

      // Timeout after 30 seconds
      setTimeout(() => {
        setTestingConnections(prev => {
          const newSet = new Set(prev);
          newSet.delete(testKey);
          return newSet;
        });
        setTestResults(prev => ({ 
          ...prev, 
          [testKey]: { 
            success: false, 
            error: 'Connection test timed out after 30 seconds' 
          } 
        }));
        window.removeEventListener('message', handleMessage);
      }, 30000);

    } catch (error: unknown) {
      setTestingConnections(prev => {
        const newSet = new Set(prev);
        newSet.delete(testKey);
        return newSet;
      });
      setTestResults(prev => ({ 
        ...prev, 
        [testKey]: { 
          success: false, 
          error: (error as Error).message || 'Connection test failed' 
        } 
      }));
    }
  };

  // Helper function to get inherited config for a specific type
  const getInheritedConfig = (type: 'mysql' | 'redis' | 'clickhouse'): DatabaseConfig | undefined => {
    return inheritedDatabases.find(db => db.type === type);
  };

  // Helper function to check if a field is inherited
  const isFieldInherited = (type: 'mysql' | 'redis' | 'clickhouse', field: keyof DatabaseConfig): boolean => {
    if (level === 'global') return false;
    const inheritedConfig = getInheritedConfig(type);
    const currentConfig = configs[type];
    if (!inheritedConfig || !currentConfig) return false;
    return currentConfig[field] === inheritedConfig[field];
  };

  const DatabaseForm = ({ 
    type, 
    config 
  }: { 
    type: 'mysql' | 'redis' | 'clickhouse'; 
    config: DatabaseConfig;
  }) => {
    const testKey = `${type}-${config.id}`;
    const isTestingConnection = testingConnections.has(testKey);
    const isSaving = savingConfigs.has(type);
    const testResult = testResults[testKey];
    const isFormValid = config.host && config.port && (type === 'redis' || (config.database && config.username));
    const inheritedConfig = getInheritedConfig(type);

    return (
      <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              type === 'mysql' ? 'bg-blue-500' :
              type === 'redis' ? 'bg-red-500' :
              'bg-yellow-500'
            }`} />
            <h4 className="font-medium">{type.charAt(0).toUpperCase() + type.slice(1)} Configuration</h4>
            {level === 'folder' && inheritedConfig && (
              <Badge variant="outline" className="text-xs">
                <ArrowDown className="h-3 w-3 mr-1" />
                Inherits from Global
              </Badge>
            )}
            {level === 'folder' && !inheritedConfig && (
              <Badge variant="secondary" className="text-xs">
                <Edit3 className="h-3 w-3 mr-1" />
                Folder Override
              </Badge>
            )}
            {isSaving && (
              <Badge variant="outline" className="text-xs animate-pulse">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Saving...
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTestConnection(type, config)}
              disabled={!isFormValid || isTestingConnection}
            >
              {isTestingConnection ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Test
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRemoveConfig(type)}
              className="text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Label htmlFor={`${type}-name`}>Connection Name</Label>
            {isFieldInherited(type, 'name') && (
              <Badge variant="outline" className="text-xs">
                <ArrowDown className="h-3 w-3 mr-1" />
                Inherited
              </Badge>
            )}
          </div>
          <Input
            id={`${type}-name`}
            value={config.name}
            onChange={(e) => updateLocalConfig(type, { name: e.target.value })}
            onBlur={() => commitConfig(type)}
            placeholder={`${type.charAt(0).toUpperCase() + type.slice(1)} Connection`}
          />
          {inheritedConfig && inheritedConfig.name && config.name !== inheritedConfig.name && (
            <p className="text-xs text-muted-foreground mt-1">
              Global: {inheritedConfig.name}
            </p>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Label htmlFor={`${type}-host`}>Host</Label>
            {isFieldInherited(type, 'host') && (
              <Badge variant="outline" className="text-xs">
                <ArrowDown className="h-3 w-3 mr-1" />
                Inherited
              </Badge>
            )}
          </div>
          <Input
            id={`${type}-host`}
            value={config.host}
            onChange={(e) => updateLocalConfig(type, { host: e.target.value })}
            onBlur={() => commitConfig(type)}
            placeholder="localhost"
          />
          {inheritedConfig && inheritedConfig.host && config.host !== inheritedConfig.host && (
            <p className="text-xs text-muted-foreground mt-1">
              Global: {inheritedConfig.host}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Label htmlFor={`${type}-port`}>Port</Label>
            {isFieldInherited(type, 'port') && (
              <Badge variant="outline" className="text-xs">
                <ArrowDown className="h-3 w-3 mr-1" />
                Inherited
              </Badge>
            )}
          </div>
          <Input
            id={`${type}-port`}
            type="number"
            value={config.port}
            onChange={(e) => updateLocalConfig(type, { port: parseInt(e.target.value) || getDefaultPort(type) })}
            onBlur={() => commitConfig(type)}
            placeholder={getDefaultPort(type).toString()}
          />
          {inheritedConfig && inheritedConfig.port && config.port !== inheritedConfig.port && (
            <p className="text-xs text-muted-foreground mt-1">
              Global: {inheritedConfig.port}
            </p>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Label htmlFor={`${type}-database`}>
              {type === 'redis' ? 'Database Number' : 'Database Name'}
            </Label>
            {isFieldInherited(type, 'database') && (
              <Badge variant="outline" className="text-xs">
                <ArrowDown className="h-3 w-3 mr-1" />
                Inherited
              </Badge>
            )}
          </div>
          {type === 'redis' ? (
            <Input
              id={`${type}-database`}
              type="number"
              value={config.database || '0'}
              onChange={(e) => updateLocalConfig(type, { database: e.target.value || '0' })}
              onBlur={() => commitConfig(type)}
              placeholder="0"
              min="0"
              max="15"
            />
          ) : (
            <Input
              id={`${type}-database`}
              value={config.database || ''}
              onChange={(e) => updateLocalConfig(type, { database: e.target.value })}
              onBlur={() => commitConfig(type)}
              placeholder="test_db"
            />
          )}
          {inheritedConfig && inheritedConfig.database && config.database !== inheritedConfig.database && (
            <p className="text-xs text-muted-foreground mt-1">
              Global: {inheritedConfig.database}
            </p>
          )}
        </div>
      </div>

      {type !== 'redis' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`${type}-username`}>Username</Label>
            <Input
              id={`${type}-username`}
              value={config.username || ''}
              onChange={(e) => updateLocalConfig(type, { username: e.target.value })}
              onBlur={() => commitConfig(type)}
              placeholder="root"
            />
          </div>
          <div>
            <Label htmlFor={`${type}-password`}>Password</Label>
            <Input
              id={`${type}-password`}
              type="password"
              value={config.password || ''}
              onChange={(e) => updateLocalConfig(type, { password: e.target.value })}
              onBlur={() => commitConfig(type)}
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
            onChange={(e) => updateLocalConfig(type, { timeout: parseInt(e.target.value) || 30000 })}
            onBlur={() => commitConfig(type)}
            placeholder="30000"
          />
        </div>
        <div>
          <Label htmlFor={`${type}-maxConnections`}>Max Connections</Label>
          <Input
            id={`${type}-maxConnections`}
            type="number"
            value={config.maxConnections || ''}
            onChange={(e) => updateLocalConfig(type, { maxConnections: parseInt(e.target.value) || 10 })}
            onBlur={() => commitConfig(type)}
            placeholder="10"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id={`${type}-ssl`}
          checked={config.ssl || false}
          onCheckedChange={(checked) => {
            updateLocalConfig(type, { ssl: checked });
            commitConfig(type);
          }}
        />
        <Label htmlFor={`${type}-ssl`}>Enable SSL</Label>
      </div>

      <div>
        <Label htmlFor={`${type}-description`}>Description</Label>
        <Textarea
          id={`${type}-description`}
          value={config.description || ''}
          onChange={(e) => updateLocalConfig(type, { description: e.target.value })}
          onBlur={() => commitConfig(type)}
          placeholder={`Optional description for this ${type} connection`}
          rows={2}
        />
      </div>

      {/* Connection Test Result */}
      {testResult && (
        <Alert className={testResult.success ? 'border-green-500' : 'border-red-500'}>
          {testResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
          <AlertDescription>
            <div className="space-y-2">
              <div>
                {testResult.success 
                  ? 'Connection test successful!' 
                  : `Connection test failed: ${testResult.error || 'Unknown error'}`
                }
              </div>
              {testResult.details && (
                <div className="text-xs text-muted-foreground">
                  {testResult.success ? (
                    <div>
                      Connected to {testResult.details.host}:{testResult.details.port}
                      {testResult.details.response && ` (${testResult.details.response})`}
                    </div>
                  ) : (
                    <div>
                      {testResult.details.code && `Error Code: ${testResult.details.code}`}
                      {testResult.details.statusCode && ` | HTTP Status: ${testResult.details.statusCode}`}
                    </div>
                  )}
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-5 w-5" />
          <h3 className="text-lg font-medium">{title}</h3>
          <Badge variant={level === 'global' ? 'default' : 'secondary'} className="text-xs">
            {level === 'global' ? (
              <>
                <Globe className="h-3 w-3 mr-1" />
                Global Level
              </>
            ) : (
              <>
                <Folder className="h-3 w-3 mr-1" />
                Folder Level
              </>
            )}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        {level === 'folder' && inheritedDatabases.length > 0 && (
          <div className="mt-2 p-2 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground">
              <ArrowDown className="h-3 w-3 inline mr-1" />
              Inheriting from {inheritedDatabases.length} global database configuration(s)
            </p>
          </div>
        )}
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