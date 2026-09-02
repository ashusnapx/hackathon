import { cn } from "@/lib/utils";

/**
 * A headline that arrives one word at a time.
 *
 * The reference site does this with GSAP's SplitText, which measures rendered
 * line boxes and wraps each line in a clipping div. That is the right effect
 * and the wrong mechanism for this page: it costs a paid GSAP plugin plus the
 * core library, it re-measures on every resize, and it has to be re-run every
 * time the language changes — which here can happen at any moment, into any of
 * twenty-three scripts, in either direction.
 *
 * Words are the unit instead. A word is a `<span>` with `overflow: hidden`
 * around a second `<span>` that starts pushed below its own baseline; the CSS
 * slides it up with a per-word delay. No measurement, so nothing to invalidate
 * on re-wrap, and it behaves identically in Devanagari and in Urdu.
 *
 * The element carries `data-reveal` itself, so the page-wide observer in
 * `useReveal` triggers it with everything else and no second observer exists.
 * Without JavaScript `data-reveal-ready` is never set, the clipping rules never
 * apply, and the heading is simply a heading.
 */

interface Props {
  children: string;
  className?: string;
  /** Stagger offset, so a second line continues the first rather than restarting. */
  from?: number;
  /** Delay between words, in ms. Long headlines want a smaller number. */
  step?: number;
  as?: "span" | "div";
}

export function Split({ children, className, from = 0, step, as = "span" }: Props) {
  const Tag = as;
  // Keeping the separators means the original spacing survives verbatim —
  // including the double space some translations carry after a full stop.
  const parts = children.split(/(\s+)/);
  let word = from;

  return (
    <Tag
      className={cn("split", className)}
      data-reveal
      style={step ? ({ "--step": step } as React.CSSProperties) : undefined}
    >
      {parts.map((part, i) => {
        if (!part) return null;
        if (/^\s+$/.test(part)) return <span key={i}>{part}</span>;
        const w = word++;
        return (
          <span key={i} className="w" style={{ "--w": w } as React.CSSProperties}>
            <span>{part}</span>
          </span>
        );
      })}
    </Tag>
  );
}

/** How many words `Split` will emit, for chaining `from` across two lines. */
export const countWords = (s: string) => s.split(/\s+/).filter(Boolean).length;

/*
 * Where to put the italic.
 *
 * The reference's signature is one phrase of a headline leaning into the
 * italic of the same face — "Don't type, *just speak.*" It works because the
 * break lands on a real turn in the sentence, and it looks like a mistake
 * everywhere else.
 *
 * So the break is never guessed. It is taken from punctuation the copy already
 * has: a sentence end, or failing that a comma. Terminators for every script
 * this site renders are listed, including the Devanagari danda and the Urdu
 * full stop, which are not full stops as far as a Latin regex is concerned.
 *
 * When a heading has no such turn — and after machine translation many will
 * not — `emphasisBreak` returns null and the heading is simply set roman. A
 * headline with no italic reads as a decision. A headline broken at "is" reads
 * as a bug.
 */
const TERMINATORS = /([.!?।۔؟…]["'’”)\]]*)\s+/gu;
const COMMAS = /([,;:،؛])\s+/gu;

export function emphasisBreak(text: string): [string, string] | null {
  const total = countWords(text);
  if (total < 4) return null;

  const candidates: number[] = [];
  for (const re of [TERMINATORS, COMMAS]) {
    re.lastIndex = 0;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      candidates.push(m.index + m[1].length);
    }
    // A sentence break always beats a comma, so stop as soon as one is found.
    if (candidates.length) break;
  }

  // The tail must be a real phrase and must not swallow the whole line.
  const usable = candidates
    .map((at) => [text.slice(0, at).trim(), text.slice(at).trim()] as [string, string])
    .filter(([head, tail]) => {
      const tw = countWords(tail);
      return tw >= 2 && countWords(head) >= 2 && tw <= total * 0.7;
    });

  if (!usable.length) return null;
  // The last qualifying break: the italic falls on the closing beat, as in the
  // reference, rather than on the middle of a three-clause sentence.
  return usable[usable.length - 1];
}

/**
 * A section heading with the reveal and, where the copy allows it, the italic.
 * Every `h2` on the marketing page goes through this so the decision is made in
 * one place instead of eleven.
 */
export function Headline({
  children,
  className,
  step,
}: {
  children: string;
  className?: string;
  step?: number;
}) {
  const split = emphasisBreak(children);
  if (!split) {
    return (
      <Split className={className} step={step}>
        {children}
      </Split>
    );
  }
  const [head, tail] = split;
  return (
    <>
      <Split className={className} step={step}>
        {head}
      </Split>{" "}
      <Split className={cn("quiet-em", className)} from={countWords(head)} step={step}>
        {tail}
      </Split>
    </>
  );
}
