const PROFANITY_LIST = [
  "fuck", "shit", "damn", "bitch", "ass", "bastard", "dick", "cock", "pussy",
  "cunt", "whore", "slut", "nigger", "nigga", "faggot", "retard", "kike",
  "spic", "chink", "wetback", "cracker"
];

const DANGER_PATTERNS = [
  /\b(kill|murder|suicide|self.?harm|cut\s+my)\b/i,
  /\b(drugs|cocaine|heroin|meth|weed|marijuana)\b/i,
  /\b(porn|xxx|nsfw|nude|naked|sex)\b/i,
  /\b(gun|weapon|bomb|explosive)\b/i,
  /\b(bully|harass|threaten|stalk)\b/i,
];

export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return PROFANITY_LIST.some(word => {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    return regex.test(lower);
  });
}

export function containsDangerousContent(text: string): boolean {
  return DANGER_PATTERNS.some(pattern => pattern.test(text));
}

export function filterContent(text: string): { clean: boolean; flagged: string[]; sanitized: string } {
  const flags: string[] = [];

  if (containsProfanity(text)) {
    flags.push("profanity");
  }
  if (containsDangerousContent(text)) {
    flags.push("dangerous_content");
  }

  let sanitized = text;
  for (const word of PROFANITY_LIST) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    sanitized = sanitized.replace(regex, "***");
  }

  return {
    clean: flags.length === 0,
    flagged: flags,
    sanitized,
  };
}

export function isStudentSafe(text: string): boolean {
  return !containsProfanity(text) && !containsDangerousContent(text);
}
