import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ValidationConfig, ValidationRule } from '@/types';
import { ValidationConfigManager } from '@/services/ValidationConfigManager';
import { Trash2, Plus, Edit3, CheckCircle, AlertCircle } from 'lucide-react';

interface ValidationEditorProps {
  stepId: string;
  stepType: 'api' | 'sql' | 'redis' | 'clickhouse';
  validations?: ValidationConfig[];
  onAddValidation: (validation: ValidationConfig) => void;
  onUpdateValidation?: (validationId: string, updates: Partial<ValidationConfig>) => void;
  onRemoveValidation?: (validationId: string) => void;
}

export const ValidationEditor: React.FC<ValidationEditorProps> = ({ 
  stepId, 
  stepType, 
  validations = [],
  onAddValidation,
  onUpdateValidation,
  onRemoveValidation
}) => {
  const [isAddingValidation, setIsAddingValidation] = useState(false);
  const [editingValidation, setEditingValidation] = useState<string | null>(null);
  
  // New validation form state
  const [newValidation, setNewValidation] = useState({
    name: '',
    type: 'value-comparison' as ValidationRule['type'],
    target: '',
    operator: 'equals' as ValidationRule['operator'],
    expectedValue: '',
    errorMessage: '',
    severity: 'error' as ValidationRule['severity']
  });

  if (stepType === 'redis') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Validations are not currently supported for Redis steps.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleAddValidation = () => {
    if (!newValidation.target || !newValidation.expectedValue) return;

    const validation: ValidationConfig = {
      id: `validation-${Date.now()}`,
      type: stepType,
      target: newValidation.target,
      expectedValue: newValidation.expectedValue,
      operator: newValidation.operator, // Include the operator selected by user
      dataType: inferDataType(newValidation.expectedValue),
      stepId,
      customErrorMessage: newValidation.errorMessage || undefined,
    };

    onAddValidation(validation);
    
    // Reset form
    setNewValidation({
      name: '',
      type: 'value-comparison',
      target: '',
      operator: 'equals',
      expectedValue: '',
      errorMessage: '',
      severity: 'error'
    });
    setIsAddingValidation(false);
  };

  const handleEditValidation = (validation: ValidationConfig) => {
    setEditingValidation(validation.id);
    setNewValidation({
      name: validation.target,
      type: 'value-comparison',
      target: validation.target,
      operator: validation.operator || 'equals', // Use the existing operator
      expectedValue: validation.expectedValue,
      errorMessage: validation.customErrorMessage || '',
      severity: 'error'
    });
  };

  const handleUpdateValidation = () => {
    if (!editingValidation || !newValidation.target || !newValidation.expectedValue) return;

    const updates: Partial<ValidationConfig> = {
      target: newValidation.target,
      expectedValue: newValidation.expectedValue,
      operator: newValidation.operator, // Include the operator in updates
      dataType: inferDataType(newValidation.expectedValue),
      customErrorMessage: newValidation.errorMessage || undefined,
    };

    onUpdateValidation?.(editingValidation, updates);
    
    // Reset form
    setNewValidation({
      name: '',
      type: 'value-comparison',
      target: '',
      operator: 'equals',
      expectedValue: '',
      errorMessage: '',
      severity: 'error'
    });
    setEditingValidation(null);
  };

  const handleCancelEdit = () => {
    setEditingValidation(null);
    setNewValidation({
      name: '',
      type: 'value-comparison',
      target: '',
      operator: 'equals',
      expectedValue: '',
      errorMessage: '',
      severity: 'error'
    });
  };

  const inferDataType = (value: string): 'string' | 'number' | 'boolean' | 'array' | 'object' => {
    if (!value || value.trim() === '') return 'string';
    
    const trimmedValue = value.trim();
    
    // Check for boolean
    if (trimmedValue.toLowerCase() === 'true' || trimmedValue.toLowerCase() === 'false') {
      return 'boolean';
    }
    
    // Check for number (including decimals, negatives, and scientific notation)
    if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmedValue)) {
      return 'number';
    }
    
    // Check for JSON array or object
    if ((trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) || 
        (trimmedValue.startsWith('{') && trimmedValue.endsWith('}'))) {
      try {
        JSON.parse(trimmedValue);
        return trimmedValue.startsWith('[') ? 'array' : 'object';
      } catch {
        return 'string';
      }
    }
    
    return 'string';
  };

  const getValidationTypeColor = (type: string) => {
    switch (type) {
      case 'api': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'sql': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'clickhouse': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getPlaceholderText = () => {
    switch (stepType) {
      case 'api':
        return 'JSON Path (e.g., $.data.id, $.status)';
      case 'sql':
      case 'clickhouse':
        return 'Column Name (e.g., user_id, status)';
      default:
        return 'Target field';
    }
  };

  const getCommonValidationTemplates = () => {
    const templates = ValidationConfigManager.createCommonValidations();
    switch (stepType) {
      case 'api':
        return [
          { label: 'API Status Success', template: templates.apiStatusSuccess() },
          { label: 'Response Not Empty', template: templates.apiResponseNotEmpty() }
        ];
      case 'sql':
      case 'clickhouse':
        return [
          { label: 'Record Exists', template: templates.dbRecordExists('id') }
        ];
      default:
        return [];
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Validation Rules
            <Badge className={getValidationTypeColor(stepType)}>
              {stepType.toUpperCase()}
            </Badge>
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setIsAddingValidation(true)}
            disabled={isAddingValidation}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Rule
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Existing Validations */}
        {validations.length > 0 && (
          <div className="space-y-3">
            {validations.map((validation, index) => (
              <div key={validation.id} className="p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Rule {index + 1}</span>
                    <Badge variant="outline" className="text-xs">
                      {validation.dataType}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditValidation(validation)}
                      disabled={!onUpdateValidation}
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemoveValidation?.(validation.id)}
                      className="text-destructive hover:text-destructive"
                      disabled={!onRemoveValidation}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="text-sm space-y-1">
                  <div><strong>Target:</strong> {validation.target}</div>
                  <div><strong>Operator:</strong> {validation.operator || 'equals'}</div>
                  <div><strong>Expected:</strong> {validation.expectedValue}</div>
                  {validation.customErrorMessage && (
                    <div><strong>Custom Message:</strong> {validation.customErrorMessage}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {validations.length === 0 && !isAddingValidation && (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No validation rules configured</p>
            <p className="text-xs">Add rules to validate step results</p>
          </div>
        )}

        {/* Add/Edit Validation Form */}
        {(isAddingValidation || editingValidation) && (
          <>
            <Separator />
            <div className="space-y-4 p-4 border rounded-lg bg-accent/10">
              <h4 className="font-medium text-sm">
                {editingValidation ? 'Edit Validation Rule' : 'Add New Validation Rule'}
              </h4>
              
              {/* Quick Templates */}
              {getCommonValidationTemplates().length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Quick Templates:</label>
                  <div className="flex gap-2 flex-wrap">
                    {getCommonValidationTemplates().map((template, index) => (
                      <Button
                        key={index}
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setNewValidation({
                            ...newValidation,
                            target: template.template.target,
                            expectedValue: String(template.template.expectedValue),
                            errorMessage: template.template.errorMessage
                          });
                        }}
                        className="text-xs"
                      >
                        {template.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Target Field</label>
                  <Input
                    value={newValidation.target}
                    onChange={(e) => setNewValidation({ ...newValidation, target: e.target.value })}
                    placeholder={getPlaceholderText()}
                    className="text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-medium">Expected Value</label>
                  <Input
                    value={newValidation.expectedValue}
                    onChange={(e) => setNewValidation({ ...newValidation, expectedValue: e.target.value })}
                    placeholder="Expected value"
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">
                  Operator 
                  <span className="text-muted-foreground ml-1">
                    (Detected type: {inferDataType(newValidation.expectedValue)})
                  </span>
                </label>
                <Select
                  value={newValidation.operator}
                  onValueChange={(value: ValidationRule['operator']) => 
                    setNewValidation({ ...newValidation, operator: value })
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Equals</SelectItem>
                    <SelectItem value="not-equals">Not Equals</SelectItem>
                    {(inferDataType(newValidation.expectedValue) === 'number') && (
                      <>
                        <SelectItem value="greater-than">Greater Than</SelectItem>
                        <SelectItem value="less-than">Less Than</SelectItem>
                      </>
                    )}
                    {(inferDataType(newValidation.expectedValue) === 'string' || 
                      inferDataType(newValidation.expectedValue) === 'array') && (
                      <SelectItem value="contains">Contains</SelectItem>
                    )}
                    <SelectItem value="matches">Matches (Regex)</SelectItem>
                  </SelectContent>
                </Select>
              </div>



              <div className="space-y-2">
                <label className="text-xs font-medium">Error Message (Optional)</label>
                <Textarea
                  value={newValidation.errorMessage}
                  onChange={(e) => setNewValidation({ ...newValidation, errorMessage: e.target.value })}
                  placeholder="Custom error message when validation fails"
                  className="text-sm resize-none"
                  rows={2}
                />
              </div>

              {/* Validation Hints */}
              {newValidation.expectedValue && (
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <h5 className="text-xs font-medium mb-2">Validation Hints:</h5>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• Detected type: <strong>{inferDataType(newValidation.expectedValue)}</strong></div>
                    {inferDataType(newValidation.expectedValue) === 'number' && (
                      <div>• For numbers: Use greater-than/less-than for range checks</div>
                    )}
                    {inferDataType(newValidation.expectedValue) === 'string' && (
                      <div>• For strings: Use contains for partial matches, matches for regex patterns</div>
                    )}
                    {inferDataType(newValidation.expectedValue) === 'boolean' && (
                      <div>• For booleans: Use true/false (case insensitive)</div>
                    )}
                    {(inferDataType(newValidation.expectedValue) === 'array' || 
                      inferDataType(newValidation.expectedValue) === 'object') && (
                      <div>• For JSON: Ensure valid JSON format for exact matching</div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={editingValidation ? handleCancelEdit : () => setIsAddingValidation(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={editingValidation ? handleUpdateValidation : handleAddValidation}
                  disabled={!newValidation.target || !newValidation.expectedValue}
                >
                  {editingValidation ? 'Update Rule' : 'Add Rule'}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};