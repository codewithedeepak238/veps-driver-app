import { useCallback, useEffect, useRef, useState } from 'react';
import api from './api';

/**
 * useInfiniteList — cursor-paginated list loader for FlatList infinite scroll.
 * The endpoint is expected to return `{ data: { [dataKey]: T[], nextCursor } }`.
 */
export function useInfiniteList<T>(url: string, dataKey: string, limit = 15) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true); // first page
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);
  const inFlight = useRef(false);

  const fetchPage = useCallback(
    async (reset: boolean) => {
      if (inFlight.current) return;
      if (!reset && !hasMoreRef.current) return;
      inFlight.current = true;
      try {
        const cursor = reset ? null : cursorRef.current;
        const r = await api.get(url, { params: { limit, ...(cursor ? { cursor } : {}) } });
        const list: T[] = r.data.data[dataKey] ?? [];
        const next: string | null = r.data.data.nextCursor ?? null;
        cursorRef.current = next;
        hasMoreRef.current = Boolean(next);
        setItems((prev) => (reset ? list : [...prev, ...list]));
      } catch {
        /* keep what we have on transient errors */
      } finally {
        inFlight.current = false;
      }
    },
    [url, dataKey, limit],
  );

  const reload = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      await fetchPage(true);
      if (!silent) setRefreshing(false);
    },
    [fetchPage],
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMoreRef.current || inFlight.current) return;
    setLoadingMore(true);
    await fetchPage(false);
    setLoadingMore(false);
  }, [fetchPage, loadingMore]);

  useEffect(() => {
    setLoading(true);
    fetchPage(true).finally(() => setLoading(false));
  }, [fetchPage]);

  return { items, loading, loadingMore, refreshing, reload, loadMore, hasMore: hasMoreRef.current };
}
