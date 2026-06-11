import {afterEach, describe, expect, it, vi} from 'vitest';
import {act, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {AuthContext} from '../../src/hooks/useAuth';
import {LoginPage} from "../../src/pages/LoginPage";

const {mockLogin} = vi.hoisted(() => ({
    mockLogin: vi.fn(),
}));

vi.mock('../../src/api/client', () => ({login: mockLogin}));

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
        mockLogin.mockResolvedValue({ok: true});
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
        mockLogin.mockResolvedValue({ok: false, status: 401});
        renderPage();

        await userEvent.type(screen.getByPlaceholderText('Email'), 'alice@example.com');
        await userEvent.type(screen.getByPlaceholderText('Password'), 'wrong');
        await act(async () => {
            await userEvent.click(screen.getByRole('button', {name: /Sign in/i}));
        });

        expect(screen.getByText(/Invalid username or password/i)).toBeInTheDocument();
    });

    it('shows server-configuration message on 403', async () => {
        mockLogin.mockResolvedValue({ok: false, status: 403});
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
        mockLogin.mockResolvedValue({ok: false, status: 429});
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
        mockLogin.mockResolvedValue({ok: false, status: 502});
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
        mockLogin.mockRejectedValue(new Error('network error'));
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
