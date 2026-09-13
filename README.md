# QATO (QA Testing Orchestrator)

QATO (QA Testing Orchestrator) is a comprehensive Visual Studio Code extension designed for QA testing orchestration. It provides a visual interface for creating, managing, and executing multi-step test cases that can interact with various data sources including SQL databases, Redis, ClickHouse, and REST APIs. The project combines a TypeScript-based VS Code extension with a React-based webview UI and Java Spring Boot microservices for database operations.

## Features

QATO provides a comprehensive set of features for QA testing orchestration with a visual approach to test creation and management. Key features include:

### Test Case Management
- **Hierarchical Organization**: Organize test cases in a folder → collection → test case structure
- **Multi-Step Test Cases**: Create complex test flows with steps interacting with multiple data sources
- **Test Case Tagging**: Organize and categorize test cases with custom tags for better filtering and management
- **Step Types Supported**:
  - **SQL**: Execute database queries with MySQL support
  - **Redis**: Execute Redis commands and operations
  - **ClickHouse**: Execute analytics database queries
  - **API**: Execute REST API calls with full HTTP method support

### Visual Test Builder
- **Drag-and-Drop Interface**: Create and arrange test steps visually without writing code
- **Real-time Preview**: Live Gherkin syntax generation from visual test configurations
- **cURL Import**: Import API requests directly from cURL commands with automatic parsing of:
  - HTTP methods (GET, POST, PUT, DELETE, PATCH)
  - Headers and authentication tokens
  - Request body (JSON, form-data, URL-encoded)
  - Query parameters
  - Multipart file uploads
- **Variable Extraction**: Extract values from API responses to use in subsequent steps
- **Dynamic Variables**: Support for variable substitution using `${variable}` syntax across steps
- **Delay Configuration**: Configure delays between test steps for timing-sensitive tests

### Validation & Flow Control
- **Type-aware Validation**: Validate data with string, number, boolean, array, and object type awareness
- **JSON Path Support**: Use JSON paths for precise API response validation
- **Custom Error Messages**: Define custom messages for validation failures
- **Configurable Flow Control**: Set execution flow behavior (stop on failure vs continue)

### Execution & Results
- **Real-time Execution**: Execute tests and monitor progress in real-time
- **Detailed Results**: View step-by-step execution results with timing information
- **Comprehensive Validation Reporting**: Detailed validation result reporting with pass/fail status
- **Smart Error Handling**: Configurable error detection and categorization
- **Test Navigation**: Quick navigation between test cases with automatic result loading

### Configuration Management
- **Multiple Database Types**: Support for MySQL, PostgreSQL, Redis, and ClickHouse
- **Global, Folder & Collection Settings**: Hierarchical configuration management
- **Step Templates**: Reusable step templates for common operations (API and database steps)
- **Execution Context Storage**: Automatically save and restore test execution context
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

## Known Issues

- **Database Service Startup**: The Java backend service may take a few seconds to start on first execution
- **Large Test Cases**: Very large test cases with many steps may experience performance degradation
- **File Watching**: In some environments, file system watching may not detect external changes immediately
- **Variable Substitution**: Complex nested variables in database queries may not be substituted correctly in some edge cases

## Release Notes

### 0.0.1 (Initial Release)

First public release of QATO (QA Testing Orchestrator) with comprehensive visual test creation and execution capabilities.

**Core Features:**
- Visual test builder with drag-and-drop interface
- Multi-step test cases with SQL, Redis, ClickHouse, and API support
- Real-time Gherkin syntax generation
- Hierarchical configuration management (global, folder, collection)
- Step template system for reusable operations
- Theme support (light, dark, auto)

**API Testing:**
- Full HTTP method support (GET, POST, PUT, DELETE, PATCH)
- **cURL Import**: Import API requests directly from cURL commands
- Query parameter management with bi-directional sync
- Multipart form-data with file upload support
- URL-encoded form data
- Custom headers and authentication
- Variable extraction from responses

**Database Testing:**
- MySQL, PostgreSQL, Redis, and ClickHouse support
- Query execution with variable substitution
- Result validation and extraction

**Validation & Flow Control:**
- Type-aware validation (string, number, boolean, array, object)
- JSON path support for precise validation
- Custom error messages
- Configurable flow control (stop on failure vs continue)

**Additional Features:**
- Test case tagging for organization
- Execution context storage and restoration
- Test navigation with automatic result loading
- Comprehensive validation reporting
- Real-time execution monitoring

## Working with QATO

### Getting Started

1. Open your project in VS Code
2. Open the Command Palette (Ctrl+Shift+P or Cmd+Shift+P)
3. Run "QATO: Show Panel" to open the visual builder
4. Create your first test folder, collection, and test case
5. Add steps to your test case using the intuitive visual interface
6. Configure validations and variable extractions as needed
7. Run your test to verify the behavior

### Importing API Requests from cURL

QATO makes it easy to import existing API requests from cURL commands:

1. Click the "Add Step" button and select "API"
2. Click the "Import from cURL" button in the API step editor
3. Paste your cURL command (supports multi-line commands with backslash continuations)
4. Click "Parse cURL" to preview the extracted configuration
5. Click "Import Step" to add the API step to your test case

The cURL parser automatically extracts:
- HTTP method and URL
- All headers including authentication
- Request body (raw JSON, form-data, URL-encoded)
- Query parameters
- File uploads in multipart requests

**Example cURL commands supported:**
```bash
# Simple GET request
curl 'https://api.example.com/users'

# POST with JSON body
curl -X POST 'https://api.example.com/users' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer token123' \
  --data-raw '{"name":"John","email":"john@example.com"}'

# Multipart form with file upload
curl -X POST 'https://api.example.com/upload' \
  -F 'file=@/path/to/file.pdf' \
  -F 'description=My document'
```

### Best Practices

- Organize your test cases in logical folder and collection structures
- Use descriptive names for test cases and steps
- Tag test cases for easy categorization and filtering
- Implement appropriate validations for each test step's expected outcome
- Use step templates for repetitive operations across multiple test cases
- Leverage variable extraction to chain dependent operations
- Import API requests from browser DevTools or Postman using cURL export
- Configure query parameters separately for better maintainability

## For more information

- [QATO Documentation](qwen-context.md) - Complete project context and technical details
- [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
- [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy testing with QATO!**