const BAD_WORDS = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'crap',
  'piss',
  'dick',
  'cock',
  'pussy',
  'slut',
  'whore',
  'fag',
  'nigger',
  'nigga',
  'retard',
  'cunt',
  'motherfucker',
  'fucker',
  'fucking',
  'fucked',
  'bullshit',
  'asshat',
  'dumbass',
  'jackass',
  'dipshit',
  'shithead',
  'dickhead',
  'assface',
];

export function containsProfanity(text: string | undefined): boolean {
  // Return false if text is undefined, null, or empty
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return false;
  }
  
  const lowerText = text.toLowerCase();
  
  return BAD_WORDS.some(word => {
    const wordPattern = new RegExp(`\\b${word}\\b`, 'i');
    return wordPattern.test(lowerText);
  });
}

export function getProfanityError(): string {
  return 'Your reflection contains inappropriate language. Please keep reflections respectful.';
}
