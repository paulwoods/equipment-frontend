import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import type {AxiosResponse, InternalAxiosRequestConfig} from 'axios';
import {apiClient} from '../../src/lib/apiClient';

interface QueuedResult {
    status: number;
    data?: unknown;
}

const buildResponse = (config: InternalAxiosRequestConfig, status: number, data: unknown): AxiosResponse =>
    ({status, statusText: '', headers: {}, config, data} as AxiosResponse);

const buildError = (config: InternalAxiosRequestConfig, status: number, data: unknown) => {
    const error = new Error(`Request failed with status code ${status}`) as Error & {
        isAxiosError: boolean;
        response: AxiosResponse;
        config: InternalAxiosRequestConfig;
    };
    error.isAxiosError = true;
    error.config = config;
    error.response = buildResponse(config, status, data);
    return error;
};

describe('apiClient response interceptor', () => {
    let queues: Record<string, QueuedResult[]>;
    let calls: Record<string, number>;
    const originalAdapter = apiClient.defaults.adapter;
    const originalLocation = window.location;

    beforeEach(() => {
        queues = {};
        calls = {};

        apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
            const url = config.url ?? '';
            calls[url] = (calls[url] ?? 0) + 1;
            const next = queues[url]?.shift() ?? {status: 200, data: null};
            if (next.status >= 200 && next.status < 300) {
                return buildResponse(config, next.status, next.data);
            }
            throw buildError(config, next.status, next.data);
        };

        // window.location.href assignment triggers jsdom's "not implemented" navigation
        // warning; stub it out so the auth-clearing fallback can be asserted on quietly.
        Object.defineProperty(window, 'location', {value: {href: ''}, writable: true, configurable: true});
    });

    afterEach(() => {
        apiClient.defaults.adapter = originalAdapter;
        Object.defineProperty(window, 'location', {value: originalLocation, writable: true, configurable: true});
    });

    it('passes successful non-401 responses straight through', async () => {
        queues['/api/v1/equipment'] = [{status: 200, data: {content: []}}];

        const response = await apiClient.get('/api/v1/equipment');

        expect(response.data).toEqual({content: []});
        expect(calls['/api/v1/equipment']).toBe(1);
    });

    it('refreshes once and retries the original request after a 401', async () => {
        queues['/api/v1/equipment'] = [
            {status: 401, data: {title: 'Unauthorized'}},
            {status: 200, data: {content: ['ok']}},
        ];
        queues['/api/v1/auth/refresh'] = [{status: 200, data: null}];

        const response = await apiClient.get('/api/v1/equipment');

        expect(response.data).toEqual({content: ['ok']});
        expect(calls['/api/v1/auth/refresh']).toBe(1);
        expect(calls['/api/v1/equipment']).toBe(2);
    });

    it('rejects with a parsed ApiError and does not loop when refresh itself fails', async () => {
        queues['/api/v1/equipment'] = [{status: 401, data: {title: 'Unauthorized'}}];
        queues['/api/v1/auth/refresh'] = [
            {status: 401, data: {title: 'Unauthorized', detail: 'Refresh token invalid'}},
        ];

        await expect(apiClient.get('/api/v1/equipment')).rejects.toEqual({
            status: 401,
            title: 'Unauthorized',
            detail: 'Refresh token invalid',
        });

        expect(calls['/api/v1/auth/refresh']).toBe(1);
        expect(calls['/api/v1/equipment']).toBe(1);
        expect(window.location.href).toBe('/login');
    });

    it('shares a single in-flight refresh call across concurrent 401s', async () => {
        queues['/api/v1/a'] = [
            {status: 401, data: {title: 'Unauthorized'}},
            {status: 200, data: {value: 'a'}},
        ];
        queues['/api/v1/b'] = [
            {status: 401, data: {title: 'Unauthorized'}},
            {status: 200, data: {value: 'b'}},
        ];
        queues['/api/v1/auth/refresh'] = [{status: 200, data: null}];

        const [a, b] = await Promise.all([
            apiClient.get('/api/v1/a'),
            apiClient.get('/api/v1/b'),
        ]);

        expect(a.data).toEqual({value: 'a'});
        expect(b.data).toEqual({value: 'b'});
        expect(calls['/api/v1/auth/refresh']).toBe(1);
    });

    it('does not attempt a nested refresh when the refresh endpoint itself 401s', async () => {
        queues['/api/v1/auth/refresh'] = [{status: 401, data: {title: 'Unauthorized'}}];

        await expect(apiClient.post('/api/v1/auth/refresh')).rejects.toEqual({status: 401, title: 'Unauthorized'});

        expect(calls['/api/v1/auth/refresh']).toBe(1);
    });

    it('does not attempt a refresh when login itself 401s', async () => {
        queues['/api/v1/auth/login'] = [{status: 401, data: {title: 'Unauthorized'}}];

        await expect(apiClient.post('/api/v1/auth/login')).rejects.toEqual({status: 401, title: 'Unauthorized'});

        expect(calls['/api/v1/auth/login']).toBe(1);
        expect(calls['/api/v1/auth/refresh']).toBeUndefined();
    });
});
