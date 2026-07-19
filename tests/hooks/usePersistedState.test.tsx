import {afterEach, describe, expect, it} from 'vitest';
import {act, renderHook} from '@testing-library/react';
import {usePersistedState} from '../../src/hooks/usePersistedState';

afterEach(() => {
    localStorage.clear();
});

describe('usePersistedState', () => {
    it('falls back to the default value when localStorage is empty', () => {
        const {result} = renderHook(() => usePersistedState('missing-key', 'default'));
        expect(result.current[0]).toBe('default');
    });

    it('falls back to the default value when localStorage holds corrupt JSON', () => {
        localStorage.setItem('corrupt-key', 'not valid json {');
        const {result} = renderHook(() => usePersistedState('corrupt-key', 'default'));
        expect(result.current[0]).toBe('default');
    });

    it('reads an existing localStorage value on init', () => {
        localStorage.setItem('existing-key', JSON.stringify('stored value'));
        const {result} = renderHook(() => usePersistedState('existing-key', 'default'));
        expect(result.current[0]).toBe('stored value');
    });

    it('persists writes to localStorage', () => {
        const {result} = renderHook(() => usePersistedState('write-key', 'default'));

        act(() => {
            result.current[1]('updated value');
        });

        expect(result.current[0]).toBe('updated value');
        expect(JSON.parse(localStorage.getItem('write-key')!)).toBe('updated value');
    });

    it('supports functional updates like useState', () => {
        const {result} = renderHook(() => usePersistedState('counter-key', 0));

        act(() => {
            result.current[1](prev => prev + 1);
        });

        expect(result.current[0]).toBe(1);
        expect(JSON.parse(localStorage.getItem('counter-key')!)).toBe(1);
    });

    it('persists object values as JSON', () => {
        const {result} = renderHook(() => usePersistedState('object-key', {a: 1}));

        act(() => {
            result.current[1]({a: 2});
        });

        expect(result.current[0]).toEqual({a: 2});
        expect(JSON.parse(localStorage.getItem('object-key')!)).toEqual({a: 2});
    });
});
