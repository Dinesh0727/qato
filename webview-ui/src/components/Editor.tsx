import { useState, useRef } from 'react';
import { Play, Plus, Database, Zap, Globe, Table, BookOpen, Settings, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TestCase, TestStep, ValidationConfig, FlowControlConfig, ExecutionLog, ValidationResult, StepTemplate, ApiStepConfig } from '@/types';
import { StepCard } from '@/components/StepCard';
import { ValidationEditor } from '@/components/ValidationEditor';
import { FlowControlSettings } from '@/components/FlowControlSettings';
import { Results } from '@/components/Results';
import { StepTemplateModal } from '@/components/StepTemplateModal';
import { SaveTemplateModal } from '@/components/SaveTemplateModal';
import { TemplateManagementModal } from '@/components/TemplateManagementModal';
import { TagEditor } from '@/components/TagEditor';
import { CurlImportDialog } from '@/components/CurlImportDialog';
import { StepTemplateManager } from '@/services/StepTemplateManager';
import { useToast } from '@/hooks/use-toast';

interface EditorProps {
  testCase: TestCase | null;
  onUpdateTestCase: (testCase: TestCase) => void;
  onRunTestCase: (testCase: TestCase) => void;
  onDebugConfig?: (testCase: TestCase) => void;
  isExecuting: boolean;
  executionLogs: ExecutionLog[];
  testResults: { [key: string]: unknown } | null;
  stepResults: { stepName: string; type: string; result: unknown; executionTime?: number }[];
  validationResults: ValidationResult[];
  templateManager: StepTemplateManager;
}

export const Editor = ({ 
  testCase, 
  onUpdateTestCase, 
  onRunTestCase, 
  onDebugConfig,
  isExecuting, 
  executionLogs, 
  testResults, 
  stepResults, 
  validationResults,
  templateManager
}: EditorProps) => {
  const [showAddStep, setShowAddStep] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [showCurlImport, setShowCurlImport] = useState(false);
  const [selectedStepForTemplate, setSelectedStepForTemplate] = useState<TestStep | null>(null);
  const [selectedStepType, setSelectedStepType] = useState<'api' | 'sql' | 'redis' | 'clickhouse' | undefined>(undefined);
  const { toast } = useToast();
  
  // Template manager is provided from parent to keep a single shared instance

  const handleAddStep = (type: 'sql' | 'redis' | 'api' | 'clickhouse') => {
    if (!testCase) return;

    const newStepName = `New ${type.toUpperCase()} Step`;
    if (testCase.steps.some(step => step.name === newStepName)) {
      toast({
        title: "Duplicate Step Name",
        description: `A step with the name "${newStepName}" already exists. Please use a unique name.`,
        variant: "destructive",
      });
      return;
    }

    const newStep: TestStep = {
      id: `step-${Date.now()}`,
      name: newStepName,
      type,
      delayMs: 0,
      order: testCase.steps.length,
      config: type === 'sql'
        ? { query: '' }
        : type === 'redis'
          ? { command: '' }
          : type === 'api'
            ? { method: 'GET', url: '', headers: {} }
            : { query: '', database: '', host: '', port: 9000, user: '', password: '' },
      validations: [], // Initialize validations as empty array
    };

    const updatedTestCase = {
      ...testCase,
      steps: [...testCase.steps, newStep]
    };

    onUpdateTestCase(updatedTestCase);
    setShowAddStep(false);
  };

  const handleDeleteStep = (stepId: string) => {
    if (!testCase) return;

    const updatedTestCase = {
      ...testCase,
      steps: testCase.steps.filter(step => step.id !== stepId)
    };

    onUpdateTestCase(updatedTestCase);
  };

  const handleUpdateStep = (stepId: string, updates: Partial<TestStep>) => {
    if (!testCase) return;

    if (updates.name) {
      const isDuplicate = testCase.steps.some(
        step => step.id !== stepId && step.name === updates.name
      );
      if (isDuplicate) {
        toast({
          title: "Duplicate Step Name",
          description: `A step with the name "${updates.name}" already exists. Please use a unique name.`,
          variant: "destructive",
        });
        return;
      }
    }

    const updatedTestCase = {
      ...testCase,
      steps: testCase.steps.map(step =>
        step.id === stepId ? { ...step, ...updates } : step
      )
    };

    onUpdateTestCase(updatedTestCase);
  };

  const handleAddValidation = (stepId: string, validation: ValidationConfig) => {
    if (!testCase) return;

    const updatedTestCase = {
      ...testCase,
      steps: testCase.steps.map(step =>
        step.id === stepId
          ? { ...step, validations: [...(step.validations || []), validation] }
          : step
      )
    };

    onUpdateTestCase(updatedTestCase);
  };

  const handleUpdateValidation = (stepId: string, validationId: string, updates: Partial<ValidationConfig>) => {
    if (!testCase) return;

    const updatedTestCase = {
      ...testCase,
      steps: testCase.steps.map(step =>
        step.id === stepId
          ? {
            ...step,
            validations: step.validations?.map(v =>
              v.id === validationId ? { ...v, ...updates } : v
            ) || []
          }
          : step
      )
    };

    onUpdateTestCase(updatedTestCase);
  };

  const handleRemoveValidation = (stepId: string, validationId: string) => {
    if (!testCase) return;

    const updatedTestCase = {
      ...testCase,
      steps: testCase.steps.map(step =>
        step.id === stepId
          ? { ...step, validations: step.validations?.filter(v => v.id !== validationId) || [] }
          : step
      )
    };

    onUpdateTestCase(updatedTestCase);
  };

  const handleFlowControlChange = (config: FlowControlConfig) => {
    if (!testCase) return;

    const updatedTestCase = {
      ...testCase,
      flowControlConfig: config
    };

    onUpdateTestCase(updatedTestCase);
  };

  const handleSaveAsTemplate = (step: TestStep) => {
    setSelectedStepForTemplate(step);
    setShowSaveTemplateModal(true);
  };

  const handleTemplateSaved = (template: StepTemplate) => {
    toast({
      title: "Template Saved",
      description: `"${template.name}" has been saved as a template.`,
    });
  };

  const handleSelectTemplate = (template: StepTemplate) => {
    if (!testCase) return;

    const newStep = templateManager.createStepFromTemplate(template, testCase.steps.length);
    
    // Update validation step IDs to match the new step
    if (newStep.validations) {
      newStep.validations = newStep.validations.map(validation => ({
        ...validation,
        stepId: newStep.id
      }));
    }

    const updatedTestCase = {
      ...testCase,
      steps: [...testCase.steps, newStep]
    };

    onUpdateTestCase(updatedTestCase);
    
    toast({
      title: "Template Applied",
      description: `"${template.name}" has been added to your test case.`,
    });
  };

  const handleShowTemplates = (type?: 'api' | 'sql' | 'redis' | 'clickhouse') => {
    setSelectedStepType(type);
    setShowTemplateModal(true);
  };

  const handleCurlImport = (config: ApiStepConfig) => {
    if (!testCase) return;

    const newStep: TestStep = {
      id: `step-${Date.now()}`,
      name: `Imported API Step`,
      type: 'api',
      delayMs: 0,
      order: testCase.steps.length,
      config: config,
      validations: [],
    };

    const updatedTestCase = {
      ...testCase,
      steps: [...testCase.steps, newStep]
    };

    onUpdateTestCase(updatedTestCase);
    
    toast({
      title: "cURL Imported",
      description: "API step has been created from your curl command.",
    });
  };

  const getDefaultFlowControlConfig = (): FlowControlConfig => {
    return testCase?.flowControlConfig || {
      id: `flow-control-${Date.now()}`,
      testCaseId: testCase?.id || '',
      stopOnFailure: false,
      continueOnFailure: true,
      skipRemainingSteps: false,
      failureThreshold: 10
    };
  };

  if (!testCase) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-6xl mb-4">🧪</div>
          <h3 className="text-xl text-muted-foreground mb-2">No Test Case Selected</h3>
          <p className="text-muted-foreground/70">Select a test case from the navigator to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background flex flex-col min-h-0">
      <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{testCase.name}</h2>
          <p className="text-sm text-muted-foreground">{testCase.steps.length} steps</p>
        </div>
        <div className="flex gap-2">
          {onDebugConfig && (
            <Button
              onClick={() => onDebugConfig(testCase)}
              disabled={isExecuting}
              variant="outline"
              className="text-blue-600 border-blue-600 hover:bg-blue-50"
            >
              <Database className="h-4 w-4 mr-2" />
              Debug Config
            </Button>
          )}
          <Button
            onClick={() => onRunTestCase(testCase)}
            disabled={isExecuting || testCase.steps.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Play className="h-4 w-4 mr-2" />
            {isExecuting ? 'Running...' : 'Run Test'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <div className="space-y-4">
          {/* Flow Control Settings */}
          <FlowControlSettings
            config={getDefaultFlowControlConfig()}
            onConfigChange={handleFlowControlChange}
          />

          {/* Test Case Tags */}
          <Card className="p-4">
            <TagEditor
              tags={testCase.tags || []}
              onChange={(nextTags) => onUpdateTestCase({ ...testCase, tags: nextTags, updatedAt: new Date() })}
              suggestions={['regression', 'smoke', 'critical', 'e2e', 'api', 'database']}
              maxTags={8}
              allowCustomTags={true}
              placeholder="Add tags to categorize this test case..."
            />
          </Card>

          {testCase.steps.map((step, index) => (
            <StepCard
              key={step.id}
              step={step}
              index={index}
              onUpdate={(updates) => handleUpdateStep(step.id, updates)}
              onDelete={() => handleDeleteStep(step.id)}
              onSaveAsTemplate={handleSaveAsTemplate}
              onImportCurl={step.type === 'api' ? () => setShowCurlImport(true) : undefined}
            >
              <ValidationEditor
                stepId={step.id}
                stepType={step.type}
                validations={step.validations || []}
                onAddValidation={(validation) => handleAddValidation(step.id, validation)}
                onUpdateValidation={(validationId, updates) => handleUpdateValidation(step.id, validationId, updates)}
                onRemoveValidation={(validationId) => handleRemoveValidation(step.id, validationId)}
              />
            </StepCard>
          ))}

          <div className="relative">
            {!showAddStep ? (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddStep(true)}
                  className="w-full border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Step
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleShowTemplates()}
                    className="border-dashed border-primary/30 text-primary hover:text-primary hover:border-primary/50 transition-colors duration-200"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCurlImport(true)}
                    className="border-dashed border-green-500/30 text-green-600 hover:text-green-700 hover:border-green-500/50 transition-colors duration-200"
                  >
                    <FileCode className="h-4 w-4 mr-2" />
                    Import cURL
                  </Button>
                </div>
              </div>
            ) : (
              <Card className="p-8 rounded-2xl shadow-2xl border-2 border-primary/20 bg-gradient-to-br from-background via-primary/5 to-background animate-fade-in">
                <h3 className="text-lg font-bold mb-2 text-primary">Add a New Step</h3>
                <p className="text-sm text-muted-foreground mb-4">Choose the type of step you want to add to your test case:</p>
                <div className="flex flex-wrap gap-3 items-center justify-start mb-2">
                  <Button
                    size="lg"
                    onClick={() => handleAddStep('sql')}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md flex items-center gap-2 px-5 py-2 rounded-xl transition-all duration-200"
                  >
                    <Database className="h-4 w-4 mr-1" /> SQL
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => handleAddStep('redis')}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md flex items-center gap-2 px-5 py-2 rounded-xl transition-all duration-200"
                  >
                    <Zap className="h-4 w-4 mr-1" /> Redis
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => handleAddStep('api')}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md flex items-center gap-2 px-5 py-2 rounded-xl transition-all duration-200"
                  >
                    <Globe className="h-4 w-4 mr-1" /> API
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => handleAddStep('clickhouse')}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold shadow-md flex items-center gap-2 px-5 py-2 rounded-xl transition-all duration-200"
                  >
                    <Table className="h-4 w-4 mr-1" /> Clickhouse
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAddStep(false)}
                    className="text-muted-foreground ml-2"
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            )}
          </div>

          
          <div className="pt-6 mt-6 border-t border-border">
            <Results
              key={testCase?.id || 'no-selection'}
              executionLogs={executionLogs}
              testResults={testResults}
              stepResults={stepResults}
              validationResults={validationResults}
            />
          </div>
        </div>
      </div>

      {/* Template Modals */}
      <StepTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelectTemplate={handleSelectTemplate}
        stepType={selectedStepType}
        templateManager={templateManager}
      />

      <SaveTemplateModal
        isOpen={showSaveTemplateModal}
        onClose={() => setShowSaveTemplateModal(false)}
        step={selectedStepForTemplate}
        templateManager={templateManager}
        onTemplateSaved={handleTemplateSaved}
      />

      <CurlImportDialog
        isOpen={showCurlImport}
        onClose={() => setShowCurlImport(false)}
        onImport={handleCurlImport}
      />

      {/* TemplateManagementModal is now mounted in the root page Header */}
    </div>
  );
};