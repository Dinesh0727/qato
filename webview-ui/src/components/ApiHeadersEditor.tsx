import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus } from 'lucide-react';

interface Header {
  key: string;
  value: string;
}

interface ApiHeadersEditorProps {
  headers: Record<string, string>;
  onChange: (headers: Record<string, string>) => void;
}

export const ApiHeadersEditor = ({ headers, onChange }: ApiHeadersEditorProps) => {
  const [rows, setRows] = useState<Header[]>(
    Object.entries(headers || {}).map(([key, value]) => ({ key, value }))
  );

  // Sync local rows state with headers prop changes
  useEffect(() => {
    setRows(Object.entries(headers || {}).map(([key, value]) => ({ key, value })));
  }, [headers]);

  const handleRowChange = (index: number, field: 'key' | 'value', value: string) => {
    const updatedRows = rows.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    );
    setRows(updatedRows);
    onChange(
      Object.fromEntries(
        updatedRows.filter(r => r.key.trim() !== '').map(r => [r.key, r.value])
      )
    );
  };

  const handleAddRow = () => {
    setRows([...rows, { key: '', value: '' }]);
  };

  const handleDeleteRow = (index: number) => {
    const updatedRows = rows.filter((_, i) => i !== index);
    setRows(updatedRows);
    onChange(
      Object.fromEntries(
        updatedRows.filter(r => r.key.trim() !== '').map(r => [r.key, r.value])
      )
    );
  };

  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <div className="text-muted-foreground text-sm mb-2">No headers set.</div>
      )}
      {rows.map((row, idx) => (
        <div key={idx} className="flex gap-2 items-center mb-1">
          <Input
            value={row.key}
            onChange={e => handleRowChange(idx, 'key', e.target.value)}
            placeholder="Header Name"
            className="w-1/3"
            autoFocus={row.key === '' && row.value === ''}
          />
          <Input
            value={row.value}
            onChange={e => handleRowChange(idx, 'value', e.target.value)}
            placeholder="Header Value"
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleDeleteRow(idx)}
            aria-label="Delete header"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddRow}
        className="mt-1"
      >
        <Plus className="h-4 w-4 mr-1" /> Add Header
      </Button>
    </div>
  );
}; 