import { useState } from 'react';
import { ChevronDown, ChevronRight, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExecutionLog, ApiResponse } from '@/types';

interface ResultsProps {
  executionLogs: ExecutionLog[];
  apiResponse: ApiResponse | null;
  testResults: any | null;
}

export const Results = ({ executionLogs, apiResponse, testResults }: ResultsProps) => {
  const [expandedResponse, setExpandedResponse] = useState(false);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-400" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Clock className="h-4 w-4 text-blue-400" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-blue-400';
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-400';
    if (status >= 400) return 'text-red-400';
    return 'text-yellow-400';
  };

  return (
    <div className="bg-background border-t border-border" style={{ height: '40vh' }}>
      <Tabs defaultValue="logs" className="h-full flex flex-col">
        <TabsList className="bg-card border-b border-border rounded-none w-full justify-start">
          <TabsTrigger value="logs" className="data-[state=active]:bg-accent">
            Execution Log ({executionLogs.length})
          </TabsTrigger>
          <TabsTrigger value="response" className="data-[state=active]:bg-accent">
            API Response
          </TabsTrigger>
          <TabsTrigger value="results" className="data-[state=active]:bg-accent">
            Test Results
          </TabsTrigger>
          <TabsTrigger value="db-results" className="data-[state=active]:bg-accent">
            DB Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {executionLogs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📋</div>
                  <p className="text-muted-foreground">No execution logs yet</p>
                  <p className="text-sm text-muted-foreground/70">Run a test case to see logs here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {executionLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getLevelIcon(log.level)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-medium ${getLevelColor(log.level)}`}>
                            {log.level.toUpperCase()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                          {log.stepIndex >= 0 && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">
                              Step {log.stepIndex + 1}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-foreground">{log.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="response" className="flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {!apiResponse ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🌐</div>
                  <p className="text-muted-foreground">No API response yet</p>
                  <p className="text-sm text-muted-foreground/70">Execute an API step to see response details</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Status */}
                  <Card className="bg-card border-border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-foreground">Response Status</h3>
                      <span className="text-sm text-muted-foreground">{apiResponse.executionTime}ms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${getStatusColor(apiResponse.status)} bg-transparent border-current`}>
                        {apiResponse.status}
                      </Badge>
                      <span className="text-foreground">{apiResponse.statusText}</span>
                    </div>
                  </Card>

                  {/* Headers */}
                  <Card className="bg-card border-border p-4">
                    <Button
                      variant="ghost"
                      onClick={() => setExpandedResponse(!expandedResponse)}
                      className="flex items-center gap-2 p-0 mb-2 text-foreground hover:text-foreground/80"
                    >
                      {expandedResponse ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="font-medium">Headers ({Object.keys(apiResponse.headers).length})</span>
                    </Button>
                    
                    {expandedResponse && (
                      <div className="space-y-1">
                        {Object.entries(apiResponse.headers).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2 text-sm">
                            <span className="text-blue-600 dark:text-blue-400 font-mono">{key}:</span>
                            <span className="text-foreground">{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Body */}
                  <Card className="bg-card border-border p-4">
                    <h3 className="font-medium text-foreground mb-2">Response Body</h3>
                    <pre className="bg-muted p-3 rounded text-sm text-foreground overflow-x-auto">
                      {JSON.stringify(apiResponse.body, null, 2)}
                    </pre>
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="results" className="flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {!testResults ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📊</div>
                  <p className="text-muted-foreground">No test results yet</p>
                  <p className="text-sm text-muted-foreground/70">Run a test to see the results</p>
                </div>
              ) : (
                <pre className="bg-muted p-3 rounded text-sm text-foreground overflow-x-auto">
                  {JSON.stringify(testResults, null, 2)}
                </pre>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="db-results" className="flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {!testResults || !testResults.dbResults || testResults.dbResults.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">💾</div>
                  <p className="text-muted-foreground">No DB results yet</p>
                  <p className="text-sm text-muted-foreground/70">Run a test with a DB step to see the results</p>
                </div>
              ) : (
                <pre className="bg-muted p-3 rounded text-sm text-foreground overflow-x-auto">
                  {JSON.stringify(testResults.dbResults, null, 2)}
                </pre>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
