import { ValidationRule, StepValidationConfig, ValidationResult } from '@/types';

export class ValidationConfigManager {
    private stepValidations: Map<string, StepValidationConfig> = new Map();

    /**
     * Add a validation rule to a specific step
     */
    addValidationRule(stepId: string, rule: ValidationRule): void {
        const stepConfig = this.getOrCreateStepConfig(stepId);

        // Check if rule with same ID already exists
        const existingIndex = stepConfig.validations.findIndex(v => v.id === rule.id);
        if (existingIndex >= 0) {
            stepConfig.validations[existingIndex] = rule;
        } else {
            stepConfig.validations.push(rule);
        }

        this.stepValidations.set(stepId, stepConfig);
    }

    /**
     * Remove a validation rule from a step
     */
    removeValidationRule(stepId: string, ruleId: string): void {
        const stepConfig = this.stepValidations.get(stepId);
        if (!stepConfig) return;

        stepConfig.validations = stepConfig.validations.filter(v => v.id !== ruleId);
        this.stepValidations.set(stepId, stepConfig);
    }

    /**
     * Update an existing validation rule
     */
    updateValidationRule(stepId: string, ruleId: string, updates: Partial<ValidationRule>): void {
        const stepConfig = this.stepValidations.get(stepId);
        if (!stepConfig) return;

        const ruleIndex = stepConfig.validations.findIndex(v => v.id === ruleId);
        if (ruleIndex >= 0) {
            stepConfig.validations[ruleIndex] = {
                ...stepConfig.validations[ruleIndex],
                ...updates
            };
            this.stepValidations.set(stepId, stepConfig);
        }
    }

    /**
     * Get all validation rules for a specific step
     */
    getValidationsForStep(stepId: string): ValidationRule[] {
        const stepConfig = this.stepValidations.get(stepId);
        return stepConfig ? [...stepConfig.validations] : [];
    }

    /**
     * Get step validation configuration
     */
    getStepValidationConfig(stepId: string): StepValidationConfig | undefined {
        return this.stepValidations.get(stepId);
    }

    /**
     * Set complete step validation configuration
     */
    setStepValidationConfig(config: StepValidationConfig): void {
        this.stepValidations.set(config.stepId, config);
    }

    /**
     * Validate a step result against its configured validation rules
     */
    validateStep(stepId: string, stepResult: unknown): ValidationResult[] {
        const stepConfig = this.stepValidations.get(stepId);
        if (!stepConfig || stepConfig.validations.length === 0) {
            return [];
        }

        const results: ValidationResult[] = [];

        for (const rule of stepConfig.validations) {
            try {
                const result = this.executeValidationRule(rule, stepResult);
                results.push(result);
            } catch (error) {
                results.push({
                    id: rule.id,
                    status: 'failure',
                    actualValue: 'Error during validation',
                    expectedValue: String(rule.expectedValue),
                    dataType: 'error',
                    target: rule.target,
                    message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    timestamp: new Date().toISOString()
                });
            }
        }

        return results;
    }

    /**
     * Execute a single validation rule against step result
     */
    private executeValidationRule(rule: ValidationRule, stepResult: unknown): ValidationResult {
        const actualValue = this.extractValueFromResult(rule.target, stepResult);
        const isValid = this.compareValues(actualValue, rule.expectedValue, rule.operator);

        return {
            id: rule.id,
            status: isValid ? 'success' : 'failure',
            actualValue,
            expectedValue: String(rule.expectedValue),
            dataType: typeof actualValue,
            target: rule.target,
            message: isValid ? undefined : rule.errorMessage,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Extract value from step result using target path
     */
    private extractValueFromResult(target: string, stepResult: unknown): unknown {
        if (!stepResult || typeof stepResult !== 'object') {
            return stepResult;
        }

        // Handle JSON path for API responses (e.g., $.data.id)
        if (target.startsWith('$.')) {
            return this.extractJsonPath(target, stepResult);
        }

        // Handle simple property access for DB results
        if (Array.isArray(stepResult) && stepResult.length > 0) {
            const firstRow = stepResult[0];
            if (firstRow && typeof firstRow === 'object' && target in firstRow) {
                return (firstRow as Record<string, unknown>)[target];
            }
        }

        // Handle direct property access
        if (typeof stepResult === 'object' && target in stepResult) {
            return (stepResult as Record<string, unknown>)[target];
        }

        return undefined;
    }

    /**
     * Extract value using JSON path notation
     */
    private extractJsonPath(path: string, data: unknown): unknown {
        // Simple JSON path implementation
        // Remove leading $. and split by dots
        const parts = path.substring(2).split('.');
        let current = data;

        for (const part of parts) {
            if (current === null || current === undefined) {
                return undefined;
            }

            if (typeof current === 'object' && part in current) {
                current = (current as Record<string, unknown>)[part];
            } else {
                return undefined;
            }
        }

        return current;
    }

    /**
     * Compare values based on operator
     */
    private compareValues(actual: unknown, expected: unknown, operator: ValidationRule['operator']): boolean {
        switch (operator) {
            case 'equals':
                return actual === expected;

            case 'not-equals':
                return actual !== expected;

            case 'greater-than':
                return typeof actual === 'number' && typeof expected === 'number' && actual > expected;

            case 'less-than':
                return typeof actual === 'number' && typeof expected === 'number' && actual < expected;

            case 'contains':
                if (typeof actual === 'string' && typeof expected === 'string') {
                    return actual.includes(expected);
                }
                if (Array.isArray(actual)) {
                    return actual.includes(expected);
                }
                return false;

            case 'matches':
                if (typeof actual === 'string' && typeof expected === 'string') {
                    try {
                        const regex = new RegExp(expected);
                        return regex.test(actual);
                    } catch {
                        return false;
                    }
                }
                return false;

            default:
                return false;
        }
    }

    /**
     * Get or create step validation configuration
     */
    private getOrCreateStepConfig(stepId: string): StepValidationConfig {
        let stepConfig = this.stepValidations.get(stepId);

        if (!stepConfig) {
            stepConfig = {
                stepId,
                validations: [],
                executionOrder: 0,
                dependencies: [],
                failureAction: 'continue'
            };
        }

        return stepConfig;
    }

    /**
     * Clear all validations for a step
     */
    clearStepValidations(stepId: string): void {
        this.stepValidations.delete(stepId);
    }

    /**
     * Get all configured step IDs
     */
    getConfiguredSteps(): string[] {
        return Array.from(this.stepValidations.keys());
    }

    /**
     * Export validation configuration
     */
    exportConfiguration(): Record<string, StepValidationConfig> {
        const config: Record<string, StepValidationConfig> = {};
        this.stepValidations.forEach((value, key) => {
            config[key] = { ...value };
        });
        return config;
    }

    /**
     * Import validation configuration
     */
    importConfiguration(config: Record<string, StepValidationConfig>): void {
        this.stepValidations.clear();
        Object.entries(config).forEach(([stepId, stepConfig]) => {
            this.stepValidations.set(stepId, { ...stepConfig });
        });
    }

    /**
     * Create a validation rule template
     */
    static createValidationRule(
        name: string,
        type: ValidationRule['type'],
        target: string,
        operator: ValidationRule['operator'],
        expectedValue: unknown,
        errorMessage?: string
    ): ValidationRule {
        return {
            id: `validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name,
            type,
            target,
            operator,
            expectedValue,
            errorMessage: errorMessage || `${target} should ${operator} ${expectedValue}`,
            severity: 'error'
        };
    }

    /**
     * Create common validation templates
     */
    static createCommonValidations() {
        return {
            apiStatusSuccess: (target = '$.status'): ValidationRule =>
                ValidationConfigManager.createValidationRule(
                    'API Status Success',
                    'value-comparison',
                    target,
                    'equals',
                    200,
                    'API should return success status'
                ),

            apiResponseNotEmpty: (target = '$.data'): ValidationRule =>
                ValidationConfigManager.createValidationRule(
                    'Response Not Empty',
                    'type-check',
                    target,
                    'not-equals',
                    null,
                    'Response data should not be empty'
                ),

            dbRecordExists: (target: string): ValidationRule =>
                ValidationConfigManager.createValidationRule(
                    'Record Exists',
                    'type-check',
                    target,
                    'not-equals',
                    undefined,
                    'Database record should exist'
                ),

            valueInRange: (target: string, min: number, max: number): ValidationRule[] => [
                ValidationConfigManager.createValidationRule(
                    'Minimum Value',
                    'range-check',
                    target,
                    'greater-than',
                    min - 1,
                    `Value should be greater than ${min}`
                ),
                ValidationConfigManager.createValidationRule(
                    'Maximum Value',
                    'range-check',
                    target,
                    'less-than',
                    max + 1,
                    `Value should be less than ${max}`
                )
            ]
        };
    }
}