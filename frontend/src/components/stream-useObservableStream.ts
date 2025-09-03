import { useState, useEffect, useRef } from 'react';
import { StreamObservableManager } from '../physics/stream-ObservableManager';
import type { ObservableManager } from '../physics/ObservableManager';

export function useObservableStream(manager: StreamObservableManager | ObservableManager | null, observableIds: string[]) {
  const [data, setData] = useState<Record<string, any>>({});
  const observableIdsRef = useRef(observableIds);

  useEffect(() => {
    observableIdsRef.current = observableIds;
  }, [observableIds]);

  useEffect(() => {
    if (!manager || !(manager instanceof StreamObservableManager)) return;

    const handleUpdate = (update: { id: string; data: any }) => {
      if (observableIdsRef.current.includes(update.id)) {
        setData(prevData => ({
          ...prevData,
          [update.id]: update.data,
        }));
      }
    };

    manager.on('update', handleUpdate);

    return () => {
      manager.off('update', handleUpdate);
    };
  }, [manager]);

  return data;
}
