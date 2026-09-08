/**
 * A motif for every state and union territory.
 *
 * These are original drawings made in the idiom of a living regional tradition.
 * They are not reproductions of anybody's artwork, and no individual artist is
 * named as their author — the credit goes to the tradition, to the community
 * that practises it, and to the state or UT it belongs to. That distinction is
 * the point: copying a named painter's work would need their permission, and
 * signing an original drawing with their name would be a false attribution.
 * Crediting the tradition is the honest version of both.
 *
 * Four rules were applied to every one of them:
 *
 *  · No religious iconography as the subject. Several of these traditions do
 *    depict deities; each one's secular vocabulary is used instead — its
 *    geometry, borders, flora, fauna, textile grammar, domestic and working
 *    life. This tool serves people of every faith and none.
 *
 *  · Never the State Emblem, the Ashoka lion capital, the Ashoka Chakra or the
 *    national flag. They are restricted under the State Emblem of India
 *    (Prohibition of Improper Use) Act, 2005, and Kavach is explicitly not a
 *    government service — borrowing the state's marks would imply otherwise.
 *
 *  · Where a place has no distinct painting tradition of its own, the entry
 *    says so and draws its actual craft instead — a boat, a weave, a rope, a
 *    building. Inventing a folk art for a territory that does not have one
 *    would be worse than the honest answer.
 *
 *  · One `<g>` on a 0 0 100 100 box, `currentColor` only, no gradients and no
 *    ids. The colour comes from whatever the motif is placed on, which is what
 *    lets one drawing work on cream paper, on the dark green panels, in high
 *    contrast and in forced-colors mode without a second copy.
 */

export interface Motif {
  /** State or union territory, as the Government of India names it. */
  region: string;
  /** Short code, used as the lookup key and for stable ordering. */
  code: string;
  isUT?: boolean;
  /** The tradition this is drawn in the idiom of. */
  tradition: string;
  /** Who practises it. Named as a community, never as an individual. */
  community: string;
  /** Geographical Indication status, where the craft carries one. */
  gi?: string;
  /** What the drawing actually shows, in plain words. */
  shows: string;
  /**
   * The artwork: the inner content of an SVG on a 0 0 100 100 viewBox.
   *
   * Held as a string because these are static, authored assets rather than
   * components — it keeps the catalogue readable as data, and lets the whole
   * set be listed, credited and audited in one place.
   */
  svg: string;
}

/** The credit line shown wherever a motif appears. */
export function creditLine(motif: Motif): string {
  const gi = motif.gi ? ` (${motif.gi})` : "";
  return `${motif.tradition} · ${motif.community} · ${motif.region}${gi}`;
}
