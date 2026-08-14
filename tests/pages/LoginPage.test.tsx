import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {AuthContext} from '../../src/hooks/useAuth';
import {LoginPage} from "../../src/pages/LoginPage";

const {mockLogin, mockGetGoogleConfig, mockGoogleLogin} = vi.hoisted(() => ({
    mockLogin: vi.fn(),
    mockGetGoogleConfig: vi.fn(),
    mockGoogleLogin: vi.fn(),
}));

vi.mock('../../src/api/client', () => ({
    login: mockLogin,
    getGoogleConfig: mockGetGoogleConfig,
    googleLogin: mockGoogleLogin,
}));

// Every test here drives the password form; Google sign-in is covered separately
// in GoogleSignInButton.test.tsx, so keep it switched off and out of the way.
beforeEach(() => mockGetGoogleConfig.mockResolvedValue({enabled: false, clientId: null}));

const renderPage = (setAuthenticated = vi.fn()) =>
    render(
        <MemoryRouter>
            <AuthContext.Provider value={{username: null, setAuthenticated}}>
                <LoginPage/>
            </AuthContext.Provider>
        </MemoryRouter>
    );

afterEach(() => vi.clearAllMocks());

describe('LoginPage', () => {
    it('renders the sign-in heading', () => {
        renderPage();
        expect(screen.getByRole('heading', {name: /Sign in to your account/i})).toBeInTheDocument();
    });

    it('renders email and password inputs', () => {
        renderPage();
        expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    });

    it('renders the Sign in button', () => {
        renderPage();
        expect(screen.getByRole('button', {name: /Sign in/i})).toBeInTheDocument();
    });

    it('calls login and setAuthenticated on successful submit', async () => {
        const setAuthenticated = vi.fn();
        mockLogin.mockResolvedValue(undefined);
        renderPage(setAuthenticated);

        await userEvent.type(screen.getByPlaceholderText('Email'), 'alice@example.com');
        await userEvent.type(screen.getByPlaceholderText('Password'), 'secret');
        await act(async () => {
            await userEvent.click(screen.getByRole('button', {name: /Sign in/i}));
        });

        expect(mockLogin).toHaveBeenCalledWith('alice@example.com', 'secret');
        expect(setAuthenticated).toHaveBeenCalledWith(true);
    });

    it('shows invalid-credentials message on 401', async () => {
        mockLogin.mockRejectedValue({status: 401, title: 'Unauthorized'});
        renderPage();

        await userEvent.type(screen.getByPlaceholderText('Email'), 'alice@example.com');
        await userEvent.type(screen.getByPlaceholderText('Password'), 'wrong');
        await act(async () => {
            await userEvent.click(screen.getByRole('button', {name: /Sign in/i}));
        });

        expect(screen.getByText(/Invalid username or password/i)).toBeInTheDocument();
    });

    it('shows server-configuration message on 403', async () => {
        mockLogin.mockRejectedValue({status: 403, title: 'Forbidden'});
        renderPage();

        await userEvent.type(screen.getByPlaceholderText('Email'), 'alice@example.com');
        await userEvent.type(screen.getByPlaceholderText('Password'), 'secret');
        await act(async () => {
            await userEvent.click(screen.getByRole('button', {name: /Sign in/i}));
        });

        expect(screen.getByText(/server blocked this request/i)).toBeInTheDocument();
        expect(screen.queryByText(/Invalid username or password/i)).not.toBeInTheDocument();
    });

    it('shows rate-limit message on 429', async () => {
        mockLogin.mockRejectedValue({status: 429, title: 'Too Many Requests'});
        renderPage();

        await userEvent.type(screen.getByPlaceholderText('Email'), 'alice@example.com');
        await userEvent.type(screen.getByPlaceholderText('Password'), 'secret');
        await act(async () => {
            await userEvent.click(screen.getByRole('button', {name: /Sign in/i}));
        });

        expect(screen.getByText(/Too many login attempts/i)).toBeInTheDocument();
        expect(screen.queryByText(/Invalid username or password/i)).not.toBeInTheDocument();
    });

    it('shows server-error message on 5xx', async () => {
        mockLogin.mockRejectedValue({status: 502, title: 'Bad Gateway'});
        renderPage();

        await userEvent.type(screen.getByPlaceholderText('Email'), 'alice@example.com');
        await userEvent.type(screen.getByPlaceholderText('Password'), 'secret');
        await act(async () => {
            await userEvent.click(screen.getByRole('button', {name: /Sign in/i}));
        });

        expect(screen.getByText(/server is unavailable or returned an error/i)).toBeInTheDocument();
        expect(screen.queryByText(/Invalid username or password/i)).not.toBeInTheDocument();
    });

    it('shows error message when login throws', async () => {
        mockLogin.mockRejectedValue({status: 0, title: 'Network error'});
        renderPage();

        await userEvent.type(screen.getByPlaceholderText('Email'), 'alice@example.com');
        await userEvent.type(screen.getByPlaceholderText('Password'), 'secret');
        await act(async () => {
            await userEvent.click(screen.getByRole('button', {name: /Sign in/i}));
        });

        expect(screen.getByText(/Login failed/i)).toBeInTheDocument();
    });

    it('shows "Signing in..." while loading', async () => {
        mockLogin.mockReturnValue(new Promise(() => {
        })); // never resolves
        renderPage();

        await userEvent.type(screen.getByPlaceholderText('Email'), 'alice@example.com');
        await userEvent.type(screen.getByPlaceholderText('Password'), 'secret');
        await userEvent.click(screen.getByRole('button', {name: /Sign in/i}));

        expect(screen.getByRole('button', {name: /Signing in/i})).toBeDisabled();
    });
});
