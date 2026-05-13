import { useCallback, useRef, useState } from "react";

type UseORPCMutationResult<TInput, TResult> = {
  error: Error | undefined;
  isPending: boolean;
  mutate: (input: TInput) => Promise<TResult>;
};

export function useORPCMutation<TInput, TResult>(
  mutationFn: (input: TInput) => Promise<TResult>,
  opts?: {
    onSuccess?: (result: TResult) => void;
    onError?: (error: Error) => void;
  },
): UseORPCMutationResult<TInput, TResult> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const fnRef = useRef(mutationFn);
  fnRef.current = mutationFn;
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const mutate = useCallback(async (input: TInput): Promise<TResult> => {
    setIsPending(true);
    setError(undefined);
    try {
      const result = await fnRef.current(input);
      optsRef.current?.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      optsRef.current?.onError?.(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { error, isPending, mutate };
}
