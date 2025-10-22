/**
 * Curl Parser Utility
 * Parses curl commands and converts them to API step configuration
 */

import { ApiStepConfig, FormDataField } from '@/types';

interface ParsedCurl {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
    bodyType: 'raw' | 'form-data' | 'x-www-form-urlencoded' | 'none';
    formData?: FormDataField[];
    urlEncodedData?: Array<{ key: string; value: string; enabled: boolean }>;
    queryParams?: Array<{ key: string; value: string; enabled: boolean }>;
}

export class CurlParser {
    /**
     * Parse a curl command string into an API step configuration
     */
    static parse(curlCommand: string): ApiStepConfig {
        const parsed = this.parseCurlCommand(curlCommand);

        return {
            method: parsed.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
            url: parsed.url,
            headers: parsed.headers,
            body: parsed.body,
            bodyType: parsed.bodyType,
            formData: parsed.formData,
            urlEncodedData: parsed.urlEncodedData,
            queryParams: parsed.queryParams,
            extractVars: []
        };
    }

    private static parseCurlCommand(curl: string): ParsedCurl {
        // Remove 'curl' prefix and normalize whitespace
        let command = curl.trim();
        if (command.startsWith('curl ')) {
            command = command.substring(5);
        }

        // Handle line continuations (backslash)
        command = command.replace(/\\\s*\n\s*/g, ' ');

        const result: ParsedCurl = {
            method: 'GET',
            url: '',
            headers: {},
            bodyType: 'none'
        };

        // Parse URL (first unquoted argument or -X/--request argument)
        const urlMatch = this.extractUrl(command);
        if (urlMatch) {
            result.url = urlMatch.url;
            result.queryParams = urlMatch.queryParams;
        }

        // Parse method
        const methodMatch = command.match(/(?:-X|--request)\s+['"]?(\w+)['"]?/i);
        if (methodMatch) {
            result.method = methodMatch[1].toUpperCase();
        }

        // Parse headers
        result.headers = this.extractHeaders(command);

        // Parse body data
        const bodyData = this.extractBody(command, result.headers);
        if (bodyData) {
            result.body = bodyData.body;
            result.bodyType = bodyData.bodyType;
            result.formData = bodyData.formData;
            result.urlEncodedData = bodyData.urlEncodedData;
        }

        // Infer method from body presence if not explicitly set
        if (result.method === 'GET' && (result.body || result.formData || result.urlEncodedData)) {
            result.method = 'POST';
        }

        return result;
    }

    private static extractUrl(command: string): { url: string; queryParams?: Array<{ key: string; value: string; enabled: boolean }> } | null {
        // Try to find URL with --url flag
        let urlMatch = command.match(/(?:--url)\s+['"]([^'"]+)['"]/);
        if (!urlMatch) {
            // Try to find first quoted string that looks like a URL
            urlMatch = command.match(/['"]((https?:\/\/|http:\/\/)[^'"]+)['"]/);
        }
        if (!urlMatch) {
            // Try to find unquoted URL
            urlMatch = command.match(/\s((https?:\/\/|http:\/\/)\S+)/);
        }

        if (!urlMatch) {
            return null;
        }

        const fullUrl = urlMatch[1];

        // Parse query parameters
        try {
            const urlObj = new URL(fullUrl);
            const queryParams: Array<{ key: string; value: string; enabled: boolean }> = [];

            urlObj.searchParams.forEach((value, key) => {
                queryParams.push({ key, value, enabled: true });
            });

            return {
                url: fullUrl,
                queryParams: queryParams.length > 0 ? queryParams : undefined
            };
        } catch {
            return { url: fullUrl };
        }
    }

    private static extractHeaders(command: string): Record<string, string> {
        const headers: Record<string, string> = {};

        // Match -H or --header flags
        const headerRegex = /(?:-H|--header)\s+['"]([^'"]+)['"]/g;
        let match;

        while ((match = headerRegex.exec(command)) !== null) {
            const headerLine = match[1];
            const colonIndex = headerLine.indexOf(':');

            if (colonIndex > 0) {
                const key = headerLine.substring(0, colonIndex).trim();
                const value = headerLine.substring(colonIndex + 1).trim();
                headers[key] = value;
            }
        }

        return headers;
    }

    private static extractBody(command: string, headers: Record<string, string>): {
        body?: string;
        bodyType: 'raw' | 'form-data' | 'x-www-form-urlencoded' | 'none';
        formData?: FormDataField[];
        urlEncodedData?: Array<{ key: string; value: string; enabled: boolean }>;
    } | null {
        // Check for --form or -F (multipart/form-data) - handle first
        const formMatches = [...command.matchAll(/(?:--form|-F)\s+(['"])((?:(?!\1).)*?)\1/g)];

        // Handle form data
        if (formMatches.length > 0) {
            const formData: FormDataField[] = [];

            formMatches.forEach(match => {
                const formField = match[2];
                const parts = formField.split('=');

                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const value = parts.slice(1).join('=').trim();

                    // Check if it's a file upload (starts with @)
                    if (value.startsWith('@')) {
                        const filePath = value.substring(1);
                        formData.push({
                            key,
                            value: filePath.startsWith('/') ? `file:${filePath}` : `classpath:${filePath}`,
                            type: 'file',
                            enabled: true
                        });
                    } else {
                        formData.push({
                            key,
                            value,
                            type: 'text',
                            enabled: true
                        });
                    }
                }
            });

            return {
                bodyType: 'form-data',
                formData
            };
        }

        // Check for --data-urlencode
        const urlEncodeMatches = [...command.matchAll(/(?:--data-urlencode)\s+(['"])((?:(?!\1).)*?)\1/g)];

        // Handle URL encoded data
        if (urlEncodeMatches.length > 0) {
            const urlEncodedData: Array<{ key: string; value: string; enabled: boolean }> = [];

            urlEncodeMatches.forEach(match => {
                const field = match[2];
                const parts = field.split('=');

                if (parts.length >= 2) {
                    urlEncodedData.push({
                        key: parts[0].trim(),
                        value: parts.slice(1).join('=').trim(),
                        enabled: true
                    });
                }
            });

            return {
                bodyType: 'x-www-form-urlencoded',
                urlEncodedData
            };
        }

        // Handle raw data - FIXED: properly handles quotes inside JSON
        // Uses backreference \1 to match the same quote type that opened the string
        const dataMatch = command.match(/(?:--data-raw|--data-binary|--data|-d)\s+(['"])([\s\S]*?)\1(?:\s|$)/);

        if (dataMatch) {
            let body = dataMatch[2];

            // Try to parse and pretty-print JSON
            const contentType = headers['Content-Type'] || headers['content-type'] || '';
            if (contentType.includes('application/json')) {
                try {
                    const parsed = JSON.parse(body);
                    body = JSON.stringify(parsed, null, 2);
                } catch {
                    // Keep original if not valid JSON
                }
            }

            return {
                body,
                bodyType: 'raw'
            };
        }

        return null;
    }

    /**
     * Validate if a string looks like a curl command
     */
    static isCurlCommand(text: string): boolean {
        const trimmed = text.trim();
        return trimmed.startsWith('curl ') || trimmed.startsWith('curl\n');
    }

    /**
     * Clean up curl command (remove comments, extra whitespace)
     */
    static cleanCurlCommand(curl: string): string {
        return curl
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
}
