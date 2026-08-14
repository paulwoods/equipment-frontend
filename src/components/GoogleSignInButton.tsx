import React, {useEffect, useRef, useState} from 'react';
import {getGoogleConfig, googleLogin} from '../api/client';
import type {ApiError} from '../lib/apiError';

const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

// Google Identity Services is loaded at runtime rather than bundled, so the
// handful of calls we make are declared here instead of pulling in @types/google.one-tap.
interface GsiCredentialResponse {
    credential: string;
}

interface GsiIdApi {
    initialize: (options: {
        client_id: string;
        callback: (response: GsiCredentialResponse) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
    }) => void;
    renderButton: (parent: HTMLElement, options: {
        type?: 'standard' | 'icon';
        theme?: 'outline' | 'filled_blue' | 'filled_black';
        size?: 'small' | 'medium' | 'large';
        text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
        shape?: 'rectangular' | 'pill' | 'circle' | 'square';
        logo_alignment?: 'left' | 'center';
        width?: number;
    }) => void;
}

declare global {
    interface Window {
        google?: {accounts: {id: GsiIdApi}};
    }
}

const loadGsiScript = (): Promise<void> =>
    new Promise((resolve, reject) => {
        if (window.google?.accounts?.id) {
            resolve();
            return;
        }
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SCRIPT_SRC}"]`);
        if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('Failed to load Google Sign-In')));
            return;
        }
        const script = document.createElement('script');
        script.src = GSI_SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.addEventListener('load', () => resolve());
        script.addEventListener('error', () => reject(new Error('Failed to load Google Sign-In')));
        document.head.appendChild(script);
    });

const googleErrorMessage = (status: number): string => {
    if (status === 409) {
        return 'Complete the initial setup before signing in with Google.';
    }
    if (status === 503) {
        return 'Google sign-in is not configured on this server.';
    }
    if (status === 429) {
        return 'Too many attempts. Please wait a few minutes and try again.';
    }
    if (status >= 500) {
        return 'The server is unavailable or returned an error. Please try again later.';
    }
    return 'Google sign-in was rejected. Please try again or use your email and password.';
};

interface GoogleSignInButtonProps {
    onSuccess: () => Promise<void> | void;
    onError: (message: string) => void;
}

/**
 * Renders Google's own sign-in button, but only once the server confirms Google
 * sign-in is configured — otherwise nothing is rendered and the page is a plain
 * email/password form. The button hands back an ID token, which the backend
 * verifies and exchanges for the usual auth cookies.
 */
const GoogleSignInButton = ({onSuccess, onError}: GoogleSignInButtonProps): React.JSX.Element | null => {
    const [enabled, setEnabled] = useState(false);
    const buttonRef = useRef<HTMLDivElement>(null);

    // Held in a ref so the GSI callback, which is registered once, always sees the
    // current handlers rather than the ones captured on the first render.
    const handlers = useRef({onSuccess, onError});
    useEffect(() => {
        handlers.current = {onSuccess, onError};
    }, [onSuccess, onError]);

    useEffect(() => {
        let cancelled = false;

        const setUp = async (): Promise<void> => {
            const config = await getGoogleConfig().catch(() => null);
            if (cancelled || !config?.enabled || !config.clientId) {
                return;
            }

            try {
                await loadGsiScript();
            } catch {
                // A blocked or unreachable script leaves password login working, so
                // report nothing and simply keep the button hidden.
                return;
            }

            const gsi = window.google?.accounts?.id;
            if (cancelled || !gsi) {
                return;
            }

            setEnabled(true);
            gsi.initialize({
                client_id: config.clientId,
                callback: (response) => {
                    void (async () => {
                        try {
                            await googleLogin(response.credential);
                            await handlers.current.onSuccess();
                        } catch (error) {
                            const status = (error as ApiError).status;
                            handlers.current.onError(
                                status === 0 ? 'Sign-in failed. Please try again.' : googleErrorMessage(status),
                            );
                        }
                    })();
                },
            });
        };

        void setUp();
        return () => {
            cancelled = true;
        };
    }, []);

    // renderButton needs the container in the DOM, so it runs after `enabled` paints it.
    useEffect(() => {
        const parent = buttonRef.current;
        const gsi = window.google?.accounts?.id;
        if (!enabled || !parent || !gsi) {
            return;
        }
        // GSI only accepts a fixed pixel width, within its own 200–400 bounds.
        const width = Math.min(400, Math.max(200, parent.clientWidth || 320));
        gsi.renderButton(parent, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'center',
            width,
        });
    }, [enabled]);

    if (!enabled) {
        return null;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-border"/>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
                <span className="h-px flex-1 bg-border"/>
            </div>
            <div ref={buttonRef} data-testid="google-signin-button" className="flex justify-center"/>
        </div>
    );
};

export {GoogleSignInButton};
