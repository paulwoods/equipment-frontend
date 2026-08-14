import axios, {type InternalAxiosRequestConfig} from 'axios';
import {toApiError} from './apiError';

export const apiClient = axios.create({
    baseURL: '',
    timeout: 10_000,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

const REFRESH_URL = '/api/v1/auth/refresh';
// '/api/v1/auth/google' also covers '/api/v1/auth/google/config' — the check is a substring match.
const NO_REFRESH_URLS = [REFRESH_URL, '/api/v1/auth/login', '/api/v1/auth/google', '/api/v1/auth/logout', '/api/v1/auth/me'];

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<void> | null = null;

const isExcludedFromRefresh = (url: string | undefined): boolean =>
    url !== undefined && NO_REFRESH_URLS.some((excluded) => url.includes(excluded));

const clearAuthState = (): void => {
    // apiClient runs outside the React tree, so there's no way to reach AuthContext's
    // setAuthenticated state setter from here. Fall back to a hard redirect.
    window.location.href = '/login';
};

apiClient.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
        if (!axios.isAxiosError(error)) {
            return Promise.reject(error);
        }

        const originalRequest = error.config as RetryableRequestConfig | undefined;

        if (
            error.response?.status === 401 &&
            originalRequest &&
            !originalRequest._retry &&
            !isExcludedFromRefresh(originalRequest.url)
        ) {
            originalRequest._retry = true;

            try {
                if (!refreshPromise) {
                    refreshPromise = apiClient
                        .post(REFRESH_URL)
                        .then(() => undefined)
                        .finally(() => {
                            refreshPromise = null;
                        });
                }
                await refreshPromise;
                return apiClient(originalRequest);
            } catch (refreshError) {
                // The refresh request goes through this same interceptor, so a failure
                // here is already a parsed ApiError (refresh is in NO_REFRESH_URLS above)
                // rather than a raw AxiosError — don't re-parse it.
                clearAuthState();
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(toApiError(error));
    },
);
