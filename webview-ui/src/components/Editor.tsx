import { useState } from 'react';
import { Play, Plus, GripVertical, Trash2, Database, Zap, Globe, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TestCase, TestStep, ClickhouseStepConfig, ValidationConfig } from '@/types';
import { StepCard } from '@/components/StepCard';
import { ValidationEditor } from '@/components/ValidationEditor';
import { useToast } from '@/hooks/use-toast';

interface EditorProps {
  testCase: TestCase | null;
  onUpdateTestCase: (testCase: TestCase) => void;
  onRunTestCase: (testCase: TestCase) => void;
  isExecuting: boolean;
}

export const Editor = ({ testCase, onUpdateTestCase, onRunTestCase, isExecuting }: EditorProps) => {
  const [showAddStep, setShowAddStep] = useState(false);
  const { toast } = useToast();

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
    <div className="flex-1 bg-background flex flex-col" style={{ height: '60vh' }}>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{testCase.name}</h2>
          <p className="text-sm text-muted-foreground">{testCase.steps.length} steps</p>
        </div>
        <Button
          onClick={() => onRunTestCase(testCase)}
          disabled={isExecuting || testCase.steps.length === 0}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Play className="h-4 w-4 mr-2" />
          {isExecuting ? 'Running...' : 'Run Test'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {testCase.steps.map((step, index) => (
            <StepCard
              key={step.id}
              step={step}
              index={index}
              onUpdate={(updates) => handleUpdateStep(step.id, updates)}
              onDelete={() => handleDeleteStep(step.id)}
            >
              <ValidationEditor
                stepId={step.id}
                stepType={step.type}
                onAddValidation={(validation) => handleAddValidation(step.id, validation)}
              />
              {step.validations?.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Validations</h4>
                  {step.validations.map((validation) => (
                    <div
                      key={validation.id}
                      className="flex items-center gap-2 mt-2 p-2 bg-muted rounded"
                    >
                      <span className="text-sm">
                        {validation.type === 'api' ? 'JSON Path' : 'Column'}: {validation.target}, Expected: {validation.expectedValue} ({validation.dataType})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveValidation(step.id, validation.id)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </StepCard>
          ))}

          <div className="relative">
            {!showAddStep ? (
              <Button
                variant="outline"
                onClick={() => setShowAddStep(true)}
                className="w-full border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Step
              </Button>
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
        </div>
      </div>
    </div>
  );
};