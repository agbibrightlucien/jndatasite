const { v4: uuidv4 } = require('uuid');

/**
 * Generates a unique vendor link using UUID v4
 * @returns {string} A unique vendor link
 */
const generateVendorLink = () => {
  return `v-${uuidv4()}`;
};

module.exports = {
  generateVendorLink
};