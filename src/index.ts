export type Listener = () => void;
export type ClearHarmonicInterval = () => void;
export type BucketID = string | number;

export interface Bucket {
  id?: BucketID;
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
const buckets: Record<BucketID, Bucket> = {};

export const setHarmonicInterval = (fn: Listener, ms: number, bucketID?: BucketID): TimerReference => {
  const id = counter + 1;
  const _bucketID = bucketID ? `${ms}-${bucketID}` : ms;

  if (buckets[_bucketID]) {
    buckets[_bucketID].listeners.set(id, fn);
    buckets[_bucketID].listenerCount++;
  } else {
    const timer = setInterval(() => {
      const { listeners } = buckets[_bucketID];
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

    buckets[_bucketID] = {
      id: _bucketID,
      ms,
      timer,
      listeners: new Map([[id, fn]]),
      listenerCount: 1,
    };
  }

  counter++;
  return {
    bucket: buckets[_bucketID],
    id,
  };
};

export const clearHarmonicInterval = ({ bucket, id }: TimerReference): void => {
  if (bucket.listeners.has(id)) {
    bucket.listeners.delete(id);
    bucket.listenerCount--;
  }

  if (bucket.listenerCount === 0) {
    clearInterval(bucket.timer);
    if (bucket.id) delete buckets[bucket.id];
    else delete buckets[bucket.ms];
  }
};
