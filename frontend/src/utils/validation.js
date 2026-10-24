/**
 * Form Validation Utilities for KicksHub
 * Comprehensive client-side validators for addresses, authentication, and admin forms.
 */

// RFC-compliant email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Validate phone number format
 * Strictly enforces:
 * - Numbers only
 * - Exactly 10 digits (max length 10)
 * - Indian mobile validation: starts with 6, 7, 8, or 9
 */
export function validatePhone(phone, country = 'India') {
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    return 'Contact phone number is required.';
  }

  const trimmed = phone.trim();

  // Allow digits only (reject letters, special characters, symbols)
  if (!/^\d+$/.test(trimmed)) {
    return 'Phone number must contain numbers only.';
  }

  if (trimmed.length !== 10) {
    return `Phone number must be exactly 10 digits (entered ${trimmed.length}).`;
  }

  if (!/^[6-9]/.test(trimmed)) {
    return 'Indian mobile number must start with 6, 7, 8, or 9.';
  }

  return null;
}

/**
 * Format and sanitize phone input as user types
 * Numbers only, maximum 10 digits
 */
export function formatPhoneInput(value) {
  if (!value) return '';
  return String(value).replace(/\D/g, '').slice(0, 10);
}

/**
 * Validate postal / PIN code
 * Strictly enforces:
 * - Numbers only
 * - Exactly 6 digits (min and max length 6)
 * - Valid Indian PIN code (cannot start with 0)
 */
export function validatePostalCode(code, country = 'India') {
  if (!code || typeof code !== 'string' || !String(code).trim()) {
    return 'PIN code is required.';
  }

  const trimmed = String(code).trim();

  if (!/^\d+$/.test(trimmed)) {
    return 'PIN code must contain numbers only.';
  }

  if (trimmed.length !== 6) {
    return `PIN code must be exactly 6 digits (entered ${trimmed.length}).`;
  }

  if (trimmed.startsWith('0')) {
    return 'Indian PIN code cannot start with 0.';
  }

  return null;
}

/**
 * Format and sanitize PIN code input as user types
 * Numbers only, maximum 6 digits
 */
export function formatPostalCodeInput(value) {
  if (!value) return '';
  return String(value).replace(/\D/g, '').slice(0, 6);
}

/**
 * Validate human or entity name (recipient, user profile, brand)
 */
export function validateName(name, fieldName = 'Full name') {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return `${fieldName} is required.`;
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return `${fieldName} must be at least 2 characters.`;
  }

  if (trimmed.length > 100) {
    return `${fieldName} cannot exceed 100 characters.`;
  }

  if (!/[a-zA-Z]/.test(trimmed)) {
    return `${fieldName} must contain valid letters.`;
  }

  if (!/^[a-zA-Z\s\.\-']+$/.test(trimmed)) {
    return `${fieldName} contains invalid characters.`;
  }

  return null;
}

/**
 * Validate street address line 1
 */
export function validateAddressLine(line, fieldName = 'Street address') {
  if (!line || typeof line !== 'string' || !line.trim()) {
    return `${fieldName} is required.`;
  }

  const trimmed = line.trim();

  if (trimmed.length < 5) {
    return `${fieldName} must be at least 5 characters.`;
  }

  if (trimmed.length > 255) {
    return `${fieldName} cannot exceed 255 characters.`;
  }

  return null;
}

/**
 * Validate city or state name
 */
export function validateCityOrState(val, fieldName = 'City') {
  if (!val || typeof val !== 'string' || !val.trim()) {
    return `${fieldName} is required.`;
  }

  const trimmed = val.trim();

  if (trimmed.length < 2) {
    return `${fieldName} must be at least 2 characters.`;
  }

  if (trimmed.length > 100) {
    return `${fieldName} cannot exceed 100 characters.`;
  }

  if (!/^[a-zA-Z\s\.\-']+$/.test(trimmed)) {
    return `${fieldName} contains invalid characters.`;
  }

  return null;
}

/**
 * Validate email address
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string' || !email.trim()) {
    return 'Email address is required.';
  }

  const trimmed = email.trim();

  if (trimmed.length > 255 || !EMAIL_REGEX.test(trimmed)) {
    return 'Please enter a valid email address (e.g. you@example.com).';
  }

  return null;
}

/**
 * Validate password strength
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return 'Password is required.';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }

  if (password.length > 128) {
    return 'Password cannot exceed 128 characters.';
  }

  if (!/[a-zA-Z]/.test(password)) {
    return 'Password must contain at least one letter.';
  }

  if (!/[\d\W_]/.test(password)) {
    return 'Password must contain at least one number or special character.';
  }

  return null;
}

/**
 * Validate password confirmation match
 */
export function validateConfirmPassword(password, confirmPassword) {
  if (!confirmPassword) {
    return 'Please confirm your password.';
  }

  if (password !== confirmPassword) {
    return 'Passwords do not match.';
  }

  return null;
}

/**
 * Validate price amount
 */
export function validatePrice(price, fieldName = 'Price') {
  if (price === undefined || price === null || String(price).trim() === '') {
    return `${fieldName} is required.`;
  }

  const num = Number(price);

  if (isNaN(num) || num < 0) {
    return `${fieldName} must be a valid non-negative number.`;
  }

  return null;
}

/**
 * Validate inventory stock quantity
 */
export function validateStock(stock, fieldName = 'Stock quantity') {
  if (stock === undefined || stock === null || String(stock).trim() === '') {
    return `${fieldName} is required.`;
  }

  const num = Number(stock);

  if (isNaN(num) || !Number.isInteger(num) || num < 0) {
    return `${fieldName} must be a whole non-negative integer (0 or more).`;
  }

  return null;
}

/**
 * Validate SKU string
 */
export function validateSku(sku) {
  if (!sku || typeof sku !== 'string' || !sku.trim()) {
    return 'SKU is required.';
  }

  const trimmed = sku.trim();

  if (trimmed.length < 3) {
    return 'SKU must be at least 3 characters.';
  }

  if (trimmed.length > 50) {
    return 'SKU cannot exceed 50 characters.';
  }

  if (!/^[A-Za-z0-9_\-\.]+$/.test(trimmed)) {
    return 'SKU may only contain letters, numbers, hyphens, underscores, or dots.';
  }

  return null;
}

/**
 * Validate price range
 */
export function validatePriceRange(min, max) {
  if (min !== '' && min !== null && min !== undefined) {
    const minNum = Number(min);
    if (isNaN(minNum) || minNum < 0) {
      return 'Minimum price must be a valid non-negative number.';
    }
  }

  if (max !== '' && max !== null && max !== undefined) {
    const maxNum = Number(max);
    if (isNaN(maxNum) || maxNum < 0) {
      return 'Maximum price must be a valid non-negative number.';
    }
  }

  if (min !== '' && max !== '' && min !== null && max !== null && min !== undefined && max !== undefined) {
    if (Number(min) > Number(max)) {
      return 'Minimum price cannot be greater than maximum price.';
    }
  }

  return null;
}
