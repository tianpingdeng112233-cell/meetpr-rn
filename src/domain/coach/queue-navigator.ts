export function nextItem<T extends { id: string }>(itemID: string, items: readonly T[]): T | null {
  const index = items.findIndex(item => item.id === itemID);
  return index < 0 ? null : items[(index + 1) % items.length];
}
/** Capture successor ID before sending; never use the old index in a refreshed queue. */
export function itemAfterSend<T extends { id: string }>(successorID: string | null | undefined, items: readonly T[]): T | null {
  return items.find(item => item.id === successorID) ?? items[0] ?? null;
}
type Resource = 'url' | 'set' | 'markers';
type SliceRequest = { itemID: string | null; requestID: number; resource: Resource };
export class SliceRequests {
  private itemID: string | null = null;
  private serial = 0;
  private requests = new Map<Resource, number>();
  select(itemID: string | null) { this.itemID = itemID; this.requests.clear(); }
  begin(resource: Resource): SliceRequest {
    const requestID = ++this.serial;
    this.requests.set(resource, requestID);
    return { itemID: this.itemID, requestID, resource };
  }
  accepts(request: SliceRequest) { return request.itemID !== null && request.itemID === this.itemID && this.requests.get(request.resource) === request.requestID; }
}
