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
  
  // Show type-specific count in badge if filtering by type
  const displayCount = stepType 
    ? (stats.byType[stepType] || 0)
    : stats.total;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[90vw] h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Step Templates
            {stepType && (
              <Badge className={`${getStepColor(stepType)} text-white ml-2`}>
                {getStepIcon(stepType)}
                <span className="uppercase text-xs ml-1">{stepType}</span>
              </Badge>
            )}
            <Badge variant="secondary" className="ml-2">
              {displayCount} template{displayCount !== 1 ? 's' : ''}
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

          {/* Tabs - only show if not filtering by stepType */}
          {!stepType && (
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-6 flex-shrink-0">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="recent">Recent</TabsTrigger>
                <TabsTrigger value="popular">Popular</TabsTrigger>
                <TabsTrigger value="sql">SQL</TabsTrigger>
                <TabsTrigger value="api">API</TabsTrigger>
                <TabsTrigger value="redis">Redis</TabsTrigger>
              </TabsList>

              <TabsContent value={selectedTab} className="flex-1 mt-4 min-h-0 overflow-hidden">
                <TemplateList 
                  filteredTemplates={filteredTemplates}
                  searchQuery={searchQuery}
                  onSelectTemplate={handleSelectTemplate}
                  getStepIcon={getStepIcon}
                  getStepColor={getStepColor}
                  getStepSummary={getStepSummary}
                />
              </TabsContent>
            </Tabs>
          )}

          {/* Direct template list when filtering by stepType */}
          {stepType && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <TemplateList 
                filteredTemplates={filteredTemplates}
                searchQuery={searchQuery}
                onSelectTemplate={handleSelectTemplate}
                getStepIcon={getStepIcon}
                getStepColor={getStepColor}
                getStepSummary={getStepSummary}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t flex-shrink-0 bg-background">
          <div className="text-sm text-muted-foreground">
            {stepType ? (
              `${displayCount} ${stepType.toUpperCase()} template${displayCount !== 1 ? 's' : ''} available`
            ) : (
              `${stats.total} templates • ${stats.byType.sql || 0} SQL • ${stats.byType.api || 0} API • ${stats.byType.redis || 0} Redis • ${stats.byType.clickhouse || 0} ClickHouse`
            )}
          </div>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Extracted template list component to reduce duplication
interface TemplateListProps {
  filteredTemplates: StepTemplate[];
  searchQuery: string;
  onSelectTemplate: (template: StepTemplate) => void;
  getStepIcon: (type: string) => JSX.Element;
  getStepColor: (type: string) => string;
  getStepSummary: (template: StepTemplate) => string;
}

const TemplateList = ({
  filteredTemplates,
  searchQuery,
  onSelectTemplate,
  getStepIcon,
  getStepColor,
  getStepSummary
}: TemplateListProps) => {
  if (filteredTemplates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-8">
        <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No templates found</h3>
        <p className="text-muted-foreground max-w-md">
          {searchQuery ? 'Try adjusting your search terms or browse different categories' : 'Create your first step template to get started'}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full pr-4">
      <div className="space-y-3 pb-4">
        {filteredTemplates.map((template) => (
          <Card
            key={template.id}
            className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/50 border border-border"
            onClick={() => onSelectTemplate(template)}
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
                    {template.tags.slice(0, 4).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {template.tags.length > 4 && (
                      <Badge variant="secondary" className="text-xs">
                        +{template.tags.length - 4} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Visual indicator for clickable card */}
              <div className="flex-shrink-0 text-muted-foreground/50">
                <div className="w-2 h-2 rounded-full bg-primary/30"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};