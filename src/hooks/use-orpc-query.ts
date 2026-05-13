import { useCallback, useEffect, useRef, useState } from "react";

type UseORPCQueryResult<T> = {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
};

export function useORPCQuery<T>(
  queryFn: () => Promise<T>,
  deps: unknown[],
): UseORPCQueryResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const seqRef = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableFn = useCallback(queryFn, deps);

  useEffect(() => {
    const seq = ++seqRef.current;
    setIsLoading(true);
    setError(undefined);

    stableFn()
      .then((result) => {
        if (seq === seqRef.current) {
          setData(result);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (seq === seqRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      });

    return () => {
      seqRef.current++;
    };
  }, [stableFn]);

  return { data, error, isLoading };
}
