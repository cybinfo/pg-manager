import '@testing-library/jest-dom'

// Mock global Request for rate-limit tests
class MockHeaders {
  constructor(init = {}) {
    this._headers = new Map()
    if (init) {
      Object.entries(init).forEach(([key, value]) => {
        this._headers.set(key.toLowerCase(), value)
      })
    }
  }
  get(name) {
    return this._headers.get(name.toLowerCase()) || null
  }
  set(name, value) {
    this._headers.set(name.toLowerCase(), value)
  }
  entries() {
    return this._headers.entries()
  }
}

class MockRequest {
  constructor(url, init = {}) {
    this.url = url
    this.method = init.method || 'GET'
    this.headers = new MockHeaders(init.headers || {})
    this._body = init.body || null
  }

  async json() {
    return JSON.parse(this._body)
  }
}

class MockResponse {
  constructor(body, init = {}) {
    this._body = body
    this.status = init.status || 200
    this.statusText = init.statusText || ''
    this.headers = new MockHeaders(init.headers || {})
    this.body = body
  }

  async json() {
    if (typeof this._body === 'string') {
      return JSON.parse(this._body)
    }
    return this._body
  }
}

// Make Request and Response available globally
global.Request = MockRequest
global.Response = MockResponse
global.Headers = MockHeaders

// Mock NextResponse for API testing
jest.mock('next/server', () => {
  class MockHeaders {
    constructor(init = {}) {
      this._headers = new Map(Object.entries(init))
    }
    get(name) {
      return this._headers.get(name) || null
    }
    set(name, value) {
      this._headers.set(name, value)
    }
  }

  class MockNextResponse {
    constructor(body, init = {}) {
      this._body = body
      this.status = init.status || 200
      this.headers = new MockHeaders(init.headers || {})
    }

    async json() {
      return JSON.parse(this._body)
    }

    static json(data, init = {}) {
      return new MockNextResponse(JSON.stringify(data), init)
    }
  }

  return {
    NextResponse: MockNextResponse,
    NextRequest: class MockNextRequest {
      constructor(url, init = {}) {
        this.url = url
        this.method = init.method || 'GET'
        this.headers = new MockHeaders(init.headers || {})
      }
    },
  }
})

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Suppress console errors in tests (optional - comment out for debugging)
// global.console.error = jest.fn()
