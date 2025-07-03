import { TestCase, ExecutionLog, ApiResponse } from '@/types';

// API base URL - should be configured via environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

interface ExecuteStepRequest {
  testCaseId: string;
  stepIndex: number;
  step: any;
}

interface ExecuteStepResponse {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
  logs: ExecutionLog[];
}

interface ExecuteTestCaseRequest {
  testCase: TestCase;
}

interface ExecuteTestCaseResponse {
  success: boolean;
  data?: {
    executionLogs: ExecutionLog[];
    apiResponses: Record<number, ApiResponse>;
  };
  error?: string;
}

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Execute a single step
  async executeStep(request: ExecuteStepRequest): Promise<ExecuteStepResponse> {
    return this.request<ExecuteStepResponse>('/execute-step', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Execute an entire test case
  async executeTestCase(request: ExecuteTestCaseRequest): Promise<ExecuteTestCaseResponse> {
    return this.request<ExecuteTestCaseResponse>('/execute-test-case', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Health check endpoint
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/health');
  }

  // Get test case by ID
  async getTestCase(id: string): Promise<TestCase> {
    return this.request<TestCase>(`/test-cases/${id}`);
  }

  // Save test case
  async saveTestCase(testCase: TestCase): Promise<TestCase> {
    return this.request<TestCase>('/test-cases', {
      method: 'POST',
      body: JSON.stringify(testCase),
    });
  }

  // Update test case
  async updateTestCase(testCase: TestCase): Promise<TestCase> {
    return this.request<TestCase>(`/test-cases/${testCase.id}`, {
      method: 'PUT',
      body: JSON.stringify(testCase),
    });
  }

  // Delete test case
  async deleteTestCase(id: string): Promise<void> {
    return this.request<void>(`/test-cases/${id}`, {
      method: 'DELETE',
    });
  }

  // Get all folders with collections and test cases
  async getFolders(): Promise<any[]> {
    return this.request<any[]>('/folders');
  }

  // Create folder
  async createFolder(name: string): Promise<any> {
    return this.request<any>('/folders', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  // Create collection
  async createCollection(folderId: string, name: string): Promise<any> {
    return this.request<any>('/collections', {
      method: 'POST',
      body: JSON.stringify({ folderId, name }),
    });
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Fallback mock implementation for development/testing
export const mockApiService = {
  async executeTestCase(request: ExecuteTestCaseRequest): Promise<ExecuteTestCaseResponse> {
    const { testCase } = request;
    const executionLogs: ExecutionLog[] = [];
    const apiResponses: Record<number, ApiResponse> = {};

    // Add initial log
    executionLogs.push({
      id: Date.now().toString(),
      timestamp: new Date(),
      level: 'info',
      message: `Starting execution of test case: ${testCase.name}`,
      stepIndex: -1
    });

    // Simulate execution of each step
    for (let i = 0; i < testCase.steps.length; i++) {
      const step = testCase.steps[i];
      
      // Add delay if specified
      if (step.delayMs > 0) {
        executionLogs.push({
          id: `${Date.now()}-delay-${i}`,
          timestamp: new Date(),
          level: 'info',
          message: `Waiting ${step.delayMs}ms before executing step ${i + 1}`,
          stepIndex: i
        });
        
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, Math.min(step.delayMs, 1000))); // Cap at 1s for demo
      }

      // Execute step
      executionLogs.push({
        id: `${Date.now()}-step-${i}`,
        timestamp: new Date(),
        level: 'info',
        message: `Executing ${step.type} step: ${step.name}`,
        stepIndex: i
      });

      // Simulate step execution
      await new Promise(resolve => setTimeout(resolve, 500));

      // Add success log
      executionLogs.push({
        id: `${Date.now()}-success-${i}`,
        timestamp: new Date(),
        level: 'success',
        message: `Step ${i + 1} completed successfully`,
        stepIndex: i
      });

      // If it's an API step, create mock response
      if (step.type === 'api') {
        apiResponses[i] = {
          status: 200,
          statusText: 'OK',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': '156'
          },
          body: {
            success: true,
            data: { id: 1, name: 'Test Response' },
            timestamp: new Date().toISOString()
          },
          executionTime: 234
        };
      }

      // If it's a Clickhouse step, add a mock log and response
      if (step.type === 'clickhouse') {
        const clickhouseConfig = step.config as import('@/types').ClickhouseStepConfig;
        executionLogs.push({
          id: `${Date.now()}-clickhouse-${i}`,
          timestamp: new Date(),
          level: 'info',
          message: `Executed Clickhouse query: ${clickhouseConfig.query || ''}`,
          stepIndex: i
        });
        apiResponses[i] = {
          status: 200,
          statusText: 'OK',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': '42'
          },
          body: {
            success: true,
            data: { rows: [{ id: 1, value: 'Clickhouse mock' }] },
            timestamp: new Date().toISOString()
          },
          executionTime: 123
        };
      }
    }

    executionLogs.push({
      id: `${Date.now()}-end`,
      timestamp: new Date(),
      level: 'success',
      message: `Test case execution completed successfully`,
      stepIndex: -1
    });

    return {
      success: true,
      data: {
        executionLogs,
        apiResponses
      }
    };
  },

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  }
};

// Export the appropriate service based on environment
export const service = import.meta.env.VITE_USE_MOCK_API === 'true' ? mockApiService : apiService; 