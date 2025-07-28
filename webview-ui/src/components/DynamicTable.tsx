import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

interface DynamicTableProps {
  data: Record<string, any>[];
}

export const DynamicTable: React.FC<DynamicTableProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-muted-foreground">No data to display.</p>;
  }

  const allKeys = Array.from(new Set(data.flatMap(obj => Object.keys(obj))));

  return (
    <Table className="min-w-full text-sm">
      <TableHeader>
        <TableRow>
          {allKeys.map(key => (
            <TableHead key={key} className="whitespace-nowrap">{key}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, rowIndex) => (
          <TableRow key={rowIndex}>
            {allKeys.map(key => (
              <TableCell
                key={`${rowIndex}-${key}`}
                className="whitespace-nowrap max-w-xs truncate"
                title={
                  typeof row[key] === 'object' && row[key] !== null
                    ? JSON.stringify(row[key])
                    : String(row[key])
                }
              >
                {typeof row[key] === 'object' && row[key] !== null
                  ? JSON.stringify(row[key])
                  : String(row[key])}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
