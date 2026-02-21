/**
 * Tests for structured logger utility
 */

// The logger suppresses output in test environment (isTest = true),
// so we test the internal behavior by spying on console methods
// and temporarily overriding NODE_ENV where needed.

describe('Logger', () => {
  let loggerModule: typeof import('@/lib/logger')

  beforeEach(() => {
    jest.resetModules()
  })

  describe('Logger class', () => {
    beforeEach(async () => {
      loggerModule = await import('@/lib/logger')
    })

    it('exports a singleton logger instance', () => {
      expect(loggerModule.logger).toBeDefined()
    })

    it('has all log level methods', () => {
      const { logger } = loggerModule
      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.error).toBe('function')
    })

    it('has a child method', () => {
      const { logger } = loggerModule
      expect(typeof logger.child).toBe('function')
    })

    it('creates child loggers', () => {
      const { logger } = loggerModule
      const child = logger.child('test-module')
      expect(child).toBeDefined()
      expect(typeof child.info).toBe('function')
      expect(typeof child.error).toBe('function')
      expect(typeof child.debug).toBe('function')
      expect(typeof child.warn).toBe('function')
    })

    it('child loggers can create nested children', () => {
      const { logger } = loggerModule
      const child = logger.child('parent')
      const grandchild = child.child('nested')
      expect(grandchild).toBeDefined()
      expect(typeof grandchild.info).toBe('function')
    })

    it('log methods do not throw in test environment', () => {
      const { logger } = loggerModule
      expect(() => logger.debug('test debug')).not.toThrow()
      expect(() => logger.info('test info')).not.toThrow()
      expect(() => logger.warn('test warn')).not.toThrow()
      expect(() => logger.error('test error')).not.toThrow()
    })

    it('log methods accept metadata', () => {
      const { logger } = loggerModule
      expect(() => logger.info('test', { key: 'value' })).not.toThrow()
      expect(() => logger.error('test', { errorCode: 500, details: 'fail' })).not.toThrow()
    })
  })

  describe('Named loggers', () => {
    beforeEach(async () => {
      loggerModule = await import('@/lib/logger')
    })

    it('exports authLogger', () => {
      expect(loggerModule.authLogger).toBeDefined()
      expect(typeof loggerModule.authLogger.info).toBe('function')
    })

    it('exports apiLogger', () => {
      expect(loggerModule.apiLogger).toBeDefined()
      expect(typeof loggerModule.apiLogger.info).toBe('function')
    })

    it('exports workflowLogger', () => {
      expect(loggerModule.workflowLogger).toBeDefined()
      expect(typeof loggerModule.workflowLogger.info).toBe('function')
    })

    it('exports cronLogger', () => {
      expect(loggerModule.cronLogger).toBeDefined()
      expect(typeof loggerModule.cronLogger.info).toBe('function')
    })

    it('exports dbLogger', () => {
      expect(loggerModule.dbLogger).toBeDefined()
      expect(typeof loggerModule.dbLogger.info).toBe('function')
    })
  })

  describe('extractErrorMeta', () => {
    beforeEach(async () => {
      loggerModule = await import('@/lib/logger')
    })

    it('extracts Error instance details', () => {
      const error = new Error('Something went wrong')
      const meta = loggerModule.extractErrorMeta(error)

      expect(meta.errorName).toBe('Error')
      expect(meta.errorMessage).toBe('Something went wrong')
    })

    it('extracts TypeError details', () => {
      const error = new TypeError('Cannot read property')
      const meta = loggerModule.extractErrorMeta(error)

      expect(meta.errorName).toBe('TypeError')
      expect(meta.errorMessage).toBe('Cannot read property')
    })

    it('handles string errors', () => {
      const meta = loggerModule.extractErrorMeta('string error')

      expect(meta.error).toBe('string error')
    })

    it('handles number errors', () => {
      const meta = loggerModule.extractErrorMeta(404)

      expect(meta.error).toBe('404')
    })

    it('handles null errors', () => {
      const meta = loggerModule.extractErrorMeta(null)

      expect(meta.error).toBe('null')
    })

    it('handles undefined errors', () => {
      const meta = loggerModule.extractErrorMeta(undefined)

      expect(meta.error).toBe('undefined')
    })

    it('handles object errors', () => {
      const meta = loggerModule.extractErrorMeta({ code: 500, msg: 'fail' })

      expect(meta.error).toBe('[object Object]')
    })

    it('does not include stack trace in non-development environment', () => {
      // In test environment, NODE_ENV is "test", not "development"
      const error = new Error('test error')
      const meta = loggerModule.extractErrorMeta(error)

      // stack should be undefined in non-development
      expect(meta.stack).toBeUndefined()
    })
  })

  describe('Logger output in non-test environment', () => {
    const originalEnv = process.env.NODE_ENV

    afterEach(() => {
      ;(process.env as Record<string, string>).NODE_ENV = originalEnv
      jest.resetModules()
    })

    it('silences all output in test environment', async () => {
      // Default environment is "test"
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation()
      const { logger } = await import('@/lib/logger')

      logger.info('should be silent')

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('outputs to console.info for info level in development', async () => {
      (process.env as Record<string, string>).NODE_ENV = 'development'
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation()
      const freshModule = await import('@/lib/logger')

      freshModule.logger.info('test message')

      expect(consoleSpy).toHaveBeenCalledTimes(1)
      const output = consoleSpy.mock.calls[0][0]
      expect(output).toContain('INFO')
      expect(output).toContain('test message')
      consoleSpy.mockRestore()
    })

    it('outputs to console.warn for warn level in development', async () => {
      (process.env as Record<string, string>).NODE_ENV = 'development'
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const freshModule = await import('@/lib/logger')

      freshModule.logger.warn('warning message')

      expect(consoleSpy).toHaveBeenCalledTimes(1)
      const output = consoleSpy.mock.calls[0][0]
      expect(output).toContain('WARN')
      expect(output).toContain('warning message')
      consoleSpy.mockRestore()
    })

    it('outputs to console.error for error level in development', async () => {
      (process.env as Record<string, string>).NODE_ENV = 'development'
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const freshModule = await import('@/lib/logger')

      freshModule.logger.error('error message')

      expect(consoleSpy).toHaveBeenCalledTimes(1)
      const output = consoleSpy.mock.calls[0][0]
      expect(output).toContain('ERROR')
      expect(output).toContain('error message')
      consoleSpy.mockRestore()
    })

    it('outputs to console.debug for debug level in development', async () => {
      (process.env as Record<string, string>).NODE_ENV = 'development'
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation()
      const freshModule = await import('@/lib/logger')

      freshModule.logger.debug('debug message')

      expect(consoleSpy).toHaveBeenCalledTimes(1)
      const output = consoleSpy.mock.calls[0][0]
      expect(output).toContain('DEBUG')
      expect(output).toContain('debug message')
      consoleSpy.mockRestore()
    })

    it('includes module prefix in child logger output', async () => {
      (process.env as Record<string, string>).NODE_ENV = 'development'
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation()
      const freshModule = await import('@/lib/logger')

      const child = freshModule.logger.child('auth')
      child.info('session created')

      expect(consoleSpy).toHaveBeenCalledTimes(1)
      const output = consoleSpy.mock.calls[0][0]
      expect(output).toContain('[auth]')
      expect(output).toContain('session created')
      consoleSpy.mockRestore()
    })

    it('includes nested module prefix in grandchild logger output', async () => {
      (process.env as Record<string, string>).NODE_ENV = 'development'
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation()
      const freshModule = await import('@/lib/logger')

      const grandchild = freshModule.logger.child('auth').child('session')
      grandchild.info('token refreshed')

      expect(consoleSpy).toHaveBeenCalledTimes(1)
      const output = consoleSpy.mock.calls[0][0]
      expect(output).toContain('[auth:session]')
      expect(output).toContain('token refreshed')
      consoleSpy.mockRestore()
    })

    it('includes structured metadata in output', async () => {
      (process.env as Record<string, string>).NODE_ENV = 'development'
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation()
      const freshModule = await import('@/lib/logger')

      freshModule.logger.info('user action', { userId: '123', action: 'login' })

      expect(consoleSpy).toHaveBeenCalledTimes(1)
      const output = consoleSpy.mock.calls[0][0]
      expect(output).toContain('user action')
      expect(output).toContain('"userId":"123"')
      expect(output).toContain('"action":"login"')
      consoleSpy.mockRestore()
    })

    it('includes timestamp in output', async () => {
      (process.env as Record<string, string>).NODE_ENV = 'development'
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation()
      const freshModule = await import('@/lib/logger')

      freshModule.logger.info('test')

      expect(consoleSpy).toHaveBeenCalledTimes(1)
      const output = consoleSpy.mock.calls[0][0]
      // ISO timestamp format: 2026-02-21T...
      expect(output).toMatch(/\d{4}-\d{2}-\d{2}T/)
      consoleSpy.mockRestore()
    })

    it('does not include metadata when none provided', async () => {
      (process.env as Record<string, string>).NODE_ENV = 'development'
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation()
      const freshModule = await import('@/lib/logger')

      freshModule.logger.info('simple message')

      expect(consoleSpy).toHaveBeenCalledTimes(1)
      const output = consoleSpy.mock.calls[0][0]
      expect(output).toContain('simple message')
      // Should not have JSON metadata appended
      expect(output).not.toContain('{')
      consoleSpy.mockRestore()
    })

    it('does not include metadata when empty object provided', async () => {
      (process.env as Record<string, string>).NODE_ENV = 'development'
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation()
      const freshModule = await import('@/lib/logger')

      freshModule.logger.info('simple message', {})

      expect(consoleSpy).toHaveBeenCalledTimes(1)
      const output = consoleSpy.mock.calls[0][0]
      // Empty meta should not produce JSON
      expect(output).not.toContain('{}')
      consoleSpy.mockRestore()
    })

    it('suppresses debug logs in production', async () => {
      (process.env as Record<string, string>).NODE_ENV = 'production'
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation()
      const infoSpy = jest.spyOn(console, 'info').mockImplementation()
      const freshModule = await import('@/lib/logger')

      freshModule.logger.debug('should not appear')
      freshModule.logger.info('should appear')

      // debug should be suppressed in production (minLevel = info)
      // but since isTest is false, info should appear
      expect(debugSpy).not.toHaveBeenCalled()
      expect(infoSpy).toHaveBeenCalledTimes(1)
      debugSpy.mockRestore()
      infoSpy.mockRestore()
    })
  })
})
