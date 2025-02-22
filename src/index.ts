export type Listener = () => void;
export type ClearHarmonicInterval = () => void;

export interface Bucket {
  ms: number;
  timer: ReturnType<typeof setInterval>;
  listeners: Map<number, Listener>;
  listenerCount: number;
}

export interface TimerReference {
  bucket: Bucket;
  id: number;
}

let counter = 0;
const buckets: Record<number, Bucket> = {};

export const setHarmonicInterval = (fn: Listener, ms: number): TimerReference => {
  const id = counter++;

  if (buckets[ms]) {
    buckets[ms].listeners.set(id, fn);
    buckets[ms].listenerCount++;
  } else {
    const timer = setInterval(() => {
      const {listeners} = buckets[ms];
      let didThrow = false;
      const errors: Record<number, { error: Error, listener: string, ms: number }> = {};

      for (const [listenerID, listener] of listeners.entries()) {
        try {
          listener();
        } catch (error) {
          didThrow = true;
          const _id = Number(listenerID);
          if (!isNaN(_id)) errors[_id] = {
            error: error as unknown as Error,
            listener: listener.name,
            ms,
          };
        }
      }

      if (didThrow) throw errors;
    }, ms);

    buckets[ms] = {
      ms,
      timer,
      listeners: new Map([[id, fn]]),
      listenerCount: 1,
    };
  }

  return {
    bucket: buckets[ms],
    id,
  };
};

export const clearHarmonicInterval = ({bucket, id}: TimerReference): void => {
  if (bucket.listeners.has(id)) {
    bucket.listeners.delete(id);
    bucket.listenerCount--;
  }

  if (bucket.listenerCount === 0) {
    clearInterval(bucket.timer);
    delete buckets[bucket.ms];
  }
};
