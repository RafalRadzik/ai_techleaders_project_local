/**
 * Source of the current instant (primitive B1). Services that need "now" take `clock`
 * from the `Cradle` by constructor injection instead of calling `new Date()`, so tests
 * can inject a fixed clock. Instants are UTC-based `Date`s; never build local-time dates.
 */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };
