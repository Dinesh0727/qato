import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Folder, FileText, Plus, Menu, X, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FolderSettingsDialog } from '@/components/FolderSettingsDialog';
import { Folder as FolderType, TestCase as TestCaseType } from '@/types';

// Define the structure of the VS Code API object
interface VsCodeApi {
  postMessage(message: { command: string; payload: unknown }): void;
}

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

interface FolderConfig {
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

interface WorkspaceFolder {
  id: string;
  name: string;
  path: string;
  config?: FolderConfig;
}

interface TestNavigatorProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  folders: FolderType[];
  workspaceFolders?: WorkspaceFolder[];
  selectedTestCase: TestCaseType | null;
  onSelectTestCase: (testCase: TestCaseType) => void;
  onDeleteTestCase?: (testCase: TestCaseType) => void;
  onDeleteCollection?: (folderId: string, collectionId: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onUpdateFolderConfig?: (folderPath: string, config: FolderConfig) => void;
  vscode: VsCodeApi;
}

export const TestNavigator = ({
  isCollapsed,
  onToggleCollapse,
  folders,
  workspaceFolders,
  selectedTestCase,
  onSelectTestCase,
  onDeleteTestCase,
  onDeleteCollection,
  onDeleteFolder,
  onUpdateFolderConfig,
  vscode,
}: TestNavigatorProps) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(folders.map(f => f.id)));
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set(folders.flatMap(f => f.collections.map(c => c.id))));
  const [searchQuery, setSearchQuery] = useState('');

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => { }
  });

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const toggleCollection = (collectionId: string) => {
    const newExpanded = new Set(expandedCollections);
    if (newExpanded.has(collectionId)) {
      newExpanded.delete(collectionId);
    } else {
      newExpanded.add(collectionId);
    }
    setExpandedCollections(newExpanded);
  };

  const handleRequestInput = (context: { type: string; prompt: string; folderId?: string; collectionId?: string }) => {
    vscode.postMessage({
      command: 'showInputBox',
      payload: {
        prompt: context.prompt,
        context: context // Pass the whole context object
      }
    });
  };

  // Filter folders and test cases based on search query
  const filteredFolders = useMemo(() => {
    if (!searchQuery.trim()) return folders;

    return folders.map(folder => ({
      ...folder,
      collections: folder.collections.map(collection => ({
        ...collection,
        testCases: collection.testCases.filter(testCase =>
          testCase.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(collection => collection.testCases.length > 0)
    })).filter(folder => folder.collections.length > 0);
  }, [folders, searchQuery]);

  if (isCollapsed) {
    return (
      <div className="w-12 bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out h-screen">
        <Button variant="ghost" size="sm" onClick={onToggleCollapse} className="m-2 text-muted-foreground hover:text-foreground transition-colors duration-200 h-6 w-6 p-0">
          <Menu className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out h-screen">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="font-medium text-foreground text-sm">Test Navigator</h2>
          <p className="text-xs text-muted-foreground/70">Organize your test cases</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onToggleCollapse} className="text-muted-foreground hover:text-foreground transition-colors duration-200 h-6 w-6 p-0">
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Search Bar */}
      <div className="p-2 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search test cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-7 text-xs"
          />
        </div>
      </div>

      {/* Add Folder Button - Always Visible */}
      <div className="px-2 pb-2 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs font-medium bg-primary/5 hover:bg-primary/10 border-primary/20 hover:border-primary/30 transition-all"
          onClick={() => handleRequestInput({
            type: 'addFolder',
            prompt: "Enter new folder name:"
          })}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          New Folder
        </Button>
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
        {folders.length === 0 && !searchQuery.trim() && (
          <div className="text-center py-8 px-4">
            <Folder className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground mb-1">No folders yet</p>
            <p className="text-xs text-muted-foreground mb-4">Create your first folder to organize test cases</p>
            <Button
              variant="outline"
              size="sm"
              className="bg-primary/5 hover:bg-primary/10 border-primary/20"
              onClick={() => handleRequestInput({
                type: 'addFolder',
                prompt: "Enter new folder name:"
              })}
            >
              <Plus className="h-3 w-3 mr-1" /> Create Folder
            </Button>
          </div>
        )}
        {filteredFolders.map((folder) => (
          <div key={folder.id} className="mb-2">
            {/* Folder */}
            <div className="flex items-center group hover:bg-accent rounded px-2 py-1.5 transition-colors duration-200">
              <Button variant="ghost" size="sm" onClick={() => toggleFolder(folder.id)} className="p-0 w-6 h-6 text-muted-foreground hover:text-foreground transition-colors duration-200">
                {expandedFolders.has(folder.id) ? (<ChevronDown className="h-3 w-3 transition-transform duration-200" />) : (<ChevronRight className="h-3 w-3 transition-transform duration-200" />)}
              </Button>
              <Folder className="h-4 w-4 text-blue-500 mx-2" />
              <span className="text-sm text-foreground flex-1 font-medium">{folder.name}</span>
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 mr-1">{folder.collections.length}</Badge>
              <div className="flex items-center gap-1">
                {workspaceFolders && onUpdateFolderConfig && (() => {
                  const workspaceFolder = workspaceFolders.find(wf => wf.id === folder.id);
                  if (workspaceFolder) {
                    return (
                      <FolderSettingsDialog
                        folderName={workspaceFolder.name}
                        folderPath={workspaceFolder.path}
                        folderConfig={workspaceFolder.config || { databases: [] }}
                        onUpdateFolderConfig={onUpdateFolderConfig}
                      />
                    );
                  }
                  return null;
                })()}
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 w-6 h-6 text-primary hover:text-primary hover:bg-primary/10"
                  title="Add Collection"
                  onClick={() => handleRequestInput({
                    type: 'addCollection',
                    prompt: "Enter new collection name:",
                    folderId: folder.id
                  })}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                {onDeleteFolder && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 w-6 h-6 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    title="Delete Folder"
                    onClick={(e) => {
                      e.stopPropagation();
                      const testCaseCount = folder.collections.reduce((acc, c) => acc + c.testCases.length, 0);
                      setConfirmDialog({
                        open: true,
                        title: 'Delete Folder',
                        description: `Are you sure you want to delete "${folder.name}"? This will permanently delete ${folder.collections.length} collection(s) and ${testCaseCount} test case(s). This action cannot be undone.`,
                        onConfirm: () => {
                          onDeleteFolder(folder.id);
                          setConfirmDialog(prev => ({ ...prev, open: false }));
                        }
                      });
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Collections */}
            <div className={`ml-4 overflow-hidden transition-all duration-300 ease-in-out ${expandedFolders.has(folder.id) ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
              {folder.collections.length === 0 && expandedFolders.has(folder.id) && (
                <div className="text-center py-4 px-2">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground mb-2">No collections in this folder</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs bg-primary/5 hover:bg-primary/10 border-primary/20"
                    onClick={() => handleRequestInput({
                      type: 'addCollection',
                      prompt: "Enter new collection name:",
                      folderId: folder.id
                    })}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Collection
                  </Button>
                </div>
              )}
              {folder.collections.map((collection) => (
                <div key={collection.id} className="mb-1">
                  <div className="flex items-center group hover:bg-accent rounded px-2 py-1.5 transition-colors duration-200">
                    <Button variant="ghost" size="sm" onClick={() => toggleCollection(collection.id)} className="p-0 w-6 h-6 text-muted-foreground hover:text-foreground transition-colors duration-200">
                      {expandedCollections.has(collection.id) ? (<ChevronDown className="h-3 w-3 transition-transform duration-200" />) : (<ChevronRight className="h-3 w-3 transition-transform duration-200" />)}
                    </Button>
                    <FileText className="h-4 w-4 text-green-500 mx-2" />
                    <span className="text-sm text-foreground flex-1">{collection.name}</span>
                    <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 mr-1">{collection.testCases.length}</Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0 w-6 h-6 text-primary hover:text-primary hover:bg-primary/10"
                        title="Add Test Case"
                        onClick={() => handleRequestInput({
                          type: 'addTestCase',
                          prompt: "Enter new test case name:",
                          collectionId: collection.id
                        })}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      {onDeleteCollection && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-0 w-6 h-6 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          title="Delete Collection"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDialog({
                              open: true,
                              title: 'Delete Collection',
                              description: `Are you sure you want to delete "${collection.name}"? This will permanently delete ${collection.testCases.length} test case(s). This action cannot be undone.`,
                              onConfirm: () => {
                                onDeleteCollection(folder.id, collection.id);
                                setConfirmDialog(prev => ({ ...prev, open: false }));
                              }
                            });
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Test Cases */}
                  <div className={`ml-4 overflow-hidden transition-all duration-300 ease-in-out ${expandedCollections.has(collection.id) ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
                    {collection.testCases.length === 0 && expandedCollections.has(collection.id) && (
                      <div className="text-center py-3 px-2">
                        <p className="text-xs text-muted-foreground mb-2">No test cases yet</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs bg-primary/5 hover:bg-primary/10 border-primary/20"
                          onClick={() => handleRequestInput({
                            type: 'addTestCase',
                            prompt: "Enter new test case name:",
                            collectionId: collection.id
                          })}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Test Case
                        </Button>
                      </div>
                    )}
                    {collection.testCases.map((testCase) => (
                      <div key={testCase.id} className={`flex items-center group hover:bg-accent rounded px-2 py-1 cursor-pointer transition-all duration-200 ${selectedTestCase?.id === testCase.id ? 'bg-primary/10 border border-primary/30' : ''}`}>
                        <div className="w-6" />
                        <div className="h-2 w-2 bg-orange-500 rounded-full mx-2" />
                        <span className="text-sm text-foreground flex-1" onClick={() => onSelectTestCase(testCase)}>{testCase.name}</span>
                        {onDeleteTestCase && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 p-0 w-6 h-6 transition-opacity duration-200 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDialog({
                                open: true,
                                title: 'Delete Test Case',
                                description: `Are you sure you want to delete "${testCase.name}"? This action cannot be undone.`,
                                onConfirm: () => {
                                  onDeleteTestCase(testCase);
                                  setConfirmDialog(prev => ({ ...prev, open: false }));
                                }
                              });
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filteredFolders.length === 0 && searchQuery.trim() && (
          <div className="text-center py-4">
            <div className="text-2xl mb-2">🔍</div>
            <p className="text-xs text-muted-foreground">No test cases found</p>
            <p className="text-xs text-muted-foreground/70">Try a different search term</p>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDialog.onConfirm}
        variant="destructive"
      />
    </div>
  );
};
//# sourceMappingURL=Navigator.js.map