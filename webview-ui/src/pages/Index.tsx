import { useState, useEffect } from 'react';
import { Navigator } from '@/components/Navigator';
import { Editor } from '@/components/Editor';
import { Results } from '@/components/Results';
import { ThemeToggle } from '@/components/ThemeToggle';
import { TestCase, ExecutionLog, ApiResponse, TestStep, SqlStepConfig, RedisStepConfig, ApiStepConfig, ClickhouseStepConfig } from '@/types';
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

const generateGherkin = (testCase: TestCase): string => {
  console.log('[DEBUG:Index.tsx] Generating Gherkin for test case:', testCase);
  let gherkin = `Feature: ${testCase.name}\n\n`;

  testCase.steps.forEach(step => {
    gherkin += `Scenario: ${step.name}\n`;
    switch (step.type) {
      case 'sql': {
        const sqlConfig = step.config as SqlStepConfig;
        gherkin += `  Given url 'http://localhost:8080/query'\n`;
        gherkin += `  And request { query: "${sqlConfig.query.replace(/"/g, '\"')}", type: "sql" }\n`;
        gherkin += `  When method post\n`;
        gherkin += `  Then status 200\n`;
        gherkin += `  * def result = response\n`;
        gherkin += `  * def stringifiedResult = karate.jsonStringify(result)\n`;
        gherkin += `  * print 'SQL Result:', stringifiedResult\n\n`;
        break;
      }
      case 'redis': {
        const redisConfig = step.config as RedisStepConfig;
        gherkin += `  Given url 'http://localhost:8080/query'\n`;
        gherkin += `  And request { query: "${redisConfig.command.replace(/"/g, '\"')}", type: "redis" }\n`;
        gherkin += `  When method post\n`;
        gherkin += `  Then status 200\n`;
        gherkin += `  * def result = response\n`;
        gherkin += `  * def stringifiedResult = karate.jsonStringify(result)
`;        gherkin += `  * print 'Redis Result:', stringifiedResult

`;
        break;
      }
      case 'api': {
        const apiConfig = step.config as ApiStepConfig;
        gherkin += `  Given url '${apiConfig.url}'\n`;
        if (apiConfig.headers && Object.keys(apiConfig.headers).length > 0) {
          gherkin += `  And headers ${JSON.stringify(apiConfig.headers)}\n`;
        }
        if (apiConfig.body) {
          gherkin += `  And request ${apiConfig.body}\n`;
        }
        gherkin += `  When method ${apiConfig.method}\n`;
        gherkin += `  Then status 200\n\n`; // Assuming 200 for now
        break;
      }
      case 'clickhouse': {
        const clickhouseConfig = step.config as ClickhouseStepConfig;
        gherkin += `  Given url 'http://localhost:8080/query'\n`;
        gherkin += `  And request { query: "${clickhouseConfig.query.replace(/"/g, '\"')}", type: "clickhouse" }\n`;
        gherkin += `  When method post\n`;
        gherkin += `  Then status 200\n`;
        gherkin += `  * def result = response\n`;
        gherkin += `  * def stringifiedResult = karate.jsonStringify(result)
`;
        gherkin += `  * print 'Clickhouse Result:', stringifiedResult

`;
        break;
      }
    }
  });
  console.log('[DEBUG:Index.tsx] Generated Gherkin:', gherkin);
  return gherkin;
};


const Index = () => {
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [isNavigatorCollapsed, setIsNavigatorCollapsed] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [testResults, setTestResults] = useState<KarateResult | null>(null); // State for results
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data as { command: string; payload: KarateResult };
      console.log('[DEBUG:Index.tsx] Received message from extension:', message);
      switch (message.command) {
        case 'testResult':
          setTestResults(message.payload); // Update state with results
          // Assuming message.payload contains the parsed Karate report
          // You'll need to map this to your ExecutionLog and ApiResponse types
          // For now, let's just log it and show a success/failure toast
          console.log('Received test results:', message.payload);
          if (message.payload.features && message.payload.features.length > 0) {
            const feature = message.payload.features[0];
            if (feature.failedCount === 0) {
              toast({
                title: "Test Execution Successful",
                description: `All scenarios passed for ${feature.name}`,
              });
            } else {
              toast({
                title: "Test Execution Failed",
                description: `${feature.failedCount} scenario(s) failed for ${feature.name}`,
                variant: "destructive",
              });
            }
          }
          // You would typically parse message.payload and update executionLogs and apiResponse here
          // For example:
          // setExecutionLogs(parseKarateLogs(message.payload));
          // setApiResponse(parseKarateApiResponse(message.payload));
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [toast]);

  const handleRunTestCase = async (testCase: TestCase) => {
    if (!testCase || isExecuting) return;
    
    setIsExecuting(true);
    setExecutionLogs([]);
    setApiResponse(null);
    
    try {
      // Generate Gherkin content
      const gherkinContent = generateGherkin(testCase);
      console.log("[DEBUG:Index.tsx] Generated Gherkin content to be sent to extension:", gherkinContent);

      // Send message to extension
      vscode.postMessage({
        command: 'runGeneratedTest',
        payload: {
          featureFileContent: gherkinContent
        }
      });

      toast({
        title: "Test sent to extension",
        description: `Generated Gherkin for ${testCase.name} and sent to VS Code extension.`,
      });

    } catch (error) {
      console.error('Error generating Gherkin or sending to extension:', error);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex theme-transition">
      <ThemeToggle />
      <Navigator
        isCollapsed={isNavigatorCollapsed}
        onToggleCollapse={() => setIsNavigatorCollapsed(!isNavigatorCollapsed)}
        selectedTestCase={selectedTestCase}
        onSelectTestCase={setSelectedTestCase}
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
          apiResponse={apiResponse}
          testResults={testResults} // Pass results to the component
        />
      </div>
    </div>
  );
};

export default Index;
