/**
 * Utility functions for phone number validation
 */

/**
 * Validates a Ghanaian phone number
 * @param {string} phoneNumber - The phone number to validate
 * @returns {boolean} - True if the phone number is valid, false otherwise
 */
const isValidGhanaianPhone = (phoneNumber) => {
  if (!phoneNumber) return false;
  
  // Remove any non-digit characters (spaces, dashes, etc.)
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // Check if the phone number is exactly 10 digits
  if (digitsOnly.length !== 10) return false;
  
  // Ensure the number starts with a valid Ghanaian prefix
  // Common prefixes: 020, 023, 024, 026, 027, 028, 029, 050, 054, 055, 056, 057, 059
  const validPrefixes = ['02', '03', '05'];
  const prefix = digitsOnly.substring(0, 2);
  
  return validPrefixes.includes(prefix);
};

/**
 * Formats a phone number to the standard Ghanaian format
 * @param {string} phoneNumber - The phone number to format
 * @returns {string} - The formatted phone number
 */
const formatGhanaianPhone = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  // Remove any non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // If it's not a valid Ghanaian number, return as is
  if (!isValidGhanaianPhone(digitsOnly)) return phoneNumber;
  
  // Format as 0XX-XXX-XXXX
  return `${digitsOnly.substring(0, 3)}-${digitsOnly.substring(3, 6)}-${digitsOnly.substring(6)}`;
};

module.exports = {
  isValidGhanaianPhone,
  formatGhanaianPhone
};