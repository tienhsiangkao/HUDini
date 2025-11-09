// utils/validators.cjs
// Input validation utilities for IPC handlers

const { logger } = require('../lib/logger.cjs');
const validatorLogger = logger.child('Validator');

/**
 * Validation error class
 */
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Validate hand IDs array
 */
function validateHandIds(handIds, options = {}) {
  const { maxBatchSize = 1000 } = options;

  if (!Array.isArray(handIds)) {
    throw new ValidationError('handIds must be an array', 'handIds');
  }

  if (handIds.length === 0) {
    throw new ValidationError('handIds array cannot be empty', 'handIds');
  }

  if (handIds.length > maxBatchSize) {
    throw new ValidationError(`Cannot process more than ${maxBatchSize} hands at once`, 'handIds');
  }

  const validIds = handIds.filter(id => typeof id === 'string' && id.length > 0);
  
  if (validIds.length !== handIds.length) {
    throw new ValidationError('All hand IDs must be non-empty strings', 'handIds');
  }

  return validIds;
}

/**
 * Validate annotation data
 */
function validateAnnotation(data) {
  const { ts, date, label } = data;

  if (ts !== undefined && (typeof ts !== 'number' || !Number.isFinite(ts))) {
    throw new ValidationError('ts must be a valid number', 'ts');
  }

  if (date !== undefined && typeof date !== 'string') {
    throw new ValidationError('date must be a string', 'date');
  }

  if (label !== undefined && typeof label !== 'string') {
    throw new ValidationError('label must be a string', 'label');
  }

  return true;
}

/**
 * Validate pagination options
 */
function validatePagination(options) {
  const { limit = 300, offset = 0 } = options;

  const validLimit = Number(limit);
  const validOffset = Number(offset);

  if (!Number.isFinite(validLimit) || validLimit < 1 || validLimit > 10000) {
    throw new ValidationError('limit must be between 1 and 10000', 'limit');
  }

  if (!Number.isFinite(validOffset) || validOffset < 0) {
    throw new ValidationError('offset must be a non-negative number', 'offset');
  }

  return { limit: validLimit, offset: validOffset };
}

/**
 * Validate date range
 */
function validateDateRange(from, to) {
  let fromTs = null;
  let toTs = null;

  if (from) {
    fromTs = Date.parse(from);
    if (!Number.isFinite(fromTs)) {
      throw new ValidationError('Invalid from date format', 'from');
    }
  }

  if (to) {
    toTs = Date.parse(to);
    if (!Number.isFinite(toTs)) {
      throw new ValidationError('Invalid to date format', 'to');
    }
  }

  if (fromTs && toTs && fromTs > toTs) {
    throw new ValidationError('from date must be before to date', 'dateRange');
  }

  return { fromTs, toTs };
}

/**
 * Validate stake format (e.g., "0.25/0.50")
 */
function validateStake(stake) {
  if (!stake || stake === 'all') {
    return null;
  }

  if (typeof stake !== 'string') {
    throw new ValidationError('stake must be a string', 'stake');
  }

  const parts = stake.split('/');
  if (parts.length !== 2) {
    throw new ValidationError('stake must be in format "sb/bb" (e.g., "0.25/0.50")', 'stake');
  }

  const sb = Number(parts[0]);
  const bb = Number(parts[1]);

  if (!Number.isFinite(sb) || sb < 0) {
    throw new ValidationError('Invalid small blind value', 'stake');
  }

  if (!Number.isFinite(bb) || bb < 0) {
    throw new ValidationError('Invalid big blind value', 'stake');
  }

  return { sb, bb };
}

/**
 * Validate sort options
 */
function validateSort(sortField, sortDir) {
  const ALLOWED_SORT_FIELDS = ['date', 'net', 'stakes', 'table', 'id'];
  const ALLOWED_SORT_DIRS = ['asc', 'desc'];

  const field = sortField || 'date';
  const dir = (sortDir || 'desc').toLowerCase();

  if (!ALLOWED_SORT_FIELDS.includes(field)) {
    throw new ValidationError(`sortField must be one of: ${ALLOWED_SORT_FIELDS.join(', ')}`, 'sortField');
  }

  if (!ALLOWED_SORT_DIRS.includes(dir)) {
    throw new ValidationError('sortDir must be either "asc" or "desc"', 'sortDir');
  }

  return { field, dir };
}

/**
 * Safe wrapper for validation functions
 */
function validateSafe(validatorFn, data, fieldName = 'input') {
  try {
    return {
      success: true,
      data: validatorFn(data),
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      validatorLogger.warn('Validation failed', { 
        field: error.field, 
        message: error.message,
        data: typeof data === 'object' ? JSON.stringify(data) : data,
      });
      return {
        success: false,
        error: error.message,
        field: error.field,
      };
    }
    
    validatorLogger.error('Unexpected validation error', { error: error.message });
    return {
      success: false,
      error: 'Validation failed',
    };
  }
}

module.exports = {
  ValidationError,
  validateHandIds,
  validateAnnotation,
  validatePagination,
  validateDateRange,
  validateStake,
  validateSort,
  validateSafe,
};
