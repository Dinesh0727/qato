# Design Document

## Overview

The Database Configuration Management feature implements a hierarchical configuration system for Redis, ClickHouse, and MySQL database connections within the QATO Visual Builder extension. The system provides a cascading configuration approach where folder-level configurations override global configurations, enabling fine-grained control while maintaining sensible defaults.

The design leverages the existing workspace management infrastructure in the VS Code extension, extending the current `WorkspaceManager` and configuration types to support database-specific settings. The configuration resolution is handled entirely within the extension host, with intuitive UI components integrated into the existing webview interface.

## Architecture

### Configuration Hierarchy

The system implements a three-tier configuration hierarchy:

1. **Global Level** - Workspace-wide default database configurations
2. **Folder Level** - Folder-specific database configurations that override global settings

Configuration resolution follows this precedence:
```
Folder Config → Global Config
```

### Core Components

#### Extension Host Components

**DatabaseConfigManager**
- Manages database configuration resolution and caching
- Provides APIs for configuration CRUD operations
- Handles configuration inheritance and merging
- Integrates with existing `WorkspaceManager`

**ConfigurationResolver**
- Resolves database configurations for specific paths
- Implements caching for performance optimization
- Handles configuration change notifications

#### Webview UI Components

**GlobalDatabaseConfigDialog**
- Enhanced version of existing `GlobalSettingsDialog`
- Provides comprehensive database configuration interface
- Supports Redis, ClickHouse, and MySQL configuration

**FolderDatabaseConfigDialog**
- New component for folder-level database configuration
- Accessible through folder context menu in navigator
- Shows inheritance from parent configurations

**DatabaseConfigForm**
- Reusable form component for database configuration
- Supports all three database types with appropriate fields
- Includes connection testing capabilities

#### Backend Integration

**Enhanced Java Utils**
- Modified `DbUtils`, `RedisUtils`, and `ClickhouseUtils`
- Support for dynamic configuration injection
- Configuration-based connection management

## Components and Interfaces

### Data Models

```typescript
interface DatabaseConfig {
  id: string;
  name: string;
  type: 'mysql' | 'redis' | 'clickhouse';
  host: string;
  port: number;
  database?: string;
  username?: string;
  password?: string;
  timeout?: number;
  maxConnections?: number;
  ssl?: boolean;
  description?: string;
}

interface DatabaseConfigSet {
  mysql?: DatabaseConfig;
  redis?: DatabaseConfig;
  clickhouse?: DatabaseConfig;
}

interface ConfigurationContext {
  path: string;
  level: 'global' | 'folder' ;
  resolvedConfig: DatabaseConfigSet;
  inheritanceChain: string[];
}
```

### Extension Host APIs

```typescript
interface DatabaseConfigManager {
  // Configuration Resolution
  resolveConfig(path: string): Promise<DatabaseConfigSet>;
  getConfigForPath(path: string, dbType: DatabaseType): Promise<DatabaseConfig | null>;
  
  // Configuration Management
  setGlobalConfig(config: DatabaseConfigSet): Promise<void>;
  setFolderConfig(folderPath: string, config: DatabaseConfigSet): Promise<void>;
  
  // Cache Management
  invalidateCache(path?: string): void;
  preloadConfigurations(): Promise<void>;
}
```

### UI Component Interfaces

```typescript
interface DatabaseConfigFormProps {
  config: DatabaseConfig;
  type: 'mysql' | 'redis' | 'clickhouse';
  onChange: (config: DatabaseConfig) => void;
  onTest?: (config: DatabaseConfig) => Promise<boolean>;
  level: 'global' | 'folder';
  inheritedConfig?: DatabaseConfig;
}

interface FolderConfigDialogProps {
  folderPath: string;
  currentConfig?: DatabaseConfigSet;
  inheritedConfig: DatabaseConfigSet;
  onSave: (config: DatabaseConfigSet) => void;
}
```

## Data Models

### Enhanced Configuration Types

The existing configuration types in `workspaceTypes.ts` will be extended:

```typescript
// Enhanced GlobalConfig
interface GlobalConfig {
  version: string;
  defaultSettings?: {
    timeout?: number;
    retryCount?: number;
  };
  databases: {
    mysql?: DatabaseConfig;
    redis?: DatabaseConfig;
    clickhouse?: DatabaseConfig;
  };
}

// Enhanced FolderConfig
interface FolderConfig {
  description?: string;
  databases?: {
    mysql?: DatabaseConfig;
    redis?: DatabaseConfig;
    clickhouse?: DatabaseConfig;
  };
  inheritFromParent?: boolean;
}
```

### Configuration Storage Format

**Global Configuration** (`global-config.json`)
```json
{
  "version": "1.0.0",
  "databases": {
    "mysql": {
      "id": "global-mysql",
      "name": "Global MySQL",
      "type": "mysql",
      "host": "localhost",
      "port": 3306,
      "database": "test",
      "username": "root",
      "password": "",
      "timeout": 30000
    },
    "redis": {
      "id": "global-redis",
      "name": "Global Redis",
      "type": "redis",
      "host": "localhost",
      "port": 6379,
      "timeout": 30000
    },
    "clickhouse": {
      "id": "global-clickhouse",
      "name": "Global ClickHouse",
      "type": "clickhouse",
      "host": "localhost",
      "port": 8123,
      "database": "default",
      "username": "default",
      "password": "",
      "timeout": 30000
    }
  }
}
```

**Folder Configuration** (`folder-config.json`)
```json
{
  "description": "Development Environment",
  "databases": {
    "mysql": {
      "id": "dev-mysql",
      "name": "Development MySQL",
      "type": "mysql",
      "host": "dev-db.company.com",
      "port": 3306,
      "database": "dev_app",
      "username": "dev_user",
      "password": "dev_pass"
    }
  },
  "inheritFromParent": true
}
```

## Error Handling

### Configuration Validation

- **Schema Validation**: Validate configuration structure against TypeScript interfaces
- **Connection Validation**: Optional connection testing for database configurations
- **Inheritance Validation**: Ensure configuration inheritance chains are valid

### Error Recovery

- **Fallback to Parent**: If folder configuration is invalid, fall back to parent or global
- **Default Configuration**: Provide sensible defaults when no configuration exists
- **User Notification**: Clear error messages for configuration issues

### Error Types

```typescript
interface ConfigurationError {
  type: 'validation' | 'connection' | 'inheritance' | 'storage';
  message: string;
  path?: string;
  details?: Record<string, any>;
}
```

## Testing Strategy

### Unit Tests

**Extension Host Tests**
- Configuration resolution logic
- Cache management functionality
- Configuration inheritance and merging
- Error handling scenarios

**UI Component Tests**
- Database configuration form validation
- Dialog interaction flows
- Configuration inheritance display
- Error state handling

### Integration Tests

**End-to-End Configuration Flow**
- Global configuration → folder override → test execution
- Configuration changes → cache invalidation → UI updates
- Multi-level inheritance scenarios

**Backend Integration Tests**
- Configuration injection into Java utilities
- Database connection establishment with resolved configs
- Error propagation from backend to frontend

### Test Data

**Configuration Scenarios**
- Global-only configuration
- Single-level folder override
- Partial configuration override
- Invalid configuration handling

## UI/UX Design

### Global Configuration Access

**Location**: Header settings button (existing `GlobalSettingsDialog`)
**Visual Indicators**:
- Clear "Global" label in dialog title
- Global scope icon in header
- Breadcrumb showing "Workspace > Global Settings"

### Folder Configuration Access

**Location**: Folder context menu in navigator
**Menu Item**: "Database Configuration..."
**Visual Indicators**:
- Folder-specific dialog title: "Database Configuration - [Folder Name]"
- Inheritance indicators showing which settings are inherited
- Override badges for locally configured settings

### Configuration Form Design

**Database Type Tabs**
- MySQL, Redis, ClickHouse tabs
- Visual indicators for configured vs inherited settings
- Connection test buttons for each database type

**Inheritance Visualization**
- Inherited settings shown with muted styling
- Override toggle switches for each setting
- Clear indication of configuration source

**Form Validation**
- Real-time validation feedback
- Connection testing with loading states
- Clear error messages with resolution suggestions

## Performance Considerations

### Configuration Caching

**Cache Strategy**
- In-memory cache for resolved configurations
- Path-based cache keys for efficient lookups
- Automatic cache invalidation on configuration changes

**Cache Optimization**
- Preload configurations on workspace initialization
- Batch configuration resolution for related paths
- Lazy loading for deep folder hierarchies

### UI Performance

**Lazy Loading**
- Load configuration dialogs on demand
- Defer connection testing until user requests
- Progressive loading for large folder structures

**Debounced Updates**
- Debounce configuration form changes
- Batch configuration saves
- Throttle cache invalidation events

## Security Considerations

### Credential Storage

**Current Approach**: Plain text storage in JSON files (matching existing implementation)
**Future Enhancement**: Integration with VS Code's secret storage API

### Access Control

**File System Permissions**: Leverage VS Code's workspace security model
**Configuration Validation**: Sanitize and validate all configuration inputs

### Network Security

**Connection Testing**: Implement timeout and retry limits
**Error Handling**: Avoid exposing sensitive connection details in error messages

## Migration Strategy

### Existing Configuration Compatibility

**Backward Compatibility**: Support existing `global-config.json` format
**Gradual Migration**: Extend existing configuration structure without breaking changes
**Default Values**: Provide sensible defaults for new configuration fields

### Database Utility Integration

**Phased Approach**:
1. Extend existing utilities to accept configuration parameters
2. Implement configuration injection mechanism
3. Maintain backward compatibility with hardcoded values
4. Gradually migrate to configuration-driven approach

## Future Extensibility

### Collection-Level Configuration

**Design Consideration**: Architecture supports future collection-level configuration
**Implementation**: Extend existing `CollectionConfig` interface
**UI Integration**: Add collection context menu option

### Additional Database Types

**Pluggable Architecture**: Database type registration system
**Configuration Schema**: Extensible configuration validation
**UI Components**: Reusable form components for new database types

### Advanced Features

**Configuration Templates**: Predefined configuration sets for common scenarios
**Environment Profiles**: Switch between development, staging, production configurations
**Configuration Import/Export**: Share configurations across workspaces