/**
 * The sample case's identity, on its own so that anything may ask "is this the
 * sample?" without pulling in the builder — and the case store can stay out of
 * an import cycle with it.
 */
export const DEMO_CASE_ID = "demo-vaani-call";
export const DEMO_CASE_PATH = `/case/${DEMO_CASE_ID}`;
