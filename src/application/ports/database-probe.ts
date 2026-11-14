/**
 * Port: tells whether the database answers. The use case depends on this
 * interface; the adapter that implements it knows about Prisma (DIP).
 */
export interface IDatabaseProbe {
  isReachable(): Promise<boolean>;
}
