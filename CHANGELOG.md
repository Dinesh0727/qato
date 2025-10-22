# Change Log

All notable changes to the "qato" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.1] - 2025-10-22

### Added

#### Core Features

- Visual test builder with drag-and-drop interface
- Multi-step test cases with SQL, Redis, ClickHouse, and API support
- Real-time Gherkin syntax generation from visual configurations
- Hierarchical configuration management (global, folder, collection levels)
- Step template system for reusable API and database operations
- Theme support (light, dark, auto modes)

#### API Testing

- Full HTTP method support (GET, POST, PUT, DELETE, PATCH)
- **cURL Import**: Import API requests directly from cURL commands with automatic parsing
- Query parameter management with bi-directional synchronization
- Multipart form-data with file upload support
- URL-encoded form data support
- Custom headers and authentication token support
- Variable extraction from API responses

#### Database Testing

- MySQL, PostgreSQL, Redis, and ClickHouse database support
- Query execution with dynamic variable substitution
- Result validation and data extraction capabilities

#### Validation & Flow Control

- Type-aware validation (string, number, boolean, array, object)
- JSON path support for precise API response validation
- Custom error messages for validation failures
- Configurable flow control (stop on failure vs continue execution)

#### Additional Features

- Test case tagging for organization and categorization
- Execution context storage and automatic restoration
- Test navigation with automatic result loading
- Comprehensive validation reporting with pass/fail status
- Real-time execution monitoring with step-by-step progress

### Fixed

- Improved cURL parser to handle quotes inside JSON bodies correctly
- Fixed step template loading during extension bootup
- Fixed results rendering when switching between test cases
- Fixed Gherkin code generation for ClickHouse queries

## [Unreleased]

- Future enhancements and features will be listed here
- Global and Local Variables 
- Group Execution
- Load Testing
