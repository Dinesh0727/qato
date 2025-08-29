import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Folder, FileText, Plus, Menu, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Folder as FolderType, TestCase as TestCaseType } from '@/types';

// Define the structure of the VS Code API object
interface VsCodeApi {
  postMessage(message: { command: string; payload: unknown }): void;
}

interface VsCodeApi {
  postMessage(message: { command: string; payload: unknown }): void;
}

interface TestNavigatorProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  // This was missing from your props, but is used in the component. Add it back.
  folders: FolderType[]; 
  selectedTestCase: TestCaseType | null;
  onSelectTestCase: (testCase: TestCaseType) => void;
  vscode: VsCodeApi;
}

export const TestNavigator = ({
  isCollapsed,
  onToggleCollapse,
  folders,
  selectedTestCase,
  onSelectTestCase,
  vscode,
}: TestNavigatorProps) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(folders.map(f => f.id)));
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set(folders.flatMap(f => f.collections.map(c => c.id))));
  const [searchQuery, setSearchQuery] = useState('');

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
          <Menu className="h-3 w-3"/>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out h-screen">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between flex-shrink-0">
        <h2 className="font-medium text-foreground text-sm">Test Navigator</h2>
        <Button variant="ghost" size="sm" onClick={onToggleCollapse} className="text-muted-foreground hover:text-foreground transition-colors duration-200 h-6 w-6 p-0">
          <X className="h-3 w-3"/>
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

      {/* Add Folder Button */}
      <div className="px-2 pb-2 flex-shrink-0">
        <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => handleRequestInput({
            type: 'addFolder',
            prompt: "Enter new folder name:"
        })}>
          <Plus className="h-3 w-3 mr-1" /> Add Folder
        </Button>
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
        {filteredFolders.map((folder) => (
          <div key={folder.id} className="mb-2">
            {/* Folder */}
            <div className="flex items-center group hover:bg-accent rounded px-2 py-1 transition-colors duration-200">
              <Button variant="ghost" size="sm" onClick={() => toggleFolder(folder.id)} className="p-0 w-6 h-6 text-muted-foreground hover:text-foreground transition-colors duration-200">
                {expandedFolders.has(folder.id) ? (<ChevronDown className="h-3 w-3 transition-transform duration-200"/>) : (<ChevronRight className="h-3 w-3 transition-transform duration-200"/>)}
              </Button>
              <Folder className="h-4 w-4 text-blue-500 mx-2"/>
              <span className="text-sm text-foreground flex-1">{folder.name}</span>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 p-0 w-6 h-6 transition-opacity duration-200" onClick={() => handleRequestInput({
                type: 'addCollection',
                prompt: "Enter new collection name:",
                folderId: folder.id
              })}>
                <Plus className="h-3 w-3"/>
              </Button>
            </div>

            {/* Collections */}
            <div className={`ml-4 overflow-hidden transition-all duration-300 ease-in-out ${expandedFolders.has(folder.id) ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
              {folder.collections.map((collection) => (
                <div key={collection.id} className="mb-1">
                  <div className="flex items-center group hover:bg-accent rounded px-2 py-1 transition-colors duration-200">
                    <Button variant="ghost" size="sm" onClick={() => toggleCollection(collection.id)} className="p-0 w-6 h-6 text-muted-foreground hover:text-foreground transition-colors duration-200">
                      {expandedCollections.has(collection.id) ? (<ChevronDown className="h-3 w-3 transition-transform duration-200"/>) : (<ChevronRight className="h-3 w-3 transition-transform duration-200"/>)}
                    </Button>
                    <FileText className="h-4 w-4 text-green-500 mx-2"/>
                    <span className="text-sm text-foreground flex-1">{collection.name}</span>
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 p-0 w-6 h-6 transition-opacity duration-200" onClick={() => handleRequestInput({
                      type: 'addTestCase',
                      prompt: "Enter new test case name:",
                      collectionId: collection.id
                    })}>
                      <Plus className="h-3 w-3"/>
                    </Button>
                  </div>

                  {/* Test Cases */}
                  <div className={`ml-4 overflow-hidden transition-all duration-300 ease-in-out ${expandedCollections.has(collection.id) ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
                    {collection.testCases.map((testCase) => (
                      <div key={testCase.id} className={`flex items-center hover:bg-accent rounded px-2 py-1 cursor-pointer transition-all duration-200 ${selectedTestCase?.id === testCase.id ? 'bg-primary/10 border border-primary/30' : ''}`} onClick={() => onSelectTestCase(testCase)}>
                        <div className="w-6"/>
                        <div className="h-2 w-2 bg-orange-500 rounded-full mx-2"/>
                        <span className="text-sm text-foreground">{testCase.name}</span>
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
    </div>
  );
};
//# sourceMappingURL=Navigator.js.map