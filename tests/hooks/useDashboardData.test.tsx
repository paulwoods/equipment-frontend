import {afterEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from '@testing-library/react';
import {useDashboardData} from '../../src/hooks/useDashboardData';
import type {DashboardItem} from '../../src/types/equipment';

const {mockGetDashboard} = vi.hoisted(() => ({
    mockGetDashboard: vi.fn(),
}));

vi.mock('../../src/api/client', () => ({
    getDashboard: mockGetDashboard,
}));

const items: DashboardItem[] = [
    {
        equipmentId: 'eq1', equipmentName: 'Acme X-100',
        procedureId: 'p1', procedureName: 'Oil Change', procedureDescription: null,
        intervalDays: 30, daysTillDue: 10, dueDate: '2025-05-01', status: 'Upcoming',
    },
    {
        equipmentId: 'eq1', equipmentName: 'Acme X-100',
        procedureId: 'p2', procedureName: 'Filter Swap', procedureDescription: null,
        intervalDays: 90, daysTillDue: 45, dueDate: '2025-06-15', status: 'Upcoming',
    },
];

afterEach(() => {
    vi.clearAllMocks();
});

describe('useDashboardData', () => {
    it('starts in a loading state', () => {
        mockGetDashboard.mockReturnValue(new Promise(() => {
        }));
        const {result} = renderHook(() => useDashboardData('', 'daysTillDue', 'asc'));
        expect(result.current.loading).toBe(true);
        expect(result.current.items).toEqual([]);
    });

    it('loads items and applies filter/sort', async () => {
        mockGetDashboard.mockResolvedValue(items);
        const {result} = renderHook(() => useDashboardData('', 'procedureName', 'asc'));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.items.map(i => i.procedureName)).toEqual(['Filter Swap', 'Oil Change']);
    });

    it('applies the search term to the derived list', async () => {
        mockGetDashboard.mockResolvedValue(items);
        const {result} = renderHook(() => useDashboardData('oil', 'procedureName', 'asc'));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.items.map(i => i.procedureName)).toEqual(['Oil Change']);
    });

    it('sets loading to false when the fetch fails', async () => {
        mockGetDashboard.mockRejectedValue(new Error('network error'));
        const {result} = renderHook(() => useDashboardData('', 'daysTillDue', 'asc'));

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.items).toEqual([]);
    });

    it('re-fetches when refresh is called', async () => {
        mockGetDashboard.mockResolvedValue(items);
        const {result} = renderHook(() => useDashboardData('', 'daysTillDue', 'asc'));

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(mockGetDashboard).toHaveBeenCalledTimes(1);

        mockGetDashboard.mockResolvedValue([items[0]]);
        act(() => {
            result.current.refresh();
        });

        await waitFor(() => expect(mockGetDashboard).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(result.current.items).toEqual([items[0]]));
    });
});
