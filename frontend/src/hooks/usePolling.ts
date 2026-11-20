import { useEffect, useRef } from 'react';

/** 定时轮询；active 为 false 时暂停；回调变化会重置定时器 */
export function usePolling(callback: () => void | Promise<void>, intervalMs: number, active: boolean) {
  const saved = useRef(callback);

  useEffect(() => {
    saved.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!active) return;

    const run = () => {
      void saved.current();
    };

    run();
    const timer = setInterval(run, intervalMs);
    return () => clearInterval(timer);
  }, [active, intervalMs]);
}
