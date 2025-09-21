import { ExecutionLog, ValidationResult } from '@/types';

export interface TestCaseResults {
  testResults: { [key: string]: unknown } | null;
  stepResults: { stepName: string; type: string; result: unknown; executionTime?: number }[];
  validationResults: ValidationResult[];
  executionLogs: ExecutionLog[];
  lastExecuted?: Date;
}

export class TestResultsManager {
  private resultsMap: Map<string, TestCaseResults> = new Map();

  /**
   * Get results for a specific test case
   */
  getResults(testCaseId: string): TestCaseResults {
    if (!this.resultsMap.has(testCaseId)) {
      // Return default empty results if no results exist for this test case
      return {
        testResults: null,
        stepResults: [],
        validationResults: [],
        executionLogs: [],
        lastExecuted: undefined
      };
    }
    return this.resultsMap.get(testCaseId)!;
  }

  /**
   * Set results for a specific test case
   */
  setResults(
    testCaseId: string, 
    testResults: { [key: string]: unknown } | null,
    stepResults: { stepName: string; type: string; result: unknown; executionTime?: number }[],
    validationResults: ValidationResult[],
    executionLogs: ExecutionLog[]
  ): void {
    this.resultsMap.set(testCaseId, {
      testResults,
      stepResults,
      validationResults,
      executionLogs,
      lastExecuted: new Date()
    });
  }

  /**
   * Clear results for a specific test case
   */
  clearResults(testCaseId: string): void {
    this.resultsMap.set(testCaseId, {
      testResults: null,
      stepResults: [],
      validationResults: [],
      executionLogs: [],
      lastExecuted: undefined
    });
  }

  /**
   * Clear all results
   */
  clearAllResults(): void {
    this.resultsMap.clear();
  }

  /**
   * Check if a test case has results
   */
  hasResults(testCaseId: string): boolean {
    const results = this.resultsMap.get(testCaseId);
    return results ? (
      results.testResults !== null || 
      results.stepResults.length > 0 || 
      results.validationResults.length > 0 || 
      results.executionLogs.length > 0
    ) : false;
  }

  /**
   * Get all test case IDs that have results
   */
  getTestCaseIdsWithResults(): string[] {
    return Array.from(this.resultsMap.keys()).filter(id => this.hasResults(id));
  }

  /**
   * Remove results for a test case (when test case is deleted)
   */
  removeResults(testCaseId: string): void {
    this.resultsMap.delete(testCaseId);
  }
}
