import { useState, useEffect, useMemo } from 'react';
import { Search, Database, Zap, Globe, Table, Star, Clock, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StepTemplate, TestStep } from '@/types';
import { StepTemplateManager } from '@/services/StepTemplateManager';

interface StepTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: StepTemplate) => void;
  stepType?: 'api' | 'sql' | 'redis' | 'clickhouse';
  templateManager: StepTemplateManager;
}

export const StepTemplateModal = ({
  isOpen,
  onClose,
  onSelectTemplate,
  stepType,
  templateManager
}: StepTemplateModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [templates, setTemplates] = useState<StepTemplate[]>([]);

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

    // Filter by step type if specified
    if (stepType) {
      filtered = filtered.filter(template => template.type === stepType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = templateManager.searchTemplates(searchQuery);
      if (stepType) {
        filtered = filtered.filter(template => template.type === stepType);
      }
    }

    // Filter by tab
    switch (selectedTab) {
      case 'recent':
        filtered = templateManager.getRecentlyUsedTemplates(20);
        if (stepType) {
          filtered = filtered.filter(template => template.type === stepType);
        }
        break;
      case 'popular':
        filtered = templateManager.getMostUsedTemplates(20);
        if (stepType) {
          filtered = filtered.filter(template => template.type === stepType);
        }
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
  }, [templates, searchQuery, selectedTab, stepType, templateManager]);

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

  const handleSelectTemplate = (template: StepTemplate) => {
    onSelectTemplate(template);
    onClose();
  };

  const stats = templateManager.getTemplateStats();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Step Templates
            <Badge variant="secondary" className="ml-2">
              {stats.total} templates
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Search Bar */}
          <div className="relative mb-4">
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
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="popular">Popular</TabsTrigger>
              <TabsTrigger value="sql">SQL</TabsTrigger>
              <TabsTrigger value="api">API</TabsTrigger>
              <TabsTrigger value="redis">Redis</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="flex-1 mt-4 min-h-0">
              <ScrollArea className="h-full">
                {filteredTemplates.length === 0 ? (
                  <div className="text-center py-8">
                    <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No templates found</h3>
                    <p className="text-muted-foreground">
                      {searchQuery ? 'Try adjusting your search terms' : 'Create your first step template to get started'}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {filteredTemplates.map((template) => (
                      <Card
                        key={template.id}
                        className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/50"
                        onClick={() => handleSelectTemplate(template)}
                      >
                        <div className="flex items-start gap-3">
                          <Badge className={`${getStepColor(template.type)} text-white flex items-center gap-1`}>
                            {getStepIcon(template.type)}
                            <span className="uppercase text-xs">{template.type}</span>
                          </Badge>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-foreground truncate">{template.name}</h4>
                              {template.usageCount && template.usageCount > 0 && (
                                <Badge variant="outline" className="text-xs">
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
                            
                            <div className="text-xs text-muted-foreground font-mono bg-muted/50 rounded p-2 mb-2">
                              {getStepSummary(template)}
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {template.createdAt.toLocaleDateString()}
                              </div>
                              
                              {template.delayMs && template.delayMs > 0 && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {template.delayMs}ms delay
                                </div>
                              )}
                              
                              {template.validations && template.validations.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Tag className="h-3 w-3" />
                                  {template.validations.length} validation{template.validations.length !== 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                            
                            {template.tags && template.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {template.tags.map((tag, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
