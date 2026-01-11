import { useState, useEffect, useRef } from 'react';
import { StreamObservableManager } from '../physics/stream-ObservableManager';
export function useObservableStream(manager, observableIds) {
    const [data, setData] = useState({});
    const observableIdsRef = useRef(observableIds);
    useEffect(() => {
        observableIdsRef.current = observableIds;
    }, [observableIds]);
    useEffect(() => {
        if (!manager || !(manager instanceof StreamObservableManager))
            return;
        const handleUpdate = (update) => {
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
