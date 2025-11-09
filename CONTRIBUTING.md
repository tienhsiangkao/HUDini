# Contributing to HUDini

Thank you for your interest in contributing to HUDini! This guide will help you get started with development.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Requirements](#testing-requirements)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Development Workflow](#development-workflow)

---

## Development Setup

### Prerequisites

- **Node.js**: v18.0.0 or higher (v22.19.0 recommended)
- **npm**: v9.0.0 or higher
- **Git**: Latest version
- **Operating System**: Windows, macOS, or Linux

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/tienhsiangkao/HUDini.git
   cd HUDini
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Rebuild native modules:**
   ```bash
   npm run rebuild:electron  # For Electron
   npm run rebuild:node      # For Node.js testing
   ```

4. **Set up environment variables (optional):**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

### Running the Application

```bash
npm start                    # Start Electron app
npm run dev                  # Start in development mode (if configured)
```

### Running Tests

```bash
npm test                     # Run all tests
npm test -- --watch          # Run in watch mode
npm test -- --run            # Run once without watch
npm run test:coverage        # Generate coverage report
```

---

## Project Structure

```
HUDini/
├── handlers/               # IPC handler modules (8 modules)
│   ├── hands-handlers.cjs
│   ├── stats-handlers.cjs
│   ├── annotations-handlers.cjs
│   ├── sessions-handlers.cjs
│   ├── ui-handlers.cjs
│   ├── db-handlers.cjs
│   ├── import-handlers.cjs
│   └── reports-handlers.cjs
├── utils/                  # Utility modules (5 modules)
│   ├── validators.cjs      # Input validation
│   ├── metrics.cjs         # Statistics calculations
│   ├── aggregators.cjs     # Data aggregation
│   ├── file-parsing.cjs    # File format detection
│   └── file-system.cjs     # Directory scanning
├── lib/                    # Core library modules
│   ├── ocr_processor.cjs
│   ├── screen_scraper.cjs
│   └── live_tracker.cjs
├── renderer/               # Frontend React components
├── tests/                  # Test suites
│   ├── handlers/          # Handler tests
│   ├── frontend/          # Frontend component tests
│   └── *.test.js
├── config/                 # Configuration management
│   └── index.cjs
├── electron-main.cjs       # Electron main process
├── preload.cjs            # Preload script
└── package.json
```

### Key Directories

- **handlers/**: All IPC handlers for Electron communication
- **utils/**: Shared utility functions used across the application
- **tests/**: Test files organized by module
- **renderer/**: React frontend code
- **lib/**: Core functionality (OCR, screen scraping, live tracking)

---

## Code Style Guidelines

### JavaScript/Node.js

1. **Use CommonJS modules** (`.cjs` extension)
   ```javascript
   const { something } = require('./module.cjs');
   module.exports = { something };
   ```

2. **Use strict mode:**
   ```javascript
   'use strict';
   ```

3. **Prefer `const` over `let`**, never use `var`
   ```javascript
   const maxRetries = 3;
   let counter = 0;
   ```

4. **Use arrow functions** for callbacks and anonymous functions
   ```javascript
   const doubled = numbers.map(n => n * 2);
   ```

5. **Use template literals** for string interpolation
   ```javascript
   console.log(`Processing ${files.length} files`);
   ```

### JSDoc Documentation

**All functions MUST include comprehensive JSDoc comments.** This is a strict requirement.

#### Function Documentation Template

```javascript
/**
 * Brief description of what the function does.
 * 
 * More detailed explanation if needed, including:
 * - Important behaviors
 * - Side effects
 * - Performance considerations
 * 
 * @param {string} paramName - Description of parameter
 * @param {object} options - Options object
 * @param {number} [options.limit=100] - Optional parameter with default
 * @param {boolean} [options.validate=true] - Another optional parameter
 * @returns {Promise<object>} Description of return value
 * @returns {Promise<object>} result - Result object
 * @returns {boolean} result.success - Whether operation succeeded
 * @returns {Array<string>} result.data - Array of results
 * 
 * @throws {Error} When validation fails
 * 
 * @example
 * const result = await processData('input', { limit: 50 });
 * if (result.success) {
 *   console.log(result.data);
 * }
 * 
 * @private  // Use for internal functions
 */
function processData(paramName, options = {}) {
  // Implementation
}
```

#### Required JSDoc Tags

- `@param`: Document ALL parameters (required and optional)
- `@returns`: Describe return value and structure
- `@example`: Provide realistic usage example
- `@throws`: Document exceptions thrown
- `@private`: Mark internal/helper functions

#### JSDoc Best Practices

1. **Use `@property` for complex return objects:**
   ```javascript
   /**
    * @returns {object} Result object
    * @property {boolean} success - Operation status
    * @property {Array<object>} data - Result data
    * @property {number} total - Total count
    */
   ```

2. **Document optional parameters with defaults:**
   ```javascript
   /**
    * @param {number} [limit=100] - Maximum results (default: 100, max: 1000)
    */
   ```

3. **Provide meaningful examples:**
   ```javascript
   /**
    * @example
    * // Get hands from last 7 days
    * const hands = await getHands({
    *   from: '2025-11-03',
    *   to: '2025-11-10',
    *   limit: 100
    * });
    */
   ```

4. **Use TypeScript-style type annotations:**
   ```javascript
   /**
    * @param {Array<string>} handIds - Array of hand IDs
    * @param {'asc'|'desc'} [direction='desc'] - Sort direction
    * @returns {Promise<Array<{id: string, net: number}>>}
    */
   ```

### Naming Conventions

- **Functions/Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Classes**: `PascalCase`
- **Private functions**: Prefix with underscore `_privateFunction`
- **IPC handlers**: Use colon notation `'module:action'`

### Error Handling

1. **Always return structured responses:**
   ```javascript
   return { success: true, data: result };
   // or
   return { success: false, error: 'Error message', code: 'ERROR_CODE' };
   ```

2. **Use try-catch for async operations:**
   ```javascript
   try {
     const result = await someOperation();
     return { success: true, data: result };
   } catch (error) {
     logger.error('Operation failed', { error: error.message });
     return { success: false, error: error.message };
   }
   ```

3. **Validate inputs early:**
   ```javascript
   if (!Array.isArray(handIds)) {
     return { success: false, error: 'handIds must be an array' };
   }
   ```

### Logging

Use the centralized logger with appropriate levels:

```javascript
const logger = require('./utils/logger.cjs');

logger.error('Critical error', { error: error.message });
logger.warn('Warning message', { context: 'value' });
logger.info('Informational message', { count: 42 });
logger.debug('Debug details', { data: result });
```

---

## Testing Requirements

### Coverage Requirements

- **Minimum overall coverage: 96%**
- **Handler functions: 100% coverage required**
- **Utility functions: 95% coverage required**
- **New code: Must maintain or improve coverage**

### Test Structure

```javascript
const { describe, it, expect, beforeEach, afterEach } = require('vitest');

describe('ModuleName', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('functionName', () => {
    it('should handle normal case', () => {
      const result = functionName('input');
      expect(result).toBe('expected');
    });

    it('should handle edge case', () => {
      const result = functionName(null);
      expect(result).toBe(null);
    });

    it('should throw error for invalid input', () => {
      expect(() => functionName('invalid')).toThrow();
    });
  });
});
```

### Test Best Practices

1. **Test file naming**: `*.test.js` (e.g., `validators.test.js`)
2. **One test file per module**
3. **Test both success and error cases**
4. **Test edge cases and boundary conditions**
5. **Use descriptive test names** starting with "should"
6. **Mock external dependencies** (database, filesystem, etc.)
7. **Clean up resources** in `afterEach` hooks

### Running Tests Before Commit

```bash
npm test -- --run        # Must pass all tests
npm run test:coverage    # Check coverage meets requirements
```

---

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, semicolons, etc.)
- **refactor**: Code refactoring (no functional changes)
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Build process, dependencies, tooling
- **ci**: CI/CD configuration changes

### Scopes (Optional)

Use module names as scopes:
- `handlers`
- `utils`
- `frontend`
- `tests`
- `config`
- `db`

### Examples

```bash
# Feature
git commit -m "feat(handlers): add position profitability report handler"

# Bug fix
git commit -m "fix(validators): handle null values in date range validation"

# Documentation
git commit -m "docs: add JSDoc to all utility functions"

# Refactor with body
git commit -m "refactor(handlers): extract common validation logic

Extract repeated validation patterns into validateHandsInput utility.
Reduces code duplication across 5 handlers."

# Breaking change
git commit -m "feat(api): change hands:list response format

BREAKING CHANGE: Response now returns { success, data, total }
instead of raw array. Update all renderer calls."
```

### Commit Guidelines

1. **Use present tense**: "add feature" not "added feature"
2. **Use imperative mood**: "fix bug" not "fixes bug"
3. **Keep subject under 72 characters**
4. **Capitalize first letter of subject**
5. **No period at end of subject**
6. **Add body for complex changes** (blank line after subject)
7. **Reference issues**: "Fixes #123" or "Closes #456"

---

## Pull Request Process

### Before Submitting

1. **Create a feature branch:**
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Write tests** for new functionality

3. **Run the test suite:**
   ```bash
   npm test -- --run
   ```

4. **Check code coverage:**
   ```bash
   npm run test:coverage
   ```

5. **Ensure JSDoc documentation** is complete

6. **Verify the app runs:**
   ```bash
   npm start
   ```

7. **Update documentation** if needed (README, API_REFERENCE)

### PR Guidelines

1. **Clear title** following commit conventions:
   - `feat: Add position profitability analysis`
   - `fix: Handle null values in session detection`

2. **Comprehensive description:**
   - What changes were made
   - Why the changes were necessary
   - How to test the changes
   - Any breaking changes

3. **Link related issues:**
   - `Fixes #123`
   - `Closes #456`
   - `Related to #789`

4. **Screenshots/Videos** for UI changes

5. **Checklist:**
   - [ ] Tests added/updated
   - [ ] All tests passing
   - [ ] Coverage maintained/improved
   - [ ] JSDoc documentation complete
   - [ ] No console.log statements
   - [ ] No commented-out code
   - [ ] Documentation updated

### PR Template

```markdown
## Description
Brief description of changes

## Motivation
Why are these changes needed?

## Changes
- Added X feature
- Fixed Y bug
- Refactored Z module

## Testing
How to test these changes:
1. Step 1
2. Step 2
3. Expected result

## Screenshots
(if applicable)

## Breaking Changes
(if any)

## Checklist
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] Coverage ≥96%
- [ ] JSDoc complete
- [ ] Documentation updated
```

### Code Review Process

1. **At least one approval** required
2. **All tests must pass** (CI/CD)
3. **No merge conflicts**
4. **Address reviewer feedback**
5. **Squash commits** before merging (optional)

---

## Development Workflow

### 1. Pick an Issue

- Check [Issues](https://github.com/tienhsiangkao/HUDini/issues) for open tasks
- Comment on the issue to claim it
- Ask questions if requirements are unclear

### 2. Create Feature Branch

```bash
git checkout -b feat/issue-123-add-feature
```

### 3. Develop with TDD (Test-Driven Development)

```bash
# 1. Write test
npm test -- --watch tests/your-module.test.js

# 2. Write implementation
# 3. Verify tests pass
# 4. Refactor if needed
```

### 4. Write JSDoc

Add comprehensive documentation as you code:

```javascript
/**
 * Calculate win rate percentage.
 * 
 * @param {number} wins - Number of wins
 * @param {number} total - Total number of hands
 * @returns {number} Win rate as percentage (0-100)
 * 
 * @example
 * const winRate = calculateWinRate(75, 100);
 * console.log(winRate); // 75
 */
function calculateWinRate(wins, total) {
  if (total === 0) return 0;
  return (wins / total) * 100;
}
```

### 5. Commit Frequently

```bash
git add .
git commit -m "feat(handlers): add win rate calculation"
```

### 6. Keep Branch Updated

```bash
git fetch origin
git rebase origin/main
```

### 7. Push and Create PR

```bash
git push origin feat/issue-123-add-feature
# Create PR on GitHub
```

### 8. Address Review Feedback

```bash
# Make changes
git add .
git commit -m "refactor: address PR feedback"
git push
```

---

## Performance Guidelines

1. **Use database indexes** for frequently queried fields
2. **Implement caching** for expensive operations
3. **Batch database operations** when possible
4. **Limit query results** (max 1000 items)
5. **Use prepared statements** for repeated queries
6. **Profile slow operations** with console.time()

Example:
```javascript
const startTime = Date.now();
const result = await expensiveOperation();
const duration = Date.now() - startTime;
logger.debug('Operation completed', { duration });
```

---

## Security Guidelines

1. **Validate ALL user inputs** using validators
2. **Use parameterized queries** (prevent SQL injection)
3. **Sanitize file paths** before filesystem operations
4. **Never log sensitive data** (passwords, tokens)
5. **Use environment variables** for configuration
6. **Keep dependencies updated** (`npm audit fix`)

---

## Getting Help

- **Documentation**: Check README.md and API_REFERENCE.md
- **Issues**: Search existing issues or create new one
- **Discussions**: GitHub Discussions for questions
- **Code**: Read tests for usage examples

---

## License

By contributing to HUDini, you agree that your contributions will be licensed under the same license as the project.

---

## Questions?

Feel free to open an issue or discussion if you have questions about contributing!

**Happy coding! 🚀**
