package com.qato.config;

/**
 * Database configuration class that matches the TypeScript DatabaseConfig interface
 */
public class DatabaseConfig {
    private String id;
    private String name;
    private String type; // 'mysql', 'redis', 'clickhouse'
    private String host;
    private int port;
    private String database;
    private String username;
    private String password;
    private Integer timeout;
    private Integer maxConnections;
    private Boolean ssl;
    private String description;

    // Default constructor
    public DatabaseConfig() {}

    // Constructor with required fields
    public DatabaseConfig(String id, String name, String type, String host, int port) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.host = host;
        this.port = port;
    }

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getHost() { return host; }
    public void setHost(String host) { this.host = host; }

    public int getPort() { return port; }
    public void setPort(int port) { this.port = port; }

    public String getDatabase() { return database; }
    public void setDatabase(String database) { this.database = database; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public Integer getTimeout() { return timeout; }
    public void setTimeout(Integer timeout) { this.timeout = timeout; }

    public Integer getMaxConnections() { return maxConnections; }
    public void setMaxConnections(Integer maxConnections) { this.maxConnections = maxConnections; }

    public Boolean getSsl() { return ssl; }
    public void setSsl(Boolean ssl) { this.ssl = ssl; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    @Override
    public String toString() {
        return "DatabaseConfig{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", type='" + type + '\'' +
                ", host='" + host + '\'' +
                ", port=" + port +
                ", database='" + database + '\'' +
                ", username='" + username + '\'' +
                ", timeout=" + timeout +
                ", maxConnections=" + maxConnections +
                ", ssl=" + ssl +
                ", description='" + description + '\'' +
                '}';
    }
}