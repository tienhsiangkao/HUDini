// tests/validators.test.js
// Unit tests for validation utilities

import { describe, test, expect } from 'vitest';
const {
  validateHandIds,
  validateAnnotation,
  validatePagination,
  validateDateRange,
  validateStake,
  validateSort,
  ValidationError,
} = require('../utils/validators.cjs');

describe('Validators', () => {
  describe('validateHandIds', () => {
    test('should accept valid hand IDs array', () => {
      const ids = ['hand1', 'hand2', 'hand3'];
      expect(validateHandIds(ids)).toEqual(ids);
    });

    test('should reject non-array input', () => {
      expect(() => validateHandIds('not-an-array')).toThrow(ValidationError);
      expect(() => validateHandIds('not-an-array')).toThrow('must be an array');
    });

    test('should reject empty array', () => {
      expect(() => validateHandIds([])).toThrow(ValidationError);
      expect(() => validateHandIds([])).toThrow('cannot be empty');
    });

    test('should reject arrays exceeding max batch size', () => {
      const largeArray = Array(1001).fill('hand');
      expect(() => validateHandIds(largeArray)).toThrow(ValidationError);
      expect(() => validateHandIds(largeArray)).toThrow('Cannot process more than');
    });

    test('should reject non-string IDs', () => {
      expect(() => validateHandIds([123, 'hand2'])).toThrow(ValidationError);
      expect(() => validateHandIds(['hand1', ''])).toThrow(ValidationError);
    });

    test('should accept custom max batch size', () => {
      const ids = Array(50).fill('hand');
      expect(() => validateHandIds(ids, { maxBatchSize: 10 })).toThrow();
      expect(validateHandIds(ids, { maxBatchSize: 100 })).toEqual(ids);
    });
  });

  describe('validatePagination', () => {
    test('should return default values when not provided', () => {
      expect(validatePagination({})).toEqual({ limit: 300, offset: 0 });
    });

    test('should accept valid limit and offset', () => {
      expect(validatePagination({ limit: 50, offset: 100 }))
        .toEqual({ limit: 50, offset: 100 });
    });

    test('should reject limit out of bounds', () => {
      expect(() => validatePagination({ limit: 0 })).toThrow(ValidationError);
      expect(() => validatePagination({ limit: 10001 })).toThrow(ValidationError);
    });

    test('should reject negative offset', () => {
      expect(() => validatePagination({ offset: -1 })).toThrow(ValidationError);
    });

    test('should parse string numbers', () => {
      expect(validatePagination({ limit: '50', offset: '10' }))
        .toEqual({ limit: 50, offset: 10 });
    });
  });

  describe('validateDateRange', () => {
    test('should handle valid date strings', () => {
      const result = validateDateRange('2024-01-01', '2024-12-31');
      expect(result.fromTs).toBeTypeOf('number');
      expect(result.toTs).toBeTypeOf('number');
      expect(result.fromTs).toBeLessThan(result.toTs);
    });

    test('should handle null dates', () => {
      const result = validateDateRange(null, null);
      expect(result.fromTs).toBeNull();
      expect(result.toTs).toBeNull();
    });

    test('should reject invalid date format', () => {
      expect(() => validateDateRange('not-a-date', null)).toThrow(ValidationError);
    });

    test('should reject from > to', () => {
      expect(() => validateDateRange('2024-12-31', '2024-01-01')).toThrow(ValidationError);
      expect(() => validateDateRange('2024-12-31', '2024-01-01'))
        .toThrow('from date must be before to date');
    });
  });

  describe('validateStake', () => {
    test('should return null for "all" or empty stake', () => {
      expect(validateStake('all')).toBeNull();
      expect(validateStake(null)).toBeNull();
      expect(validateStake('')).toBeNull();
    });

    test('should parse valid stake format', () => {
      expect(validateStake('0.25/0.50')).toEqual({ sb: 0.25, bb: 0.50 });
      expect(validateStake('1/2')).toEqual({ sb: 1, bb: 2 });
    });

    test('should reject invalid format', () => {
      expect(() => validateStake('0.25')).toThrow(ValidationError);
      expect(() => validateStake('0.25/0.50/extra')).toThrow(ValidationError);
    });

    test('should reject non-numeric values', () => {
      expect(() => validateStake('abc/def')).toThrow(ValidationError);
    });

    test('should reject negative values', () => {
      expect(() => validateStake('-1/2')).toThrow(ValidationError);
    });
  });

  describe('validateSort', () => {
    test('should return default values', () => {
      expect(validateSort()).toEqual({ field: 'date', dir: 'desc' });
    });

    test('should accept valid sort fields', () => {
      expect(validateSort('net', 'asc')).toEqual({ field: 'net', dir: 'asc' });
      expect(validateSort('stakes', 'DESC')).toEqual({ field: 'stakes', dir: 'desc' });
    });

    test('should reject invalid field', () => {
      expect(() => validateSort('invalid')).toThrow(ValidationError);
    });

    test('should reject invalid direction', () => {
      expect(() => validateSort('date', 'invalid')).toThrow(ValidationError);
    });
  });

  describe('validateAnnotation', () => {
    test('should accept valid annotation data', () => {
      expect(validateAnnotation({
        ts: 1234567890,
        date: '2024-01-01',
        label: 'Test annotation',
      })).toBe(true);
    });

    test('should reject invalid timestamp', () => {
      expect(() => validateAnnotation({ ts: 'not-a-number' })).toThrow(ValidationError);
      expect(() => validateAnnotation({ ts: NaN })).toThrow(ValidationError);
    });

    test('should reject invalid date type', () => {
      expect(() => validateAnnotation({ date: 123 })).toThrow(ValidationError);
    });

    test('should reject invalid label type', () => {
      expect(() => validateAnnotation({ label: 123 })).toThrow(ValidationError);
    });

    test('should allow undefined fields', () => {
      expect(validateAnnotation({})).toBe(true);
    });
  });
});
