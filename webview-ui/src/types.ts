export interface TestCase {
  id: string;
  name: string;
  collectionId: string;
  steps: TestStep[];
  createdAt: Date;
  updatedAt: Date;
  flowControlConfig?: FlowControlConfig;
}

export interface TestStep {
  id: string;
  name: string;
  type: 'api' | 'sql' | 'redis' | 'clickhouse';
  delayMs?: number;
  order: number;
  config: SqlStepConfig | RedisStepConfig | ApiStepConfig | ClickhouseStepConfig;
  validations?: ValidationConfig[];
  flowControlConfig?: StepFlowControlConfig;
  uiConfig?: StepUIConfig;
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

// Workspace types for file system integration
export interface WorkspaceTree {
  rootPath: string;
  folders: WorkspaceFolder[];
  globalConfig?: GlobalConfig;
}

export interface WorkspaceFolder {
  id: string;
  name: string;
  path: string;
  collections: WorkspaceCollection[];
  config?: FolderConfig;
}

export interface WorkspaceCollection {
  id: string;
  name: string;
  path: string;
  folderId: string;
  testCases: WorkspaceTestCase[];
  config?: CollectionConfig;
}

export interface WorkspaceTestCase {
  id: string;
  name: string;
  path: string;
  collectionId: string;
  testCase: TestCase;
}

// Database connection configuration
export interface DatabaseConfig {
  id: string;
  name: string;
  type: 'mysql' | 'postgresql' | 'redis' | 'clickhouse';
  host: string;
  port: number;
  database?: string;
  username?: string;
  password?: string;
  connectionString?: string;
  timeout?: number;
  maxConnections?: number;
  ssl?: boolean;
  description?: string;
}

// Global workspace configuration
export interface GlobalConfig {
  version: string;
  defaultSettings?: {
    timeout?: number;
    retryCount?: number;
  };
  databases?: DatabaseConfig[];
  defaultDatabaseConnections?: {
    sql?: string; // Database ID to use as default for SQL steps
    redis?: string; // Database ID to use as default for Redis steps
    clickhouse?: string; // Database ID to use as default for ClickHouse steps
  };
}

// Folder-level configuration
export interface FolderConfig {
  description?: string;
  defaultCollectionSettings?: {
    timeout?: number;
  };
  databases?: DatabaseConfig[];
  defaultDatabaseConnections?: {
    sql?: string;
    redis?: string;
    clickhouse?: string;
  };
}

// Collection-level configuration (future use)
export interface CollectionConfig {
  description?: string;
  defaultTestSettings?: {
    timeout?: number;
    retryCount?: number;
  };
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
  body: unknown;
  executionTime: number;
}

export interface ValidationConfig {
  id: string;
  type: 'api' | 'sql' | 'clickhouse';
  target: string; // JSON path for API, column name for DB
  expectedValue: string;
  dataType: 'string' | 'number' | 'boolean' | 'array' | 'object';
  stepId: string; // Links to the step being validated
  customErrorMessage?: string; // Custom error message for validation failures
}

export interface ValidationResult {
  id: string;
  status: 'success' | 'failure';
  actualValue: unknown;
  expectedValue: string;
  dataType: string;
  target: string;
  message?: string;
  timestamp: string;
  karateError?: string;
}

// Flow Control Types
export interface FlowControlConfig {
  id: string;
  testCaseId: string;
  stopOnFailure: boolean;
  continueOnFailure: boolean;
  skipRemainingSteps: boolean;
  failureThreshold: number;
}

export interface StepFlowControlConfig {
  continueOnFailure: boolean;
  skipOnDependencyFailure: boolean;
  retryCount: number;
  timeout: number;
}

export interface StepUIConfig {
  displayName: string;
  description: string;
  icon: string;
  color: string;
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

// Enhanced Execution Results
export interface EnhancedExecutionResult {
  testCaseId: string;
  executionId: string;
  startTime: Date;
  endTime: Date;
  status: 'completed' | 'failed' | 'partial' | 'cancelled';
  stepResults: EnhancedStepResult[];
  validationSummary: ValidationSummary;
  flowControlSummary: FlowControlSummary;
  metrics: ExecutionMetrics;
}

export interface EnhancedStepResult {
  stepId: string;
  stepName: string;
  type: 'api' | 'sql' | 'redis' | 'clickhouse';
  executionStatus: 'executed' | 'skipped' | 'failed' | 'cancelled';
  result: unknown;
  validationResults: ValidationResult[];
  executionTime?: number;
  skipReason?: string;
  dependencies: string[];
  flowControlDecision: FlowControlDecision;
}

export interface ValidationSummary {
  totalValidations: number;
  passedValidations: number;
  failedValidations: number;
  skippedValidations: number;
}

export interface FlowControlSummary {
  totalDecisions: number;
  stopDecisions: number;
  continueDecisions: number;
  skippedSteps: string[];
}

export interface ExecutionMetrics {
  totalExecutionTime: number;
  averageStepTime: number;
  slowestStep: {
    stepId: string;
    executionTime: number;
  };
  fastestStep: {
    stepId: string;
    executionTime: number;
  };
}

// Enhanced Validation Types
export interface ValidationRule {
  id: string;
  name: string;
  type: 'value-comparison' | 'type-check' | 'range-check' | 'pattern-match' | 'custom';
  target: string;
  operator: 'equals' | 'not-equals' | 'greater-than' | 'less-than' | 'contains' | 'matches';
  expectedValue: unknown;
  errorMessage: string;
  severity: 'error' | 'warning' | 'info';
}

export interface StepValidationConfig {
  stepId: string;
  validations: ValidationRule[];
  executionOrder: number;
  dependencies: string[];
  failureAction: 'continue' | 'stop' | 'skip-dependent';
}

// UI State Types
export interface UIState {
  theme: 'light' | 'dark' | 'auto';
  layout: {
    navigatorCollapsed: boolean;
    resultsHeight: number;
    tabsLayout: 'horizontal' | 'vertical';
  };
  preferences: {
    defaultFlowControl: FlowControlConfig;
    autoExpandResults: boolean;
    showExecutionMetrics: boolean;
    enableAnimations: boolean;
  };
}

export interface ResponsiveLayoutState {
  viewportWidth: number;
  viewportHeight: number;
  availableSpace: {
    tabs: number;
    results: number;
    editor: number;
  };
  breakpoint: 'sm' | 'md' | 'lg' | 'xl';
}

// Theme Types
export interface ThemeConfig {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    foreground: string;
    muted: string;
    accent: string;
  };
  accessibility: {
    contrastRatio: number;
    wcagCompliant: boolean;
  };
}