import {afterEach, describe, expect, it, vi} from 'vitest';
import {act, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {SystemPage} from '../../src/pages/SystemPage';

const {mockExportEquipment, mockSendDashboardEmail} = vi.hoisted(() => ({
    mockExportEquipment: vi.fn(),
    mockSendDashboardEmail: vi.fn(),
}));

vi.mock('../../src/api/client', () => ({
    exportEquipment: mockExportEquipment,
    sendDashboardEmail: mockSendDashboardEmail,
}));

const renderPage = () => render(<MemoryRouter><SystemPage/></MemoryRouter>);

afterEach(() => vi.clearAllMocks());

describe('SystemPage', () => {
    it('renders the System heading', () => {
        renderPage();
        expect(screen.getByRole('heading', {name: 'System'})).toBeInTheDocument();
    });

    it('renders Users link to /users', () => {
        renderPage();
        expect(screen.getByRole('link', {name: /Users/i})).toHaveAttribute('href', '/users');
    });

    it('renders Import link to /equipment/import', () => {
        renderPage();
        expect(screen.getByRole('link', {name: /Import/i})).toHaveAttribute('href', '/equipment/import');
    });

    it('triggers export on Export card click', async () => {
        mockExportEquipment.mockResolvedValue(undefined);
        renderPage();
        await act(async () => {
            await userEvent.click(screen.getByRole('button', {name: /Export/i}));
        });
        expect(mockExportEquipment).toHaveBeenCalledOnce();
    });

    it('sends dashboard email and shows success alert', async () => {
        mockSendDashboardEmail.mockResolvedValue({success: true});
        vi.spyOn(window, 'alert').mockImplementation(() => {
        });
        renderPage();
        await act(async () => {
            await userEvent.click(screen.getByRole('button', {name: /Email Dashboard/i}));
        });
        expect(mockSendDashboardEmail).toHaveBeenCalledOnce();
        expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/sent successfully/i));
    });

    it('shows failure alert when email send fails', async () => {
        mockSendDashboardEmail.mockResolvedValue({success: false, error: 'SMTP error'});
        vi.spyOn(window, 'alert').mockImplementation(() => {
        });
        renderPage();
        await act(async () => {
            await userEvent.click(screen.getByRole('button', {name: /Email Dashboard/i}));
        });
        expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/Failed/i));
    });
});
