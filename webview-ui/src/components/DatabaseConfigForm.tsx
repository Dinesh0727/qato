import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Database,
  Zap,
  CheckCircle,
  XCircle,
  Loader2,
  Info,
  ArrowDown,
  Edit3,
  Globe,
  Folder,
  Save
} from 'lucide-react';
import { DatabaseConfig, DatabaseConfigFormProps } from '@/types';

export const DatabaseConfigForm = ({
  config,
  type,
  onChange,
  onTest,
  level,
  inheritedConfig
}: DatabaseConfigFormProps) => {
  const [localConfig, setLocalConfig] = useState<DatabaseConfig>(config);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string; details?: any } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update local config when prop changes, but only if it's actually different
  useEffect(() => {
    // Only update if the config has actually changed to prevent unnecessary re-renders
    if (JSON.stringify(config) !== JSON.stringify(localConfig)) {
      setLocalConfig(config);
    }
  }, [config]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const getDefaultPort = (dbType: string): number => {
    switch (dbType) {
      case 'mysql': return 3306;
      case 'redis': return 6379;
      case 'clickhouse': return 9000;
      default: return 3306;
    }
  };

  const validateField = (field: string, value: any): string | null => {
    switch (field) {
      case 'name':
        return !value || value.trim() === '' ? 'Name is required' : null;
      case 'host':
        return !value || value.trim() === '' ? 'Host is required' : null;
      case 'port':
        if (!value || value < 1 || value > 65535) {
          return 'Port must be between 1 and 65535';
        }
        return null;
      case 'database':
        if (type !== 'redis' && (!value || value.trim() === '')) {
          return 'Database name is required';
        }
        return null;
      case 'username':
        if (type !== 'redis' && (!value || value.trim() === '')) {
          return 'Username is required';
        }
        return null;
      case 'timeout':
        if (value && value < 1000) {
          return 'Timeout must be at least 1000ms';
        }
        return null;
      case 'maxConnections':
        if (value && value < 1) {
          return 'Max connections must be at least 1';
        }
        return null;
      default:
        return null;
    }
  };

  const handleFieldChange = useCallback((field: keyof DatabaseConfig, value: any) => {
    const updatedConfig = { ...localConfig, [field]: value };
    setLocalConfig(updatedConfig);

    // Validate the field
    const error = validateField(field, value);
    setValidationErrors(prev => ({
      ...prev,
      [field]: error || ''
    }));

    // Show saving indicator
    setIsSaving(true);

    // Debounce the onChange call to prevent excessive parent re-renders
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      onChange(updatedConfig);
      setIsSaving(false);
    }, 300);
  }, [localConfig, onChange]);

  const handleTestConnection = async () => {
    if (!onTest) return;

    setIsTestingConnection(true);
    setTestResult(null);

    try {
      const result = await onTest(localConfig);
      setTestResult(result);
    } catch (error: unknown) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const isFormValid = () => {
    const requiredFields = ['name', 'host', 'port'];
    if (type !== 'redis') {
      requiredFields.push('database', 'username');
    }

    return requiredFields.every(field => {
      const value = localConfig[field as keyof DatabaseConfig];
      return value && validateField(field, value) === null;
    });
  };

  const isFieldInherited = (field: keyof DatabaseConfig): boolean => {
    if (!inheritedConfig || level === 'global') return false;
    return localConfig[field] === inheritedConfig[field];
  };

  const getFieldValue = (field: keyof DatabaseConfig) => {
    return localConfig[field] || '';
  };

  const renderFieldWithInheritance = (
    field: keyof DatabaseConfig,
    label: string,
    inputElement: React.ReactNode,
    isRequired: boolean = false
  ) => {
    const inherited = isFieldInherited(field);
    const hasError = validationErrors[field];

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Label htmlFor={`${type}-${field}`} className={isRequired ? "after:content-['*'] after:text-red-500" : ""}>
            {label}
          </Label>
          {inherited && (
            <Badge variant="outline" className="text-xs">
              <ArrowDown className="h-3 w-3 mr-1" />
              Inherited
            </Badge>
          )}
          {!inherited && inheritedConfig && inheritedConfig[field] && (
            <Badge variant="secondary" className="text-xs">
              <Edit3 className="h-3 w-3 mr-1" />
              Override
            </Badge>
          )}
        </div>
        {inputElement}
        {hasError && (
          <p className="text-sm text-red-500">{hasError}</p>
        )}
        {inherited && inheritedConfig && (
          <p className="text-xs text-muted-foreground">
            Inherited from {level === 'folder' ? 'global' : 'parent'}: {inheritedConfig[field]}
          </p>
        )}
      </div>
    );
  };

  const getTypeColor = () => {
    switch (type) {
      case 'mysql': return 'bg-blue-500';
      case 'redis': return 'bg-red-500';
      case 'clickhouse': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6 p-4 border rounded-lg bg-card">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded-full ${getTypeColor()}`} />
          <div>
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Database className="h-5 w-5" />
              {type.charAt(0).toUpperCase() + type.slice(1)} Configuration
              {isSaving && (
                <Badge variant="outline" className="text-xs animate-pulse">
                  <Save className="h-3 w-3 mr-1" />
                  Saving...
                </Badge>
              )}
            </h3>
            <p className="text-sm text-muted-foreground">
              Configure {type} database connection for {level} level
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={level === 'global' ? 'default' : 'secondary'}>
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
      </div>

      {/* Inheritance Info */}
      {inheritedConfig && level !== 'global' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This configuration inherits from the global level. Override specific fields as needed.
          </AlertDescription>
        </Alert>
      )}

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Connection Name */}
        {renderFieldWithInheritance(
          'name',
          'Connection Name',
          <Input
            id={`${type}-name`}
            value={getFieldValue('name')}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder={`${type.charAt(0).toUpperCase() + type.slice(1)} Connection`}
            className={validationErrors.name ? 'border-red-500' : ''}
          />,
          true
        )}

        {/* Host and Port */}
        <div className="grid grid-cols-2 gap-4">
          {renderFieldWithInheritance(
            'host',
            'Host',
            <Input
              id={`${type}-host`}
              value={getFieldValue('host')}
              onChange={(e) => handleFieldChange('host', e.target.value)}
              placeholder="localhost"
              className={validationErrors.host ? 'border-red-500' : ''}
            />,
            true
          )}

          {renderFieldWithInheritance(
            'port',
            'Port',
            <Input
              id={`${type}-port`}
              type="number"
              value={getFieldValue('port')}
              onChange={(e) => handleFieldChange('port', parseInt(e.target.value) || getDefaultPort(type))}
              placeholder={getDefaultPort(type).toString()}
              className={validationErrors.port ? 'border-red-500' : ''}
            />,
            true
          )}
        </div>

        {/* Database Name and Username (not for Redis) */}
        {type !== 'redis' && (
          <div className="grid grid-cols-2 gap-4">
            {renderFieldWithInheritance(
              'database',
              'Database Name',
              <Input
                id={`${type}-database`}
                value={getFieldValue('database')}
                onChange={(e) => handleFieldChange('database', e.target.value)}
                placeholder={type === 'clickhouse' ? 'default' : 'test_db'}
                className={validationErrors.database ? 'border-red-500' : ''}
              />,
              true
            )}

            {renderFieldWithInheritance(
              'username',
              'Username',
              <Input
                id={`${type}-username`}
                value={getFieldValue('username')}
                onChange={(e) => handleFieldChange('username', e.target.value)}
                placeholder={type === 'clickhouse' ? 'default' : 'root'}
                className={validationErrors.username ? 'border-red-500' : ''}
              />,
              true
            )}
          </div>
        )}

        {/* Password (not for Redis) */}
        {type !== 'redis' && renderFieldWithInheritance(
          'password',
          'Password',
          <Input
            id={`${type}-password`}
            type="password"
            value={getFieldValue('password')}
            onChange={(e) => handleFieldChange('password', e.target.value)}
            placeholder="••••••••"
          />
        )}

        {/* Advanced Settings */}
        <Separator />
        <h4 className="text-sm font-medium">Advanced Settings</h4>

        <div className="grid grid-cols-2 gap-4">
          {renderFieldWithInheritance(
            'timeout',
            'Timeout (ms)',
            <Input
              id={`${type}-timeout`}
              type="number"
              value={getFieldValue('timeout')}
              onChange={(e) => handleFieldChange('timeout', parseInt(e.target.value) || 30000)}
              placeholder="30000"
              className={validationErrors.timeout ? 'border-red-500' : ''}
            />
          )}

          {renderFieldWithInheritance(
            'maxConnections',
            'Max Connections',
            <Input
              id={`${type}-maxConnections`}
              type="number"
              value={getFieldValue('maxConnections')}
              onChange={(e) => handleFieldChange('maxConnections', parseInt(e.target.value) || 10)}
              placeholder="10"
              className={validationErrors.maxConnections ? 'border-red-500' : ''}
            />
          )}
        </div>

        {/* SSL Toggle */}
        <div className="flex items-center space-x-2">
          <Switch
            id={`${type}-ssl`}
            checked={localConfig.ssl || false}
            onCheckedChange={(checked) => handleFieldChange('ssl', checked)}
          />
          <Label htmlFor={`${type}-ssl`}>Enable SSL</Label>
          {isFieldInherited('ssl') && (
            <Badge variant="outline" className="text-xs">
              <ArrowDown className="h-3 w-3 mr-1" />
              Inherited
            </Badge>
          )}
        </div>

        {/* Description */}
        {renderFieldWithInheritance(
          'description',
          'Description',
          <Textarea
            id={`${type}-description`}
            value={getFieldValue('description')}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder={`Optional description for this ${type} connection`}
            rows={2}
          />
        )}
      </div>

      {/* Connection Test */}
      {onTest && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Connection Test</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={!isFormValid() || isTestingConnection}
              >
                {isTestingConnection ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Test Connection
              </Button>
            </div>

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
        </>
      )}

      {/* Form Status */}
      <div className="text-xs text-muted-foreground">
        {!isFormValid() && (
          <p className="text-red-500">Please fill in all required fields to enable connection testing.</p>
        )}
      </div>
    </div>
  );
};