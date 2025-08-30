# QATO (QA Testing Orchestrator) - Project Summary

## Overview

QATO is a comprehensive Visual Studio Code extension designed for QA testing orchestration. It provides a visual interface for creating, managing, and executing multi-step test cases that can interact with various data sources including SQL databases, Redis, ClickHouse, and REST APIs. The project combines a TypeScript-based VS Code extension with a React-based webview UI and Java Spring Boot microservices for database operations.

## Architecture

### 1. VS Code Extension (TypeScript)

- **Main Extension**: `src/extension.ts`
- **Configuration**: `src/config.ts` - Centralized configuration for error patterns, timeouts, and settings
- **Package**: `package.json` - Defines extension metadata, commands, and dependencies
- **Commands**:
  - `qato.runHardcodedTest` - Run predefined test
  - `qato.showPanel` - Open the QATO visual builder panel

### 2. Webview UI (React + TypeScript)

- **Framework**: React 18 with TypeScript, Vite build system
- **UI Library**: Radix UI components with Tailwind CSS styling
- **State Management**: React hooks with local state
- **Key Components**:
  - `TestNavigator.tsx` - Hierarchical test case browser (folders → collections → test cases)
  - `Editor.tsx` - Main test case editor with step configuration
  - `StepCard.tsx` - Individual test step configuration
  - `ValidationEditor.tsx` - Validation rule configuration
  - `Results.tsx` - Test execution results display
  - `FlowControlSettings.tsx` - Flow control configuration

### 3. Java Backend Services

- **Framework**: Spring Boot 3.5.3 with Java 11
- **Purpose**: Database access microservice for SQL, Redis, and ClickHouse operations
- **Dependencies**:
  - MySQL Connector (8.0.33)
  - Jedis Redis client (5.1.0)
  - ClickHouse JDBC driver (0.9.0)
- **JAR**: `qa-tool-orchaestrator-0.0.1-SNAPSHOT.jar`

### 4. Test Execution Engine

- **Framework**: Karate Framework (1.5.1) for BDD-style test execution
- **Process**: Extension generates Gherkin feature files from visual test cases
- **Execution Flow**:
  1. User creates test case visually
  2. Extension converts to Gherkin syntax
  3. Karate executes the feature file
  4. Results are parsed and displayed in UI

## Core Features

### Test Case Management

- **Hierarchical Organization**: Folders → Collections → Test Cases
- **Step Types**:
  - **SQL**: Database queries with MySQL support
  - **Redis**: Redis commands and operations
  - **ClickHouse**: Analytics database queries
  - **API**: REST API calls with full HTTP method support
- **Flow Control**: Configurable execution flow with failure handling
- **Validation Rules**: Data validation with type-aware comparisons

### Visual Test Builder

- **Drag-and-Drop Interface**: Visual step creation and ordering
- **Real-time Preview**: Live Gherkin generation
- **Variable Extraction**: API response data extraction for subsequent steps
- **Dynamic Variables**: Variable substitution across steps using `${variable}$` syntax
- **Delay Configuration**: Configurable delays between steps

### Execution & Results

- **Real-time Execution**: Live test execution with progress tracking
- **Detailed Results**: Step-by-step execution results with timing
- **Validation Results**: Comprehensive validation reporting
- **Error Handling**: Configurable error detection and categorization
- **Flow Control**: Smart execution flow based on success/failure conditions

### Configuration Management

- **Error Patterns**: Configurable regex patterns for error detection
- **Database Connections**: Support for multiple database types
- **Timeout Settings**: Configurable timeouts for various operations
- **UI Preferences**: Theme support and layout customization

## Data Models

### Core Types

```typescript
interface TestCase {
  id: string;
  name: string;
  collectionId: string;
  steps: TestStep[];
  flowControlConfig?: FlowControlConfig;
}

interface TestStep {
  id: string;
  name: string;
  type: "api" | "sql" | "redis" | "clickhouse";
  delayMs?: number;
  order: number;
  config:
    | SqlStepConfig
    | RedisStepConfig
    | ApiStepConfig
    | ClickhouseStepConfig;
  validations?: ValidationConfig[];
}
```

### Step Configurations

- **SQL/ClickHouse**: Query string with optional database specification
- **Redis**: Command string with optional database number
- **API**: Method, URL, headers, body, and variable extraction rules

### Validation System

- **Type-aware Validation**: String, number, boolean, array, object validation
- **JSON Path Support**: API response validation using JSON paths
- **Custom Error Messages**: User-defined validation failure messages
- **Flow Control Integration**: Validation results affect execution flow

## Development Environment

### Prerequisites

- Node.js and npm for extension and webview development
- Java 11+ and Maven for backend services
- Docker (optional) for database services via docker-compose.yml

### Database Services (Docker Compose)

- **MySQL 8.0**: Port 3306, test database with user credentials
- **Redis**: Port 6379, standard configuration
- **ClickHouse**: Ports 8123 (HTTP) and 9001 (native client)

### Build Process

1. **Extension**: TypeScript compilation to `out/` directory
2. **Webview**: Vite build to `dist-ui/` directory
3. **Java Services**: Maven build to generate JAR files

## Key Files Structure

```
├── src/                          # VS Code extension source
│   ├── extension.ts             # Main extension logic
│   └── config.ts                # Configuration management
├── webview-ui/                  # React webview application
│   ├── src/components/          # React components
│   ├── src/types.ts            # TypeScript type definitions
│   └── src/pages/Index.tsx     # Main application page
├── java-utils/                  # Java backend services
│   └── qa-tool-orchaestrator/  # Spring Boot microservice
├── resources/                   # JAR files and dependencies
├── docker-compose.yml          # Database services setup
└── sample.feature              # Example Karate test file
```

## Integration Points

### Extension ↔ Webview Communication

- **Message Passing**: VS Code webview API for bidirectional communication
- **Commands**: Extension exposes commands for test execution
- **Input Handling**: Extension handles user input dialogs

### Webview ↔ Java Services

- **HTTP API**: REST endpoints for database operations
- **Query Execution**: Direct database query execution
- **Response Formatting**: Structured response format for UI consumption

### Karate Integration

- **Gherkin Generation**: Dynamic feature file creation from visual test cases
- **Variable Substitution**: Runtime variable replacement in queries/requests
- **Result Parsing**: Custom result extraction from Karate execution logs

## Configuration & Customization

### Error Detection

- Configurable regex patterns for error identification
- Database-specific error categorization
- Custom error message length limits

### Flow Control

- Stop on failure vs. continue on failure modes
- Failure threshold configuration
- Step-level retry and timeout settings

### UI Customization

- Theme support (light/dark/auto)
- Collapsible navigation panels
- Responsive layout adaptation

## Use Cases

### Primary Use Cases

1. **API Testing**: Multi-step API workflows with data validation
2. **Database Testing**: SQL query validation and data integrity checks
3. **Integration Testing**: Cross-system data flow validation
4. **Performance Testing**: Execution timing and performance metrics
5. **Regression Testing**: Automated test suite execution

### Typical Workflow

1. Create folder and collection structure
2. Design test case with multiple steps
3. Configure database connections and API endpoints
4. Set up validation rules for expected outcomes
5. Execute test and analyze results
6. Iterate based on validation feedback

## Technical Highlights

### Strengths

- **Visual Test Design**: No-code test case creation
- **Multi-Database Support**: SQL, Redis, ClickHouse integration
- **Real-time Execution**: Live test execution with immediate feedback
- **Flexible Validation**: Type-aware validation with custom rules
- **Extensible Architecture**: Modular design for easy feature additions

### Innovation Points

- **Gherkin Generation**: Automatic BDD test generation from visual design
- **Variable Flow**: Dynamic variable extraction and substitution
- **Flow Control**: Intelligent execution flow based on validation results
- **Error Intelligence**: Smart error detection and categorization

This project represents a comprehensive QA testing solution that bridges the gap between visual test design and automated execution, making complex multi-step testing accessible to both technical and non-technical users.
