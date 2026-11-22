/**
 * Port: the current time. Injected so tests can fix "now" and get the same
 * result every run (architecture.md §2, ports).
 */
export interface IClock {
  now(): Date;
}
