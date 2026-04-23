import { makeUuid } from "./uuid";

const DRAFT_PREFIX = "draft-";

/** Client-only id for a lead/car row not yet persisted; never sent as a REST path segment for GET. */
export function newDraftRecordId(): string {
  return `${DRAFT_PREFIX}${makeUuid()}`;
}

export function isDraftRecordId(id: string): boolean {
  return id.startsWith(DRAFT_PREFIX);
}
