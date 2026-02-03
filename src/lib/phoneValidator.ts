// Phone number patterns to block in messages
const phonePatterns = [
  // International format
  /\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
  // Saudi numbers
  /05\d{8}/g,
  /\+9665\d{8}/g,
  /009665\d{8}/g,
  // Egyptian numbers
  /01[0-2,5]\d{8}/g,
  /\+201[0-2,5]\d{8}/g,
  // UAE numbers
  /05[0-9]\d{7}/g,
  /\+9715[0-9]\d{7}/g,
  // Generic patterns (7+ consecutive digits)
  /\d{7,}/g,
  // Arabic numerals
  /[٠-٩]{7,}/g,
];

export const containsPhoneNumber = (text: string): boolean => {
  // Remove spaces and common separators for checking
  const cleanText = text.replace(/[-.\s()]/g, '');
  
  for (const pattern of phonePatterns) {
    if (pattern.test(cleanText) || pattern.test(text)) {
      // Reset regex lastIndex
      pattern.lastIndex = 0;
      return true;
    }
    pattern.lastIndex = 0;
  }
  return false;
};

export const getPhoneBlockMessage = (): string => {
  return 'عذراً، لا يمكن إرسال أرقام الهواتف في الرسائل لضمان أمان المستخدمين';
};
