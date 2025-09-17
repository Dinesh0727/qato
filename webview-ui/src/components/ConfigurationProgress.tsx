import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';

interface ConfigurationProgressProps {
  operations: Array<{
    id: string;
    name: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
  }>;
  isVisible: boolean;
}

export const ConfigurationProgress = ({ operations, isVisible }: ConfigurationProgressProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const completedCount = operations.filter(op => op.status === 'completed' || op.status === 'failed').length;
    const newProgress = operations.length > 0 ? (completedCount / operations.length) * 100 : 0;
    setProgress(newProgress);
  }, [operations]);

  if (!isVisible || operations.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-card border rounded-lg p-4 shadow-lg z-40 min-w-80">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Configuration Operations</h4>
          <Badge variant="outline" className="text-xs">
            {operations.filter(op => op.status === 'completed').length} / {operations.length}
          </Badge>
        </div>
        
        <Progress value={progress} className="h-2" />
        
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {operations.map((operation) => (
            <div key={operation.id} className="flex items-center gap-2 text-xs">
              {operation.status === 'pending' && (
                <div className="w-3 h-3 rounded-full bg-muted" />
              )}
              {operation.status === 'in-progress' && (
                <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
              )}
              {operation.status === 'completed' && (
                <CheckCircle className="w-3 h-3 text-green-500" />
              )}
              {operation.status === 'failed' && (
                <XCircle className="w-3 h-3 text-red-500" />
              )}
              <span className={`flex-1 ${
                operation.status === 'completed' ? 'text-muted-foreground line-through' :
                operation.status === 'failed' ? 'text-red-500' :
                operation.status === 'in-progress' ? 'text-foreground font-medium' :
                'text-muted-foreground'
              }`}>
                {operation.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};