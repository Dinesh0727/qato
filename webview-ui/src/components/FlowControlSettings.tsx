import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { FlowControlConfig } from '@/types';
import { AlertTriangle, CheckCircle, Settings, ChevronDown, ChevronRight } from 'lucide-react';

interface FlowControlSettingsProps {
  config: FlowControlConfig;
  onConfigChange: (config: FlowControlConfig) => void;
  onSave?: () => void;
  disabled?: boolean;
}

export const FlowControlSettings = ({
  config,
  onConfigChange,
  onSave,
  disabled = false
}: FlowControlSettingsProps) => {
  const [localConfig, setLocalConfig] = useState<FlowControlConfig>(config);
  const [hasChanges, setHasChanges] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // Default collapsed

  const handleConfigUpdate = (updates: Partial<FlowControlConfig>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    setHasChanges(true);
    onConfigChange(newConfig);
  };

  const handleSave = () => {
    if (onSave) {
      onSave();
    }
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalConfig(config);
    setHasChanges(false);
    onConfigChange(config);
  };

  const getExecutionModeDescription = () => {
    if (localConfig.stopOnFailure) {
      return {
        mode: 'Stop on Failure',
        description: 'Test execution will halt immediately when any validation fails',
        icon: <AlertTriangle className="h-4 w-4 text-warning" />,
        color: 'bg-warning/10 text-warning border-warning/20'
      };
    } else if (localConfig.continueOnFailure) {
      return {
        mode: 'Continue on Failure',
        description: 'All test steps will execute regardless of validation failures',
        icon: <CheckCircle className="h-4 w-4 text-success" />,
        color: 'bg-success/10 text-success border-success/20'
      };
    } else {
      return {
        mode: 'Default Behavior',
        description: 'Uses system default flow control settings',
        icon: <Settings className="h-4 w-4 text-muted-foreground" />,
        color: 'bg-muted text-muted-foreground border-border'
      };
    }
  };

  const executionMode = getExecutionModeDescription();

  return (
    <Card className="w-full">
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="p-0 w-6 h-6">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Flow Control Settings
              </CardTitle>
              {!isExpanded && (
                <CardDescription className="text-xs">
                  {executionMode.mode} • Click to configure
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="outline" className="text-warning border-warning">
                Unsaved Changes
              </Badge>
            )}
            {!isExpanded && (
              <Badge variant="outline" className={executionMode.color}>
                {executionMode.mode}
              </Badge>
            )}
          </div>
        </div>
        {isExpanded && (
          <CardDescription>
            Configure how test execution behaves when validations fail
          </CardDescription>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Current Mode Display */}
          <div className={`p-3 rounded-lg border ${executionMode.color}`}>
            <div className="flex items-center gap-2 mb-1">
              {executionMode.icon}
              <span className="font-medium">{executionMode.mode}</span>
            </div>
            <p className="text-sm opacity-90">{executionMode.description}</p>
          </div>

          <Separator />

          {/* Execution Behavior Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-foreground">Execution Behavior</h4>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="stop-on-failure" className="text-sm font-medium">
                    Stop on First Failure
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Halt execution immediately when any validation fails
                  </p>
                </div>
                <Switch
                  id="stop-on-failure"
                  checked={localConfig.stopOnFailure}
                  onCheckedChange={(checked) =>
                    handleConfigUpdate({
                      stopOnFailure: checked,
                      continueOnFailure: !checked
                    })
                  }
                  disabled={disabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="continue-on-failure" className="text-sm font-medium">
                    Continue on Failure
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Execute all steps regardless of validation failures
                  </p>
                </div>
                <Switch
                  id="continue-on-failure"
                  checked={localConfig.continueOnFailure}
                  onCheckedChange={(checked) =>
                    handleConfigUpdate({
                      continueOnFailure: checked,
                      stopOnFailure: !checked
                    })
                  }
                  disabled={disabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="skip-remaining" className="text-sm font-medium">
                    Skip Remaining Steps
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Skip all remaining steps when threshold is reached
                  </p>
                </div>
                <Switch
                  id="skip-remaining"
                  checked={localConfig.skipRemainingSteps}
                  onCheckedChange={(checked) =>
                    handleConfigUpdate({ skipRemainingSteps: checked })
                  }
                  disabled={disabled}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Failure Threshold */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-foreground">Failure Threshold</h4>
            <div className="flex items-center gap-3">
              <Label htmlFor="failure-threshold" className="text-sm whitespace-nowrap">
                Max Failures:
              </Label>
              <Input
                id="failure-threshold"
                type="number"
                min="1"
                max="100"
                value={localConfig.failureThreshold}
                onChange={(e) =>
                  handleConfigUpdate({
                    failureThreshold: Math.max(1, parseInt(e.target.value) || 1)
                  })
                }
                className="w-20"
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Stop execution after this many failures
              </p>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-muted-foreground">
              {hasChanges ? 'Changes will be applied to this test case' : 'No pending changes'}
            </div>
            <div className="flex gap-2">
              {hasChanges && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={disabled}
                >
                  Reset
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSave}
                disabled={disabled || !hasChanges}
              >
                {hasChanges ? 'Save Changes' : 'Saved'}
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};