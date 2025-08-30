import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Database, Plus, Trash2, Edit, Save, X, ChevronDown, ChevronRight } from 'lucide-react';

interface DatabaseConfig {
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

interface DatabaseConfigEditorProps {
  databases: DatabaseConfig[];
  onDatabasesChange: (databases: DatabaseConfig[]) => void;
  level: 'global' | 'folder';
  title?: string;
  description?: string;
}

export const DatabaseConfigEditor = ({
  databases,
  onDatabasesChange,
  level,
  title = "Database Configurations",
  description = "Manage database connections for your test cases"
}: DatabaseConfigEditorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newDatabase, setNewDatabase] = useState<Partial<DatabaseConfig>>({});

  const getDefaultPort = (type: string): number => {
    switch (type) {
      case 'mysql': return 3306;
      case 'postgresql': return 5432;
      case 'redis': return 6379;
      case 'clickhouse': return 9000;
      default: return 3306;
    }
  };

  const handleAddDatabase = () => {
    const database: DatabaseConfig = {
      id: `db-${Date.now()}`,
      name: newDatabase.name || 'New Database',
      type: (newDatabase.type as any) || 'mysql',
      host: newDatabase.host || 'localhost',
      port: newDatabase.port || getDefaultPort(newDatabase.type || 'mysql'),
      database: newDatabase.database || '',
      username: newDatabase.username || '',
      password: newDatabase.password || '',
      timeout: newDatabase.timeout || 30000,
      maxConnections: newDatabase.maxConnections || 10,
      ssl: newDatabase.ssl || false,
      description: newDatabase.description || ''
    };

    onDatabasesChange([...databases, database]);
    setNewDatabase({});
  };

  const handleUpdateDatabase = (id: string, updates: Partial<DatabaseConfig>) => {
    const updatedDatabases = databases.map(db =>
      db.id === id ? { ...db, ...updates } : db
    );
    onDatabasesChange(updatedDatabases);
  };

  const handleDeleteDatabase = (id: string) => {
    const updatedDatabases = databases.filter(db => db.id !== id);
    onDatabasesChange(updatedDatabases);
    if (editingId === id) {
      setEditingId(null);
    }
  };

  const DatabaseForm = ({ database, isNew = false }: { database: Partial<DatabaseConfig>; isNew?: boolean }) => (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`name-${database.id}`}>Connection Name</Label>
          <Input
            id={`name-${database.id}`}
            value={database.name || ''}
            onChange={(e) => isNew 
              ? setNewDatabase({ ...newDatabase, name: e.target.value })
              : handleUpdateDatabase(database.id!, { name: e.target.value })
            }
            placeholder="My Database"
          />
        </div>
        <div>
          <Label htmlFor={`type-${database.id}`}>Database Type</Label>
          <Select
            value={database.type || 'mysql'}
            onValueChange={(value: any) => {
              const port = getDefaultPort(value);
              if (isNew) {
                setNewDatabase({ ...newDatabase, type: value, port });
              } else {
                handleUpdateDatabase(database.id!, { type: value, port });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mysql">MySQL</SelectItem>
              <SelectItem value="postgresql">PostgreSQL</SelectItem>
              <SelectItem value="redis">Redis</SelectItem>
              <SelectItem value="clickhouse">ClickHouse</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`host-${database.id}`}>Host</Label>
          <Input
            id={`host-${database.id}`}
            value={database.host || ''}
            onChange={(e) => isNew 
              ? setNewDatabase({ ...newDatabase, host: e.target.value })
              : handleUpdateDatabase(database.id!, { host: e.target.value })
            }
            placeholder="localhost"
          />
        </div>
        <div>
          <Label htmlFor={`port-${database.id}`}>Port</Label>
          <Input
            id={`port-${database.id}`}
            type="number"
            value={database.port || ''}
            onChange={(e) => isNew 
              ? setNewDatabase({ ...newDatabase, port: parseInt(e.target.value) || 0 })
              : handleUpdateDatabase(database.id!, { port: parseInt(e.target.value) || 0 })
            }
            placeholder={getDefaultPort(database.type || 'mysql').toString()}
          />
        </div>
      </div>

      {database.type !== 'redis' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`database-${database.id}`}>Database Name</Label>
            <Input
              id={`database-${database.id}`}
              value={database.database || ''}
              onChange={(e) => isNew 
                ? setNewDatabase({ ...newDatabase, database: e.target.value })
                : handleUpdateDatabase(database.id!, { database: e.target.value })
              }
              placeholder="my_database"
            />
          </div>
          <div>
            <Label htmlFor={`username-${database.id}`}>Username</Label>
            <Input
              id={`username-${database.id}`}
              value={database.username || ''}
              onChange={(e) => isNew 
                ? setNewDatabase({ ...newDatabase, username: e.target.value })
                : handleUpdateDatabase(database.id!, { username: e.target.value })
              }
              placeholder="username"
            />
          </div>
        </div>
      )}

      {database.type !== 'redis' && (
        <div>
          <Label htmlFor={`password-${database.id}`}>Password</Label>
          <Input
            id={`password-${database.id}`}
            type="password"
            value={database.password || ''}
            onChange={(e) => isNew 
              ? setNewDatabase({ ...newDatabase, password: e.target.value })
              : handleUpdateDatabase(database.id!, { password: e.target.value })
            }
            placeholder="••••••••"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`timeout-${database.id}`}>Timeout (ms)</Label>
          <Input
            id={`timeout-${database.id}`}
            type="number"
            value={database.timeout || ''}
            onChange={(e) => isNew 
              ? setNewDatabase({ ...newDatabase, timeout: parseInt(e.target.value) || 0 })
              : handleUpdateDatabase(database.id!, { timeout: parseInt(e.target.value) || 0 })
            }
            placeholder="30000"
          />
        </div>
        <div>
          <Label htmlFor={`maxConnections-${database.id}`}>Max Connections</Label>
          <Input
            id={`maxConnections-${database.id}`}
            type="number"
            value={database.maxConnections || ''}
            onChange={(e) => isNew 
              ? setNewDatabase({ ...newDatabase, maxConnections: parseInt(e.target.value) || 0 })
              : handleUpdateDatabase(database.id!, { maxConnections: parseInt(e.target.value) || 0 })
            }
            placeholder="10"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id={`ssl-${database.id}`}
          checked={database.ssl || false}
          onCheckedChange={(checked) => isNew 
            ? setNewDatabase({ ...newDatabase, ssl: checked })
            : handleUpdateDatabase(database.id!, { ssl: checked })
          }
        />
        <Label htmlFor={`ssl-${database.id}`}>Enable SSL</Label>
      </div>

      <div>
        <Label htmlFor={`description-${database.id}`}>Description</Label>
        <Textarea
          id={`description-${database.id}`}
          value={database.description || ''}
          onChange={(e) => isNew 
            ? setNewDatabase({ ...newDatabase, description: e.target.value })
            : handleUpdateDatabase(database.id!, { description: e.target.value })
          }
          placeholder="Optional description for this database connection"
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2">
        {isNew ? (
          <>
            <Button variant="outline" size="sm" onClick={() => setNewDatabase({})}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddDatabase}>
              <Save className="h-4 w-4 mr-1" />
              Add Database
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
            <Save className="h-4 w-4 mr-1" />
            Done
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="p-0 w-6 h-6">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5" />
                {title}
              </CardTitle>
              {!isExpanded && (
                <CardDescription className="text-xs">
                  {databases.length} database{databases.length !== 1 ? 's' : ''} configured • Click to manage
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {level === 'global' ? 'Global' : 'Folder'} Level
            </Badge>
            {!isExpanded && (
              <Badge variant="secondary">
                {databases.length} DB{databases.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
        {isExpanded && (
          <CardDescription>
            {description}
          </CardDescription>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Existing Databases */}
          {databases.map((database) => (
            <div key={database.id} className="border rounded-lg p-4">
              {editingId === database.id ? (
                <DatabaseForm database={database} />
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      database.type === 'mysql' ? 'bg-blue-500' :
                      database.type === 'postgresql' ? 'bg-blue-600' :
                      database.type === 'redis' ? 'bg-red-500' :
                      'bg-yellow-500'
                    }`} />
                    <div>
                      <div className="font-medium">{database.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {database.type.toUpperCase()} • {database.host}:{database.port}
                        {database.database && ` • ${database.database}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingId(database.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDatabase(database.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add New Database */}
          {Object.keys(newDatabase).length > 0 ? (
            <DatabaseForm database={newDatabase} isNew />
          ) : (
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => setNewDatabase({ type: 'mysql' })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Database Connection
            </Button>
          )}

          {databases.length > 0 && (
            <>
              <Separator />
              <div className="text-xs text-muted-foreground">
                These database connections will be available for {level === 'global' ? 'all test cases in this workspace' : 'test cases in this folder'}.
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
};