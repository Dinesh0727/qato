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
  type: 'sql' | 'redis' | 'api' | 'clickhouse';
  delayMs: number;
  order: number;
  config: SqlStepConfig | RedisStepConfig | ApiStepConfig | ClickhouseStepConfig;
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
  extractVars?: Array<{ name: string; path: string }>;
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
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  stepIndex: number;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  executionTime: number;
}
