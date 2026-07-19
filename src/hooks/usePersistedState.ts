import {type Dispatch, type SetStateAction, useCallback, useState} from "react";

const readPersisted = <T, >(key: string, defaultValue: T): T => {
    try {
        const stored = localStorage.getItem(key);
        return stored === null ? defaultValue : (JSON.parse(stored) as T);
    } catch {
        return defaultValue;
    }
};

/**
 * A useState-like hook that persists its value to localStorage under `key`,
 * reading the initial value from localStorage (falling back to `defaultValue`
 * when the key is missing or holds corrupt JSON).
 */
export const usePersistedState = <T, >(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>] => {
    const [state, setState] = useState<T>(() => readPersisted(key, defaultValue));

    const setPersistedState: Dispatch<SetStateAction<T>> = useCallback((value) => {
        setState(prev => {
            const next = value instanceof Function ? value(prev) : value;
            try {
                localStorage.setItem(key, JSON.stringify(next));
            } catch {
                // ignore write errors (e.g. storage quota exceeded, private browsing)
            }
            return next;
        });
    }, [key]);

    return [state, setPersistedState];
};
