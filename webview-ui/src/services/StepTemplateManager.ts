import { StepTemplate, TestStep } from '@/types';

// Declare vscode as a global variable for webview context
declare global {
  const vscode: {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
  };
}

export class StepTemplateManager {
  private templates: Map<string, StepTemplate> = new Map();
  private isInitialized = false;
  private vscode: any;

  constructor() {
    // Try to capture the injected VS Code API if available.
    // In VS Code webviews, the extension injects `const vscode = acquireVsCodeApi();`
    // Note: `const` doesn't attach to window/globalThis, so check the global identifier directly.
    try {
      // @ts-ignore - allow referencing global `vscode` if present
      if (typeof vscode !== 'undefined') {
        // @ts-ignore
        this.vscode = vscode;
      } else if (typeof window !== 'undefined' && (globalThis as any).vscode) {
        this.vscode = (globalThis as any).vscode;
      }
    } catch {
      // Ignore - we'll try again lazily when needed
    }
  }

  private ensureApi(): void {
    if (this.vscode) return;
    try {
      // @ts-ignore
      if (typeof vscode !== 'undefined') {
        // @ts-ignore
        this.vscode = vscode;
      } else if (typeof window !== 'undefined' && (globalThis as any).vscode) {
        this.vscode = (globalThis as any).vscode;
      }
    } catch {
      // no-op
    }
  }

  /**
   * Save a step as a template
   */
  async saveTemplate(step: TestStep, templateName: string, description?: string, tags?: string[]): Promise<StepTemplate> {
    const template: StepTemplate = {
      id: `template-${Date.now()}`,
      name: templateName,
      description,
      type: step.type,
      config: { ...step.config },
      validations: step.validations ? [...step.validations] : [],
      delayMs: step.delayMs,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: tags || [],
      usageCount: 0
    };

    this.templates.set(template.id, template);
    await this.saveToBackend(template);
    return template;
  }

  /**
   * Get all templates
   */
  getAllTemplates(): StepTemplate[] {
    return Array.from(this.templates.values()).sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  /**
   * Get templates by type
   */
  getTemplatesByType(type: 'api' | 'sql' | 'redis' | 'clickhouse'): StepTemplate[] {
    return this.getAllTemplates().filter(template => template.type === type);
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): StepTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Create a new step from a template
   */
  createStepFromTemplate(template: StepTemplate, order: number): TestStep {
    // Increment usage count
    const updatedTemplate = {
      ...template,
      usageCount: (template.usageCount || 0) + 1,
      updatedAt: new Date()
    };
    this.templates.set(template.id, updatedTemplate);
    this.saveToStorage();

    // Create new step with unique ID
    const newStep: TestStep = {
      id: `step-${Date.now()}`,
      name: template.name,
      type: template.type,
      delayMs: template.delayMs || 0,
      order,
      config: { ...template.config },
      validations: template.validations ? template.validations.map(v => ({
        ...v,
        id: `validation-${Date.now()}-${Math.random()}`,
        stepId: `step-${Date.now()}` // Will be updated when step is added to test case
      })) : []
    };

    return newStep;
  }

  /**
   * Update a template
   */
  async updateTemplate(id: string, updates: Partial<StepTemplate>): Promise<StepTemplate | null> {
    const template = this.templates.get(id);
    if (!template) return null;

    const updatedTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date()
    };

    this.templates.set(id, updatedTemplate);
    await this.updateInBackend(id, updates);
    return updatedTemplate;
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<boolean> {
    const deleted = this.templates.delete(id);
    if (deleted) {
      await this.deleteFromBackend(id);
    }
    return deleted;
  }

  /**
   * Search templates by name, description, or tags
   */
  searchTemplates(query: string): StepTemplate[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getAllTemplates().filter(template => 
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description?.toLowerCase().includes(lowercaseQuery) ||
      template.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * Get most used templates
   */
  getMostUsedTemplates(limit: number = 5): StepTemplate[] {
    return this.getAllTemplates()
      .filter(template => (template.usageCount || 0) > 0)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, limit);
  }

  /**
   * Get recently used templates
   */
  getRecentlyUsedTemplates(limit: number = 5): StepTemplate[] {
    return this.getAllTemplates()
      .filter(template => (template.usageCount || 0) > 0)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Initialize templates from backend
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      this.ensureApi();
      if (this.vscode) {
        console.log("Initializing StepTemplateManager");
        this.vscode.postMessage({
          command: 'loadStepTemplates',
          payload: {}
        });
        this.isInitialized = true;
      } else {
        // Silently ignore if API not yet available; caller can re-initialize later
      }
    } catch (error) {
      console.error('Failed to initialize templates:', error);
    }
  }

  /**
   * Load templates from backend response
   */
  loadTemplates(templates: StepTemplate[]): void {
    this.templates.clear();
    templates.forEach(template => {
      // Convert date strings back to Date objects
      template.createdAt = new Date(template.createdAt);
      template.updatedAt = new Date(template.updatedAt);
      this.templates.set(template.id, template);
    });
  }

  /**
   * Save template to backend
   */
  private async saveToBackend(template: StepTemplate): Promise<void> {
    try {
      this.ensureApi();
      if (this.vscode) {
        this.vscode.postMessage({
          command: 'saveStepTemplate',
          payload: { template }
        });
      } else {
        console.warn('VS Code API not yet available - skipping saveStepTemplate');
      }
    } catch (error) {
      console.error('Failed to save template to backend:', error);
    }
  }

  /**
   * Update template in backend
   */
  private async updateInBackend(id: string, updates: Partial<StepTemplate>): Promise<void> {
    try {
      this.ensureApi();
      if (this.vscode) {
        this.vscode.postMessage({
          command: 'updateStepTemplate',
          payload: { templateId: id, updates }
        });
      } else {
        console.warn('VS Code API not yet available - skipping updateStepTemplate');
      }
    } catch (error) {
      console.error('Failed to update template in backend:', error);
    }
  }

  /**
   * Delete template from backend
   */
  private async deleteFromBackend(id: string): Promise<void> {
    try {
      this.ensureApi();
      if (this.vscode) {
        this.vscode.postMessage({
          command: 'deleteStepTemplate',
          payload: { templateId: id }
        });
      } else {
        console.warn('VS Code API not yet available - skipping deleteStepTemplate');
      }
    } catch (error) {
      console.error('Failed to delete template from backend:', error);
    }
  }

  /**
   * Clear all templates
   */
  async clearAllTemplates(): Promise<void> {
    this.templates.clear();
    try {
      this.ensureApi();
      if (this.vscode) {
        this.vscode.postMessage({
          command: 'clearAllTemplates',
          payload: {}
        });
      } else {
        console.warn('VS Code API not yet available - skipping clearAllTemplates');
      }
    } catch (error) {
      console.error('Failed to clear templates:', error);
    }
  }

  /**
   * Get template statistics
   */
  getTemplateStats(): {
    total: number;
    byType: Record<string, number>;
    mostUsed: StepTemplate | null;
    recentlyCreated: StepTemplate | null;
  } {
    const allTemplates = this.getAllTemplates();
    const byType = allTemplates.reduce((acc, template) => {
      acc[template.type] = (acc[template.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostUsed = allTemplates
      .filter(t => (t.usageCount || 0) > 0)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))[0] || null;

    const recentlyCreated = allTemplates
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] || null;

    return {
      total: allTemplates.length,
      byType,
      mostUsed,
      recentlyCreated
    };
  }

  /**
   * Save to storage (fallback method, not implemented in original)
   */
  private saveToStorage(): void {}
}

// Singleton instance to ensure a single source of truth across the UI
export const stepTemplateManager = new StepTemplateManager();