import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DynamicTableProps {
  data: Record<string, any>[];
}

export const DynamicTable: React.FC<DynamicTableProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-muted-foreground">No data to display.</p>;
  }

  // Get all unique keys from all objects to form columns
  const allKeys = Array.from(new Set(data.flatMap(obj => Object.keys(obj))));

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {allKeys.map(key => (
              <TableHead key={key}>{key}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {allKeys.map(key => (
                <TableCell key={`${rowIndex}-${key}`}>
                  {typeof row[key] === 'object' && row[key] !== null
                    ? JSON.stringify(row[key])
                    : String(row[key])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};