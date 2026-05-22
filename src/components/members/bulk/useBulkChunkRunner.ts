import { useCallback, useRef, useState } from "react";
import type { BulkChunkResult } from "./types";

export interface UseBulkChunkRunnerOptions<TArgs> {
  userIds: string[];
  chunkSize?: number;
  runChunk: (chunkUserIds: string[], args: TArgs) => Promise<BulkChunkResult>;
  onComplete?: (final: {
    processed: number;
    succeeded: number;
    failed: number;
    cancelled: boolean;
    results: BulkChunkResult["results"];
  }) => void;
}

export interface UseBulkChunkRunnerReturn<TArgs> {
  start: (args: TArgs) => Promise<void>;
  cancel: () => void;
  reset: () => void;
  isRunning: boolean;
  cancelled: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  results: BulkChunkResult["results"];
}

export default function useBulkChunkRunner<TArgs>(
  opts: UseBulkChunkRunnerOptions<TArgs>,
): UseBulkChunkRunnerReturn<TArgs> {
  const { userIds, chunkSize = 50, runChunk, onComplete } = opts;
  const [isRunning, setIsRunning] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [succeeded, setSucceeded] = useState(0);
  const [failed, setFailed] = useState(0);
  const [results, setResults] = useState<BulkChunkResult["results"]>([]);
  const cancelRef = useRef(false);

  const cancel = useCallback(() => {
    cancelRef.current = true;
    setCancelled(true);
  }, []);

  const reset = useCallback(() => {
    cancelRef.current = false;
    setIsRunning(false);
    setCancelled(false);
    setProcessed(0);
    setSucceeded(0);
    setFailed(0);
    setResults([]);
  }, []);

  const start = useCallback(
    async (args: TArgs) => {
      cancelRef.current = false;
      setCancelled(false);
      setProcessed(0);
      setSucceeded(0);
      setFailed(0);
      setResults([]);
      setIsRunning(true);

      let p = 0;
      let s = 0;
      let f = 0;
      const acc: BulkChunkResult["results"] = [];

      for (let i = 0; i < userIds.length; i += chunkSize) {
        if (cancelRef.current) break;
        const chunk = userIds.slice(i, i + chunkSize);
        try {
          const r = await runChunk(chunk, args);
          s += r.succeeded;
          f += r.failed;
          acc.push(...r.results);
        } catch (err) {
          f += chunk.length;
          chunk.forEach((uid) =>
            acc.push({ user_id: uid, status: "error", detail: (err as Error).message }),
          );
        }
        p += chunk.length;
        setProcessed(p);
        setSucceeded(s);
        setFailed(f);
        setResults([...acc]);
      }

      setIsRunning(false);
      onComplete?.({
        processed: p,
        succeeded: s,
        failed: f,
        cancelled: cancelRef.current,
        results: acc,
      });
    },
    [userIds, chunkSize, runChunk, onComplete],
  );

  return { start, cancel, reset, isRunning, cancelled, processed, succeeded, failed, results };
}
