import { useState, useEffect, useMemo } from 'react';
import { Search, Database, Zap, Globe, Table, Star, Clock, Tag, X, Edit, Trash2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { StepTemplate } from '@/types';
import { StepTemplateManager } from '@/services/StepTemplateManager';

interface TemplateManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateManager: StepTemplateManager;
}

export const TemplateManagementModal = ({
  isOpen,
  onClose,
  templateManager
}: TemplateManagementModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [templates, setTemplates] = useState<StepTemplate[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<StepTemplate | null>(null);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

  // Load templates when modal opens
  useEffect(() => {
    if (isOpen) {
      templateManager.initialize();
      setTemplates(templateManager.getAllTemplates());
    }
  }, [isOpen, templateManager]);

  // Filter templates based on search and tab
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = templateManager.searchTemplates(searchQuery);
    }

    // Filter by tab
    switch (selectedTab) {
      case 'recent':
        filtered = templateManager.getRecentlyUsedTemplates(50);
        break;
      case 'popular':
        filtered = templateManager.getMostUsedTemplates(50);
        break;
      case 'sql':
        filtered = filtered.filter(template => template.type === 'sql');
        break;
      case 'api':
        filtered = filtered.filter(template => template.type === 'api');
        break;
      case 'redis':
        filtered = filtered.filter(template => template.type === 'redis');
        break;
      case 'clickhouse':
        filtered = filtered.filter(template => template.type === 'clickhouse');
        break;
    }

    return filtered;
  }, [templates, searchQuery, selectedTab, templateManager]);

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'sql':
        return <Database className="h-4 w-4" />;
      case 'redis':
        return <Zap className="h-4 w-4" />;
      case 'api':
        return <Globe className="h-4 w-4" />;
      case 'clickhouse':
        return <Table className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  const getStepColor = (type: string) => {
    switch (type) {
      case 'sql':
        return 'bg-blue-600';
      case 'redis':
        return 'bg-red-600';
      case 'api':
        return 'bg-green-600';
      case 'clickhouse':
        return 'bg-yellow-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getStepSummary = (template: StepTemplate) => {
    switch (template.type) {
      case 'sql':
        const sqlConfig = template.config as any;
        return sqlConfig.query ? sqlConfig.query.substring(0, 60) + (sqlConfig.query.length > 60 ? '...' : '') : 'No query configured';
      case 'redis':
        const redisConfig = template.config as any;
        return redisConfig.command ? redisConfig.command.substring(0, 60) + (redisConfig.command.length > 60 ? '...' : '') : 'No command configured';
      case 'api':
        const apiConfig = template.config as any;
        return `${apiConfig.method} ${apiConfig.url || 'No URL configured'}`.substring(0, 80);
      case 'clickhouse':
        const clickhouseConfig = template.config as any;
        return clickhouseConfig.query ? clickhouseConfig.query.substring(0, 60) + (clickhouseConfig.query.length > 60 ? '...' : '') : 'No query configured';
      default:
        return 'Step configuration';
    }
  };

  const handleDeleteTemplate = (template: StepTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTemplate = async () => {
    if (templateToDelete) {
      await templateManager.deleteTemplate(templateToDelete.id);
      setTemplates(templateManager.getAllTemplates());
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handleClearAllTemplates = async () => {
    await templateManager.clearAllTemplates();
    setTemplates([]);
    setClearAllDialogOpen(false);
  };

  const stats = templateManager.getTemplateStats();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl w-[95vw] h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Template Management
              <Badge variant="secondary" className="ml-2">
                {stats.total} templates
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0 px-6">
            {/* Search Bar */}
            <div className="relative py-4 flex-shrink-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates by name, description, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Tabs */}
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-7 flex-shrink-0">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="recent">Recent</TabsTrigger>
                <TabsTrigger value="popular">Popular</TabsTrigger>
                <TabsTrigger value="sql">SQL</TabsTrigger>
                <TabsTrigger value="api">API</TabsTrigger>
                <TabsTrigger value="redis">Redis</TabsTrigger>
                <TabsTrigger value="clickhouse">ClickHouse</TabsTrigger>
              </TabsList>

              <TabsContent value={selectedTab} className="flex-1 mt-4 min-h-0 overflow-hidden">
                {filteredTemplates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No templates found</h3>
                    <p className="text-muted-foreground">
                      {searchQuery ? 'Try adjusting your search terms' : 'Create your first step template to get started'}
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-3 pb-4">
                      {filteredTemplates.map((template) => (
                        <Card
                          key={template.id}
                          className="p-4 hover:shadow-md transition-all duration-200 border border-border"
                        >
                          <div className="flex items-start gap-3">
                            <Badge className={`${getStepColor(template.type)} text-white flex items-center gap-1 flex-shrink-0`}>
                              {getStepIcon(template.type)}
                              <span className="uppercase text-xs">{template.type}</span>
                            </Badge>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-foreground truncate">{template.name}</h4>
                                {template.usageCount && template.usageCount > 0 && (
                                  <Badge variant="outline" className="text-xs flex-shrink-0">
                                    <Star className="h-3 w-3 mr-1" />
                                    {template.usageCount}
                                  </Badge>
                                )}
                              </div>
                              
                              {template.description && (
                                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                  {template.description}
                                </p>
                              )}
                              
                              <div className="text-xs text-muted-foreground font-mono bg-muted/50 rounded p-2 mb-2 overflow-hidden">
                                <div className="truncate" title={getStepSummary(template)}>
                                  {getStepSummary(template)}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Clock className="h-3 w-3" />
                                  {template.createdAt.toLocaleDateString()}
                                </div>
                                
                                {template.delayMs && template.delayMs > 0 && (
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <Clock className="h-3 w-3" />
                                    {template.delayMs}ms delay
                                  </div>
                                )}
                                
                                {template.validations && template.validations.length > 0 && (
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <Tag className="h-3 w-3" />
                                    {template.validations.length} validation{template.validations.length !== 1 ? 's' : ''}
                                  </div>
                                )}
                              </div>
                              
                              {template.tags && template.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {template.tags.slice(0, 5).map((tag, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {template.tags.length > 5 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{template.tags.length - 5} more
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-foreground"
                                title="Edit template"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600"
                                onClick={() => handleDeleteTemplate(template)}
                                title="Delete template"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center px-6 py-4 border-t flex-shrink-0 bg-background">
            <div className="text-sm text-muted-foreground">
              {stats.total} templates • {stats.byType.sql || 0} SQL • {stats.byType.api || 0} API • {stats.byType.redis || 0} Redis • {stats.byType.clickhouse || 0} ClickHouse
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setClearAllDialogOpen(true)}
                disabled={stats.total === 0}
              >
                Clear All
              </Button>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the template "{templateToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTemplate} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Templates</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all {stats.total} templates? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAllTemplates} className="bg-red-600 hover:bg-red-700">
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};