import { useState, useEffect } from 'react';
import { Navigator } from '@/components/Navigator';
import { Editor } from '@/components/Editor';
import { Results } from '@/components/Results';
import { ThemeToggle } from '@/components/ThemeToggle';
import { TestCase, ExecutionLog, ApiResponse, TestStep, SqlStepConfig, RedisStepConfig, ApiStepConfig, ClickhouseStepConfig } from '@/types';
import { useToast } from '@/hooks/use-toast';

declare const vscode: any; // Declare vscode API

const generateGherkin = (testCase: TestCase): string => {
  let gherkin = `Feature: ${testCase.name}

`;

  gherkin += `Background:
  * def DbUtils = Java.type('com.qato.utils.DbUtils')
`;

  testCase.steps.forEach(step => {
    gherkin += `
Scenario: ${step.name}
`;
    switch (step.type) {
      case 'sql': {
        const sqlConfig = step.config as SqlStepConfig;
        gherkin += `  * def result = DbUtils.readRow("${sqlConfig.query.replace(/"/g, '"')}")
`;
        gherkin += `  * print 'SQL Result:', result
`;
        break;
      }
      case 'redis': {
        const redisConfig = step.config as RedisStepConfig;
        gherkin += `  * def result = DbUtils.execute("${redisConfig.command.replace(/"/g, '\"')}")
`;
        gherkin += `  * print 'Redis Result:', result
`;
        break;
      }
      case 'api': {
        const apiConfig = step.config as ApiStepConfig;
        gherkin += `  Given url '${apiConfig.url}'
`;
        gherkin += `  And method ${apiConfig.method}
`;
        if (apiConfig.headers && Object.keys(apiConfig.headers).length > 0) {
          gherkin += `  And headers ${JSON.stringify(apiConfig.headers)}
`;
        }
        if (apiConfig.body) {
          gherkin += `  And request ${apiConfig.body}
`;
        }
        gherkin += `  When method ${apiConfig.method}
`;
        gherkin += `  Then status 200
`; // Assuming 200 for now
        break;
      }
      case 'clickhouse': {
        const clickhouseConfig = step.config as ClickhouseStepConfig;
        gherkin += `  * def result = DbUtils.readRow("${clickhouseConfig.query.replace(/"/g, '\"')}")
`;
        gherkin += `  * print 'Clickhouse Result:', result
`;
        break;
      }
    }
  });

  return gherkin;
};

const Index = () => {
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [isNavigatorCollapsed, setIsNavigatorCollapsed] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case 'testResult':
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
  }, []);

  const handleRunTestCase = async (testCase: TestCase) => {
    if (!testCase || isExecuting) return;
    
    setIsExecuting(true);
    setExecutionLogs([]);
    setApiResponse(null);
    
    try {
      // Generate Gherkin content
      const gherkinContent = generateGherkin(testCase);
      console.log("Generated Gherkin:\n", gherkinContent);

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
        />
      </div>
    </div>
  );
};

export default Index;
