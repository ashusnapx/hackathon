/**
 * Writing somebody's name the way they would write it.
 *
 * People type their name into a phone in whatever case the keyboard gave them —
 * "ashutosh kumar", "MEERA NAIR" — and it then appears at the head of a letter
 * to their bank and on an FIR application. Fixing the case is a small courtesy
 * that costs nothing and shows up on every document.
 *
 * It is deliberately conservative, because a name is not a string to be
 * cleverly reformatted:
 *
 *  - Initials are left exactly as they are. "RK Nair" is not "Rk Nair", and
 *    South Indian names carry initials far more often than Western ones.
 *  - Scripts without case — Devanagari, Tamil, Bengali — pass through
 *    untouched, because upper and lower case do not exist in them.
 *  - Hyphens and apostrophes start a new word: "d'souza" is "D'Souza".
 */
export function properName(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map(capitaliseWord)
    .join(" ");
}

function capitaliseWord(word: string): string {
  // "RK", "K.", "A" — an initial, and already how they meant to write it.
  if (/^[A-Z]{1,2}\.?$/.test(word)) return word;
  return word
    .split(/([-'’])/)
    .map((part) => (
      /^[-'’]$/.test(part)
        ? part
        : part.charAt(0).toLocaleUpperCase() + part.slice(1).toLocaleLowerCase()
    ))
    .join("");
}

/**
 * What to call them.
 *
 * The first word is usually the given name, but not when it is an initial:
 * "K. Ashutosh" is Ashutosh, and greeting him as "K." would be worse than not
 * greeting him at all. If every part is an initial there is nothing better to
 * use than the first one.
 */
export function firstName(input: string): string {
  const parts = properName(input).split(" ").filter(Boolean);
  if (!parts.length) return "";
  return parts.find((part) => !/^[A-Za-z]{1,2}\.?$/.test(part)) ?? parts[0];
}
