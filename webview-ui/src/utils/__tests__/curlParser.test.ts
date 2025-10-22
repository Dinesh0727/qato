/**
 * Tests for CurlParser utility
 */

import { CurlParser } from '../curlParser';

describe('CurlParser', () => {
  describe('parse', () => {
    it('should parse simple GET request', () => {
      const curl = `curl 'https://api.example.com/users'`;
      const result = CurlParser.parse(curl);
      
      expect(result.method).toBe('GET');
      expect(result.url).toBe('https://api.example.com/users');
      expect(result.bodyType).toBe('none');
    });

    it('should parse POST request with JSON body', () => {
      const curl = `curl -X POST 'https://api.example.com/users' \\
        -H 'Content-Type: application/json' \\
        --data-raw '{"name":"John","email":"john@example.com"}'`;
      
      const result = CurlParser.parse(curl);
      
      expect(result.method).toBe('POST');
      expect(result.url).toBe('https://api.example.com/users');
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.body).toContain('John');
      expect(result.bodyType).toBe('raw');
    });

    it('should parse request with multiple headers', () => {
      const curl = `curl 'https://api.example.com/users' \\
        -H 'Authorization: Bearer token123' \\
        -H 'Content-Type: application/json' \\
        -H 'X-Custom-Header: value'`;
      
      const result = CurlParser.parse(curl);
      
      expect(result.headers['Authorization']).toBe('Bearer token123');
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['X-Custom-Header']).toBe('value');
    });

    it('should parse request with query parameters', () => {
      const curl = `curl 'https://api.example.com/users?page=1&limit=10'`;
      
      const result = CurlParser.parse(curl);
      
      expect(result.url).toBe('https://api.example.com/users?page=1&limit=10');
      expect(result.queryParams).toHaveLength(2);
      expect(result.queryParams?.[0]).toEqual({ key: 'page', value: '1', enabled: true });
      expect(result.queryParams?.[1]).toEqual({ key: 'limit', value: '10', enabled: true });
    });

    it('should parse form-data request', () => {
      const curl = `curl -X POST 'https://api.example.com/upload' \\
        -F 'name=John' \\
        -F 'file=@/path/to/file.pdf'`;
      
      const result = CurlParser.parse(curl);
      
      expect(result.method).toBe('POST');
      expect(result.bodyType).toBe('form-data');
      expect(result.formData).toHaveLength(2);
      expect(result.formData?.[0]).toEqual({ key: 'name', value: 'John', type: 'text', enabled: true });
      expect(result.formData?.[1].type).toBe('file');
    });

    it('should parse URL encoded request', () => {
      const curl = `curl -X POST 'https://api.example.com/login' \\
        --data-urlencode 'username=john' \\
        --data-urlencode 'password=secret123'`;
      
      const result = CurlParser.parse(curl);
      
      expect(result.method).toBe('POST');
      expect(result.bodyType).toBe('x-www-form-urlencoded');
      expect(result.urlEncodedData).toHaveLength(2);
    });

    it('should handle curl without curl prefix', () => {
      const curl = `'https://api.example.com/users' -H 'Authorization: Bearer token'`;
      const result = CurlParser.parse(curl);
      
      expect(result.url).toBe('https://api.example.com/users');
      expect(result.headers['Authorization']).toBe('Bearer token');
    });
  });

  describe('isCurlCommand', () => {
    it('should return true for valid curl commands', () => {
      expect(CurlParser.isCurlCommand('curl https://example.com')).toBe(true);
      expect(CurlParser.isCurlCommand('curl -X POST https://example.com')).toBe(true);
    });

    it('should return false for invalid curl commands', () => {
      expect(CurlParser.isCurlCommand('https://example.com')).toBe(false);
      expect(CurlParser.isCurlCommand('wget https://example.com')).toBe(false);
    });
  });

  describe('cleanCurlCommand', () => {
    it('should remove extra whitespace and comments', () => {
      const curl = `curl 'https://example.com' \\
        # This is a comment
        -H 'Authorization: Bearer token'`;
      
      const cleaned = CurlParser.cleanCurlCommand(curl);
      
      expect(cleaned).not.toContain('#');
      expect(cleaned).not.toContain('\n');
    });
  });
});
