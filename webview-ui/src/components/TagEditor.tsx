import { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Tag, Plus, Hash, ChevronDown, ChevronRight, Edit3 } from 'lucide-react';

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  maxTags?: number;
  allowCustomTags?: boolean;
  disabled?: boolean;
  defaultCollapsed?: boolean;
}

export const TagEditor = ({ 
  tags = [], 
  onChange, 
  suggestions = ['regression', 'smoke', 'smsfallback', 'critical', 'e2e'], 
  placeholder = 'Add tags...',
  maxTags = 10,
  allowCustomTags = true,
  disabled = false,
  defaultCollapsed = true
}: TagEditorProps) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [inputValue, setInputValue] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, '-');

  // Auto-expand when editing starts
  const handleStartEditing = () => {
    setIsCollapsed(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Filter suggestions based on input and existing tags
  useEffect(() => {
    if (!inputValue || !suggestions.length) {
      setFilteredSuggestions([]);
      return;
    }

    const filtered = suggestions.filter(suggestion => 
      suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
      !tags.includes(normalize(suggestion))
    ).slice(0, 5);

    setFilteredSuggestions(filtered);
  }, [inputValue, suggestions, tags]);

  const addTags = (newTags: string[]) => {
    if (disabled) return;
    
    const normalized = newTags
      .map(tag => normalize(tag))
      .filter(tag => tag && tag.length > 0)
      .filter(tag => !tags.includes(tag));

    if (normalized.length === 0) return;

    if (maxTags && tags.length + normalized.length > maxTags) {
      const remainingSlots = maxTags - tags.length;
      if (remainingSlots <= 0) return;
      normalized.splice(remainingSlots);
    }

    const updatedTags = [...tags, ...normalized];
    onChange(updatedTags);
  };

  const removeTag = (tagToRemove: string, e?: React.MouseEvent) => {
    if (disabled) return;
    e?.stopPropagation();
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTags(inputValue.split(/[,\s]+/));
        setInputValue('');
        setShowSuggestions(false);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      e.preventDefault();
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'Escape') {
      setInputValue('');
      setShowSuggestions(false);
      setIsCollapsed(true);
    }
  };

  const handleInputFocus = () => {
    setIsInputFocused(true);
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      setIsInputFocused(false);
      setShowSuggestions(false);
      if (inputValue.trim() && allowCustomTags) {
        addTags(inputValue.split(/[,\s]+/));
        setInputValue('');
      }
    }, 200);
  };

  const handleSuggestionClick = (suggestion: string) => {
    addTags([suggestion]);
    setInputValue('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleQuickAddClick = (suggestion: string) => {
    if (!tags.includes(normalize(suggestion))) {
      addTags([suggestion]);
    }
  };

  const canAddMoreTags = !maxTags || tags.length < maxTags;

  // Collapsed view - compact display
  if (isCollapsed) {
    return (
      <div className="flex items-center gap-2 py-1">
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 group"
          disabled={disabled}
        >
          <ChevronRight className="h-3.5 w-3.5 group-hover:text-primary" />
          <Tag className="h-3.5 w-3.5" />
          <span className="font-medium">Tags</span>
          {tags.length > 0 && (
            <Badge variant="outline" className="text-xs h-4 px-1.5 ml-1">
              {tags.length}
            </Badge>
          )}
        </button>

        {/* Compact tag display */}
        {tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {tags.slice(0, 3).map((tag, index) => (
              <Badge 
                key={`compact-${tag}-${index}`}
                variant="secondary" 
                className="text-xs h-5 px-2 bg-primary/8 text-primary border-primary/20 flex items-center gap-1"
              >
                <Hash className="h-2.5 w-2.5" />
                <span className="truncate max-w-[80px]">{tag}</span>
                {!disabled && (
                  <button
                    onClick={(e) => removeTag(tag, e)}
                    className="ml-1 opacity-60 hover:opacity-100 hover:text-destructive transition-all duration-150"
                    aria-label={`Remove ${tag}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="outline" className="text-xs h-5 px-2">
                +{tags.length - 3} more
              </Badge>
            )}
            {!disabled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStartEditing}
                className="h-5 w-5 p-0 text-muted-foreground hover:text-primary"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        {/* Add tag button when no tags */}
        {tags.length === 0 && !disabled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartEditing}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-primary border-dashed border border-transparent hover:border-primary/30"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add tags
          </Button>
        )}
      </div>
    );
  }

  // Expanded view - full editor
  return (
    <div className="space-y-3 border border-border rounded-lg p-3 bg-background/50">
      {/* Header with collapse button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsCollapsed(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors duration-150 group"
          disabled={disabled}
        >
          <ChevronDown className="h-3.5 w-3.5 group-hover:text-primary" />
          <Tag className="h-3.5 w-3.5" />
          <span>Tags</span>
          {tags.length > 0 && (
            <Badge variant="outline" className="text-xs h-4 px-1.5 ml-1">
              {tags.length}{maxTags ? `/${maxTags}` : ''}
            </Badge>
          )}
        </button>
      </div>

      {/* Tag input area */}
      <div className="relative">
        <div className={`min-h-[40px] p-2.5 border rounded-md bg-background transition-all duration-200 ${
          isInputFocused 
            ? 'border-primary shadow-sm ring-1 ring-primary/20' 
            : 'border-border'
        }`}>
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Existing tags */}
            {tags.map((tag, index) => (
              <Badge 
                key={`expanded-${tag}-${index}`}
                variant="secondary" 
                className="flex items-center gap-1 px-2 py-0.5 text-xs bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15"
              >
                <Hash className="h-2.5 w-2.5" />
                {tag}
                {!disabled && (
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-0.5 opacity-60 hover:opacity-100 hover:text-destructive"
                    aria-label={`Remove ${tag}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </Badge>
            ))}
            
            {/* Input field */}
            {canAddMoreTags && (
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                disabled={disabled}
                placeholder={tags.length === 0 ? placeholder : 'Add more...'}
                className="border-0 focus-visible:ring-0 shadow-none h-6 px-1 flex-1 min-w-[100px] text-xs"
              />
            )}
          </div>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-32 overflow-y-auto">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={`suggestion-${suggestion}-${index}`}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors flex items-center gap-2"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <Hash className="h-2.5 w-2.5 text-muted-foreground" />
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick add suggestions */}
      {suggestions.length > 0 && canAddMoreTags && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions
            .filter(suggestion => !tags.includes(normalize(suggestion)))
            .slice(0, 8)
            .map((suggestion, index) => (
            <Button
              key={`quick-${suggestion}-${index}`}
              variant="outline"
              size="sm"
              disabled={disabled}
              className="h-6 px-2 text-xs border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary"
              onClick={() => handleQuickAddClick(suggestion)}
            >
              <Plus className="h-2.5 w-2.5 mr-1" />
              {suggestion}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};