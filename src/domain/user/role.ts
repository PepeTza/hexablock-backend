/** What a user may do: `admin` can also publish levels and seed configs. */
export const ROLES = ['player', 'admin'] as const;
export type Role = (typeof ROLES)[number];
