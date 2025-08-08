import { useState, useEffect, useCallback, useRef } from 'react';
import { TestNavigator } from '@/components/TestNavigator';
import { Editor } from '@/components/Editor';
import { Results } from '@/components/Results';
import { ThemeToggle } from '@/components/ThemeToggle';
import { TestCase, ExecutionLog, ApiResponse, TestStep, SqlStepConfig, RedisStepConfig, ApiStepConfig, ClickhouseStepConfig, Folder, Collection, ValidationConfig } from '@/types';
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

  // --- FIX 1: Create only ONE Feature and ONE Scenario for the entire test case ---
  // This ensures variables defined in one step are available to the next.
  let gherkin = `Feature: ${testCase.name}\n\n`;
  gherkin += `Scenario: Full flow for ${testCase.name}\n\n`;

  // Map to track extracted variable types
  const extractedVars: Record<string, { type: string }> = {};
  let missingVar = false;

  testCase.steps.forEach((step, idx) => {
    // Add a comment to delineate steps for readability in the generated file
    gherkin += `  # --- Step ${idx + 1}: ${step.name} ---\n`;
    const sanitizedStepName = step.name.replace(/'/g, "\\'");

    if (missingVar) {
      gherkin += `  * print 'Step "${sanitizedStepName}" skipped due to missing required variable from a previous step.'\n\n`;
      return;
    }

    if (step.delayMs && step.delayMs > 0) {
      gherkin += `  * def Thread = Java.type('java.lang.Thread')\n`;
      gherkin += `  * Thread.sleep(${step.delayMs})\n`;
    }

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

        // Check if query contains dynamic variables (${...}$ pattern)
        const dynamicPattern = /\$\{([a-zA-Z0-9_]+)\}\$/g;
        let karateQuery: string;

        if (!dynamicPattern.test(query)) {
          // No dynamic variables present
          // Escape single quotes inside the query using \'
          const escapedQuery = query.replace(/'/g, "\\'");
          karateQuery = escapedQuery;
          gherkin += `  * def query = '${karateQuery}'\n`;
          gherkin += `  * print 'query (no substitution needed): ' + query\n`;
        } else {
          // Dynamic variables substitution logic
          karateQuery = query.replace(dynamicPattern, (_match, varName) => {
            if (extractedVars[varName]) {
              const varType = extractedVars[varName].type || 'string';
              if (varType === 'string') {
                return `' + "'" + ${varName} + "'" + '`;
              } else {
                return `' + ${varName} + '`;
              }
            } else {
              missingVar = true;
              gherkin += `  * print 'Required variable "${varName}" is missing. Skipping this and subsequent steps.'\n`;
              return `MISSING_VAR_${varName}`;
            }
          });
          gherkin += `  * def query = '${karateQuery}'\n`;
          gherkin += `  * print 'query constructed: ' + query\n`;
        }

        gherkin += `  Given url 'http://localhost:8280/query'\n`;
        gherkin += `  And request { query: '#(query)', type: "${step.type}" }\n`;
        gherkin += `  When method post\n`;
        gherkin += `  Then status 200\n`;
        // Add error handling for DB responses
        gherkin += `  * def dbResponse = response\n`;
        gherkin += `  * def hasDbError = dbResponse.result && dbResponse.result[0] && dbResponse.result[0].error\n`;
        gherkin += `  * if (hasDbError) karate.fail('DB Error: ' + dbResponse.result[0].error)\n`;
        break;
      }
      case 'api': {
        const apiConfig = step.config as ApiStepConfig;
        gherkin += `  Given url '${apiConfig.url.split('?')[0]}'\n`;
        if (apiConfig.headers && Object.keys(apiConfig.headers).length > 0) {
          gherkin += `  And headers ${JSON.stringify(apiConfig.headers)}\n`;
        }
        if (apiConfig.body) {
          let body = apiConfig.body.replace(/\$\{([a-zA-Z0-9_]+)\}\$/g, (_match, varName) => {
            if (extractedVars[varName]) {
              return `#(${varName})`;
            } else {
              missingVar = true;
              gherkin += `  * print 'Required variable "${varName}" is missing in body. Skipping this and subsequent steps.'\n`;
              return `MISSING_VAR_${varName}`;
            }
          });
          gherkin += `  * def requestBody =\n`;
          gherkin += `    """\n${body}\n"""\n`;
          gherkin += `  And request requestBody\n`;
        }
        gherkin += `  When method ${apiConfig.method.toUpperCase()}\n`;
        gherkin += `  Then status 200\n`;
        if (apiConfig.extractVars && apiConfig.extractVars.length > 0) {
          apiConfig.extractVars.forEach(({ name, path, type }) => {
            if (name && path) {
              gherkin += `  * def ${name} = karate.jsonPath(response, '${path}')\n`;
              extractedVars[name] = { type: type || 'string' };
            } else {
              gherkin += `  * print 'Extraction variable name or path missing. Skipping further steps.'\n`;
              missingVar = true;
            }
          });
        }
        gherkin += `  * def endTime = System.currentTimeMillis()\n`;
        gherkin += `  * def executionTime = endTime - startTime\n`;
        gherkin += `  * def resultData = { body: '#(response)', headers: '#(responseHeaders)', status: '#(responseStatus)' }\n`;
        break;
      }
    }

    // Validation logic - only run if no missing variables
    if (step.validations && step.validations.length > 0 && !missingVar) {
      step.validations.forEach((validation: ValidationConfig, valIdx) => {
        const sanitizedTarget = validation.target.replace(/'/g, "\\'");
        gherkin += `  # --- Validation ${valIdx + 1} for ${sanitizedStepName} ---\n`;
        
        let actualValue;
        if (step.type === 'api') {
          actualValue = `karate.jsonPath(response, '${sanitizedTarget}')`;
        } else {
          // For DB, assume result is an array of objects
          actualValue = `response.result[0].${sanitizedTarget}`;
        }
        
        gherkin += `  * def validationActual = ${actualValue}\n`;
        
        // Type-aware comparison
        let expectedValue = validation.expectedValue;
        if (validation.dataType === 'number') {
          expectedValue = parseFloat(validation.expectedValue).toString();
        } else if (validation.dataType === 'boolean') {
          expectedValue = validation.expectedValue.toLowerCase();
        } else if (validation.dataType === 'string') {
          expectedValue = `'${validation.expectedValue.replace(/'/g, "\\'")}'`;
        } else if (validation.dataType === 'array' || validation.dataType === 'object') {
          try {
            expectedValue = JSON.stringify(JSON.parse(validation.expectedValue));
          } catch {
            expectedValue = `'${validation.expectedValue.replace(/'/g, "\\'")}'`;
          }
        }
        
        gherkin += `  * def SimpleDateFormat = Java.type('java.text.SimpleDateFormat')\n`;
        gherkin += `  * def Date = Java.type('java.util.Date')\n`;
        gherkin += `  * def sdf = new SimpleDateFormat('yyyy-MM-dd HH:mm:ss')\n`;
        gherkin += `  * def currentTimestamp = sdf.format(new Date())\n`;


        gherkin += `  * def validationExpected = ${expectedValue}\n`;
        gherkin += `  * def validationResult = validationActual == validationExpected ? 'success' : 'failure'\n`;
        gherkin += `  * def validationPayload = { id: '${validation.id}', status: '#(validationResult)', actualValue: '#(validationActual)', expectedValue: '#(validationExpected)', dataType: '${validation.dataType}', target: '${sanitizedTarget}', timestamp: '#(currentTimestamp)' }\n`;
        gherkin += `  * print '---QATO_VALIDATION_START---'\n`;
        gherkin += `  * print karate.toJson(validationPayload)\n`;
        gherkin += `  * print '---QATO_VALIDATION_END---'\n`;

        // Fail the scenario if validation fails
        gherkin += `  * assert validationResult == 'success'\n`;
      });
    }

    // Handle result generation based on step type and missing variables
    if (missingVar) {
      // If missing variables, create an error result
      gherkin += `  * def qatoPayload = { stepName: '${sanitizedStepName}', type: '${step.type}', result: { error: 'Step skipped due to missing required variables' }, executionTime: 0 }\n`;
      gherkin += `  * print '---QATO_RESULT_START---'\n`;
      gherkin += `  * print karate.toJson(qatoPayload)\n`;
      gherkin += `  * print '---QATO_RESULT_END---'\n\n`;
    } else {
      // Normal result generation
      if (step.type !== 'api') {
        gherkin += `  * def responseData = response\n`;
        gherkin += `  * def executionTime = responseData.executionTime\n`;
        gherkin += `  * def resultData = responseData.result\n`;
      }
      gherkin += `  * def qatoPayload = { stepName: '${sanitizedStepName}', type: '${step.type}', result: '#(resultData)', executionTime: '#(executionTime)' }\n`;
      gherkin += `  * print '---QATO_RESULT_START---'\n`;
      gherkin += `  * print karate.toJson(qatoPayload)\n`;
      gherkin += `  * print '---QATO_RESULT_END---'\n\n`; // Add a newline for readability
    }
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
                  name: 'Create User API',
                  type: 'api',
                  delayMs: 500,
                  order: 2,
                  config: {
                    method: 'POST',
                    url: 'https://rcmqa.karix.com/services/rcm/sendMessage',
                    headers: { 'Authentication': 'Bearer Cv4zdo706u0P7YrwUMwRZA==' },
                    body: '{"message":{"channel":"WABA","content":{"preview_url":true,"shorten_url":false,"type":"TEMPLATE","template":{"templateId":"tamil_template04","parameterValues":{},"language":"ta"}},"recipient":{"to":"919398712957","recipient_type":"individual","reference":{"cust_ref":"cust ref test new ","conversationId":"conversation id test new","batchId":"410130031031145835340211","messageTag1":"livedelivery","messageTag2":"uniqueid message","messageTag3":"tag3","messageTag4":"tag4","messageTag5":"tag5","messageTag10":"Naruto-11thJune"}},"sender":{"from":"917391093716"},"preferences":{"webHookDNId":"1001"},"smsFallback":{"sender":"Alerts","destination":"919790212113","message":"qa test message for testing lounge"}},"metaData":{"version":"v1.0.9","originator":"API"}}',
                  },
                  validations: [
                    {
                      id: 'val-1',
                      type: 'api',
                      target: '$.status',
                      expectedValue: 'success',
                      dataType: 'string',
                      stepId: 'step-1',
                    },
                  ],
                },
                {
                  id: 'step-2',
                  name: 'Get MT SUB STATS',
                  type: 'clickhouse',
                  delayMs: 0,
                  order: 0,
                  config: { query: 'SELECT * from rcm_billing.RCM_MT_SUB_STATS;' }
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
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();
  const runStartTime = useRef<number | null>(null);

  const addFolder = useCallback((name: string) => {
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name,
      collections: [],
    };
    setFolders(prev => [...prev, newFolder]);
    toast({ title: "Folder Created", description: `Folder "${name}" has been added.` });
  }, [toast]);

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
    toast({ title: "Collection Created", description: `Collection "${name}" has been added.` });
  }, [toast]);

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
    toast({ title: "Test Case Created", description: `Test case "${name}" has been added.` });
  }, [toast]);

  const handleUpdateTestCase = (updatedTestCase: TestCase) => {
    setFolders(prevFolders =>
      prevFolders.map(folder => ({
        ...folder,
        collections: folder.collections.map(collection => {
          if (collection.id === updatedTestCase.collectionId) {
            return {
              ...collection,
              testCases: collection.testCases.map(tc =>
                tc.id === updatedTestCase.id ? updatedTestCase : tc
              ),
            };
          }
          return collection;
        }),
      }))
    );
    setSelectedTestCase(updatedTestCase);
  };

  const handleMessage = useCallback((event: MessageEvent) => {
    const message = event.data as { command: string; payload: any };
    console.log('[DEBUG:Index.tsx] Received message from extension:', message);

    switch (message.command) {
      case 'inputBoxResult': {
        const { value, context } = message.payload;
        if (!value) return; 

        switch (context.type) {
          case 'addFolder':
            addFolder(value);
            break;
          case 'addCollection':
            if (context.folderId) {
              addCollection(context.folderId, value);
            }
            break;
          case 'addTestCase':
            if (context.collectionId) {
              addTestCase(context.collectionId, value);
            }
            break;
        }
        break;
      }
      case 'testResult': {
        setIsExecuting(false);
        if (!message.payload) {
            console.error('Received testResult with null payload.');
            toast({ title: "Error", description: "Received empty test results.", variant: "destructive" });
            return;
        }
        // Log execution time
        if (runStartTime.current) {
          const duration = Date.now() - runStartTime.current;
          console.log(`[QATO] Total execution time (button click to response): ${duration} ms`);
          runStartTime.current = null;
        }
        const { parsedResults, validationResults, ...karateSummary } = message.payload;
        setTestResults(karateSummary);
        setStepResults(parsedResults || []);
        setValidationResults(validationResults || []);
        console.log('[DEBUG:Index.tsx] Processed Karate summary:', karateSummary);
        console.log('[DEBUG:Index.tsx] Processed step results:', parsedResults);
        console.log('[DEBUG:Index.tsx] Processed validation results:', validationResults);

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
  }, [toast, addFolder, addCollection, addTestCase]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  const handleRunTestCase = async (testCase: TestCase) => {
    if (!testCase || isExecuting) return;

    setIsExecuting(true);
    setTestResults(null);
    setStepResults([]);
    setValidationResults([]);
    setExecutionLogs([]);

    // Record start time
    runStartTime.current = Date.now();

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
        folders={folders}
      />
      
      <div className="flex-1 flex flex-col">
        <Editor
          testCase={selectedTestCase}
          onUpdateTestCase={handleUpdateTestCase}
          onRunTestCase={handleRunTestCase}
          isExecuting={isExecuting}
        />
        
        <Results
          executionLogs={executionLogs}
          testResults={testResults}
          stepResults={stepResults}
          validationResults={validationResults}
        />
      </div>
    </div>
  );
};

export default Index;
