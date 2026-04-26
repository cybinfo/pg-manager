/**
 * Tests for download utilities
 *
 * Tests client-side CSV/JSON/text download functions and
 * server-side response helpers (PDF, CSV, JSON, file, streaming).
 */

import {
  buildCSV,
  timestampedFilename,
  entityExportFilename,
  createPDFResponse,
  createCSVResponse,
  createJSONResponse,
  createFileResponse,
  createStreamingResponse,
} from '@/lib/download-utils'

// Polyfill TextEncoder for jsdom test environment
if (typeof globalThis.TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TextEncoder } = require('util')
  globalThis.TextEncoder = TextEncoder
}

// Polyfill ReadableStream for jsdom test environment
if (typeof globalThis.ReadableStream === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ReadableStream } = require('stream/web')
  globalThis.ReadableStream = ReadableStream
}

// ============================================================================
// CLIENT-SIDE: CSV UTILITIES
// ============================================================================

describe('CSV Utilities', () => {
  describe('buildCSV', () => {
    it('builds CSV with headers and data rows', () => {
      const data = [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 },
      ]
      const columns = [
        { key: 'name' as const, header: 'Name' },
        { key: 'age' as const, header: 'Age' },
      ]

      const csv = buildCSV(data, columns)
      const lines = csv.split('\n')

      expect(lines).toHaveLength(3)
      expect(lines[0]).toBe('Name,Age')
      expect(lines[1]).toBe('Alice,25')
      expect(lines[2]).toBe('Bob,30')
    })

    it('handles empty data array', () => {
      const columns = [
        { key: 'name' as const, header: 'Name' },
      ]

      const csv = buildCSV([], columns)
      const lines = csv.split('\n')

      expect(lines).toHaveLength(1)
      expect(lines[0]).toBe('Name')
    })

    it('escapes values with commas', () => {
      const data = [
        { name: 'Doe, John', city: 'New York' },
      ]
      const columns = [
        { key: 'name' as const, header: 'Name' },
        { key: 'city' as const, header: 'City' },
      ]

      const csv = buildCSV(data, columns)
      const lines = csv.split('\n')

      expect(lines[1]).toBe('"Doe, John",New York')
    })

    it('escapes values with double quotes', () => {
      const data = [
        { name: 'He said "hello"', city: 'London' },
      ]
      const columns = [
        { key: 'name' as const, header: 'Name' },
        { key: 'city' as const, header: 'City' },
      ]

      const csv = buildCSV(data, columns)
      const lines = csv.split('\n')

      expect(lines[1]).toBe('"He said ""hello""",London')
    })

    it('escapes values with newlines', () => {
      const data = [
        { name: 'Line1\nLine2', city: 'Paris' },
      ]
      const columns = [
        { key: 'name' as const, header: 'Name' },
        { key: 'city' as const, header: 'City' },
      ]

      const csv = buildCSV(data, columns)

      expect(csv).toContain('"Line1\nLine2"')
    })

    it('handles null values', () => {
      const data = [
        { name: null, city: 'London' },
      ] as unknown as Record<string, unknown>[]
      const columns = [
        { key: 'name' as const, header: 'Name' },
        { key: 'city' as const, header: 'City' },
      ]

      const csv = buildCSV(data, columns)
      const lines = csv.split('\n')

      expect(lines[1]).toBe(',London')
    })

    it('handles undefined values', () => {
      const data = [
        { name: undefined, city: 'London' },
      ] as unknown as Record<string, unknown>[]
      const columns = [
        { key: 'name' as const, header: 'Name' },
        { key: 'city' as const, header: 'City' },
      ]

      const csv = buildCSV(data, columns)
      const lines = csv.split('\n')

      expect(lines[1]).toBe(',London')
    })

    it('applies format functions', () => {
      const data = [
        { name: 'Alice', amount: 1500 },
        { name: 'Bob', amount: 2000 },
      ]
      const columns = [
        { key: 'name' as const, header: 'Name' },
        {
          key: 'amount' as const,
          header: 'Amount',
          format: (value: unknown) => `₹${value}`,
        },
      ]

      const csv = buildCSV(data, columns)
      const lines = csv.split('\n')

      expect(lines[1]).toBe('Alice,₹1500')
      expect(lines[2]).toBe('Bob,₹2000')
    })

    it('format function receives full row', () => {
      const data = [
        { first: 'John', last: 'Doe' },
      ]
      const columns = [
        {
          key: 'first' as const,
          header: 'Full Name',
          format: (_value: unknown, row: Record<string, unknown>) =>
            `${row.first} ${row.last}`,
        },
      ]

      const csv = buildCSV(data, columns)
      const lines = csv.split('\n')

      expect(lines[1]).toBe('John Doe')
    })

    it('escapes header values with special characters', () => {
      const data = [{ val: 'test' }]
      const columns = [
        { key: 'val' as const, header: 'Value, with comma' },
      ]

      const csv = buildCSV(data, columns)
      const lines = csv.split('\n')

      expect(lines[0]).toBe('"Value, with comma"')
    })
  })
})

// ============================================================================
// FILENAME HELPERS
// ============================================================================

describe('Filename Helpers', () => {
  describe('timestampedFilename', () => {
    it('generates filename with date', () => {
      const filename = timestampedFilename('report', 'csv')

      // Should match pattern: report-YYYY-MM-DD.csv
      expect(filename).toMatch(/^report-\d{4}-\d{2}-\d{2}\.csv$/)
    })

    it('generates filename with date and time', () => {
      const filename = timestampedFilename('backup', 'json', true)

      // Should match pattern: backup-YYYY-MM-DD-HH-MM-SS.json
      expect(filename).toMatch(/^backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/)
    })

    it('uses current date', () => {
      const today = new Date().toISOString().split('T')[0]
      const filename = timestampedFilename('test', 'txt')

      expect(filename).toContain(today)
    })

    it('sanitizes the base name', () => {
      const filename = timestampedFilename('my report', 'csv')

      // sanitizeFilename converts spaces to dashes
      expect(filename).toMatch(/^my-report-\d{4}-\d{2}-\d{2}\.csv$/)
    })
  })

  describe('entityExportFilename', () => {
    it('generates export filename without prefix', () => {
      const filename = entityExportFilename('payments', 'csv')

      // Should match: payments-export-YYYY-MM-DD.csv
      expect(filename).toMatch(/^payments-export-\d{4}-\d{2}-\d{2}\.csv$/)
    })

    it('generates filename with prefix', () => {
      const filename = entityExportFilename('John Doe', 'pdf', 'receipt')

      // Should match: receipt-john-doe-YYYY-MM-DD.pdf
      expect(filename).toMatch(/^receipt-john-doe-\d{4}-\d{2}-\d{2}\.pdf$/)
    })

    it('lowercases entity name', () => {
      const filename = entityExportFilename('TENANTS', 'csv')

      expect(filename).toMatch(/^tenants-export-/)
    })

    it('uses current date', () => {
      const today = new Date().toISOString().split('T')[0]
      const filename = entityExportFilename('test', 'csv')

      expect(filename).toContain(today)
    })
  })
})

// ============================================================================
// SERVER-SIDE: RESPONSE HELPERS
// ============================================================================

describe('Server-Side Response Helpers', () => {
  describe('createPDFResponse', () => {
    it('creates response with correct content type', () => {
      const content = new Uint8Array([1, 2, 3])
      const response = createPDFResponse(content, 'test.pdf')

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/pdf')
    })

    it('sets attachment disposition by default', () => {
      const content = new Uint8Array([1, 2, 3])
      const response = createPDFResponse(content, 'test.pdf')

      const disposition = response.headers.get('Content-Disposition')
      expect(disposition).toContain('attachment')
      expect(disposition).toContain('test.pdf')
    })

    it('supports inline disposition', () => {
      const content = new Uint8Array([1, 2, 3])
      const response = createPDFResponse(content, 'test.pdf', { disposition: 'inline' })

      const disposition = response.headers.get('Content-Disposition')
      expect(disposition).toContain('inline')
    })

    it('sets Content-Length header', () => {
      const content = new Uint8Array([1, 2, 3, 4, 5])
      const response = createPDFResponse(content, 'test.pdf')

      expect(response.headers.get('Content-Length')).toBe('5')
    })

    it('sets Cache-Control to no-cache', () => {
      const content = new Uint8Array([1])
      const response = createPDFResponse(content, 'test.pdf')

      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
    })

    it('sanitizes filename', () => {
      const content = new Uint8Array([1])
      const response = createPDFResponse(content, 'my report<script>.pdf')

      const disposition = response.headers.get('Content-Disposition')
      expect(disposition).not.toContain('<script>')
    })

    it('includes extra headers', () => {
      const content = new Uint8Array([1])
      const response = createPDFResponse(content, 'test.pdf', {
        headers: { 'X-Custom': 'value' },
      })

      expect(response.headers.get('X-Custom')).toBe('value')
    })

    it('handles ArrayBuffer content', () => {
      const buffer = new ArrayBuffer(3)
      const response = createPDFResponse(buffer, 'test.pdf')

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Length')).toBe('3')
    })
  })

  describe('createCSVResponse', () => {
    it('creates response with correct content type', () => {
      const response = createCSVResponse('a,b\n1,2', 'test.csv')

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8')
    })

    it('sets attachment disposition by default', () => {
      const response = createCSVResponse('a,b', 'test.csv')

      const disposition = response.headers.get('Content-Disposition')
      expect(disposition).toContain('attachment')
      expect(disposition).toContain('test.csv')
    })

    it('sets Cache-Control to no-cache', () => {
      const response = createCSVResponse('data', 'test.csv')

      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
    })

    it('sanitizes filename', () => {
      const response = createCSVResponse('data', 'my file<>.csv')

      const disposition = response.headers.get('Content-Disposition')
      expect(disposition).not.toContain('<>')
    })

    it('includes extra headers', () => {
      const response = createCSVResponse('data', 'test.csv', {
        headers: { 'X-Export-Id': '123' },
      })

      expect(response.headers.get('X-Export-Id')).toBe('123')
    })

    it('supports inline disposition', () => {
      const response = createCSVResponse('data', 'test.csv', { disposition: 'inline' })

      const disposition = response.headers.get('Content-Disposition')
      expect(disposition).toContain('inline')
    })
  })

  describe('createJSONResponse', () => {
    it('creates response with correct content type', () => {
      const response = createJSONResponse({ key: 'value' }, 'data.json')

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/json; charset=utf-8')
    })

    it('sets attachment disposition by default', () => {
      const response = createJSONResponse({}, 'data.json')

      const disposition = response.headers.get('Content-Disposition')
      expect(disposition).toContain('attachment')
      expect(disposition).toContain('data.json')
    })

    it('sets Cache-Control to no-cache', () => {
      const response = createJSONResponse({}, 'data.json')

      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
    })

    it('serializes data as pretty JSON', async () => {
      const data = { name: 'Test', count: 42 }
      const response = createJSONResponse(data, 'data.json')

      const body = await response.json()
      expect(body).toEqual(data)
    })

    it('handles arrays', async () => {
      const data = [1, 2, 3]
      const response = createJSONResponse(data, 'array.json')

      const body = await response.json()
      expect(body).toEqual([1, 2, 3])
    })

    it('handles null', async () => {
      const response = createJSONResponse(null, 'null.json')

      const body = await response.json()
      expect(body).toBeNull()
    })

    it('sanitizes filename', () => {
      const response = createJSONResponse({}, 'bad<name>.json')

      const disposition = response.headers.get('Content-Disposition')
      expect(disposition).not.toContain('<name>')
    })

    it('includes extra headers', () => {
      const response = createJSONResponse({}, 'test.json', {
        headers: { 'X-Version': '2' },
      })

      expect(response.headers.get('X-Version')).toBe('2')
    })

    it('supports inline disposition', () => {
      const response = createJSONResponse({}, 'test.json', { disposition: 'inline' })

      const disposition = response.headers.get('Content-Disposition')
      expect(disposition).toContain('inline')
    })
  })

  describe('createFileResponse', () => {
    it('creates response with specified MIME type', () => {
      const content = new Uint8Array([1, 2, 3])
      const response = createFileResponse(content, 'file.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    })

    it('sets Content-Length for Uint8Array', () => {
      const content = new Uint8Array([1, 2, 3, 4])
      const response = createFileResponse(content, 'file.bin', 'application/octet-stream')

      expect(response.headers.get('Content-Length')).toBe('4')
    })

    it('sets Content-Length for string content', () => {
      const content = 'hello'
      const response = createFileResponse(content, 'file.txt', 'text/plain')

      // "hello" is 5 bytes in UTF-8
      expect(response.headers.get('Content-Length')).toBe('5')
    })

    it('sets Content-Length for ArrayBuffer', () => {
      const buffer = new ArrayBuffer(8)
      const response = createFileResponse(buffer, 'file.bin', 'application/octet-stream')

      expect(response.headers.get('Content-Length')).toBe('8')
    })

    it('sets attachment disposition by default', () => {
      const response = createFileResponse('data', 'file.txt', 'text/plain')

      const disposition = response.headers.get('Content-Disposition')
      expect(disposition).toContain('attachment')
    })

    it('supports inline disposition', () => {
      const response = createFileResponse('data', 'file.txt', 'text/plain', { disposition: 'inline' })

      const disposition = response.headers.get('Content-Disposition')
      expect(disposition).toContain('inline')
    })

    it('sanitizes filename', () => {
      const response = createFileResponse('data', 'bad/file:name.txt', 'text/plain')

      const disposition = response.headers.get('Content-Disposition')
      expect(disposition).not.toContain('/')
      expect(disposition).not.toContain(':')
    })

    it('includes extra headers', () => {
      const response = createFileResponse('data', 'file.txt', 'text/plain', {
        headers: { 'X-Custom': 'test' },
      })

      expect(response.headers.get('X-Custom')).toBe('test')
    })
  })

  describe('createStreamingResponse', () => {
    it('creates response with specified MIME type', () => {
      const stream = new ReadableStream()
      const response = createStreamingResponse(stream, 'large.zip', 'application/zip')

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/zip')
    })

    it('sets attachment disposition by default', () => {
      const stream = new ReadableStream()
      const response = createStreamingResponse(stream, 'file.zip', 'application/zip')

      const disposition = response.headers.get('Content-Disposition')
      expect(disposition).toContain('attachment')
      expect(disposition).toContain('file.zip')
    })

    it('sets Content-Length when provided', () => {
      const stream = new ReadableStream()
      const response = createStreamingResponse(stream, 'file.zip', 'application/zip', {
        contentLength: 1024,
      })

      expect(response.headers.get('Content-Length')).toBe('1024')
    })

    it('omits Content-Length when not provided', () => {
      const stream = new ReadableStream()
      const response = createStreamingResponse(stream, 'file.zip', 'application/zip')

      expect(response.headers.get('Content-Length')).toBeNull()
    })

    it('sets Cache-Control to no-cache', () => {
      const stream = new ReadableStream()
      const response = createStreamingResponse(stream, 'file.zip', 'application/zip')

      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
    })

    it('sanitizes filename', () => {
      const stream = new ReadableStream()
      const response = createStreamingResponse(stream, 'bad<file>.zip', 'application/zip')

      const disposition = response.headers.get('Content-Disposition')
      expect(disposition).not.toContain('<file>')
    })

    it('includes extra headers', () => {
      const stream = new ReadableStream()
      const response = createStreamingResponse(stream, 'file.zip', 'application/zip', {
        headers: { 'X-Stream-Id': 'abc' },
      })

      expect(response.headers.get('X-Stream-Id')).toBe('abc')
    })

    it('supports inline disposition', () => {
      const stream = new ReadableStream()
      const response = createStreamingResponse(stream, 'file.zip', 'application/zip', {
        disposition: 'inline',
      })

      const disposition = response.headers.get('Content-Disposition')
      expect(disposition).toContain('inline')
    })
  })
})

// ============================================================================
// CLIENT-SIDE: BLOB/CSV/JSON/TEXT DOWNLOAD (DOM-mocked)
// ============================================================================

import {
  downloadBlob,
  downloadContent,
  downloadCSV,
  downloadSimpleCSV,
  downloadJSON,
  downloadText,
} from '@/lib/download-utils'

describe('Client-side download functions', () => {
  let clickSpy: jest.SpyInstance

  beforeEach(() => {
    global.URL.createObjectURL = jest.fn(() => 'blob:fake-url')
    global.URL.revokeObjectURL = jest.fn()
    clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('downloadBlob', () => {
    it('creates an object URL and triggers a click', () => {
      const blob = new Blob(['hello'], { type: 'text/plain' })
      downloadBlob(blob, 'test.txt')

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob)
      expect(clickSpy).toHaveBeenCalled()
    })

    it('sets the download attribute on the link', () => {
      const links: HTMLAnchorElement[] = []
      const origCreate = document.createElement.bind(document)
      jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = origCreate(tag)
        if (tag === 'a') links.push(el as HTMLAnchorElement)
        return el
      })

      downloadBlob(new Blob(['data']), 'report.txt')

      expect(links[0]?.download).toBe('report.txt')
    })

    it('revokes the object URL after a delay', () => {
      jest.useFakeTimers()
      const blob = new Blob(['x'])
      downloadBlob(blob, 'x.txt')

      expect(global.URL.revokeObjectURL).not.toHaveBeenCalled()
      jest.advanceTimersByTime(100)
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-url')
      jest.useRealTimers()
    })
  })

  describe('downloadContent', () => {
    it('creates a blob with the given MIME type and triggers download', () => {
      downloadContent('col1,col2\n1,2', 'text/csv', 'data.csv')

      expect(global.URL.createObjectURL).toHaveBeenCalled()
      expect(clickSpy).toHaveBeenCalled()
    })
  })

  describe('downloadCSV', () => {
    it('builds CSV and triggers download', () => {
      const data = [{ name: 'Alice', age: 30 }]
      const columns = [
        { key: 'name' as const, header: 'Name' },
        { key: 'age' as const, header: 'Age' },
      ]
      downloadCSV(data, columns, 'export.csv')

      expect(clickSpy).toHaveBeenCalled()
    })
  })

  describe('downloadSimpleCSV', () => {
    it('calls downloadContent for empty data (early-return branch)', () => {
      downloadSimpleCSV([], 'empty.csv')

      expect(clickSpy).toHaveBeenCalled()
    })

    it('auto-detects columns from first row and downloads (capitalizes headers)', () => {
      const data = [
        { first_name: 'Alice', age: 25 },
        { first_name: 'Bob', age: 30 },
      ]
      downloadSimpleCSV(data, 'people.csv')

      expect(clickSpy).toHaveBeenCalled()
    })
  })

  describe('downloadJSON', () => {
    it('downloads pretty JSON by default', () => {
      downloadJSON({ key: 'value' }, 'data.json')

      expect(clickSpy).toHaveBeenCalled()
    })

    it('downloads compact JSON when pretty=false', () => {
      downloadJSON([1, 2, 3], 'data.json', false)

      expect(clickSpy).toHaveBeenCalled()
    })
  })

  describe('downloadText', () => {
    it('downloads text content', () => {
      downloadText('log line 1\nlog line 2', 'debug.txt')

      expect(clickSpy).toHaveBeenCalled()
    })
  })
})
