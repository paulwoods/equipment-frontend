import {describe, expect, it} from 'vitest';
import {toApiError} from '../../src/lib/apiError';

describe('toApiError', () => {
    it('parses an RFC7807 problem-detail body', () => {
        const error = Object.assign(new Error('Request failed with status code 404'), {
            isAxiosError: true,
            response: {
                status: 404,
                data: {title: 'Not Found', detail: 'Equipment not found', status: 404},
            },
        });

        expect(toApiError(error)).toEqual({status: 404, title: 'Not Found', detail: 'Equipment not found'});
    });

    it('falls back to the response status and message when the body is not RFC7807 shaped', () => {
        const error = Object.assign(new Error('Request failed with status code 500'), {
            isAxiosError: true,
            response: {status: 500, data: {some: 'unexpected shape'}},
        });

        expect(toApiError(error)).toEqual({status: 500, title: 'Request failed with status code 500'});
    });

    it('falls back to a network-error shape when there is no response', () => {
        const error = Object.assign(new Error('Network Error'), {isAxiosError: true});

        expect(toApiError(error)).toEqual({status: 0, title: 'Network error'});
    });

    it('falls back to a generic shape for non-axios errors', () => {
        expect(toApiError(new Error('boom'))).toEqual({status: 0, title: 'Unexpected error'});
    });
});
