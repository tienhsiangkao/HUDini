// utils/validators.cjs
// Input validation utilities for IPC handlers

const { logger } = require('../lib/logger.cjs');
const validatorLogger = logger.child('Validator');

/**
 * Custom error class for validation failures.
 * Extends Error with field property for identifying which field failed validation.
 * 
 * @class ValidationError
 * @extends Error
 * @property {string} name - Error name ('ValidationError')
 * @property {string} field - Name of the field that failed validation
 */
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Validate an array of hand IDs for batch operations.
 * Ensures handIds is an array of non-empty strings within size limit.
 * 
 * @param {Array<string>} handIds - Array of hand ID strings to validate
 * @param {object} [options={}] - Validation options
 * @param {number} [options.maxBatchSize=1000] - Maximum allowed batch size
 * @returns {Array<string>} Validated array of hand IDs
 * @throws {ValidationError} If validation fails (not array, empty, too large, invalid IDs)
 * 
 * @example
 * const validIds = validateHandIds(['RC123', 'RC456']); // ['RC123', 'RC456']
 * validateHandIds([]); // throws ValidationError: handIds array cannot be empty
 * validateHandIds('RC123'); // throws ValidationError: handIds must be an array
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
 * Validate annotation data for create/update operations.
 * Checks timestamp, date, and label fields for correct types.
 * 
 * @param {object} data - Annotation data to validate
 * @param {number} [data.ts] - Unix timestamp in milliseconds
 * @param {string} [data.date] - Date string (ISO format)
 * @param {string} [data.label] - Annotation label text
 * @returns {boolean} True if validation passes
 * @throws {ValidationError} If any field has invalid type
 * 
 * @example
 * validateAnnotation({ ts: 1699564800000, label: 'Session start' }); // true
 * validateAnnotation({ ts: 'invalid' }); // throws ValidationError
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
 * Validate and normalize pagination options (limit and offset).
 * Ensures limit is between 1-10000 and offset is non-negative.
 * 
 * @param {object} options - Pagination options
 * @param {number} [options.limit=300] - Maximum results to return
 * @param {number} [options.offset=0] - Number of results to skip
 * @returns {object} Normalized pagination with {limit, offset}
 * @throws {ValidationError} If limit or offset are invalid
 * 
 * @example
 * validatePagination({ limit: 50, offset: 100 }); // { limit: 50, offset: 100 }
 * validatePagination({ limit: '50' }); // { limit: 50, offset: 0 } (parses strings)
 * validatePagination({ limit: 20000 }); // throws ValidationError
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
 * Validate and parse date range (from and to dates).
 * Accepts ISO date strings or null, ensures 'from' is not after 'to'.
 * 
 * @param {string|null} from - Start date (ISO format) or null
 * @param {string|null} to - End date (ISO format) or null
 * @returns {object} Parsed date range with {fromTs, toTs} in milliseconds or null
 * @throws {ValidationError} If dates are invalid or from > to
 * 
 * @example
 * validateDateRange('2024-01-01', '2024-12-31'); // { fromTs: 1704067200000, toTs: 1735603200000 }
 * validateDateRange(null, null); // { fromTs: null, toTs: null }
 * validateDateRange('2024-12-31', '2024-01-01'); // throws ValidationError
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
 * Validate and parse poker stake format (e.g., "0.25/0.50").
 * Returns null for "all" or empty stake, otherwise parses small blind / big blind values.
 * 
 * @param {string|null} stake - Stake string in format "sb/bb" (e.g., "0.25/0.50"), "all", or null
 * @returns {object|null} Parsed stake with {sb, bb} numbers, or null if stake is "all" or empty
 * @throws {ValidationError} If stake format is invalid or values are negative
 * 
 * @example
 * validateStake('0.25/0.50'); // { sb: 0.25, bb: 0.50 }
 * validateStake('all'); // null
 * validateStake('invalid'); // throws ValidationError
 * validateStake('0.25/-0.50'); // throws ValidationError (negative bb)
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
 * Validate sort options for database queries.
 * Returns default values ('date' field, 'desc' direction) if not provided.
 * 
 * @param {string} [sortField] - Field to sort by (date, net, stakes, table, id)
 * @param {string} [sortDir] - Sort direction (asc or desc)
 * @returns {object} Validated sort options with {field, dir}
 * @throws {ValidationError} If sortField or sortDir are invalid
 * 
 * @example
 * validateSort('date', 'desc'); // { field: 'date', dir: 'desc' }
 * validateSort(); // { field: 'date', dir: 'desc' } (defaults)
 * validateSort('net', 'asc'); // { field: 'net', dir: 'asc' }
 * validateSort('invalid', 'desc'); // throws ValidationError
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
 * Safe wrapper for validation functions.
 * Catches ValidationError and returns a result object instead of throwing.
 * 
 * @param {Function} validatorFn - Validation function to execute
 * @param {*} data - Data to validate
 * @param {string} [fieldName='input'] - Field name for error logging
 * @returns {object} Result object with {success, data} or {success, error, field}
 * 
 * @example
 * validateSafe(validateHandIds, ['hand1', 'hand2']); // { success: true, data: [...] }
 * validateSafe(validateHandIds, 'invalid'); // { success: false, error: 'handIds must be an array', field: 'handIds' }
 * 
 * @private
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
