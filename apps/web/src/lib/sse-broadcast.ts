type Listener = (data: string) => void;
const channels = new Map<string, Set<Listener>>();

export function subscribe(sessionId: string, listener: Listener): () => void {
  if (!channels.has(sessionId)) channels.set(sessionId, new Set());
  channels.get(sessionId)!.add(listener);
  return () => {
    channels.get(sessionId)?.delete(listener);
    if (channels.get(sessionId)?.size === 0) channels.delete(sessionId);
  };
}

export function broadcast(sessionId: string, event: object) {
  const data = JSON.stringify(event);
  channels.get(sessionId)?.forEach((fn) => fn(data));
}

export function closeChannel(sessionId: string) {
  channels.delete(sessionId);
}
