import { useState, useMemo } from 'react';
import { DynamicTable } from '@/components/DynamicTable';
import { ExecutionLog, ApiResponse, ValidationResult } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, XCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react';

interface ResultsProps {
  executionLogs: ExecutionLog[];
  testResults: { [key: string]: any } | null;
  stepResults: { stepName: string; type: string; result: any; executionTime?: number }[];
  validationResults: ValidationResult[];
}

export const Results = ({ executionLogs, testResults, stepResults, validationResults }: ResultsProps) => {
  const [expandedApiSteps, setExpandedApiSteps] = useState<Set<string>>(new Set());
  const [expandedDbSteps, setExpandedDbSteps] = useState<Set<string>>(new Set());
  // Add state for headers/body collapse per step
  const [expandedValidationSteps, setExpandedValidationSteps] = useState<Set<string>>(new Set());
  const [collapsedHeaders, setCollapsedHeaders] = useState<{ [stepName: string]: boolean }>({});
  const [collapsedBody, setCollapsedBody] = useState<{ [stepName: string]: boolean }>({});

  console.log("[DEBUG:Results.tsx] Received stepResults prop:", stepResults);
  console.log("[DEBUG:Results.tsx] Received validationResults prop:", validationResults);

  const getParsedResult = (result: any) => {
    if (typeof result === 'string') {
      try {
        return JSON.parse(result);
      } catch (e) {
        console.error("Failed to parse result string:", e);
        return { error: "Invalid JSON format", content: result };
      }
    }
    return result;
  };

  const apiResults = useMemo(() => stepResults.filter(r => r.type === 'api' || r.type === 'karate_error'), [stepResults]);
  const dbResults = useMemo(() => stepResults.filter(r => ['sql', 'redis', 'clickhouse', 'db_error'].includes(r.type)), [stepResults]);

  const toggleApiStep = (stepName: string) => {
    setExpandedApiSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepName)) newSet.delete(stepName);
      else newSet.add(stepName);
      return newSet;
    });
  };

  const toggleDbStep = (stepName: string) => {
    setExpandedDbSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepName)) newSet.delete(stepName);
      else newSet.add(stepName);
      return newSet;
    });
  };

  const toggleValidationStep = (id: string) => {
    setExpandedValidationSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

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

  const getStatusColor = (status: number | string) => {
    if (typeof status === 'number') {
      if (status >= 200 && status < 300) return 'text-green-400';
      if (status >= 400) return 'text-red-400';
      return 'text-yellow-400';
    }
    return status === 'success' ? 'text-green-400' : 'text-red-400';
  };

  return (
    <div className="bg-background border-t border-border" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
      <Tabs defaultValue="logs" className="h-full flex flex-col">
        <TabsList className="bg-card border-b border-border rounded-none justify-start">
          <TabsTrigger value="logs" className="data-[state=active]:bg-accent">
            Execution Log ({executionLogs.length})
          </TabsTrigger>
          <TabsTrigger value="response" className="data-[state=active]:bg-accent">
            API Responses ({apiResults.length})
          </TabsTrigger>
          <TabsTrigger value="db-results" className="data-[state=active]:bg-accent">
            DB Results ({dbResults.length})
          </TabsTrigger>
          <TabsTrigger value="validations" className="data-[state=active]:bg-accent">
            Validation Results ({validationResults.length})
          </TabsTrigger>
          <TabsTrigger value="results" className="data-[state=active]:bg-accent">
            Raw Test Results
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
              {apiResults.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📡</div>
                  <p className="text-muted-foreground">No API responses yet</p>
                  <p className="text-sm text-muted-foreground/70">Run an API test to see responses here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {apiResults.map((apiRes, index) => {
                    const parsedResult = getParsedResult(apiRes.result);
                    const stepName = apiRes.stepName;
                    if (!parsedResult || typeof parsedResult !== 'object' || parsedResult.error) {
                      return (
                        <Card key={index} className="bg-card border-destructive p-4">
                          <p className="font-medium text-destructive">Error processing response for: {stepName}</p>
                          <pre className="bg-muted p-2 mt-2 rounded text-sm overflow-x-auto">
                            {JSON.stringify(apiRes.result, null, 2)}
                          </pre>
                          {/* Display Karate error details if available */}
                          {parsedResult && parsedResult.karateError && (
                            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                              <p className="font-medium text-red-700 dark:text-red-300 mb-2">Karate Error Details:</p>
                              <pre className="text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap overflow-x-auto">
                                {parsedResult.result.karateError}
                              </pre>
                            </div>
                          )}
                        </Card>
                      );
                    }

                    // Default collapsed state: headers collapsed, body expanded
                    const isHeadersCollapsed = collapsedHeaders[stepName] ?? true;
                    const isBodyCollapsed = collapsedBody[stepName] ?? false;

                    const toggleHeaders = () => setCollapsedHeaders(prev => ({ ...prev, [stepName]: !isHeadersCollapsed }));
                    const toggleBody = () => setCollapsedBody(prev => ({ ...prev, [stepName]: !isBodyCollapsed }));

                    return (
                      <Card key={index} className="bg-card border-border p-4">
                        <Button
                          variant="ghost"
                          onClick={() => toggleApiStep(stepName)}
                          className="flex items-center gap-2 p-0 mb-2 text-foreground hover:text-foreground/80"
                        >
                          {expandedApiSteps.has(stepName) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <span className="font-medium">API Response: {stepName}</span>
                        </Button>

                        {expandedApiSteps.has(stepName) && (
                          <div className="space-y-4 mt-2">
                            {/* Status and Execution Time */}
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-medium text-foreground">Status</h3>
                              <span className="text-sm text-muted-foreground">{apiRes.executionTime ?? 'N/A'}ms</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`${getStatusColor(parsedResult.status)} bg-transparent border-current`}>
                                {parsedResult.status}
                              </Badge>
                              <span className="text-foreground">{parsedResult.statusText || ''}</span>
                            </div>

                            {/* Collapsible Headers */}
                            <div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={toggleHeaders}
                                className="flex items-center gap-2 mb-1 text-foreground hover:text-foreground/80"
                              >
                                {isHeadersCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                <span className="font-medium">Headers</span>
                              </Button>
                              {!isHeadersCollapsed && (
                                <div className="space-y-1 ml-6">
                                  {Object.entries(parsedResult.headers || {}).map(([key, value]) => (
                                    <div key={key} className="flex items-center gap-2 text-sm">
                                      <span className="text-blue-600 dark:text-blue-400 font-mono">{key}:</span>
                                      <span className="text-foreground">{String(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Collapsible Body */}
                            <div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={toggleBody}
                                className="flex items-center gap-2 mb-1 text-foreground hover:text-foreground/80"
                              >
                                {isBodyCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                <span className="font-medium">Body</span>
                              </Button>
                              {!isBodyCollapsed && (
                                <div className="max-h-60 overflow-y-auto ml-6">
                                  <pre className="bg-muted p-3 rounded text-sm text-foreground overflow-x-auto">
                                    {JSON.stringify(parsedResult.body, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="db-results" className="flex-1 p-0 overflow-x-auto">
          <ScrollArea className="h-full">
            <div className="p-4">
              {dbResults.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🗄️</div>
                  <p className="text-muted-foreground">No DB results yet</p>
                  <p className="text-sm text-muted-foreground/70">Run a SQL, Redis, or ClickHouse test to see results here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dbResults.map((dbRes, index) => {
                    const parsedResult = getParsedResult(dbRes.result);
                    
                    // Handle error cases for DB results
                    if (!parsedResult || typeof parsedResult !== 'object' || parsedResult.error) {
                      return (
                        <Card key={index} className="bg-card border-destructive p-4">
                          <p className="font-medium text-destructive">Error processing DB result for: {dbRes.stepName}</p>
                          <pre className="bg-muted p-2 mt-2 rounded text-sm overflow-x-auto">
                            {JSON.stringify(dbRes.result, null, 2)}
                          </pre>
                          {/* Display Karate error details if available */}
                          {parsedResult && parsedResult.karateError && (
                            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                              <p className="font-medium text-red-700 dark:text-red-300 mb-2">Karate Error Details:</p>
                              <pre className="text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap overflow-x-auto">
                                {parsedResult.result.karateError}
                              </pre>
                            </div>
                          )}
                        </Card>
                      );
                    }
                    
                    return (
                      <Card key={index} className="bg-card border-border p-4">
                        <Button
                          variant="ghost"
                          onClick={() => toggleDbStep(dbRes.stepName)}
                          className="flex items-center gap-2 p-0 mb-2 text-foreground hover:text-foreground/80"
                        >
                          {expandedDbSteps.has(dbRes.stepName) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <span className="font-medium">DB Result: {dbRes.stepName} ({dbRes.type.toUpperCase()}) - {dbRes.executionTime ?? 'N/A'}ms</span>
                        </Button>
                        {expandedDbSteps.has(dbRes.stepName) && (
                          <div className="mt-2" style={{overflowX: 'scroll', display: 'inline-grid', overflowY: 'hidden'}}>
                            <DynamicTable data={Array.isArray(parsedResult) ? parsedResult : [parsedResult]} />
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="validations" className="flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {validationResults.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-muted-foreground">No validation results yet</p>
                  <p className="text-sm text-muted-foreground/70">Add validations to your test steps and run the test case</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {validationResults.map((valRes, index) => (
                    <Card key={index} className="bg-card border-border p-4">
                      <Button
                        variant="ghost"
                        onClick={() => toggleValidationStep(valRes.id)}
                        className="flex items-center gap-2 p-0 mb-2 text-foreground hover:text-foreground/80"
                      >
                        {expandedValidationSteps.has(valRes.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="font-medium">Validation: {valRes.target} ({valRes.dataType})</span>
                      </Button>
                      {expandedValidationSteps.has(valRes.id) && (
                        <div className="space-y-2 mt-2">
                          <div className="flex items-center gap-2">
                            <Badge className={`${getStatusColor(valRes.status)} bg-transparent border-current`}>
                              {valRes.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p><strong>Expected Value:</strong> {valRes.expectedValue}</p>
                          <p><strong>Actual Value:</strong> {JSON.stringify(valRes.actualValue)}</p>
                          {valRes.message && <p><strong>Message:</strong> {valRes.message}</p>}
                          <p><strong>Timestamp:</strong> {valRes.timestamp}</p>
                          {/* Display Karate error details if available */}
                          {valRes.karateError && (
                            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                              <p className="font-medium text-red-700 dark:text-red-300 mb-2">Karate Error Details:</p>
                              <pre className="text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap overflow-x-auto">
                                {valRes.karateError}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  ))}
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
                  <p className="text-muted-foreground">No raw test results yet</p>
                  <p className="text-sm text-muted-foreground/70">Run a test to see the raw results</p>
                </div>
              ) : (
                <pre className="bg-muted p-3 rounded text-sm text-foreground overflow-x-auto">
                  {JSON.stringify(testResults, null, 2)}
                </pre>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};