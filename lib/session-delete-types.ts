/** Maximum number of root session ids accepted by one bulk-delete request. */
export const MAX_SESSION_DELETE_IDS = 500;

export interface SessionDeleteResult {
  /** Every session removed: the named ones and their related child sessions. */
  deleted: string[];
  /** Named ids with neither a file nor a cached path. */
  missing: string[];
  /** Named ids kept because a session of theirs is running. */
  running: string[];
}
