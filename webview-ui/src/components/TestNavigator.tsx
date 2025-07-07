import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FileText, Plus, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Folder as FolderType, Collection as CollectionType, TestCase as TestCaseType } from '@/types';

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

  if (isCollapsed) {
    return (
      <div className="w-12 bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out">
        <Button variant="ghost" size="sm" onClick={onToggleCollapse} className="m-2 text-muted-foreground hover:text-foreground transition-colors duration-200">
          <Menu className="h-4 w-4"/>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Test Navigator</h2>
        <Button variant="ghost" size="sm" onClick={onToggleCollapse} className="text-muted-foreground hover:text-foreground transition-colors duration-200">
          <X className="h-4 w-4"/>
        </Button>
      </div>

      {/* Add Folder Button */}
      <div className="p-2">
        <Button variant="outline" className="w-full" onClick={() => handleRequestInput({
            type: 'addFolder',
            prompt: "Enter new folder name:"
        })}>
          <Plus className="h-4 w-4 mr-2" /> Add Folder
        </Button>
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto p-2">
        {folders.map((folder) => (
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
      </div>
    </div>
  );
};
//# sourceMappingURL=Navigator.js.map