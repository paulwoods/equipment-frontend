import {describe, expect, it} from 'vitest';
import {ApiError, toApiError} from '../../src/lib/apiError';

const expectApiError = (
    actual: ApiError,
    expected: {status: number; title: string; detail?: string; message: string},
): void => {
    expect(actual).toBeInstanceOf(ApiError);
    expect(actual.status).toBe(expected.status);
    expect(actual.title).toBe(expected.title);
    expect(actual.detail).toBe(expected.detail);
    expect(actual.message).toBe(expected.message);
};

describe('toApiError', () => {
    it('parses an RFC7807 problem-detail body', () => {
        const error = Object.assign(new Error('Request failed with status code 404'), {
            isAxiosError: true,
            response: {
                status: 404,
                data: {title: 'Not Found', detail: 'Equipment not found', status: 404},
            },
        });

        expectApiError(toApiError(error), {
            status: 404,
            title: 'Not Found',
            detail: 'Equipment not found',
            message: 'Equipment not found',
        });
    });

    it('falls back to the response status and message when the body is not RFC7807 shaped', () => {
        const error = Object.assign(new Error('Request failed with status code 500'), {
            isAxiosError: true,
            response: {status: 500, data: {some: 'unexpected shape'}},
        });

        expectApiError(toApiError(error), {
            status: 500,
            title: 'Request failed with status code 500',
            detail: undefined,
            message: 'Request failed with status code 500',
        });
    });

    it('falls back to a network-error shape when there is no response', () => {
        const error = Object.assign(new Error('Network Error'), {isAxiosError: true});

        expectApiError(toApiError(error), {
            status: 0,
            title: 'Network error',
            detail: undefined,
            message: 'Network error',
        });
    });

    it('falls back to a generic shape for non-axios errors', () => {
        expectApiError(toApiError(new Error('boom')), {
            status: 0,
            title: 'Unexpected error',
            detail: undefined,
            message: 'Unexpected error',
        });
    });

    // Regression guard: apiClient rejects with this value, so any `catch (err)`
    // block using `err instanceof Error` or reading `err.message` must keep
    // working. A plain object here silently broke four pages and only the e2e
    // suite noticed.
    it('produces a real Error carrying the server message', () => {
        const error = Object.assign(new Error('Request failed with status code 400'), {
            isAxiosError: true,
            response: {
                status: 400,
                data: {
                    title: 'Import Error',
                    detail: 'Invalid JSON in import file: Unexpected character',
                    status: 400,
                },
            },
        });

        const apiError = toApiError(error);

        expect(apiError).toBeInstanceOf(Error);
        expect(apiError.message).toMatch(/invalid json/i);
    });
});
