import { useState, useEffect, useCallback, useRef } from 'react';
import { TestNavigator } from '@/components/TestNavigator';
import { Editor } from '@/components/Editor';
import { Header } from '@/components/Header';
import { TestCase, ExecutionLog, SqlStepConfig, RedisStepConfig, ApiStepConfig, ClickhouseStepConfig, Folder, Collection, ValidationConfig, WorkspaceTree, WorkspaceFolder, WorkspaceCollection, WorkspaceTestCase, GlobalConfig, FolderConfig } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { TestResultsManager } from '@/services/TestResultsManager';

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

const generateGherkin = (testCase: TestCase, workspaceTree?: WorkspaceTree): string => {
  console.log('[DEBUG:Index.tsx] Generating Gherkin for test case:', testCase);
  console.log('[DEBUG:Index.tsx] Workspace tree:', workspaceTree);

  // Get flow control configuration
  const flowControlConfig = testCase.flowControlConfig || {
    stopOnFailure: false,
    continueOnFailure: true,
    skipRemainingSteps: false,
    failureThreshold: 10
  };

  // --- FIX 1: Create only ONE Feature and ONE Scenario for the entire test case ---
  // This ensures variables defined in one step are available to the next.
  let gherkin = `Feature: ${testCase.name}\n\n`;
  gherkin += `Scenario: Full flow for ${testCase.name}\n\n`;

  // Add flow control configuration
  gherkin += `  * def flowControlConfig = ${JSON.stringify(flowControlConfig)}\n`;
  gherkin += `  * def failureCount = 0\n`;
  gherkin += `  * def shouldContinue = true\n\n`;

  // Map to track extracted variable types
  const extractedVars: Record<string, { type: string }> = {};
  let missingVar = false;

  testCase.steps.forEach((step, idx) => {
    // Add a comment to delineate steps for readability in the generated file
    gherkin += `  # --- Step ${idx + 1}: ${step.name} ---\n`;
    const sanitizedStepName = step.name.replace(/'/g, "\\'");

    // Check if we should continue execution using proper Karate syntax
    gherkin += `  * def skipStep = !shouldContinue\n`;
    gherkin += `  * if (skipStep) karate.log('Step "${sanitizedStepName}" skipped due to flow control decision')\n`;
    gherkin += `  * if (skipStep) karate.abort()\n`;

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
        
        // NEW FIX: Use triple-quoted strings for all queries to handle single quotes properly
        if (!dynamicPattern.test(query)) {
          // No dynamic variables present - use triple quotes to handle single quotes
          gherkin += `  * def query =\n`;
          gherkin += `    """\n${query}\n"""\n`;
          gherkin += `  * print 'query (no substitution needed): ' + query\n`;
        } else {
          // Dynamic variables present - need to construct query with proper escaping
          // First, extract all string literals (content within single quotes)
          const stringLiterals: Record<string, string> = {};
          let literalCounter = 0;
          let tempQuery = query;
          
          // Extract string literals and replace with placeholders
          tempQuery = tempQuery.replace(/'([^']*)'/g, (match, content) => {
            const placeholder = `__STRING_LITERAL_${literalCounter}__`;
            stringLiterals[placeholder] = content;
            literalCounter++;
            return placeholder;
          });
          
          // Now handle dynamic variable substitution on the temp query
          const processedQuery = tempQuery.replace(dynamicPattern, (_match, varName) => {
            if (extractedVars[varName]) {
              const varType = extractedVars[varName].type || 'string';
              if (varType === 'string') {
                return `" + "'" + ${varName} + "'" + "`;
              } else {
                return `" + ${varName} + "`;
              }
            } else {
              missingVar = true;
              gherkin += `  * print 'Required variable "${varName}" is missing. Skipping this and subsequent steps.'\n`;
              return `MISSING_VAR_${varName}`;
            }
          });
          
          // Restore string literals
          let finalQuery = processedQuery;
          Object.entries(stringLiterals).forEach(([placeholder, content]) => {
            finalQuery = finalQuery.replace(placeholder, `'${content}'`);
          });
          
          // Use triple-quoted string with proper concatenation
          gherkin += `  * def query = "${finalQuery}"\n`;
          gherkin += `  * print 'query constructed: ' + query\n`;
        }

        // Build test context for configuration-aware queries
        let testContext = {
          testCaseName: testCase.name,
          workspaceRoot: workspaceTree?.rootPath || '',
          folderPath: '',
          collectionPath: '',
          globalConfig: workspaceTree?.globalConfig,
          folderConfig: null
        };

        // Try to find the folder and collection paths from the workspace tree
        if (workspaceTree) {
          for (const folder of workspaceTree.folders) {
            for (const collection of folder.collections) {
              for (const wsTestCase of collection.testCases) {
                if (wsTestCase.id === testCase.id) {
                  testContext.folderPath = folder.path;
                  testContext.collectionPath = collection.path;
                  testContext.folderConfig = folder.config;
                  break;
                }
              }
            }
          }
        }

        gherkin += `  * def testContext = ${JSON.stringify(testContext)}\n`;
        gherkin += `  Given url 'http://localhost:8280/query-with-context'\n`;
        gherkin += `  And request { query: '#(query)', type: "${step.type}", context: '#(testContext)' }\n`;
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
        // Don't enforce status 200 - capture response regardless of status
        gherkin += `  * print 'API Response Status: ' + responseStatus\n`;
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
        
        // Generate comparison based on operator
        let comparisonLogic = '';
        switch (validation.operator || 'equals') {
          case 'equals':
            comparisonLogic = 'validationActual == validationExpected';
            break;
          case 'not-equals':
            comparisonLogic = 'validationActual != validationExpected';
            break;
          case 'greater-than':
            comparisonLogic = 'validationActual > validationExpected';
            break;
          case 'less-than':
            comparisonLogic = 'validationActual < validationExpected';
            break;
          case 'contains':
            if (validation.dataType === 'string') {
              comparisonLogic = 'validationActual.contains(validationExpected)';
            } else if (validation.dataType === 'array') {
              comparisonLogic = 'validationActual.contains(validationExpected)';
            } else {
              comparisonLogic = 'validationActual.toString().contains(validationExpected.toString())';
            }
            break;
          case 'matches':
            comparisonLogic = 'java.util.regex.Pattern.matches(validationExpected, validationActual.toString())';
            break;
          default:
            comparisonLogic = 'validationActual == validationExpected';
        }
        
        gherkin += `  * def validationResult = (${comparisonLogic}) ? 'success' : 'failure'\n`;

        // Add custom error message if provided
        const customMessage = validation.customErrorMessage ?
          validation.customErrorMessage.replace(/'/g, "\\'") :
          `Validation failed for ${sanitizedTarget}`;

        gherkin += `  * def validationMessage = validationResult == 'success' ? '' : '${customMessage}'\n`;
        gherkin += `  * def validationPayload = { id: '${validation.id}', status: '#(validationResult)', actualValue: '#(validationActual)', expectedValue: '#(validationExpected)', dataType: '${validation.dataType}', target: '${sanitizedTarget}', timestamp: '#(currentTimestamp)', message: '#(validationMessage)', stepType: '${step.type}', stepName: '${step.name}' }\n`;
        gherkin += `  * print '---QATO_VALIDATION_START---'\n`;
        gherkin += `  * print karate.toJson(validationPayload)\n`;
        gherkin += `  * print '---QATO_VALIDATION_END---'\n`;

        // Handle flow control based on validation result
        gherkin += `  * if (validationResult == 'failure') failureCount = failureCount + 1\n`;
        gherkin += `  * if (validationResult == 'failure' && flowControlConfig.stopOnFailure) shouldContinue = false\n`;
        gherkin += `  * if (failureCount >= flowControlConfig.failureThreshold) shouldContinue = false\n`;

        // Only assert if we should stop on failure, otherwise just log
        gherkin += `  * if (validationResult == 'failure' && flowControlConfig.stopOnFailure) karate.fail('Validation failed: ' + validationMessage)\n`;
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
  const [folders, setFolders] = useState<Folder[]>([]);
  const [workspaceTree, setWorkspaceTree] = useState<WorkspaceTree | null>(null);
  const [isWorkspaceInitialized, setIsWorkspaceInitialized] = useState(false);

  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [isNavigatorCollapsed, setIsNavigatorCollapsed] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();
  const runStartTime = useRef<number | null>(null);
  
  // Test results manager instance
  const resultsManager = useRef(new TestResultsManager());

  // Get current results for the selected test case
  const getCurrentResults = useCallback(() => {
    if (!selectedTestCase) {
      return {
        testResults: null,
        stepResults: [],
        validationResults: [],
        executionLogs: []
      };
    }
    return resultsManager.current.getResults(selectedTestCase.id);
  }, [selectedTestCase]);

  // Convert workspace tree to folder structure for UI compatibility
  const convertWorkspaceToFolders = useCallback((workspaceTree: WorkspaceTree): Folder[] => {
    return workspaceTree.folders.map(wsFolder => ({
      id: wsFolder.id,
      name: wsFolder.name,
      collections: wsFolder.collections.map(wsCollection => ({
        id: wsCollection.id,
        name: wsCollection.name,
        folderId: wsCollection.folderId,
        testCases: wsCollection.testCases.map(wsTestCase => wsTestCase.testCase)
      }))
    }));
  }, []);

  const addFolder = useCallback((name: string) => {
    if (!workspaceTree) {
      toast({ title: "Error", description: "No workspace initialized", variant: "destructive" });
      return;
    }
    
    vscode.postMessage({
      command: 'createFolder',
      payload: { name, parentPath: workspaceTree.rootPath }
    });
  }, [workspaceTree, toast]);

  const addCollection = useCallback((folderId: string, name: string) => {
    if (!workspaceTree) {
      toast({ title: "Error", description: "No workspace initialized", variant: "destructive" });
      return;
    }
    
    const folder = workspaceTree.folders.find(f => f.id === folderId);
    if (!folder) {
      toast({ title: "Error", description: "Folder not found", variant: "destructive" });
      return;
    }
    
    vscode.postMessage({
      command: 'createCollection',
      payload: { name, folderPath: folder.path }
    });
  }, [workspaceTree, toast]);

  const addTestCase = useCallback((collectionId: string, name: string) => {
    if (!workspaceTree) {
      toast({ title: "Error", description: "No workspace initialized", variant: "destructive" });
      return;
    }
    
    // Find the collection path
    let collectionPath = '';
    for (const folder of workspaceTree.folders) {
      const collection = folder.collections.find(c => c.id === collectionId);
      if (collection) {
        collectionPath = collection.path;
        break;
      }
    }
    
    if (!collectionPath) {
      toast({ title: "Error", description: "Collection not found", variant: "destructive" });
      return;
    }
    
    const newTestCase: TestCase = {
      id: `test-${Date.now()}`,
      name,
      collectionId,
      steps: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    vscode.postMessage({
      command: 'saveTestCase',
      payload: { testCase: newTestCase, collectionPath }
    });
  }, [workspaceTree, toast]);

  const handleUpdateTestCase = (updatedTestCase: TestCase) => {
    if (!workspaceTree) {
      toast({ title: "Error", description: "No workspace initialized", variant: "destructive" });
      return;
    }
    
    // Find the collection path for this test case
    let collectionPath = '';
    for (const folder of workspaceTree.folders) {
      const collection = folder.collections.find(c => c.id === updatedTestCase.collectionId);
      if (collection) {
        collectionPath = collection.path;
        break;
      }
    }
    
    if (!collectionPath) {
      toast({ title: "Error", description: "Collection not found for test case", variant: "destructive" });
      return;
    }
    
    // Save the updated test case to file system
    vscode.postMessage({
      command: 'saveTestCase',
      payload: { testCase: updatedTestCase, collectionPath }
    });
    
    setSelectedTestCase(updatedTestCase);
  };

  const handleDeleteTestCase = useCallback((testCase: TestCase) => {
    if (!workspaceTree) {
      toast({ title: "Error", description: "No workspace initialized", variant: "destructive" });
      return;
    }
    
    // Find the test case file path
    let testCasePath = '';
    for (const folder of workspaceTree.folders) {
      for (const collection of folder.collections) {
        const wsTestCase = collection.testCases.find(tc => tc.testCase.id === testCase.id);
        if (wsTestCase) {
          testCasePath = wsTestCase.path;
          break;
        }
      }
      if (testCasePath) break;
    }
    
    if (!testCasePath) {
      toast({ title: "Error", description: "Test case file not found", variant: "destructive" });
      return;
    }
    
    // Clear selection if deleting the currently selected test case
    if (selectedTestCase?.id === testCase.id) {
      setSelectedTestCase(null);
    }
    
    // Remove results for this test case
    resultsManager.current.removeResults(testCase.id);
    
    // Send delete command to extension
    vscode.postMessage({
      command: 'deleteTestCase',
      payload: { testCasePath }
    });
    
    toast({ title: "Test Case Deleted", description: `"${testCase.name}" has been deleted.` });
  }, [workspaceTree, selectedTestCase, toast]);

  const handleDeleteCollection = useCallback((folderId: string, collectionId: string) => {
    if (!workspaceTree) {
      toast({ title: "Error", description: "No workspace initialized", variant: "destructive" });
      return;
    }
    
    // Find the collection path
    let collectionPath = '';
    let collectionName = '';
    for (const folder of workspaceTree.folders) {
      if (folder.id === folderId) {
        const collection = folder.collections.find(c => c.id === collectionId);
        if (collection) {
          collectionPath = collection.path;
          collectionName = collection.name;
          break;
        }
      }
    }
    
    if (!collectionPath) {
      toast({ title: "Error", description: "Collection not found", variant: "destructive" });
      return;
    }
    
    // Clear selection if deleting a collection that contains the selected test case
    if (selectedTestCase?.collectionId === collectionId) {
      setSelectedTestCase(null);
    }
    
    // Send delete command to extension
    vscode.postMessage({
      command: 'deleteCollection',
      payload: { collectionPath }
    });
    
    toast({ title: "Collection Deleted", description: `"${collectionName}" and all its test cases have been deleted.` });
  }, [workspaceTree, selectedTestCase, toast]);

  const handleDeleteFolder = useCallback((folderId: string) => {
    if (!workspaceTree) {
      toast({ title: "Error", description: "No workspace initialized", variant: "destructive" });
      return;
    }
    
    // Find the folder path
    const folder = workspaceTree.folders.find(f => f.id === folderId);
    if (!folder) {
      toast({ title: "Error", description: "Folder not found", variant: "destructive" });
      return;
    }
    
    // Clear selection if deleting a folder that contains the selected test case
    if (selectedTestCase) {
      const containsSelectedTestCase = folder.collections.some(c => 
        c.testCases.some(tc => tc.testCase.id === selectedTestCase.id)
      );
      if (containsSelectedTestCase) {
        setSelectedTestCase(null);
      }
    }
    
    // Send delete command to extension
    vscode.postMessage({
      command: 'deleteFolder',
      payload: { folderPath: folder.path }
    });
    
    toast({ title: "Folder Deleted", description: `"${folder.name}" and all its contents have been deleted.` });
  }, [workspaceTree, selectedTestCase, toast]);

  const handleUpdateGlobalConfig = useCallback((config: any) => {
    if (!workspaceTree) return;
    
    console.log('[DEBUG:Index.tsx] Sending updateGlobalConfig message:', JSON.stringify(config, null, 2));
    vscode.postMessage({
      command: 'updateGlobalConfig',
      payload: { config }
    });
  }, [workspaceTree]);

  const handleUpdateFolderConfig = useCallback((folderPath: string, config: unknown) => {
    vscode.postMessage({
      command: 'updateFolderConfig',
      payload: { folderPath, config }
    });
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    const message = event.data as { command: string; payload: unknown };
    console.log('[DEBUG:Index.tsx] Received message from extension:', message);

    switch (message.command) {
      case 'workspaceInitialized': {
        const { workspaceTree } = message.payload as { workspaceTree: WorkspaceTree };
        setWorkspaceTree(workspaceTree);
        setFolders(convertWorkspaceToFolders(workspaceTree));
        setIsWorkspaceInitialized(true);
        toast({ title: "Workspace Loaded", description: `Loaded ${workspaceTree.folders.length} folders` });
        break;
      }
      
      case 'fileSystemChanged': {
        const { workspaceTree } = message.payload as { workspaceTree: WorkspaceTree };
        console.log('[DEBUG:Index.tsx] Received fileSystemChanged message, updating workspace tree:', JSON.stringify(workspaceTree, null, 2));
        setWorkspaceTree(workspaceTree);
        setFolders(convertWorkspaceToFolders(workspaceTree));
        break;
      }
      
      case 'workspaceError': {
        const { error } = message.payload as { error: string };
        toast({ title: "Workspace Error", description: error, variant: "destructive" });
        break;
      }
      
      case 'inputBoxResult': {
        const { value, context } = message.payload as { value?: string; context: any };
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
        const payload = message.payload as any;
        const { parsedResults, validationResults, testCaseId, ...karateSummary } = payload;
        
        // Store results in the results manager for the specific test case
        const targetTestCaseId = testCaseId || selectedTestCase?.id;
        if (targetTestCaseId) {
          resultsManager.current.setResults(
            targetTestCaseId,
            karateSummary,
            parsedResults || [],
            validationResults || [],
            [] // executionLogs - could be added later if needed
          );
        }
        
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
        const { message: errorMessage } = message.payload as { message?: string };
        toast({
          title: "Execution Error",
          description: errorMessage || 'An unknown error occurred in the extension.',
          variant: "destructive",
        });
        break;
      }
    }
  }, [toast, addFolder, addCollection, addTestCase, convertWorkspaceToFolders]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  // Initialize workspace on component mount
  useEffect(() => {
    if (!isWorkspaceInitialized) {
      vscode.postMessage({
        command: 'initializeWorkspace',
        payload: {}
      });
    }
  }, [isWorkspaceInitialized]);

    const handleRunTestCase = async (testCase: TestCase) => {
    if (!testCase || isExecuting) return;

    setIsExecuting(true);
    
    // Clear results for this specific test case
    resultsManager.current.clearResults(testCase.id);

    // Record start time
    runStartTime.current = Date.now();

    toast({
      title: "Test Run Started",
      description: `Executing: ${testCase.name}`,
    });

    try {
      const gherkinContent = generateGherkin(testCase, workspaceTree);
      vscode.postMessage({
        command: 'runGeneratedTest',
        payload: { 
          featureFileContent: gherkinContent,
          testContext: {
            testCaseName: testCase.name,
            testCaseId: testCase.id, // Include test case ID for results association
            workspaceRoot: workspaceTree?.rootPath || '',
            globalConfig: workspaceTree?.globalConfig,
            folderConfig: null // Will be determined by the backend
          }
        }
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

  const handleDebugConfig = async (testCase: TestCase) => {
    if (!testCase) return;

    console.log('[DEBUG:Index.tsx] Debugging configuration for test case:', testCase);
    console.log('[DEBUG:Index.tsx] Workspace tree:', workspaceTree);

    try {
      // Find the folder and collection paths
      let folderPath = '';
      let collectionPath = '';
      let folderConfig = null;

      if (workspaceTree) {
        for (const folder of workspaceTree.folders) {
          for (const collection of folder.collections) {
            for (const wsTestCase of collection.testCases) {
              if (wsTestCase.id === testCase.id) {
                folderPath = folder.path;
                collectionPath = collection.path;
                folderConfig = folder.config;
                break;
              }
            }
          }
        }
      }

      const testContext = {
        testCaseName: testCase.name,
        workspaceRoot: workspaceTree?.rootPath || '',
        folderPath: folderPath,
        collectionPath: collectionPath,
        globalConfig: workspaceTree?.globalConfig,
        folderConfig: folderConfig
      };

      console.log('[DEBUG:Index.tsx] Test context for debug:', testContext);

      // Send debug request to backend
      const response = await fetch('http://localhost:8280/debug-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context: testContext })
      });

      const debugResult = await response.json();
      console.log('[DEBUG:Index.tsx] Debug result:', debugResult);

      toast({
        title: "Configuration Debug",
        description: debugResult.success ? 
          `Configuration loaded successfully. Check console for details.` : 
          `Configuration debug failed: ${debugResult.error}`,
        variant: debugResult.success ? "default" : "destructive",
      });

    } catch (error) {
      console.error('Error in handleDebugConfig:', error);
      toast({
        title: "Debug Error",
        description: error instanceof Error ? error.message : 'An unknown error occurred while debugging configuration.',
        variant: "destructive",
      });
    }
  };

  if (!isWorkspaceInitialized) {
    return (
      <div className="h-screen bg-background text-foreground flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-lg font-medium mb-2">Initializing QATO Workspace</h2>
          <p className="text-sm text-muted-foreground">Please select a folder for your test cases...</p>
        </div>
      </div>
    );
  }

  const globalConfig = workspaceTree?.globalConfig || {
    version: '1.0.0',
    databases: [],
    defaultDatabaseConnections: {}
  };

  return (
    <div className="h-screen bg-background text-foreground flex flex-col theme-transition overflow-hidden">
      <Header 
        globalConfig={globalConfig}
        onUpdateGlobalConfig={handleUpdateGlobalConfig}
      />

      <div className="flex-1 flex min-h-0">
        <TestNavigator
          isCollapsed={isNavigatorCollapsed}
          onToggleCollapse={() => setIsNavigatorCollapsed(!isNavigatorCollapsed)}
          selectedTestCase={selectedTestCase}
          onSelectTestCase={setSelectedTestCase}
          onDeleteTestCase={handleDeleteTestCase}
          onDeleteCollection={handleDeleteCollection}
          onDeleteFolder={handleDeleteFolder}
          workspaceFolders={workspaceTree?.folders}
          onUpdateFolderConfig={handleUpdateFolderConfig}
          vscode={vscode}
          folders={folders}
        />

        <div className="flex-1 flex flex-col min-h-0">
            <Editor
              testCase={selectedTestCase}
              onUpdateTestCase={handleUpdateTestCase}
              onRunTestCase={handleRunTestCase}
              onDebugConfig={handleDebugConfig}
              isExecuting={isExecuting}
              executionLogs={getCurrentResults().executionLogs}
              testResults={getCurrentResults().testResults}
              stepResults={getCurrentResults().stepResults}
              validationResults={getCurrentResults().validationResults}
            />
        </div>
      </div>
    </div>
  );
};

export default Index;
