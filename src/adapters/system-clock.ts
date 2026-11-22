import { IClock } from '../application/ports/clock';

/** Adapter: the real time of the server. */
export class SystemClock implements IClock {
  now(): Date {
    return new Date();
  }
}
