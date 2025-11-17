/**
 * Validation utilities for form inputs
 */

/**
 * Validate that a value is not empty
 * @param {any} value - Value to validate
 * @returns {boolean} True if valid, false otherwise
 */
export const isRequired = (value) => {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined && value !== "";
};

/**
 * Validate that a value is a valid email address
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate that a value is a non-negative number
 * @param {any} value - Value to validate
 * @returns {boolean} True if non-negative number
 */
export const isNonNegativeNumber = (value) => {
  const num = Number(value);
  return !isNaN(num) && num >= 0;
};

/**
 * Validate that a value is a positive number
 * @param {any} value - Value to validate
 * @returns {boolean} True if positive number
 */
export const isPositiveNumber = (value) => {
  const num = Number(value);
  return !isNaN(num) && num > 0;
};

/**
 * Validate that a value is a valid numeric value
 * @param {any} value - Value to validate
 * @returns {boolean} True if valid number
 */
export const isNumeric = (value) => {
  return !isNaN(Number(value)) && value !== "" && value !== null;
};

/**
 * Validate that a value is a valid date
 * @param {any} date - Date to validate
 * @returns {boolean} True if valid date
 */
export const isValidDate = (date) => {
  if (!date) return false;
  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj.getTime());
};

/**
 * Validate that end mileage is greater than start mileage
 * @param {number} startMileage - Starting mileage value
 * @param {number} endMileage - Ending mileage value
 * @returns {boolean} True if end mileage > start mileage
 */
export const isValidMileageRange = (startMileage, endMileage) => {
  const start = Number(startMileage);
  const end = Number(endMileage);

  if (isNaN(start) || isNaN(end)) {
    return false;
  }

  return end > start;
};

/**
 * Validate that a year is within a reasonable range
 * @param {number} year - Year to validate
 * @returns {boolean} True if valid year (1900 to current year + 1)
 */
export const isValidYear = (year) => {
  const currentYear = new Date().getFullYear();
  const yearNum = Number(year);
  return !isNaN(yearNum) && yearNum >= 1900 && yearNum <= currentYear + 1;
};

/**
 * Validate vehicle registration number format
 * @param {string} registration - Registration number
 * @returns {boolean} True if not empty
 */
export const isValidRegistration = (registration) => {
  return isRequired(registration) && registration.trim().length >= 3;
};

/**
 * Validate that a string has minimum length
 * @param {string} value - String to validate
 * @param {number} minLength - Minimum required length
 * @returns {boolean} True if meets minimum length
 */
export const hasMinLength = (value, minLength) => {
  if (typeof value !== "string") return false;
  return value.trim().length >= minLength;
};

/**
 * Validate that a string has maximum length
 * @param {string} value - String to validate
 * @param {number} maxLength - Maximum allowed length
 * @returns {boolean} True if within maximum length
 */
export const hasMaxLength = (value, maxLength) => {
  if (typeof value !== "string") return false;
  return value.length <= maxLength;
};

/**
 * Validate password strength (minimum 6 characters)
 * @param {string} password - Password to validate
 * @returns {boolean} True if meets minimum requirements
 */
export const isValidPassword = (password) => {
  return hasMinLength(password, 6);
};

/**
 * Get error message for validation failure
 * @param {string} field - Field name
 * @param {string} validationType - Type of validation that failed
 * @returns {string} Error message
 */
export const getValidationError = (field, validationType) => {
  const errors = {
    required: `${field} is required`,
    email: "Please enter a valid email address",
    nonNegative: `${field} must be a non-negative number`,
    positive: `${field} must be a positive number`,
    numeric: `${field} must be a valid number`,
    date: "Please enter a valid date",
    mileageRange: "End mileage must be greater than start mileage",
    year: "Please enter a valid year",
    registration: "Registration number must be at least 3 characters",
    minLength: `${field} is too short`,
    maxLength: `${field} is too long`,
    password: "Password must be at least 6 characters",
  };

  return errors[validationType] || `${field} is invalid`;
};

/**
 * Validate cash-in value (must be non-negative)
 * @param {any} value - Cash-in value to validate
 * @returns {Object} Validation result with isValid and error properties
 */
export const validateCashIn = (value) => {
  if (!isRequired(value)) {
    return { isValid: false, error: "Cash-in is required" };
  }
  if (!isNonNegativeNumber(value)) {
    return { isValid: false, error: "Cash-in must be a non-negative number" };
  }
  return { isValid: true, error: null };
};

/**
 * Validate mileage value (must be positive)
 * @param {any} value - Mileage value to validate
 * @returns {Object} Validation result with isValid and error properties
 */
export const validateMileage = (value) => {
  if (!isRequired(value)) {
    return { isValid: false, error: "Mileage is required" };
  }
  if (!isPositiveNumber(value)) {
    return { isValid: false, error: "Mileage must be a positive number" };
  }
  return { isValid: true, error: null };
};

/**
 * Validate that end mileage is greater than start mileage
 * @param {any} startMileage - Start mileage value
 * @param {any} endMileage - End mileage value
 * @returns {Object} Validation result with isValid and error properties
 */
export const validateMileageComparison = (startMileage, endMileage) => {
  if (!isValidMileageRange(startMileage, endMileage)) {
    return {
      isValid: false,
      error: "End mileage must be greater than start mileage",
    };
  }
  return { isValid: true, error: null };
};

/**
 * Validate expense description (must not be empty)
 * @param {string} description - Description to validate
 * @returns {Object} Validation result with isValid and error properties
 */
export const validateExpenseDescription = (description) => {
  if (!isRequired(description)) {
    return { isValid: false, error: "Description is required" };
  }
  if (!hasMinLength(description, 3)) {
    return {
      isValid: false,
      error: "Description must be at least 3 characters",
    };
  }
  return { isValid: true, error: null };
};

/**
 * Validate expense amount (must be positive)
 * @param {any} amount - Amount to validate
 * @returns {Object} Validation result with isValid and error properties
 */
export const validateExpenseAmount = (amount) => {
  if (!isRequired(amount)) {
    return { isValid: false, error: "Amount is required" };
  }
  if (!isPositiveNumber(amount)) {
    return { isValid: false, error: "Amount must be a positive number" };
  }
  return { isValid: true, error: null };
};
