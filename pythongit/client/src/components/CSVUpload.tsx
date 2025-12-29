import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, AlertCircle, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CSVUploadProps {
  onUpload: (data: any[]) => void;
  expectedFields: string[];
  title: string;
  description: string;
  isUploading?: boolean;
  maxRows?: number;
}

interface ParsedCSV {
  headers: string[];
  data: any[];
  errors: string[];
}

export function CSVUpload({ 
  onUpload, 
  expectedFields, 
  title, 
  description, 
  isUploading = false,
  maxRows = 1000 
}: CSVUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCSV | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  const parseCSV = useCallback((content: string): ParsedCSV => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      return { headers: [], data: [], errors: ['CSV file is empty'] };
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const errors: string[] = [];
    const data: any[] = [];

    // Validate headers against expected fields
    const missingFields = expectedFields.filter(field => 
      !headers.some(h => h.toLowerCase() === field.toLowerCase())
    );
    
    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Parse data rows
    for (let i = 1; i < Math.min(lines.length, maxRows + 1); i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      
      if (values.length !== headers.length) {
        errors.push(`Row ${i}: Expected ${headers.length} columns, got ${values.length}`);
        continue;
      }

      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      data.push(row);
    }

    if (lines.length > maxRows + 1) {
      errors.push(`File contains ${lines.length - 1} rows, but only first ${maxRows} will be processed`);
    }

    return { headers, data, errors };
  }, [expectedFields, maxRows]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setParseErrors(['Please select a CSV file']);
      return;
    }

    setFile(file);
    setParseErrors([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsed = parseCSV(content);
      setParsedData(parsed);
      setParseErrors(parsed.errors);
    };
    reader.readAsText(file);
  }, [parseCSV]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    multiple: false
  });

  const handleUpload = () => {
    if (parsedData?.data && parseErrors.length === 0) {
      onUpload(parsedData.data);
    }
  };

  const handleClear = () => {
    setFile(null);
    setParsedData(null);
    setParseErrors([]);
  };

  const canUpload = parsedData?.data && parsedData.data.length > 0 && parseErrors.length === 0;

  return (
    <Card className="w-full" data-testid="csv-upload-component">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
          data-testid="csv-dropzone"
        >
          <input {...getInputProps()} />
          <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-lg">Drop the CSV file here...</p>
          ) : (
            <div>
              <p className="text-lg mb-2">Drag & drop a CSV file here, or click to select</p>
              <p className="text-sm text-muted-foreground">
                Expected fields: {expectedFields.join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* File Info */}
        {file && (
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5" />
              <div>
                <p className="font-medium" data-testid="csv-filename">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClear} data-testid="button-clear-csv">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Parse Errors */}
        {parseErrors.length > 0 && (
          <Alert variant="destructive" data-testid="csv-parse-errors">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {parseErrors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Preview */}
        {parsedData && parseErrors.length === 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Preview ({parsedData.data.length} rows)
              </h4>
              <Badge variant="secondary" data-testid="csv-row-count">
                {parsedData.data.length} rows
              </Badge>
            </div>

            <ScrollArea className="h-48 w-full border rounded-md">
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {parsedData.headers.map((header, index) => (
                        <th key={index} className="text-left p-2 font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.data.slice(0, 5).map((row, index) => (
                      <tr key={index} className="border-b">
                        {parsedData.headers.map((header, colIndex) => (
                          <td key={colIndex} className="p-2 max-w-32 truncate">
                            {row[header] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.data.length > 5 && (
                  <p className="text-muted-foreground text-center mt-4">
                    ... and {parsedData.data.length - 5} more rows
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Upload Button */}
        <Separator />
        <div className="flex justify-end gap-3">
          {file && (
            <Button variant="outline" onClick={handleClear} data-testid="button-cancel-upload">
              Cancel
            </Button>
          )}
          <Button 
            onClick={handleUpload} 
            disabled={!canUpload || isUploading}
            data-testid="button-upload-csv"
          >
            {isUploading ? 'Uploading...' : `Upload ${parsedData?.data?.length || 0} Records`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}