import {afterEach, describe, expect, it, vi} from 'vitest';
import {act, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {DashboardPage} from '../../src/pages/DashboardPage';
import type {DashboardItem} from '../../src/types/equipment';

const {mockGetDashboard, mockDeleteProcedure} = vi.hoisted(() => ({
    mockGetDashboard: vi.fn(),
    mockDeleteProcedure: vi.fn(),
}));

vi.mock('../../src/api/client', () => ({
    getDashboard: mockGetDashboard,
    deleteProcedure: mockDeleteProcedure,
}));

// CalendarView uses complex DOM — mock it
vi.mock('../../src/components/CalendarView', () => ({
    CalendarView: () => <div>Calendar View</div>,
}));

const items: DashboardItem[] = [
    {
        equipmentId: 'eq1', equipmentName: 'Acme X-100',
        procedureId: 'p1', procedureName: 'Oil Change', procedureDescription: null,
        intervalDays: 30, daysTillDue: 10, dueDate: '2025-05-01', status: 'DUE_SOON',
    },
    {
        equipmentId: 'eq1', equipmentName: 'Acme X-100',
        procedureId: 'p2', procedureName: 'Filter Swap', procedureDescription: null,
        intervalDays: 90, daysTillDue: 45, dueDate: '2025-06-15', status: 'OK',
    },
];

const renderPage = () => render(<MemoryRouter><DashboardPage/></MemoryRouter>);

afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
});

describe('DashboardPage', () => {
    it('shows loading initially', () => {
        mockGetDashboard.mockReturnValue(new Promise(() => {
        }));
        renderPage();
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders the Dashboard heading', async () => {
        mockGetDashboard.mockResolvedValue(items);
        await act(async () => {
            renderPage();
        });
        expect(screen.getByRole('heading', {name: 'Dashboard'})).toBeInTheDocument();
    });

    it('renders procedures from dashboard items', async () => {
        mockGetDashboard.mockResolvedValue(items);
        await act(async () => {
            renderPage();
        });
        expect(screen.getAllByText('Oil Change').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Filter Swap').length).toBeGreaterThan(0);
    });

    it('shows empty state when no items', async () => {
        mockGetDashboard.mockResolvedValue([]);
        await act(async () => {
            renderPage();
        });
        expect(screen.getByText(/No procedures found/i)).toBeInTheDocument();
    });

    it('filters procedures by search term', async () => {
        mockGetDashboard.mockResolvedValue(items);
        await act(async () => {
            renderPage();
        });

        await userEvent.type(screen.getByPlaceholderText(/search procedures/i), 'Oil');
        expect(screen.queryAllByText('Filter Swap').length).toBe(0);
        expect(screen.getAllByText('Oil Change').length).toBeGreaterThan(0);
    });

    it('deletes a procedure after confirmation', async () => {
        mockGetDashboard.mockResolvedValue(items);
        mockDeleteProcedure.mockResolvedValue(undefined);
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        await act(async () => {
            renderPage();
        });

        const deleteButtons = screen.getAllByRole('button', {name: 'Delete'});
        await act(async () => {
            await userEvent.click(deleteButtons[0]);
        });

        expect(mockDeleteProcedure).toHaveBeenCalledOnce();
    });
});
