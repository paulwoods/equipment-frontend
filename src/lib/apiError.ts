import axios from 'axios';

/**
 * The single shape every rejected apiClient request produces.
 *
 * Extends Error on purpose: apiClient's interceptor rejects with this, so any
 * `catch (err)` block written the obvious way — `err instanceof Error`, or
 * reading `err.message` — keeps working. A plain object here silently turns
 * every such check false and swallows the server's message.
 *
 * `message` prefers ProblemDetail's `detail` (the specific explanation, e.g.
 * "Invalid JSON in import file: ...") over `title` (the generic category, e.g.
 * "Import Error"), because `message` is what reaches the user.
 */
export class ApiError extends Error {
    readonly status: number;
    readonly title: string;
    readonly detail?: string;

    constructor(status: number, title: string, detail?: string) {
        super(detail ?? title);
        this.name = 'ApiError';
        this.status = status;
        this.title = title;
        this.detail = detail;
    }
}

interface ProblemDetailBody {
    title: string;
    detail?: string;
    status?: number;
}

const isProblemDetail = (data: unknown): data is ProblemDetailBody =>
    typeof data === 'object' && data !== null && typeof (data as { title?: unknown }).title === 'string';

export const toApiError = (error: unknown): ApiError => {
    if (!axios.isAxiosError(error)) {
        return new ApiError(0, 'Unexpected error');
    }

    const response = error.response;
    if (!response) {
        return new ApiError(0, 'Network error');
    }

    if (isProblemDetail(response.data)) {
        return new ApiError(
            response.data.status ?? response.status,
            response.data.title,
            response.data.detail,
        );
    }

    return new ApiError(response.status, error.message);
};
