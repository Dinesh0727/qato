import { useState, useRef } from 'react';
import { GripVertical, Trash2, Database, Zap, Globe, ChevronDown, ChevronRight, Clock, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TestStep, SqlStepConfig, RedisStepConfig, ApiStepConfig, ClickhouseStepConfig } from '@/types';
import { ApiHeadersEditor } from './ApiHeadersEditor';

// Updated interface to include children prop and collapse state
interface StepCardProps {
  step: TestStep;
  index: number;
  onUpdate: (updates: Partial<TestStep>) => void;
  onDelete: () => void;
  children?: React.ReactNode;
  defaultCollapsed?: boolean; // New prop to control default state
}

export const StepCard = ({ step, index, onUpdate, onDelete, children, defaultCollapsed = true }: StepCardProps) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  // Move useRef to top level to avoid conditional hook call
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const getStepIcon = () => {
    switch (step.type) {
      case 'sql':
        return <Database className="h-4 w-4" />;
      case 'redis':
        return <Zap className="h-4 w-4" />;
      case 'api':
        return <Globe className="h-4 w-4" />;
      case 'clickhouse':
        return <Database className="h-4 w-4" />;
    }
  };

  const getStepColor = () => {
    switch (step.type) {
      case 'sql':
        return 'bg-blue-600';
      case 'redis':
        return 'bg-red-600';
      case 'api':
        return 'bg-green-600';
      case 'clickhouse':
        return 'bg-yellow-600';
    }
  };

  const getStepSummary = () => {
    switch (step.type) {
      case 'sql':
        const sqlConfig = step.config as SqlStepConfig;
        return sqlConfig.query ? sqlConfig.query.substring(0, 60) + (sqlConfig.query.length > 60 ? '...' : '') : 'No query configured';
      case 'redis':
        const redisConfig = step.config as RedisStepConfig;
        return redisConfig.command ? redisConfig.command.substring(0, 60) + (redisConfig.command.length > 60 ? '...' : '') : 'No command configured';
      case 'api':
        const apiConfig = step.config as ApiStepConfig;
        return `${apiConfig.method} ${apiConfig.url || 'No URL configured'}`.substring(0, 80);
      case 'clickhouse':
        const clickhouseConfig = step.config as ClickhouseStepConfig;
        return clickhouseConfig.query ? clickhouseConfig.query.substring(0, 60) + (clickhouseConfig.query.length > 60 ? '...' : '') : 'No query configured';
      default:
        return 'Step configuration';
    }
  };

  const renderStepContent = () => {
    switch (step.type) {
      case 'sql':
        const sqlConfig = step.config as SqlStepConfig;
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">SQL Query</label>
              <Textarea
                value={sqlConfig.query}
                onChange={(e) => onUpdate({ 
                  config: { ...sqlConfig, query: e.target.value } 
                })}
                placeholder="SELECT * FROM users WHERE id = 1;"
                className="bg-muted border-border text-foreground font-mono text-sm min-h-[100px] rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Database (optional)</label>
              <Input
                value={sqlConfig.database || ''}
                onChange={(e) => onUpdate({ 
                  config: { ...sqlConfig, database: e.target.value } 
                })}
                placeholder="database_name"
                className="bg-muted border-border text-foreground rounded-lg"
              />
            </div>
          </div>
        );

      case 'redis':
        const redisConfig = step.config as RedisStepConfig;
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Redis Command</label>
              <Textarea
                value={redisConfig.command}
                onChange={(e) => onUpdate({ 
                  config: { ...redisConfig, command: e.target.value } 
                })}
                placeholder="SET key value"
                className="bg-muted border-border text-foreground font-mono rounded-lg min-h-[80px] break-all"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Database Number (optional)</label>
              <Input
                type="number"
                value={redisConfig.database || ''}
                onChange={(e) => onUpdate({ 
                  config: { ...redisConfig, database: parseInt(e.target.value) || 0 } 
                })}
                placeholder="0"
                className="bg-muted border-border text-foreground rounded-lg"
              />
            </div>
          </div>
        );

      case 'api':
        const apiConfig = step.config as ApiStepConfig;
        // Handle body change with auto-resizing
        const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
          onUpdate({ config: { ...apiConfig, body: e.target.value } });
          // Auto-resize logic
          const textarea = bodyTextareaRef.current;
          if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 600) + 'px'; // max 600px
          }
        };
        return (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Select
                value={apiConfig.method}
                onValueChange={(value) => onUpdate({ 
                  config: { ...apiConfig, method: value as any } 
                })}
              >
                <SelectTrigger className="w-28 bg-muted border-border rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-muted border-border rounded-lg">
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                value={apiConfig.url}
                onChange={(e) => onUpdate({ 
                  config: { ...apiConfig, url: e.target.value } 
                })}
                placeholder="https://api.example.com/endpoint"
                className="flex-1 bg-muted border-border text-foreground rounded-lg"
              />
            </div>

            <Tabs defaultValue="headers" className="w-full">
              <TabsList className="bg-muted rounded-lg">
                <TabsTrigger value="headers" className="rounded-md">Headers</TabsTrigger>
                <TabsTrigger value="body" className="rounded-md">Body</TabsTrigger>
              </TabsList>
              
              <TabsContent value="headers" className="mt-3">
                <ApiHeadersEditor
                  headers={apiConfig.headers || {}}
                  onChange={headers => onUpdate({ config: { ...apiConfig, headers } })}
                />
              </TabsContent>
              
              <TabsContent value="body" className="mt-3">
                <Textarea
                  ref={bodyTextareaRef}
                  value={apiConfig.body || ''}
                  onChange={handleBodyChange}
                  placeholder='{"key": "value"}'
                  className="bg-muted border-border text-foreground font-mono text-sm min-h-[120px] rounded-lg"
                  style={{ lineHeight: '1.5', overflow: 'auto' }}
                  rows={6}
                />
              </TabsContent>
            </Tabs>

            {/* Variable Extraction UI */}
            <div className="mt-4">
              <label className="text-sm text-muted-foreground mb-1 block font-semibold">Extract Variables from Response (JSONPath)</label>
              {(apiConfig.extractVars || []).map((v, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input
                    value={v.name}
                    onChange={e => {
                      const newVars = [...(apiConfig.extractVars || [])];
                      newVars[i] = { ...newVars[i], name: e.target.value };
                      onUpdate({ config: { ...apiConfig, extractVars: newVars } });
                    }}
                    placeholder="Variable Name (e.g. mid)"
                    className="w-1/4"
                  />
                  <Input
                    value={v.path}
                    onChange={e => {
                      const newVars = [...(apiConfig.extractVars || [])];
                      newVars[i] = { ...newVars[i], path: e.target.value };
                      onUpdate({ config: { ...apiConfig, extractVars: newVars } });
                    }}
                    placeholder="JSONPath (e.g. $.mid)"
                    className="flex-1"
                  />
                  <Select
                    value={v.type || 'string'}
                    onValueChange={value => {
                      const newVars = [...(apiConfig.extractVars || [])];
                      newVars[i] = { ...newVars[i], type: value as any };
                      onUpdate({ config: { ...apiConfig, extractVars: newVars } });
                    }}
                  >
                    <SelectTrigger className="w-28 bg-muted border-border rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-muted border-border rounded-lg">
                      <SelectItem value="string">String</SelectItem>
                      <SelectItem value="integer">Integer</SelectItem>
                      <SelectItem value="float">Float</SelectItem>
                      <SelectItem value="boolean">Boolean</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => {
                      const newVars = [...(apiConfig.extractVars || [])];
                      newVars.splice(i, 1);
                      onUpdate({ config: { ...apiConfig, extractVars: newVars } });
                    }}
                    className="ml-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newVars = [...(apiConfig.extractVars || []), { name: '', path: '' }];
                  onUpdate({ config: { ...apiConfig, extractVars: newVars } });
                }}
                className="mt-1"
              >
                + Add Variable
              </Button>
            </div>
          </div>
        );

      case 'clickhouse':
        const clickhouseConfig = step.config as ClickhouseStepConfig;
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">ClickHouse Query</label>
              <Textarea
                value={clickhouseConfig.query}
                onChange={(e) => onUpdate({ 
                  config: { ...clickhouseConfig, query: e.target.value } 
                })}
                placeholder="SELECT * FROM my_table LIMIT 10;"
                className="bg-muted border-border text-foreground font-mono text-sm min-h-[100px] rounded-lg"
              />
            </div>
          </div>
        );
    }
  };

  return (
    <Card
      className={`relative rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl
        ${getStepColor()} border-opacity-20
        ${isCollapsed 
          ? 'bg-gradient-to-r from-background to-muted/30' 
          : `bg-gradient-to-br from-background via-${getStepColor().replace('bg-', '')}/5 to-background`
        }
      `}
    >
      {/* Collapsible Header */}
      <div 
        className={`flex items-center gap-3 cursor-pointer transition-all duration-200 hover:bg-muted/20 rounded-t-2xl ${isCollapsed ? 'p-4' : 'p-6 pb-4'}`}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <Button 
          variant="ghost" 
          size="sm" 
          className="cursor-grab text-muted-foreground p-1 hover:bg-accent rounded-lg transition-colors duration-200"
          onClick={(e) => e.stopPropagation()} // Prevent collapse toggle when dragging
        >
          <GripVertical className="h-4 w-4" />
        </Button>
        
        {/* Collapse/Expand Icon */}
        <div className="flex items-center justify-center w-6 h-6 text-muted-foreground">
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
        
        <Badge className={`${getStepColor()} text-white rounded-lg px-3 py-1 flex items-center gap-1 shadow-md`}> 
          {getStepIcon()}
          <span className="ml-1 font-semibold tracking-wide uppercase">{step.type}</span>
        </Badge>
        
        <div className="flex-1 min-w-0">
          {isCollapsed ? (
            <div className="space-y-1">
              <div className="font-semibold text-foreground truncate">{step.name}</div>
              <div className="text-sm text-muted-foreground font-mono truncate">{getStepSummary()}</div>
              {step.delayMs > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{step.delayMs}ms delay</span>
                </div>
              )}
            </div>
          ) : (
            <Input
              value={step.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              onClick={(e) => e.stopPropagation()} // Prevent collapse when editing name
              className="bg-transparent border-none text-foreground font-semibold p-0 h-auto focus-visible:ring-0 rounded-lg text-lg"
            />
          )}
        </div>
        
        <div className={`absolute -top-4 -right-4 z-10 flex items-center justify-center w-10 h-10 rounded-full border-4 ${getStepColor()} border-white shadow-lg text-white text-lg font-bold bg-gradient-to-br from-${getStepColor().replace('bg-', '')}/80 to-${getStepColor().replace('bg-', '')}/60`}>
          {index + 1}
        </div>
        
        {isCollapsed && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground hover:bg-accent p-1 rounded-lg transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(false);
            }}
            title="Edit step"
          >
            <Edit3 className="h-4 w-4" />
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 p-1 rounded-lg transition-all duration-200"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Expandable Content */}
      {!isCollapsed && (
        <div className="px-6 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Delay Input */}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Delay Before Executing (ms)</label>
            <Input
              type="number"
              value={step.delayMs === 0 ? '' : step.delayMs}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || isNaN(Number(val))) {
                  onUpdate({ delayMs: 0 });
                } else {
                  onUpdate({ delayMs: parseInt(val, 10) });
                }
              }}
              min="0"
              className="w-32 bg-muted border-border text-foreground rounded-lg shadow-sm focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Step Content */}
          {renderStepContent()}

          {/* Render Children (ValidationEditor and validation list) */}
          {children && (
            <div className="mt-6 pt-4 border-t border-border/50">
              {children}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};