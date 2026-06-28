type PendingLoc = { lat: number; lng: number; name: string };
let _pending: PendingLoc | null = null;

export const pendingLocation = {
  set: (loc: PendingLoc) => { _pending = loc; },
  consume: (): PendingLoc | null => { const l = _pending; _pending = null; return l; },
};
