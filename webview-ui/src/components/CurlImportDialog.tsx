import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileCode, AlertCircle, CheckCircle2, Copy } from 'lucide-react';
import { CurlParser } from '@/utils/curlParser';
import { ApiStepConfig } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface CurlImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (config: ApiStepConfig) => void;
}

export const CurlImportDialog = ({ isOpen, onClose, onImport }: CurlImportDialogProps) => {
  const [curlCommand, setCurlCommand] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ApiStepConfig | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const { toast } = useToast();

  const examples = [
    {
      name: 'Simple GET',
      curl: `curl 'https://jsonplaceholder.typicode.com/posts/1'`
    },
    {
      name: 'POST with JSON',
      curl: `curl -X POST 'https://jsonplaceholder.typicode.com/posts' \\
  -H 'Content-Type: application/json' \\
  --data-raw '{"title":"My Post","body":"Content","userId":1}'`
    },
    {
      name: 'With Auth Header',
      curl: `curl 'https://api.example.com/data' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -H 'Accept: application/json'`
    }
  ];

  const handleCopyExample = (curl: string) => {
    navigator.clipboard.writeText(curl);
    toast({ title: "Copied!", description: "Example copied to clipboard" });
  };

  const handleParse = () => {
    setError(null);
    setPreview(null);

    if (!curlCommand.trim()) {
      setError('Please paste a curl command');
      return;
    }

    try {
      const cleaned = CurlParser.cleanCurlCommand(curlCommand);
      
      if (!CurlParser.isCurlCommand(cleaned)) {
        setError('Invalid curl command. Make sure it starts with "curl"');
        return;
      }

      const config = CurlParser.parse(cleaned);
      
      if (!config.url) {
        setError('Could not extract URL from curl command');
        return;
      }

      setPreview(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse curl command');
    }
  };

  const handleImport = () => {
    if (preview) {
      onImport(preview);
      handleClose();
    }
  };

  const handleClose = () => {
    setCurlCommand('');
    setError(null);
    setPreview(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            Import from cURL
          </DialogTitle>
          <DialogDescription>
            Paste a curl command to automatically create an API step configuration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">cURL Command</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExamples(!showExamples)}
                className="text-xs"
              >
                {showExamples ? 'Hide' : 'Show'} Examples
              </Button>
            </div>
            
            {showExamples && (
              <div className="mb-3 p-3 bg-muted rounded-lg space-y-2">
                <p className="text-xs text-muted-foreground mb-2">Click to use an example:</p>
                {examples.map((example, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurlCommand(example.curl)}
                      className="flex-1 justify-start text-left h-auto py-2"
                    >
                      <div>
                        <div className="font-semibold text-xs">{example.name}</div>
                        <div className="text-xs text-muted-foreground font-mono truncate">
                          {example.curl.substring(0, 50)}...
                        </div>
                      </div>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopyExample(example.curl)}
                      className="h-8 w-8"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <Textarea
              value={curlCommand}
              onChange={(e) => setCurlCommand(e.target.value)}
              placeholder={`curl 'https://api.example.com/users' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer token123' \\
  --data-raw '{"name":"John","email":"john@example.com"}'`}
              className="font-mono text-sm min-h-[150px]"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {preview && (
            <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <div className="font-semibold mb-2">Successfully parsed curl command!</div>
                <div className="space-y-1 text-sm">
                  <div><span className="font-medium">Method:</span> {preview.method}</div>
                  <div><span className="font-medium">URL:</span> {preview.url}</div>
                  {Object.keys(preview.headers || {}).length > 0 && (
                    <div><span className="font-medium">Headers:</span> {Object.keys(preview.headers).length} header(s)</div>
                  )}
                  {preview.queryParams && preview.queryParams.length > 0 && (
                    <div><span className="font-medium">Query Params:</span> {preview.queryParams.length} param(s)</div>
                  )}
                  {preview.body && (
                    <div><span className="font-medium">Body:</span> {preview.bodyType}</div>
                  )}
                  {preview.formData && preview.formData.length > 0 && (
                    <div><span className="font-medium">Form Data:</span> {preview.formData.length} field(s)</div>
                  )}
                  {preview.urlEncodedData && preview.urlEncodedData.length > 0 && (
                    <div><span className="font-medium">URL Encoded:</span> {preview.urlEncodedData.length} field(s)</div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {!preview ? (
            <Button onClick={handleParse}>
              Parse cURL
            </Button>
          ) : (
            <Button onClick={handleImport}>
              Import Step
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
