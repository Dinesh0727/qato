import { ValidationResult } from '@/types';

export interface FlowControlConfig {
  id: string;
  testCaseId: string;
  stopOnFailure: boolean;
  continueOnFailure: boolean;
  skipRemainingSteps: boolean;
  failureThreshold: number;
}

export interface FlowControlDecision {
  shouldContinue: boolean;
  reason: string;
  affectedSteps: string[];
  userOverride?: boolean;
}

export interface ExecutionSummary {
  totalSteps: number;
  executedSteps: number;
  skippedSteps: number;
  failedSteps: number;
  flowControlDecisions: FlowControlDecision[];
}

export interface StepResult {
  stepId: string;
  stepName: string;
  type: string;
  status: 'executed' | 'skipped' | 'failed' | 'cancelled';
  validationResults: ValidationResult[];
  executionTime?: number;
  skipReason?: string;
}

export class FlowControlManager {
  private config: FlowControlConfig;
  private executionState: {
    currentStepIndex: number;
    totalSteps: number;
    skippedSteps: string[];
    failedSteps: string[];
    decisions: FlowControlDecision[];
  };

  constructor(config: FlowControlConfig) {
    this.config = config;
    this.executionState = {
      currentStepIndex: 0,
      totalSteps: 0,
      skippedSteps: [],
      failedSteps: [],
      decisions: []
    };
  }

  /**
   * Set or update the flow control configuration
   */
  setFlowConfig(config: FlowControlConfig): void {
    this.config = config;
  }

  /**
   * Get current flow control configuration
   */
  getFlowConfig(): FlowControlConfig {
    return { ...this.config };
  }

  /**
   * Initialize execution state for a new test run
   */
  initializeExecution(totalSteps: number): void {
    this.executionState = {
      currentStepIndex: 0,
      totalSteps,
      skippedSteps: [],
      failedSteps: [],
      decisions: []
    };
  }

  /**
   * Determine if execution should continue based on step result and validation results
   */
  shouldContinueExecution(
    stepResult: StepResult, 
    validationResults: ValidationResult[]
  ): boolean {
    const hasValidationFailures = validationResults.some(v => v.status === 'failure');
    const hasStepFailure = stepResult.status === 'failed';
    
    // If no failures, always continue
    if (!hasValidationFailures && !hasStepFailure) {
      return true;
    }

    // Record failed step
    if (hasStepFailure || hasValidationFailures) {
      this.executionState.failedSteps.push(stepResult.stepId);
    }

    // Check failure threshold
    if (this.executionState.failedSteps.length >= this.config.failureThreshold) {
      const decision: FlowControlDecision = {
        shouldContinue: false,
        reason: `Failure threshold (${this.config.failureThreshold}) exceeded`,
        affectedSteps: this.getRemainingSteps()
      };
      this.executionState.decisions.push(decision);
      return false;
    }

    // Apply flow control logic
    if (this.config.stopOnFailure && (hasValidationFailures || hasStepFailure)) {
      const decision: FlowControlDecision = {
        shouldContinue: false,
        reason: 'Stop on failure configured and failure detected',
        affectedSteps: this.getRemainingSteps()
      };
      this.executionState.decisions.push(decision);
      return false;
    }

    if (this.config.continueOnFailure) {
      const decision: FlowControlDecision = {
        shouldContinue: true,
        reason: 'Continue on failure configured',
        affectedSteps: []
      };
      this.executionState.decisions.push(decision);
      return true;
    }

    // Default behavior: continue on failure for comprehensive analysis
    const decision: FlowControlDecision = {
      shouldContinue: true,
      reason: 'Default behavior: continue for comprehensive analysis',
      affectedSteps: []
    };
    this.executionState.decisions.push(decision);
    return true;
  }

  /**
   * Get list of steps that will be skipped from current position
   */
  getSkippedSteps(currentStepIndex: number, totalSteps: number): string[] {
    const skippedSteps: string[] = [];
    for (let i = currentStepIndex + 1; i < totalSteps; i++) {
      skippedSteps.push(`step-${i}`);
    }
    return skippedSteps;
  }

  /**
   * Mark steps as skipped
   */
  markStepsAsSkipped(stepIds: string[], reason: string): void {
    this.executionState.skippedSteps.push(...stepIds);
    
    const decision: FlowControlDecision = {
      shouldContinue: false,
      reason,
      affectedSteps: stepIds
    };
    this.executionState.decisions.push(decision);
  }

  /**
   * Get execution summary with flow control information
   */
  getExecutionSummary(): ExecutionSummary {
    return {
      totalSteps: this.executionState.totalSteps,
      executedSteps: this.executionState.totalSteps - this.executionState.skippedSteps.length,
      skippedSteps: this.executionState.skippedSteps.length,
      failedSteps: this.executionState.failedSteps.length,
      flowControlDecisions: [...this.executionState.decisions]
    };
  }

  /**
   * Get remaining steps from current position
   */
  private getRemainingSteps(): string[] {
    const remaining: string[] = [];
    for (let i = this.executionState.currentStepIndex + 1; i < this.executionState.totalSteps; i++) {
      remaining.push(`step-${i}`);
    }
    return remaining;
  }

  /**
   * Advance to next step
   */
  advanceStep(): void {
    this.executionState.currentStepIndex++;
  }

  /**
   * Get current step index
   */
  getCurrentStepIndex(): number {
    return this.executionState.currentStepIndex;
  }

  /**
   * Check if step should be skipped based on previous decisions
   */
  shouldSkipStep(stepId: string): boolean {
    return this.executionState.skippedSteps.includes(stepId);
  }

  /**
   * Get skip reason for a specific step
   */
  getSkipReason(stepId: string): string | undefined {
    if (!this.shouldSkipStep(stepId)) {
      return undefined;
    }

    const decision = this.executionState.decisions.find(d => 
      d.affectedSteps.includes(stepId)
    );
    
    return decision?.reason || 'Step skipped due to flow control decision';
  }

  /**
   * Reset execution state
   */
  reset(): void {
    this.executionState = {
      currentStepIndex: 0,
      totalSteps: 0,
      skippedSteps: [],
      failedSteps: [],
      decisions: []
    };
  }

  /**
   * Create default flow control configuration
   */
  static createDefaultConfig(testCaseId: string): FlowControlConfig {
    return {
      id: `flow-control-${Date.now()}`,
      testCaseId,
      stopOnFailure: false,
      continueOnFailure: true,
      skipRemainingSteps: false,
      failureThreshold: 10 // Allow up to 10 failures before stopping
    };
  }
}