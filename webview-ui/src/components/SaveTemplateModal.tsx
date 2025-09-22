import { useState, useEffect } from 'react';
import { Save, Tag, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TestStep, StepTemplate } from '@/types';
import { StepTemplateManager } from '@/services/StepTemplateManager';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  step: TestStep | null;
  templateManager: StepTemplateManager;
  onTemplateSaved: (template: StepTemplate) => void;
}

export const SaveTemplateModal = ({
  isOpen,
  onClose,
  step,
  templateManager,
  onTemplateSaved
}: SaveTemplateModalProps) => {
  const [templateName, setTemplateName] = useState(step?.name || '');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Update template name when step changes
  useEffect(() => {
    if (step) {
      setTemplateName(step.name);
    }
  }, [step]);

  const handleSave = async () => {
    if (!templateName.trim() || !step) return;

    setIsSaving(true);
    try {
      const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      
      const template = await templateManager.saveTemplate(
        step,
        templateName.trim(),
        description.trim() || undefined,
        tagsArray.length > 0 ? tagsArray : undefined
      );

      onTemplateSaved(template);
      onClose();
      
      // Reset form
      setTemplateName(step.name);
      setDescription('');
      setTags('');
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getStepSummary = () => {
    if (!step) return 'No step selected';
    
    switch (step.type) {
      case 'sql':
        const sqlConfig = step.config as any;
        return sqlConfig.query ? sqlConfig.query.substring(0, 100) + (sqlConfig.query.length > 100 ? '...' : '') : 'No query configured';
      case 'redis':
        const redisConfig = step.config as any;
        return redisConfig.command ? redisConfig.command.substring(0, 100) + (redisConfig.command.length > 100 ? '...' : '') : 'No command configured';
      case 'api':
        const apiConfig = step.config as any;
        return `${apiConfig.method} ${apiConfig.url || 'No URL configured'}`;
      case 'clickhouse':
        const clickhouseConfig = step.config as any;
        return clickhouseConfig.query ? clickhouseConfig.query.substring(0, 100) + (clickhouseConfig.query.length > 100 ? '...' : '') : 'No query configured';
      default:
        return 'Step configuration';
    }
  };

  // Don't render if no step is selected
  if (!step) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save Step as Template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Preview */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Step Preview
            </h4>
            <div className="text-sm text-muted-foreground">
              <div className="font-medium mb-1">{step.name} ({step.type.toUpperCase()})</div>
              <div className="font-mono text-xs bg-background rounded p-2 border">
                {getStepSummary()}
              </div>
              {step.delayMs && step.delayMs > 0 && (
                <div className="mt-1 text-xs">
                  Delay: {step.delayMs}ms
                </div>
              )}
              {step.validations && step.validations.length > 0 && (
                <div className="mt-1 text-xs">
                  {step.validations.length} validation{step.validations.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>

          {/* Template Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter a descriptive name for this template"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this template does and when to use it"
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Enter tags separated by commas (e.g., authentication, database, api)"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tags help you find this template later
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!templateName.trim() || isSaving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
