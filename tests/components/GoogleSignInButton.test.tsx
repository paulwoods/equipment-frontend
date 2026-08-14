import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen, waitFor} from '@testing-library/react';
import {GoogleSignInButton} from '../../src/components/GoogleSignInButton';

const {mockGetGoogleConfig, mockGoogleLogin} = vi.hoisted(() => ({
    mockGetGoogleConfig: vi.fn(),
    mockGoogleLogin: vi.fn(),
}));

vi.mock('../../src/api/client', () => ({
    getGoogleConfig: mockGetGoogleConfig,
    googleLogin: mockGoogleLogin,
}));

const CLIENT_ID = 'our-app.apps.googleusercontent.com';

type GsiCallback = (response: {credential: string}) => void;

let capturedCallback: GsiCallback | null;
let initialize: ReturnType<typeof vi.fn>;
let renderButton: ReturnType<typeof vi.fn>;

/** Stands in for the Google Identity Services script, which never loads under jsdom. */
const installGsiStub = (): void => {
    capturedCallback = null;
    initialize = vi.fn((options: {client_id: string; callback: GsiCallback}) => {
        capturedCallback = options.callback;
    });
    renderButton = vi.fn();
    window.google = {accounts: {id: {initialize, renderButton} as never}};
};

const removeGsiStub = (): void => {
    delete window.google;
};

beforeEach(() => installGsiStub());

afterEach(() => {
    removeGsiStub();
    vi.clearAllMocks();
});

describe('GoogleSignInButton', () => {
    it('renders nothing when the server reports Google sign-in is disabled', async () => {
        mockGetGoogleConfig.mockResolvedValue({enabled: false, clientId: null});

        render(<GoogleSignInButton onSuccess={vi.fn()} onError={vi.fn()}/>);

        await waitFor(() => expect(mockGetGoogleConfig).toHaveBeenCalled());
        expect(screen.queryByTestId('google-signin-button')).not.toBeInTheDocument();
        expect(initialize).not.toHaveBeenCalled();
    });

    it('renders nothing when the config request fails', async () => {
        mockGetGoogleConfig.mockRejectedValue({status: 500});

        render(<GoogleSignInButton onSuccess={vi.fn()} onError={vi.fn()}/>);

        await waitFor(() => expect(mockGetGoogleConfig).toHaveBeenCalled());
        expect(screen.queryByTestId('google-signin-button')).not.toBeInTheDocument();
    });

    it('renders nothing when the server reports enabled but sends no client ID', async () => {
        mockGetGoogleConfig.mockResolvedValue({enabled: true, clientId: null});

        render(<GoogleSignInButton onSuccess={vi.fn()} onError={vi.fn()}/>);

        await waitFor(() => expect(mockGetGoogleConfig).toHaveBeenCalled());
        expect(screen.queryByTestId('google-signin-button')).not.toBeInTheDocument();
        expect(initialize).not.toHaveBeenCalled();
    });

    it('initializes Google with the server-supplied client ID and renders the button', async () => {
        mockGetGoogleConfig.mockResolvedValue({enabled: true, clientId: CLIENT_ID});

        render(<GoogleSignInButton onSuccess={vi.fn()} onError={vi.fn()}/>);

        await waitFor(() => expect(screen.getByTestId('google-signin-button')).toBeInTheDocument());
        expect(initialize).toHaveBeenCalledWith(expect.objectContaining({client_id: CLIENT_ID}));
        await waitFor(() => expect(renderButton).toHaveBeenCalled());
    });

    it('exchanges the credential for a session and reports success', async () => {
        mockGetGoogleConfig.mockResolvedValue({enabled: true, clientId: CLIENT_ID});
        mockGoogleLogin.mockResolvedValue(undefined);
        const onSuccess = vi.fn();
        const onError = vi.fn();

        render(<GoogleSignInButton onSuccess={onSuccess} onError={onError}/>);
        await waitFor(() => expect(capturedCallback).not.toBeNull());

        capturedCallback!({credential: 'a.google.id-token'});

        await waitFor(() => expect(onSuccess).toHaveBeenCalled());
        expect(mockGoogleLogin).toHaveBeenCalledWith('a.google.id-token');
        expect(onError).not.toHaveBeenCalled();
    });

    it('reports a rejected credential without signing the user in', async () => {
        mockGetGoogleConfig.mockResolvedValue({enabled: true, clientId: CLIENT_ID});
        mockGoogleLogin.mockRejectedValue({status: 401});
        const onSuccess = vi.fn();
        const onError = vi.fn();

        render(<GoogleSignInButton onSuccess={onSuccess} onError={onError}/>);
        await waitFor(() => expect(capturedCallback).not.toBeNull());

        capturedCallback!({credential: 'forged'});

        await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.stringMatching(/rejected/i)));
        expect(onSuccess).not.toHaveBeenCalled();
    });

    it('explains that setup must be completed first on 409', async () => {
        mockGetGoogleConfig.mockResolvedValue({enabled: true, clientId: CLIENT_ID});
        mockGoogleLogin.mockRejectedValue({status: 409});
        const onError = vi.fn();

        render(<GoogleSignInButton onSuccess={vi.fn()} onError={onError}/>);
        await waitFor(() => expect(capturedCallback).not.toBeNull());

        capturedCallback!({credential: 'a.google.id-token'});

        await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.stringMatching(/initial setup/i)));
    });

    it('reports a network failure distinctly', async () => {
        mockGetGoogleConfig.mockResolvedValue({enabled: true, clientId: CLIENT_ID});
        mockGoogleLogin.mockRejectedValue({status: 0});
        const onError = vi.fn();

        render(<GoogleSignInButton onSuccess={vi.fn()} onError={onError}/>);
        await waitFor(() => expect(capturedCallback).not.toBeNull());

        capturedCallback!({credential: 'a.google.id-token'});

        await waitFor(() => expect(onError).toHaveBeenCalledWith('Sign-in failed. Please try again.'));
    });

    it('stays hidden when the Google script cannot be loaded', async () => {
        removeGsiStub();
        mockGetGoogleConfig.mockResolvedValue({enabled: true, clientId: CLIENT_ID});

        render(<GoogleSignInButton onSuccess={vi.fn()} onError={vi.fn()}/>);

        await waitFor(() => expect(mockGetGoogleConfig).toHaveBeenCalled());
        // jsdom never fires load for the injected <script>, so the promise stays pending
        // and the button must never appear — password login carries on regardless.
        expect(screen.queryByTestId('google-signin-button')).not.toBeInTheDocument();
    });
});
