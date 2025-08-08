export interface TestCase {
  id: string;
  name: string;
  collectionId: string;
  steps: TestStep[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TestStep {
  id: string;
  name: string;
  type: 'api' | 'sql' | 'redis' | 'clickhouse';
  delayMs?: number;
  order: number;
  config: SqlStepConfig | RedisStepConfig | ApiStepConfig | ClickhouseStepConfig;
  validations?: ValidationConfig[];
}

export interface SqlStepConfig {
  query: string;
  database?: string;
}

export interface RedisStepConfig {
  command: string;
  database?: number;
}

export interface ApiStepConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers: Record<string, string>;
  body?: string;
  extractVars?: Array<{ name: string; path: string; type?: 'string' | 'integer' | 'float' | 'boolean' }>;
}

export interface ClickhouseStepConfig {
  query: string;
  database?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
}

export interface Collection {
  id: string;
  name: string;
  folderId: string;
  testCases: TestCase[];
}

export interface Folder {
  id: string;
  name: string;
  collections: Collection[];
}

export interface ExecutionLog {
  id: string;
  level: string;
  message: string;
  timestamp: Date;
  stepIndex?: number;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  executionTime: number;
}

export interface ValidationConfig {
  id: string;
  type: 'api' | 'sql' | 'clickhouse';
  target: string; // JSON path for API, column name for DB
  expectedValue: string;
  dataType: 'string' | 'number' | 'boolean' | 'array' | 'object';
  stepId: string; // Links to the step being validated
}

interface ValidationResult {
  id: string;
  status: 'success' | 'failure';
  actualValue: any;
  expectedValue: string;
  dataType: string;
  target: string;
  message?: string;
  timestamp: string;
}