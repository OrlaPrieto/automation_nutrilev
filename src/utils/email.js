/**
 * Extracts the first valid email address from a string.
 * This is useful for cleaning up values from Google Calendar descriptions
 * that may contain HTML tags (like <a>) or names alongside the email.
 * 
 * @param {string} text - The text to extract the email from.
 * @returns {string|null} - The extracted email or null if none found.
 */
function extractEmail(text) {
  if (!text || typeof text !== 'string') return null;
  
  // Regex to match email addresses
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/;
  const match = text.match(emailRegex);
  
  return match ? match[0].trim() : null;
}

module.exports = {
  extractEmail
};
