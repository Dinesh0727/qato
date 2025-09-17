import * as vscode from 'vscode';
import * as path from 'path';
import {
  DatabaseConfig,
  DatabaseConfigSet,
  ConfigurationContext,
  ConfigurationError,
  DatabaseConfigManager as IDatabaseConfigManager,
  GlobalConfig,
  FolderConfig,
  FileSystemResult
} from './workspaceTypes';

/**
 * Manages database configuration resolution, caching, and persistence
 * Implements hierarchical configuration inheritance: folder -> global
 */
export class DatabaseConfigManager implements IDatabaseConfigManager {
  private configCache = new Map<string, DatabaseConfigSet>();
  private rootUri: vscode.Uri | null = null;
  private onConfigurationChanged?: () => Promise<void>;

  constructor(private workspaceManager: any) {}

  /**
   * Set callback for when configuration changes
   */
  setOnConfigurationChanged(callback: () => Promise<void>): void {
    this.onConfigurationChanged = callback;
  }

  /**
   * Set the workspace root URI
   */
  setRootUri(rootUri: vscode.Uri): void {
    this.rootUri = rootUri;
    // Clear cache when root changes
    this.invalidateCache();
  }

  /**
   * Resolve database configuration for a specific path
   * Implements hierarchical resolution: folder -> global
   */
  async resolveConfig(path: string): Promise<DatabaseConfigSet> {
    // Check cache first
    const cacheKey = this.getCacheKey(path);
    if (this.configCache.has(cacheKey)) {
      return this.configCache.get(cacheKey)!;
    }

    try {
      const resolvedConfig = await this.performConfigResolution(path);
      
      // Cache the resolved configuration
      this.configCache.set(cacheKey, resolvedConfig);
      
      return resolvedConfig;
    } catch (error: any) {
      console.error(`[DatabaseConfigManager] Failed to resolve config for path ${path}:`, error);
      
      // Return empty config set on error
      return {};
    }
  }

  /**
   * Get configuration for a specific database type at a path
   */
  async getConfigForPath(path: string, dbType: 'mysql' | 'redis' | 'clickhouse'): Promise<DatabaseConfig | null> {
    const configSet = await this.resolveConfig(path);
    return configSet[dbType] || null;
  }

  /**
   * Set global database configuration
   */
  async setGlobalConfig(config: DatabaseConfigSet): Promise<void> {
    if (!this.rootUri) {
      throw new Error('No workspace root set');
    }

    try {
      // Read existing global config or create new one
      let globalConfig: GlobalConfig;
      const existingConfig = await this.loadGlobalConfig();
      
      if (existingConfig) {
        // Use existing config structure, just update databases
        try {
          const globalConfigPath = vscode.Uri.joinPath(this.rootUri, 'global-config.json');
          const configData = await vscode.workspace.fs.readFile(globalConfigPath);
          globalConfig = JSON.parse(configData.toString());
        } catch {
          // Fallback to default structure
          globalConfig = {
            version: '1.0.0',
            defaultSettings: {
              timeout: 30000,
              retryCount: 3
            },
            databases: existingConfig
          };
        }
      } else {
        // Create default global config if it doesn't exist
        globalConfig = {
          version: '1.0.0',
          defaultSettings: {
            timeout: 30000,
            retryCount: 3
          },
          databases: {}
        };
      }

      // Update database configuration
      globalConfig.databases = { ...globalConfig.databases, ...config };

      // Save updated config
      const result = await this.workspaceManager.updateGlobalConfig(this.rootUri, globalConfig);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update global config');
      }

      // Invalidate cache since global config changed
      this.invalidateCache();

      // Trigger configuration change callback
      if (this.onConfigurationChanged) {
        await this.onConfigurationChanged();
      }
    } catch (error: any) {
      throw new Error(`Failed to set global config: ${error.message}`);
    }
  }

  /**
   * Set folder-level database configuration
   */
  async setFolderConfig(folderPath: string, config: DatabaseConfigSet): Promise<void> {
    try {
      const folderUri = vscode.Uri.file(folderPath);
      
      // Read existing folder config or create new one
      let folderConfig: FolderConfig;
      try {
        const configPath = vscode.Uri.joinPath(folderUri, 'folder-config.json');
        const configData = await vscode.workspace.fs.readFile(configPath);
        folderConfig = JSON.parse(configData.toString());
      } catch {
        // Create default folder config if it doesn't exist
        folderConfig = {
          description: `Folder: ${path.basename(folderPath)}`,
          inheritFromParent: true
        };
      }

      // Update database configuration
      folderConfig.databases = { ...folderConfig.databases, ...config };

      // Save updated config
      const result = await this.workspaceManager.updateFolderConfig(folderUri, folderConfig);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update folder config');
      }

      // Invalidate cache for this folder and its children
      this.invalidateCache(folderPath);

      // Trigger configuration change callback
      if (this.onConfigurationChanged) {
        await this.onConfigurationChanged();
      }
    } catch (error: any) {
      throw new Error(`Failed to set folder config: ${error.message}`);
    }
  }

  /**
   * Invalidate configuration cache
   * @param path Optional path to invalidate specific cache entries
   */
  invalidateCache(path?: string): void {
    if (path) {
      // Invalidate cache for specific path and all its children
      const pathsToRemove: string[] = [];
      for (const cacheKey of this.configCache.keys()) {
        if (cacheKey.startsWith(path)) {
          pathsToRemove.push(cacheKey);
        }
      }
      pathsToRemove.forEach(key => this.configCache.delete(key));
    } else {
      // Clear entire cache
      this.configCache.clear();
    }
  }

  /**
   * Preload configurations for performance optimization
   */
  async preloadConfigurations(): Promise<void> {
    if (!this.rootUri) {
      return;
    }

    try {
      // Load global configuration
      await this.resolveConfig(this.rootUri.fsPath);

      // Load configurations for all folders
      const workspaceTree = await this.workspaceManager.getWorkspaceTree(this.rootUri);
      if (workspaceTree.success && workspaceTree.data) {
        for (const folder of workspaceTree.data.folders) {
          await this.resolveConfig(folder.path);
        }
      }
    } catch (error: any) {
      console.error('[DatabaseConfigManager] Failed to preload configurations:', error);
    }
  }

  /**
   * Get configuration context for a path (useful for UI display)
   */
  async getConfigurationContext(path: string): Promise<ConfigurationContext> {
    const resolvedConfig = await this.resolveConfig(path);
    const inheritanceChain = await this.buildInheritanceChain(path);
    
    // Determine the level based on path
    let level: 'global' | 'folder' | 'collection' = 'global';
    if (this.rootUri && path !== this.rootUri.fsPath) {
      // Check if path is a folder or collection
      try {
        const stat = await vscode.workspace.fs.stat(vscode.Uri.file(path));
        if (stat.type === vscode.FileType.Directory) {
          level = 'folder';
        }
      } catch {
        // Path might not exist, default to folder
        level = 'folder';
      }
    }

    return {
      path,
      level,
      resolvedConfig,
      inheritanceChain
    };
  }

  /**
   * Perform the actual configuration resolution logic
   */
  private async performConfigResolution(targetPath: string): Promise<DatabaseConfigSet> {
    const mergedConfig: DatabaseConfigSet = {};

    try {
      // Start with global configuration
      const globalConfig = await this.loadGlobalConfig();
      if (globalConfig) {
        this.mergeConfigs(mergedConfig, globalConfig);
        console.log(`[DatabaseConfigManager] Loaded global config for path: ${targetPath}`);
      }

      // If target path is not the root, check for folder configurations
      if (this.rootUri && targetPath !== this.rootUri.fsPath) {
        const folderConfig = await this.loadFolderConfig(targetPath);
        if (folderConfig) {
          this.mergeConfigs(mergedConfig, folderConfig);
          console.log(`[DatabaseConfigManager] Loaded folder config for path: ${targetPath}`);
        }
      }

      console.log(`[DatabaseConfigManager] Resolved config for ${targetPath}:`, Object.keys(mergedConfig));
      return mergedConfig;
    } catch (error: any) {
      console.error(`[DatabaseConfigManager] Error during config resolution for ${targetPath}:`, error);
      throw error;
    }
  }

  /**
   * Load global database configuration
   */
  private async loadGlobalConfig(): Promise<DatabaseConfigSet | null> {
    if (!this.rootUri) {
      return null;
    }

    try {
      const globalConfigPath = vscode.Uri.joinPath(this.rootUri, 'global-config.json');
      const configData = await vscode.workspace.fs.readFile(globalConfigPath);
      const globalConfig: GlobalConfig = JSON.parse(configData.toString());
      return globalConfig.databases || {};
    } catch (error: any) {
      console.warn('[DatabaseConfigManager] Failed to load global config:', error.message);
      return null;
    }
  }

  /**
   * Load folder database configuration
   */
  private async loadFolderConfig(folderPath: string): Promise<DatabaseConfigSet | null> {
    try {
      const folderUri = vscode.Uri.file(folderPath);
      const configPath = vscode.Uri.joinPath(folderUri, 'folder-config.json');
      const configData = await vscode.workspace.fs.readFile(configPath);
      const folderConfig: FolderConfig = JSON.parse(configData.toString());
      
      // Check if folder inherits from parent (default: true)
      if (folderConfig.inheritFromParent !== false) {
        return folderConfig.databases || {};
      } else {
        // If not inheriting, only return folder-specific config
        return folderConfig.databases || {};
      }
    } catch (error: any) {
      // Folder config doesn't exist or is invalid, return null
      return null;
    }
  }

  /**
   * Merge database configurations with precedence
   * Later configs override earlier ones
   */
  private mergeConfigs(target: DatabaseConfigSet, source: DatabaseConfigSet): void {
    if (source.mysql) {
      target.mysql = { ...target.mysql, ...source.mysql };
    }
    if (source.redis) {
      target.redis = { ...target.redis, ...source.redis };
    }
    if (source.clickhouse) {
      target.clickhouse = { ...target.clickhouse, ...source.clickhouse };
    }
  }

  /**
   * Build inheritance chain for a path
   */
  private async buildInheritanceChain(targetPath: string): Promise<string[]> {
    const chain: string[] = [];
    
    // Add global level
    if (this.rootUri) {
      chain.push(this.rootUri.fsPath);
    }

    // Add folder level if different from root
    if (this.rootUri && targetPath !== this.rootUri.fsPath) {
      chain.push(targetPath);
    }

    return chain;
  }

  /**
   * Generate cache key for a path
   */
  private getCacheKey(path: string): string {
    return path.toLowerCase().replace(/\\/g, '/');
  }

  /**
   * Validate database configuration
   */
  validateConfig(config: DatabaseConfig): ConfigurationError | null {
    // Basic validation
    if (!config.host || !config.port) {
      return {
        type: 'validation',
        message: 'Host and port are required',
        details: { config }
      };
    }

    if (config.port < 1 || config.port > 65535) {
      return {
        type: 'validation',
        message: 'Port must be between 1 and 65535',
        details: { port: config.port }
      };
    }

    // Type-specific validation
    switch (config.type) {
      case 'mysql':
        if (!config.database || !config.username) {
          return {
            type: 'validation',
            message: 'Database and username are required for MySQL',
            details: { config }
          };
        }
        break;
      case 'redis':
        // Redis has minimal requirements
        break;
      case 'clickhouse':
        if (!config.database || !config.username) {
          return {
            type: 'validation',
            message: 'Database and username are required for ClickHouse',
            details: { config }
          };
        }
        break;
    }

    return null;
  }

  /**
   * Get all cached configurations (useful for debugging)
   */
  getCachedConfigurations(): Map<string, DatabaseConfigSet> {
    return new Map(this.configCache);
  }

  /**
   * Check if a path has cached configuration
   */
  hasCachedConfig(path: string): boolean {
    const cacheKey = this.getCacheKey(path);
    return this.configCache.has(cacheKey);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.configCache.size,
      keys: Array.from(this.configCache.keys())
    };
  }

  /**
   * Clear and reload all configurations
   */
  async reloadConfigurations(): Promise<void> {
    this.invalidateCache();
    await this.preloadConfigurations();
  }

  /**
   * Test database connection with timeout and proper error handling
   */
  async testConnection(config: DatabaseConfig): Promise<{ success: boolean; error?: string; details?: any }> {
    const validationError = this.validateConfig(config);
    if (validationError) {
      return {
        success: false,
        error: validationError.message,
        details: validationError.details
      };
    }

    const timeout = config.timeout || 30000;
    
    try {
      switch (config.type) {
        case 'mysql':
          return await this.testMySQLConnection(config, timeout);
        case 'redis':
          return await this.testRedisConnection(config, timeout);
        case 'clickhouse':
          return await this.testClickHouseConnection(config, timeout);
        default:
          return {
            success: false,
            error: `Unsupported database type: ${config.type}`
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Connection test failed: ${error.message}`,
        details: { originalError: error }
      };
    }
  }

  /**
   * Test MySQL connection
   */
  private async testMySQLConnection(config: DatabaseConfig, timeout: number): Promise<{ success: boolean; error?: string; details?: any }> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({
          success: false,
          error: `Connection timeout after ${timeout}ms`,
          details: { timeout }
        });
      }, timeout);

      try {
        // Use Node.js net module to test basic connectivity
        const net = require('net');
        const socket = new net.Socket();
        
        socket.setTimeout(timeout);
        
        socket.connect(config.port, config.host, () => {
          clearTimeout(timeoutId);
          socket.destroy();
          
          // Basic connectivity successful
          resolve({
            success: true,
            details: {
              host: config.host,
              port: config.port,
              connectionTime: Date.now()
            }
          });
        });

        socket.on('error', (error: any) => {
          clearTimeout(timeoutId);
          socket.destroy();
          
          let errorMessage = 'Connection failed';
          if (error.code === 'ECONNREFUSED') {
            errorMessage = `Connection refused to ${config.host}:${config.port}. Is MySQL server running?`;
          } else if (error.code === 'ETIMEDOUT') {
            errorMessage = `Connection timed out to ${config.host}:${config.port}`;
          } else if (error.code === 'ENOTFOUND') {
            errorMessage = `Host not found: ${config.host}`;
          } else {
            errorMessage = `Connection error: ${error.message}`;
          }
          
          resolve({
            success: false,
            error: errorMessage,
            details: { 
              code: error.code,
              originalError: error.message,
              host: config.host,
              port: config.port
            }
          });
        });

        socket.on('timeout', () => {
          clearTimeout(timeoutId);
          socket.destroy();
          resolve({
            success: false,
            error: `Socket timeout after ${timeout}ms`,
            details: { timeout, host: config.host, port: config.port }
          });
        });

      } catch (error: any) {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: `Failed to create connection: ${error.message}`,
          details: { originalError: error }
        });
      }
    });
  }

  /**
   * Test Redis connection
   */
  private async testRedisConnection(config: DatabaseConfig, timeout: number): Promise<{ success: boolean; error?: string; details?: any }> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({
          success: false,
          error: `Connection timeout after ${timeout}ms`,
          details: { timeout }
        });
      }, timeout);

      try {
        const net = require('net');
        const socket = new net.Socket();
        
        socket.setTimeout(timeout);
        
        socket.connect(config.port, config.host, () => {
          // Send Redis PING command to verify it's actually Redis
          socket.write('PING\r\n');
        });

        let responseReceived = false;
        socket.on('data', (data: Buffer) => {
          if (responseReceived) {
            return;
          }
          responseReceived = true;
          
          clearTimeout(timeoutId);
          socket.destroy();
          
          const response = data.toString().trim();
          if (response === '+PONG' || response.includes('PONG')) {
            resolve({
              success: true,
              details: {
                host: config.host,
                port: config.port,
                response: response,
                connectionTime: Date.now()
              }
            });
          } else {
            resolve({
              success: false,
              error: `Unexpected response from Redis server: ${response}`,
              details: { response, host: config.host, port: config.port }
            });
          }
        });

        socket.on('error', (error: any) => {
          clearTimeout(timeoutId);
          socket.destroy();
          
          let errorMessage = 'Connection failed';
          if (error.code === 'ECONNREFUSED') {
            errorMessage = `Connection refused to ${config.host}:${config.port}. Is Redis server running?`;
          } else if (error.code === 'ETIMEDOUT') {
            errorMessage = `Connection timed out to ${config.host}:${config.port}`;
          } else if (error.code === 'ENOTFOUND') {
            errorMessage = `Host not found: ${config.host}`;
          } else {
            errorMessage = `Connection error: ${error.message}`;
          }
          
          resolve({
            success: false,
            error: errorMessage,
            details: { 
              code: error.code,
              originalError: error.message,
              host: config.host,
              port: config.port
            }
          });
        });

        socket.on('timeout', () => {
          clearTimeout(timeoutId);
          socket.destroy();
          resolve({
            success: false,
            error: `Socket timeout after ${timeout}ms`,
            details: { timeout, host: config.host, port: config.port }
          });
        });

      } catch (error: any) {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: `Failed to create connection: ${error.message}`,
          details: { originalError: error }
        });
      }
    });
  }

  /**
   * Test ClickHouse connection
   */
  private async testClickHouseConnection(config: DatabaseConfig, timeout: number): Promise<{ success: boolean; error?: string; details?: any }> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({
          success: false,
          error: `Connection timeout after ${timeout}ms`,
          details: { timeout }
        });
      }, timeout);

      try {
        // ClickHouse HTTP interface test
        const http = require('http');
        const https = require('https');
        
        const protocol = config.ssl ? https : http;
        const port = config.port || (config.ssl ? 8443 : 8123);
        
        // Create basic auth header if username/password provided
        let authHeader = '';
        if (config.username) {
          const credentials = Buffer.from(`${config.username}:${config.password || ''}`).toString('base64');
          authHeader = `Basic ${credentials}`;
        }

        const options = {
          hostname: config.host,
          port: port,
          path: '/ping',
          method: 'GET',
          timeout: timeout,
          headers: authHeader ? { 'Authorization': authHeader } : {}
        };

        const req = protocol.request(options, (res: any) => {
          clearTimeout(timeoutId);
          
          let data = '';
          res.on('data', (chunk: any) => {
            data += chunk;
          });
          
          res.on('end', () => {
            if (res.statusCode === 200 && data.trim() === 'Ok.') {
              resolve({
                success: true,
                details: {
                  host: config.host,
                  port: port,
                  statusCode: res.statusCode,
                  response: data.trim(),
                  connectionTime: Date.now()
                }
              });
            } else if (res.statusCode === 401) {
              resolve({
                success: false,
                error: 'Authentication failed. Check username and password.',
                details: { statusCode: res.statusCode, response: data }
              });
            } else {
              resolve({
                success: false,
                error: `HTTP ${res.statusCode}: ${data || 'Unknown error'}`,
                details: { statusCode: res.statusCode, response: data }
              });
            }
          });
        });

        req.on('error', (error: any) => {
          clearTimeout(timeoutId);
          
          let errorMessage = 'Connection failed';
          if (error.code === 'ECONNREFUSED') {
            errorMessage = `Connection refused to ${config.host}:${port}. Is ClickHouse server running?`;
          } else if (error.code === 'ETIMEDOUT') {
            errorMessage = `Connection timed out to ${config.host}:${port}`;
          } else if (error.code === 'ENOTFOUND') {
            errorMessage = `Host not found: ${config.host}`;
          } else if (error.code === 'CERT_HAS_EXPIRED') {
            errorMessage = `SSL certificate has expired for ${config.host}`;
          } else if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
            errorMessage = `SSL certificate verification failed for ${config.host}`;
          } else {
            errorMessage = `Connection error: ${error.message}`;
          }
          
          resolve({
            success: false,
            error: errorMessage,
            details: { 
              code: error.code,
              originalError: error.message,
              host: config.host,
              port: port
            }
          });
        });

        req.on('timeout', () => {
          clearTimeout(timeoutId);
          req.destroy();
          resolve({
            success: false,
            error: `Request timeout after ${timeout}ms`,
            details: { timeout, host: config.host, port: port }
          });
        });

        req.end();

      } catch (error: any) {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: `Failed to create connection: ${error.message}`,
          details: { originalError: error }
        });
      }
    });
  }

  /**
   * Test connection with connection pooling validation
   */
  async testConnectionPool(config: DatabaseConfig): Promise<{ success: boolean; error?: string; details?: any }> {
    const maxConnections = config.maxConnections || 5;
    const connectionPromises: Promise<{ success: boolean; error?: string; details?: any }>[] = [];
    
    // Test multiple concurrent connections to validate pooling
    for (let i = 0; i < Math.min(maxConnections, 3); i++) {
      connectionPromises.push(this.testConnection(config));
    }
    
    try {
      const results = await Promise.all(connectionPromises);
      const successfulConnections = results.filter(r => r.success).length;
      const failedConnections = results.filter(r => !r.success);
      
      if (successfulConnections === results.length) {
        return {
          success: true,
          details: {
            testedConnections: results.length,
            successfulConnections,
            maxConnections: config.maxConnections
          }
        };
      } else {
        return {
          success: false,
          error: `${failedConnections.length} out of ${results.length} connections failed`,
          details: {
            testedConnections: results.length,
            successfulConnections,
            failedConnections: failedConnections.map(f => f.error),
            maxConnections: config.maxConnections
          }
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Connection pool test failed: ${error.message}`,
        details: { originalError: error }
      };
    }
  }
}