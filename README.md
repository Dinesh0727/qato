# QATO (QA Testing Orchestrator)

QATO (QA Testing Orchestrator) is a comprehensive Visual Studio Code extension designed for QA testing orchestration. It provides a visual interface for creating, managing, and executing multi-step test cases that can interact with various data sources including SQL databases, Redis, ClickHouse, and REST APIs. The project combines a TypeScript-based VS Code extension with a React-based webview UI and Java Spring Boot microservices for database operations.

## Features

QATO provides a comprehensive set of features for QA testing orchestration with a visual approach to test creation and management. Key features include:

### Test Case Management
- **Hierarchical Organization**: Organize test cases in a folder → collection → test case structure
- **Multi-Step Test Cases**: Create complex test flows with steps interacting with multiple data sources
- **Step Types Supported**:
  - **SQL**: Execute database queries with MySQL support
  - **Redis**: Execute Redis commands and operations
  - **ClickHouse**: Execute analytics database queries
  - **API**: Execute REST API calls with full HTTP method support

### Visual Test Builder
- **Drag-and-Drop Interface**: Create and arrange test steps visually without writing code
- **Real-time Preview**: Live Gherkin syntax generation from visual test configurations
- **Variable Extraction**: Extract values from API responses to use in subsequent steps
- **Dynamic Variables**: Support for variable substitution using `${variable}$` syntax across steps
- **Delay Configuration**: Configure delays between test steps for timing-sensitive tests

### Validation & Flow Control
- **Type-aware Validation**: Validate data with string, number, boolean, array, and object type awareness
- **JSON Path Support**: Use JSON paths for precise API response validation
- **Custom Error Messages**: Define custom messages for validation failures
- **Configurable Flow Control**: Set execution flow behavior (stop on failure vs continue)

### Execution & Results
- **Real-time Execution**: Execute tests and monitor progress in real-time
- **Detailed Results**: View step-by-step execution results with timing information
- **Comprehensive Validation Reporting**: Detailed validation result reporting
- **Smart Error Handling**: Configurable error detection and categorization

### Configuration Management
- **Multiple Database Types**: Support for MySQL, PostgreSQL, Redis, and ClickHouse
- **Global, Folder & Collection Settings**: Hierarchical configuration management
- **Step Templates**: Reusable step templates for common operations
- **Theme Support**: Light, dark, and auto theme options

![QATO Interface](images/qato-interface.png)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

To use QATO effectively, you'll need the following prerequisites installed on your system:

### System Requirements
- **Node.js** (version 18 or higher)
- **npm** package manager
- **Java 11+** runtime environment for backend services

### Optional Database Services (for testing)
If you plan to test with actual databases, you can use the provided Docker Compose configuration:
- **MySQL 8.0**: Port 3306, test database with user credentials
- **Redis**: Port 6379, standard configuration
- **ClickHouse**: Ports 8123 (HTTP) and 9001 (native client)

To start all database services at once, run from the project root:
```bash
docker-compose up -d
```

## Extension Settings

QATO adds several settings through the `contributes.configuration` extension point. These settings control various aspects of the extension behavior and can be configured in your VS Code settings.json file or through the UI under Settings > Extensions > QA Testing Orchestrator. Note that these settings are currently defined in the extension's internal configuration system and will be made available through VS Code's configuration API in future releases.

## Commands

QATO provides the following commands that can be accessed through VS Code's command palette (Ctrl+Shift+P or Cmd+Shift+P):

- `QATO: Show Panel` - Opens the QATO visual builder panel for creating and editing test cases
- `QATO: Run Hardcoded Test` - Executes a predefined test for verification

## Known Issues

- **Database Service Startup**: The Java backend service may take a few seconds to start on first execution
- **Large Test Cases**: Very large test cases with many steps may experience performance degradation
- **File Watching**: In some environments, file system watching may not detect external changes immediately
- **Variable Substitution**: Complex nested variables in database queries may not be substituted correctly in some edge cases

## Release Notes

### 1.0.0

Initial release of QATO (QA Testing Orchestrator) with complete visual test creation and execution capabilities, including support for SQL, Redis, ClickHouse, and API testing with validation and flow control features.

### 1.0.1

- Fixed issue with variable extraction in API response headers
- Improved error handling during test execution
- Added support for custom headers in API calls
- Enhanced database connection stability

### 1.1.0

- Added step template management system
- Implemented theme toggle functionality (light/dark/auto)
- Introduced hierarchical configuration system (global, folder, collection)
- Enhanced validation system with better type checking
- Added support for form data in API requests

## Working with QATO

### Getting Started

1. Open your project in VS Code
2. Open the Command Palette (Ctrl+Shift+P or Cmd+Shift+P)
3. Run "QATO: Show Panel" to open the visual builder
4. Create your first test folder, collection, and test case
5. Add steps to your test case using the intuitive visual interface
6. Configure validations and variable extractions as needed
7. Run your test to verify the behavior

### Best Practices

- Organize your test cases in logical folder and collection structures
- Use descriptive names for test cases and steps
- Implement appropriate validations for each test step's expected outcome
- Use step templates for repetitive operations across multiple test cases
- Leverage variable extraction to chain dependent operations

## For more information

- [QATO Documentation](qwen-context.md) - Complete project context and technical details
- [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
- [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy testing with QATO!**