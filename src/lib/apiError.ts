import axios from 'axios';

export interface ApiError {
    status: number;
    title: string;
    detail?: string;
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
        return {status: 0, title: 'Unexpected error'};
    }

    const response = error.response;
    if (!response) {
        return {status: 0, title: 'Network error'};
    }

    if (isProblemDetail(response.data)) {
        return {
            status: response.data.status ?? response.status,
            title: response.data.title,
            detail: response.data.detail,
        };
    }

    return {status: response.status, title: error.message};
};
