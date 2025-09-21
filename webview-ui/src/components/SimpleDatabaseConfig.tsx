import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Save, X, Plus, AlertCircle, CheckCircle } from 'lucide-react';

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
  databases?: DatabaseConfig[];
  onDatabasesChange: (databases: DatabaseConfig[]) => void;
  level: 'global' | 'folder';
  title?: string;
  description?: string;
}

export const SimpleDatabaseConfig = ({
  databases = [],
  onDatabasesChange,
  level,
  title = "Database Configurations",
  description = "Configure database connections for your test cases"
}: SimpleDatabaseConfigProps) => {
  // Use refs to store current form data - NO STATE UPDATES DURING TYPING
  const formDataRef = useRef<{
    mysql?: DatabaseConfig;
    redis?: DatabaseConfig;
    clickhouse?: DatabaseConfig;
  }>({});

  // Only state that matters for rendering UI structure
  const [activeConfigs, setActiveConfigs] = useState<{
    mysql: boolean;
    redis: boolean;
    clickhouse: boolean;
  }>({ mysql: false, redis: false, clickhouse: false });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Initialize from parent data
  const initializeFromDatabases = useCallback(() => {
    console.log('🔧 Initializing from databases:', databases);
    
    const configMap: any = {};
    const activeMap = { mysql: false, redis: false, clickhouse: false };
    
    if (Array.isArray(databases)) {
      databases.forEach(db => {
        if (db.type === 'mysql' || db.type === 'redis' || db.type === 'clickhouse') {
          configMap[db.type] = JSON.parse(JSON.stringify(db));
          activeMap[db.type] = true;
        }
      });
    }
    
    formDataRef.current = configMap;
    setActiveConfigs(activeMap);
    setHasUnsavedChanges(false);
    setSaveStatus('idle');
  }, [databases]);

  useEffect(() => {
    initializeFromDatabases();
  }, [initializeFromDatabases]);

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

  // Update form data in ref only - NO RE-RENDERS
  const updateFormData = (type: 'mysql' | 'redis' | 'clickhouse', field: string, value: unknown) => {
    if (!formDataRef.current[type]) {
      formDataRef.current[type] = createDefaultConfig(type);
    }
    
    (formDataRef.current[type] as any)[field] = value;
    
    // Only set unsaved changes flag - no other state updates
    if (!hasUnsavedChanges) {
      setHasUnsavedChanges(true);
      setSaveStatus('idle');
    }
  };

  const addConfig = (type: 'mysql' | 'redis' | 'clickhouse') => {
    console.log('➕ Adding config:', type);
    formDataRef.current[type] = createDefaultConfig(type);
    setActiveConfigs(prev => ({ ...prev, [type]: true }));
    setHasUnsavedChanges(true);
    setSaveStatus('idle');
  };

  const removeConfig = (type: 'mysql' | 'redis' | 'clickhouse') => {
    console.log('🗑️ Removing config:', type);
    delete formDataRef.current[type];
    setActiveConfigs(prev => ({ ...prev, [type]: false }));
    setHasUnsavedChanges(true);
    setSaveStatus('idle');
  };

  const handleSave = () => {
    console.log('💾 Saving configurations...');
    console.log('💾 Current form data:', formDataRef.current);
    setSaveStatus('saving');
    
    const updatedDatabases: DatabaseConfig[] = [];
    
    // Keep existing non-target databases
    const currentDatabases = Array.isArray(databases) ? databases : [];
    const otherDatabases = currentDatabases.filter(
      db => db.type !== 'mysql' && db.type !== 'redis' && db.type !== 'clickhouse'
    );
    updatedDatabases.push(...otherDatabases);
    
    // Add current form data
    Object.values(formDataRef.current).forEach(config => {
      if (config) {
        updatedDatabases.push(config);
      }
    });
    
    console.log('💾 Updated databases to save:', updatedDatabases);
    
    setTimeout(() => {
      console.log('💾 Calling onDatabasesChange with:', updatedDatabases);
      onDatabasesChange(updatedDatabases);
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
      
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 300);
  };

  const handleDiscard = () => {
    console.log('🚮 Discarding changes...');
    initializeFromDatabases();
  };

  // Controlled input component that uses refs
  const RefControlledInput = ({ 
    type,
    field,
    defaultValue,
    inputType = "text",
    placeholder,
    ...props 
  }: {
    type: 'mysql' | 'redis' | 'clickhouse';
    field: string;
    defaultValue: any;
    inputType?: string;
    placeholder?: string;
    [key: string]: any;
  }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    
    // Set initial value
    useEffect(() => {
      if (inputRef.current && defaultValue !== undefined) {
        inputRef.current.value = defaultValue.toString();
      }
    }, [defaultValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = inputType === 'number' ? 
        (parseInt(e.target.value) || 0) : 
        e.target.value;
      
      updateFormData(type, field, value);
    };

    return (
      <Input
        ref={inputRef}
        type={inputType}
        onChange={handleChange}
        placeholder={placeholder}
        {...props}
      />
    );
  };

  // Controlled textarea component that uses refs
  const RefControlledTextarea = ({ 
    type,
    field,
    defaultValue,
    placeholder,
    rows = 3,
    ...props 
  }: {
    type: 'mysql' | 'redis' | 'clickhouse';
    field: string;
    defaultValue: any;
    placeholder?: string;
    rows?: number;
    [key: string]: any;
  }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    // Set initial value
    useEffect(() => {
      if (textareaRef.current && defaultValue !== undefined) {
        textareaRef.current.value = defaultValue.toString();
      }
    }, [defaultValue]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateFormData(type, field, e.target.value);
    };

    return (
      <Textarea
        ref={textareaRef}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        {...props}
      />
    );
  };

  const DatabaseConfigForm = ({ 
    type, 
    config 
  }: { 
    type: 'mysql' | 'redis' | 'clickhouse'; 
    config: DatabaseConfig;
  }) => (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            type === 'mysql' ? 'bg-blue-500' :
            type === 'redis' ? 'bg-red-500' :
            'bg-yellow-500'
          }`} />
          <h4 className="font-medium">
            {type.charAt(0).toUpperCase() + type.slice(1)} Configuration
          </h4>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => removeConfig(type)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Connection Name</Label>
          <RefControlledInput
            type={type}
            field="name"
            defaultValue={config.name}
            placeholder={`${type.charAt(0).toUpperCase() + type.slice(1)} Connection`}
          />
        </div>
        <div className="space-y-2">
          <Label>Host</Label>
          <RefControlledInput
            type={type}
            field="host"
            defaultValue={config.host}
            placeholder="localhost"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Port</Label>
          <RefControlledInput
            type={type}
            field="port"
            inputType="number"
            defaultValue={config.port}
            placeholder={getDefaultPort(type).toString()}
          />
        </div>
        {type !== 'redis' && (
          <div className="space-y-2">
            <Label>Database Name</Label>
            <RefControlledInput
              type={type}
              field="database"
              defaultValue={config.database || ''}
              placeholder="test_db"
            />
          </div>
        )}
      </div>

      {type !== 'redis' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Username</Label>
            <RefControlledInput
              type={type}
              field="username"
              defaultValue={config.username || ''}
              placeholder="root"
            />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <RefControlledInput
              type={type}
              field="password"
              inputType="password"
              defaultValue={config.password || ''}
              placeholder="••••••••"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Timeout (ms)</Label>
          <RefControlledInput
            type={type}
            field="timeout"
            inputType="number"
            defaultValue={config.timeout || 30000}
            placeholder="30000"
          />
        </div>
        <div className="space-y-2">
          <Label>Max Connections</Label>
          <RefControlledInput
            type={type}
            field="maxConnections"
            inputType="number"
            defaultValue={config.maxConnections || 10}
            placeholder="10"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={config.ssl || false}
          onCheckedChange={(checked) => updateFormData(type, 'ssl', checked)}
        />
        <Label>Enable SSL</Label>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <RefControlledTextarea
          type={type}
          field="description"
          defaultValue={config.description || ''}
          placeholder={`Optional description for this ${type} connection`}
        />
      </div>
    </div>
  );

  const DatabaseTypeCard = ({ 
    type,
    colorClass,
    displayName 
  }: { 
    type: 'mysql' | 'redis' | 'clickhouse';
    colorClass: string;
    displayName: string;
  }) => (
    <div className="p-6 border-2 border-dashed rounded-lg text-center hover:border-primary/50 transition-colors">
      <div className="flex items-center justify-center gap-2 mb-3">
        <div className={`w-4 h-4 rounded-full ${colorClass}`} />
        <span className="font-medium text-muted-foreground">{displayName} Configuration</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => addConfig(type)}
        className="hover:bg-primary/10"
      >
        <Plus className="h-4 w-4 mr-1" />
        Add {displayName} Connection
      </Button>
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

      {hasUnsavedChanges && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Click "Save Changes" to apply them or "Discard Changes" to reset.
          </AlertDescription>
        </Alert>
      )}

      {saveStatus === 'saved' && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Database configurations saved successfully!
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {activeConfigs.mysql ? (
          <DatabaseConfigForm 
            type="mysql" 
            config={formDataRef.current.mysql || createDefaultConfig('mysql')} 
          />
        ) : (
          <DatabaseTypeCard 
            type="mysql" 
            colorClass="bg-blue-500" 
            displayName="MySQL" 
          />
        )}

        {activeConfigs.redis ? (
          <DatabaseConfigForm 
            type="redis" 
            config={formDataRef.current.redis || createDefaultConfig('redis')} 
          />
        ) : (
          <DatabaseTypeCard 
            type="redis" 
            colorClass="bg-red-500" 
            displayName="Redis" 
          />
        )}

        {activeConfigs.clickhouse ? (
          <DatabaseConfigForm 
            type="clickhouse" 
            config={formDataRef.current.clickhouse || createDefaultConfig('clickhouse')} 
          />
        ) : (
          <DatabaseTypeCard 
            type="clickhouse" 
            colorClass="bg-yellow-500" 
            displayName="ClickHouse" 
          />
        )}
      </div>

      <div className="flex items-center justify-between pt-4">
        <div className="text-xs text-muted-foreground">
          These database connections will be available for{' '}
          {level === 'global' 
            ? 'all test cases in this workspace' 
            : 'test cases in this folder'
          }.
        </div>
        
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscard}
              disabled={saveStatus === 'saving'}
            >
              <X className="h-4 w-4 mr-1" />
              Discard Changes
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saveStatus === 'saving'}
            size="sm"
            className="min-w-[120px]"
          >
            {saveStatus === 'saving' ? (
              <>
                <div className="w-4 h-4 mr-1 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <Separator className="my-4" />
    </div>
  );
};