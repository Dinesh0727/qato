import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { DatabaseConfig, DatabaseConfigSet } from '../types';

interface GlobalConfig {
  version: string;
  defaultSettings?: {
    timeout?: number;
    retryCount?: number;
  };
  databases: DatabaseConfigSet;
}

interface ConfigurationTemplate {
  id: string;
  name: string;
  description: string;
  config: GlobalConfig;
}

interface ConfigurationImportExportProps {
  onConfigurationImported: (config: GlobalConfig) => void;
}

// Get configuration templates from the backend
const getConfigurationTemplates = (): ConfigurationTemplate[] => {
  const timestamp = Date.now();
  
  return [
    {
      id: 'development',
      name: 'Development Environment',
      description: 'Local development setup with default localhost connections',
      config: {
        version: '1.0.0',
        defaultSettings: {
          timeout: 30000,
          retryCount: 3
        },
        databases: {
          mysql: {
            id: `dev-mysql-${timestamp}`,
            name: 'Development MySQL',
            type: 'mysql',
            host: 'localhost',
            port: 3306,
            database: 'dev_db',
            username: 'dev_user',
            password: 'dev_pass',
            timeout: 30000,
            description: 'Local MySQL for development'
          },
          redis: {
            id: `dev-redis-${timestamp}`,
            name: 'Development Redis',
            type: 'redis',
            host: 'localhost',
            port: 6379,
            database: '0',
            timeout: 30000,
            description: 'Local Redis for caching'
          },
          clickhouse: {
            id: `dev-clickhouse-${timestamp}`,
            name: 'Development ClickHouse',
            type: 'clickhouse',
            host: 'localhost',
            port: 9000,
            database: 'default',
            username: 'default',
            password: '',
            timeout: 30000,
            description: 'Local ClickHouse for analytics'
          }
        }
      }
    },
    {
      id: 'staging',
      name: 'Staging Environment',
      description: 'Staging environment with remote database connections',
      config: {
        version: '1.0.0',
        defaultSettings: {
          timeout: 45000,
          retryCount: 5
        },
        databases: {
          mysql: {
            id: `staging-mysql-${timestamp}`,
            name: 'Staging MySQL',
            type: 'mysql',
            host: 'staging-db.company.com',
            port: 3306,
            database: 'staging_db',
            username: 'staging_user',
            password: '',
            timeout: 45000,
            ssl: true,
            description: 'Staging MySQL database'
          },
          redis: {
            id: `staging-redis-${timestamp}`,
            name: 'Staging Redis',
            type: 'redis',
            host: 'staging-redis.company.com',
            port: 6379,
            database: '0',
            timeout: 45000,
            ssl: true,
            description: 'Staging Redis cache'
          },
          clickhouse: {
            id: `staging-clickhouse-${timestamp}`,
            name: 'Staging ClickHouse',
            type: 'clickhouse',
            host: 'staging-ch.company.com',
            port: 9000,
            database: 'staging',
            username: 'staging_user',
            password: '',
            timeout: 45000,
            ssl: true,
            description: 'Staging ClickHouse analytics'
          }
        }
      }
    },
    {
      id: 'testing',
      name: 'Testing Environment',
      description: 'Optimized configuration for automated testing',
      config: {
        version: '1.0.0',
        defaultSettings: {
          timeout: 15000,
          retryCount: 1
        },
        databases: {
          mysql: {
            id: `test-mysql-${timestamp}`,
            name: 'Test MySQL',
            type: 'mysql',
            host: 'localhost',
            port: 3306,
            database: 'test_db',
            username: 'test_user',
            password: 'test_pass',
            timeout: 15000,
            description: 'MySQL for automated testing'
          },
          redis: {
            id: `test-redis-${timestamp}`,
            name: 'Test Redis',
            type: 'redis',
            host: 'localhost',
            port: 6379,
            database: '0',
            timeout: 15000,
            description: 'Redis for test caching'
          }
        }
      }
    }
  ];
};

export const ConfigurationImportExport = ({
  onConfigurationImported
}: ConfigurationImportExportProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const CONFIGURATION_TEMPLATES = getConfigurationTemplates();

  const handleExport = async () => {
    setIsExporting(true);
    setMessage(null);

    try {
      // Send export request to extension
      const vscode = (window as unknown as { acquireVsCodeApi: () => { postMessage: (message: unknown) => void } }).acquireVsCodeApi();
      vscode.postMessage({
        command: 'exportConfiguration',
        payload: {}
      });

      // Listen for response
      const handleMessage = (event: MessageEvent<{
        command: string;
        payload: {
          success: boolean;
          data?: unknown;
          error?: string;
        };
      }>) => {
        const message = event.data;
        if (message.command === 'configurationExported') {
          if (message.payload.success) {
            // Create and download file
            const exportData = message.payload.data;
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
              type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `qato-config-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setMessage({ type: 'success', text: 'Configuration exported successfully!' });
          } else {
            setMessage({ type: 'error', text: message.payload.error || 'Export failed' });
          }
          setIsExporting(false);
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);

      // Timeout after 10 seconds
      setTimeout(() => {
        setIsExporting(false);
        setMessage({ type: 'error', text: 'Export timeout - please try again' });
        window.removeEventListener('message', handleMessage);
      }, 10000);

    } catch (error) {
      setIsExporting(false);
      setMessage({ type: 'error', text: 'Failed to export configuration' });
    }
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setMessage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string) as {
          timestamp?: string;
          version: string;
          globalConfig?: GlobalConfig;
          folderConfigs?: Array<{ folderName: string; config: unknown }>;
        };
        importConfiguration(importData);
      } catch (error) {
        setIsImporting(false);
        setMessage({ type: 'error', text: 'Invalid JSON file format' });
      }
    };
    reader.readAsText(file);
  };

  const handleTemplateImport = () => {
    if (!selectedTemplate) return;

    const template = CONFIGURATION_TEMPLATES.find(t => t.id === selectedTemplate);
    if (!template) return;

    setIsImporting(true);
    setMessage(null);

    // Create import data structure that matches the export format
    const importData = {
      timestamp: new Date().toISOString(),
      version: template.config.version,
      globalConfig: template.config,
      folderConfigs: []
    };

    importConfiguration(importData);
  };

  const importConfiguration = (importData: {
    timestamp?: string;
    version: string;
    globalConfig?: GlobalConfig;
    folderConfigs?: Array<{ folderName: string; config: unknown }>;
  }) => {
    try {
      // Send import request to extension
      const vscode = (window as unknown as { acquireVsCodeApi: () => { postMessage: (message: unknown) => void } }).acquireVsCodeApi();
      vscode.postMessage({
        command: 'importConfiguration',
        payload: { data: importData }
      });

      // Listen for response
      const handleMessage = (event: MessageEvent<{
        command: string;
        payload: {
          success: boolean;
          imported?: boolean;
          error?: string;
        };
      }>) => {
        const message = event.data;
        if (message.command === 'configurationImported') {
          if (message.payload.success) {
            if (message.payload.imported) {
              // Update local state with imported global config
              if (importData.globalConfig) {
                onConfigurationImported(importData.globalConfig);
              }
              setMessage({ type: 'success', text: 'Configuration imported successfully!' });
            } else {
              setMessage({ type: 'success', text: 'No changes were needed - configuration is already up to date' });
            }
          } else {
            setMessage({ type: 'error', text: message.payload.error || 'Import failed' });
          }
          setIsImporting(false);
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);

      // Timeout after 10 seconds
      setTimeout(() => {
        setIsImporting(false);
        setMessage({ type: 'error', text: 'Import timeout - please try again' });
        window.removeEventListener('message', handleMessage);
      }, 10000);

    } catch (error) {
      setIsImporting(false);
      setMessage({ type: 'error', text: 'Failed to import configuration' });
    }
  };

  const clearMessage = () => {
    setMessage(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Configuration Management
        </CardTitle>
        <CardDescription>
          Export your current configuration for backup or sharing, import configurations from files or templates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            {message.type === 'error' ? (
              <AlertCircle className="h-4 w-4 text-red-600" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
            <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
              {message.text}
              <Button
                variant="ghost"
                size="sm"
                className="ml-2 h-auto p-0 text-xs underline"
                onClick={clearMessage}
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Export Section */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Export Configuration</h4>
            <p className="text-xs text-muted-foreground">
              Download your current workspace configuration as a JSON file for backup or sharing
            </p>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full"
              variant="outline"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Configuration
                </>
              )}
            </Button>
          </div>

          {/* Import Section */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Import Configuration</h4>
            <p className="text-xs text-muted-foreground">
              Import configuration from a previously exported file
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="w-full"
              variant="outline"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import from File
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Template Section */}
        <div className="border-t pt-4 space-y-3">
          <h4 className="font-medium text-sm">Configuration Templates</h4>
          <p className="text-xs text-muted-foreground">
            Apply pre-configured templates for common database setup scenarios
          </p>
          <div className="flex gap-2">
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                {CONFIGURATION_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-muted-foreground">{template.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleTemplateImport}
              disabled={!selectedTemplate || isImporting}
              variant="outline"
            >
              {isImporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Apply Template'
              )}
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
          <strong>Note:</strong> Importing configuration will create a backup of your current settings before applying changes. 
          Templates provide common database configurations that you can customize after import.
        </div>
      </CardContent>
    </Card>
  );
};