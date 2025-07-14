import { useState, useEffect, useCallback } from 'react';
import { TestNavigator } from '@/components/TestNavigator';
import { Editor } from '@/components/Editor';
import { Results } from '@/components/Results';
import { ThemeToggle } from '@/components/ThemeToggle';
import { TestCase, ExecutionLog, ApiResponse, TestStep, SqlStepConfig, RedisStepConfig, ApiStepConfig, ClickhouseStepConfig, Folder, Collection } from '@/types';
import { useToast } from '@/hooks/use-toast';

// Define the structure of the VS Code API object
interface VsCodeApi {
  postMessage(message: { command: string; payload: unknown }): void;
}

// Declare the vscode object for TypeScript
declare const vscode: VsCodeApi;

// Define the structure of the Karate test results
interface KarateResult {
  features: {
    name: string;
    failedCount: number;
  }[];
}

// src/components/Index.tsx

const generateGherkin = (testCase: TestCase): string => {
  console.log('[DEBUG:Index.tsx] Generating Gherkin for test case:', testCase);
  let gherkin = `Feature: ${testCase.name}\n\n`;

  testCase.steps.forEach(step => {
    const sanitizedStepName = step.name.replace(/'/g, "\\'");
    gherkin += `Scenario: ${sanitizedStepName}\n`;

    // Add timing instrumentation for API calls, DB calls are timed by the backend
    if (step.type === 'api') {
        gherkin += `  * def System = Java.type('java.lang.System')\n`;
        gherkin += `  * def startTime = System.currentTimeMillis()\n`;
    }

    switch (step.type) {
      case 'sql':
      case 'redis':
      case 'clickhouse': {
        const dbConfig = step.config as SqlStepConfig | RedisStepConfig | ClickhouseStepConfig;
        const query = 'query' in dbConfig ? dbConfig.query : dbConfig.command;
        const requestBody = { query: query, type: step.type };
        gherkin += `  Given url 'http://localhost:8080/query'\n`;
        gherkin += `  And request ${JSON.stringify(requestBody)}\n`;
        gherkin += `  When method post\n`;
        break;
      }
      case 'api': {
        const apiConfig = step.config as ApiStepConfig;
        if (apiConfig.method.toUpperCase() === 'GET' && apiConfig.url.includes('?')) {
          try {
            const url = new URL(apiConfig.url);
            const baseUrl = `${url.protocol}//${url.host}${url.pathname}`;
            gherkin += `  Given url '${baseUrl}'\n`;
            url.searchParams.forEach((value, key) => {
              const escapedValue = value.replace(/'/g, "\\'");
              gherkin += `  And param ${key} = '${escapedValue}'\n`;
            });
          } catch (e) {
            console.error("Invalid URL for GET request, falling back to old behavior:", apiConfig.url, e);
            gherkin += `  Given url '${apiConfig.url}'\n`;
          }
        } else {
          gherkin += `  Given url '${apiConfig.url}'\n`;
        }

        if (apiConfig.headers && Object.keys(apiConfig.headers).length > 0) {
          gherkin += `  And headers ${JSON.stringify(apiConfig.headers)}\n`;
        }
        if (apiConfig.body) {
          gherkin += `  And request """\n${apiConfig.body}\n"""\n`;
        }
        gherkin += `  When method ${apiConfig.method.toUpperCase()}\n`;
        break;
      }
    }

    // Handle response and execution time
    gherkin += `  Then status 200\n`;
    if (step.type === 'api') {
        gherkin += `  * def endTime = System.currentTimeMillis()\n`;
        gherkin += `  * def executionTime = endTime - startTime\n`;
        gherkin += `  * def resultData = response\n`;
    } else {
        gherkin += `  * def responseData = response\n`;
        gherkin += `  * print 'Just response printing'\n`;
        gherkin += `  * print responseData\n`;
        gherkin += `  * def executionTime = responseData.executionTime\n`;
        gherkin += `  * print 'Execution Time: '\n`;
        gherkin += `  * print executionTime\n`;
        gherkin += `  * def resultData = responseData.result\n`;
    }

    gherkin += `  * def qatoPayload = { stepName: '${sanitizedStepName}', type: '${step.type}', result: '#(resultData)', executionTime: '#(executionTime)' }\n`;
    gherkin += `  * print '---QATO_RESULT_START---'\n`;
    gherkin += `  * print karate.toJson(qatoPayload)\n`;
    gherkin += `  * print '---QATO_RESULT_END---'\n\n`;
  });

  console.log('[DEBUG:Index.tsx] Generated Gherkin:\n', gherkin);
  return gherkin;
};

const Index = () => {
  const [folders, setFolders] = useState<Folder[]>([
    {
      id: 'folder-1',
      name: 'E-commerce API Tests',
      collections: [
        {
          id: 'collection-1',
          name: 'User Management',
          folderId: 'folder-1',
          testCases: [
            {
              id: 'test-1',
              name: 'Create User Flow',
              collectionId: 'collection-1',
              createdAt: new Date(),
              updatedAt: new Date(),
              steps: [
                {
                  id: 'step-1',
                  name: 'Check DB Connection',
                  type: 'sql',
                  delayMs: 0,
                  config: { query: 'SELECT 1;' }
                },
                {
                  id: 'step-2',
                  name: 'Clear Cache',
                  type: 'redis',
                  delayMs: 100,
                  config: { command: 'FLUSHDB' }
                },
                {
                  id: 'step-3',
                  name: 'Create User API',
                  type: 'api',
                  delayMs: 500,
                  config: {
                    method: 'POST',
                    url: 'https://api.example.com/users',
                    headers: { 'Content-Type': 'application/json' },
                    body: '{"name": "John Doe", "email": "john@example.com"}'
                  }
                }
              ]
            },
            {
              id: 'test-2',
              name: 'User Login Test',
              collectionId: 'collection-1',
              createdAt: new Date(),
              updatedAt: new Date(),
              steps: []
            }
          ]
        },
        {
          id: 'collection-2',
          name: 'Product Catalog',
          folderId: 'folder-1',
          testCases: [
            {
              id: 'test-3',
              name: 'Product Search',
              collectionId: 'collection-2',
              createdAt: new Date(),
              updatedAt: new Date(),
              steps: []
            }
          ]
        }
      ]
    }
  ]);

  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [isNavigatorCollapsed, setIsNavigatorCollapsed] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [testResults, setTestResults] = useState<KarateResult | null>(null);
  const [stepResults, setStepResults] = useState<any[]>([]); // New state for parsed results
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();

  const addFolder = useCallback((name: string) => {
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name,
      collections: [],
    };
    setFolders(prev => [...prev, newFolder]);
  }, []);

  const addCollection = useCallback((folderId: string, name: string) => {
    setFolders(prevFolders => prevFolders.map(folder => {
      if (folder.id === folderId) {
        const newCollection: Collection = {
          id: `collection-${Date.now()}`,
          name,
          folderId,
          testCases: [],
        };
        return {
          ...folder,
          collections: [...folder.collections, newCollection],
        };
      }
      return folder;
    }));
  }, []);

  const addTestCase = useCallback((collectionId: string, name: string) => {
    setFolders(prevFolders => prevFolders.map(folder => {
      return {
        ...folder,
        collections: folder.collections.map(collection => {
          if (collection.id === collectionId) {
            const newTestCase: TestCase = {
              id: `test-${Date.now()}`,
              name,
              collectionId,
              steps: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            return {
              ...collection,
              testCases: [...collection.testCases, newTestCase],
            };
          }
          return collection;
        }),
      };
    }));
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    const message = event.data as { command: string; payload: any };
    console.log('[DEBUG:Index.tsx] Received message from extension:', message);

    switch (message.command) {
      case 'testResult': {
        setIsExecuting(false);
        if (!message.payload) {
            console.error('Received testResult with null payload.');
            toast({ title: "Error", description: "Received empty test results.", variant: "destructive" });
            return;
        }
        
        const { parsedResults, ...karateSummary } = message.payload;
        setTestResults(karateSummary);
        setStepResults(parsedResults || []);
        console.log('[DEBUG:Index.tsx] Processed Karate summary:', karateSummary);
        console.log('[DEBUG:Index.tsx] Processed step results:', parsedResults);

        toast({
          title: "Test Run Finished",
          description: `See the results in the tabs below.`,
        });
        break;
      }
      case 'testExecutionError': {
        setIsExecuting(false);
        toast({
          title: "Execution Error",
          description: message.payload.message || 'An unknown error occurred in the extension.',
          variant: "destructive",
        });
        break;
      }
    }
  }, [toast]); // Dependencies for the callback

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]); // Effect depends on the memoized callback

  const handleRunTestCase = async (testCase: TestCase) => {
    if (!testCase || isExecuting) return;

    setIsExecuting(true);
    setTestResults(null);
    setStepResults([]);
    setExecutionLogs([]); // Clear previous logs

    toast({
      title: "Test Run Started",
      description: `Executing: ${testCase.name}`,
    });

    try {
      const gherkinContent = generateGherkin(testCase);
      vscode.postMessage({
        command: 'runGeneratedTest',
        payload: { featureFileContent: gherkinContent }
      });
    } catch (error) {
      console.error('Error in handleRunTestCase:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'An unknown error occurred while preparing the test.',
        variant: "destructive",
      });
      setIsExecuting(false);
    }
  };

  

  return (
    <div className="min-h-screen bg-background text-foreground flex theme-transition">
      <ThemeToggle />
      <TestNavigator
        isCollapsed={isNavigatorCollapsed}
        onToggleCollapse={() => setIsNavigatorCollapsed(!isNavigatorCollapsed)}
        selectedTestCase={selectedTestCase}
        onSelectTestCase={setSelectedTestCase}
        vscode={vscode}
        folders={folders} // Assuming 'folders' state exists here
      />
      
      <div className="flex-1 flex flex-col">
        <Editor
          testCase={selectedTestCase}
          onUpdateTestCase={setSelectedTestCase}
          onRunTestCase={handleRunTestCase}
          isExecuting={isExecuting}
        />
        
        <Results
          executionLogs={executionLogs}
          testResults={testResults} // Pass summary results
          stepResults={stepResults} // Pass step-by-step results
        />
      </div>
    </div>
  );
};

export default Index;
