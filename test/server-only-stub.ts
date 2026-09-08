/**
 * `server-only` has no implementation to import — it is a package whose whole
 * job is to fail the build when a client bundle reaches for it, and Next
 * resolves it. Vitest is neither, so it resolves nothing and any route that
 * guards itself this way could not be tested at all.
 *
 * Stubbing it here restores that: the guard keeps working where it matters (the
 * bundler), and a test may import the route it protects.
 */
export {};
