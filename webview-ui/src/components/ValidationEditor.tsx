import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ValidationConfig } from '@/types';

interface ValidationEditorProps {
  stepId: string;
  stepType: 'api' | 'sql' | 'redis' | 'clickhouse';
  onAddValidation: (validation: ValidationConfig) => void;
}

export const ValidationEditor: React.FC<ValidationEditorProps> = ({ stepId, stepType, onAddValidation }) => {
  const [target, setTarget] = useState('');
  const [expectedValue, setExpectedValue] = useState('');
  const [dataType, setDataType] = useState<'string' | 'number' | 'boolean' | 'array' | 'object'>('string');

  if (stepType === 'redis') {
    return (
      <div className="text-sm text-muted-foreground">
        Validations are not supported for Redis steps.
      </div>
    );
  }

  const handleAdd = () => {
    if (!target || !expectedValue) return;

    const validation: ValidationConfig = {
      id: `validation-${Date.now()}`,
      type: stepType,
      target,
      expectedValue,
      dataType,
      stepId,
    };

    onAddValidation(validation);
    setTarget('');
    setExpectedValue('');
    setDataType('string');
  };

  return (
    <div className="space-y-3 mt-4">
      <h4 className="text-sm font-medium">Add Validation</h4>
      <div className="flex gap-2">
        <Input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder={stepType === 'api' ? 'JSON Path (e.g., $.data.id)' : 'Column Name'}
          className="bg-muted border-border text-foreground"
        />
        <Input
          value={expectedValue}
          onChange={(e) => setExpectedValue(e.target.value)}
          placeholder="Expected Value"
          className="bg-muted border-border text-foreground"
        />
        <Select
          value={dataType}
          onValueChange={(value: any) => setDataType(value)}
        >
          <SelectTrigger className="w-32 bg-muted border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="string">String</SelectItem>
            <SelectItem value="number">Number</SelectItem>
            <SelectItem value="boolean">Boolean</SelectItem>
            <SelectItem value="array">Array</SelectItem>
            <SelectItem value="object">Object</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={handleAdd}
          disabled={!target || !expectedValue}
          className="bg-primary text-white"
        >
          Add
        </Button>
      </div>
    </div>
  );
};