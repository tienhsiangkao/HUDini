// tests/logger.test.js
// Unit tests for logging utility

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
const { Logger, logger, createLogger } = require('../lib/logger.cjs');

describe('Logger', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    originalEnv = process.env.LOG_LEVEL;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    process.env.LOG_LEVEL = originalEnv;
  });

  describe('Log Levels', () => {
    test('should create logger with default level', () => {
      const testLogger = new Logger();
      expect(testLogger.minLevel).toBeDefined();
    });

    test('should respect LOG_LEVEL environment variable', () => {
      process.env.LOG_LEVEL = 'ERROR';
      const testLogger = new Logger();
      expect(testLogger.minLevel).toBe(0); // ERROR level
    });

    test('should use DEBUG level in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.LOG_LEVEL;
      const testLogger = new Logger();
      expect(testLogger.minLevel).toBe(3); // DEBUG level
    });

    test('should use WARN level in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.LOG_LEVEL;
      const testLogger = new Logger();
      expect(testLogger.minLevel).toBe(1); // WARN level
    });
  });

  describe('Logging Methods', () => {
    test('should have error, warn, info, debug methods', () => {
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    test('should not log below minimum level', () => {
      const testLogger = new Logger({ level: 'ERROR' });
      const consoleSpy = vi.spyOn(console, 'log');
      
      testLogger.debug('This should not log');
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    test('should log at or above minimum level', () => {
      const testLogger = new Logger({ level: 'ERROR' });
      const consoleSpy = vi.spyOn(console, 'error');
      
      testLogger.error('This should log');
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Child Logger', () => {
    test('should create child logger with additional context', () => {
      const parentLogger = new Logger({ context: 'Parent' });
      const childLogger = parentLogger.child('Child');
      
      expect(childLogger.context).toBe('Parent:Child');
    });

    test('should inherit log level from parent', () => {
      const parentLogger = new Logger({ level: 'WARN' });
      const childLogger = parentLogger.child('Child');
      
      expect(childLogger.minLevel).toBe(parentLogger.minLevel);
    });
  });

  describe('Message Formatting', () => {
    test('should format message with timestamp and level', () => {
      const testLogger = new Logger({ useColors: false });
      const formatted = testLogger.formatMessage('INFO', 'Test message', {});
      
      expect(formatted).toContain('INFO');
      expect(formatted).toContain('Test message');
      expect(formatted).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp
    });

    test('should include context in formatted message', () => {
      const testLogger = new Logger({ context: 'TestContext', useColors: false });
      const formatted = testLogger.formatMessage('INFO', 'Test message', {});
      
      expect(formatted).toContain('[TestContext]');
    });

    test('should include data object when provided', () => {
      const testLogger = new Logger({ useColors: false });
      const formatted = testLogger.formatMessage('INFO', 'Test message', { key: 'value' });
      
      expect(formatted).toContain('Data:');
      expect(formatted).toContain('key');
      expect(formatted).toContain('value');
    });
  });

  describe('Factory Function', () => {
    test('should create new logger instance', () => {
      const newLogger = createLogger({ level: 'DEBUG' });
      expect(newLogger).toBeInstanceOf(Logger);
    });

    test('should allow custom options', () => {
      const newLogger = createLogger({ context: 'Custom', level: 'ERROR' });
      expect(newLogger.context).toBe('Custom');
      expect(newLogger.minLevel).toBe(0); // ERROR level
    });
  });
});
