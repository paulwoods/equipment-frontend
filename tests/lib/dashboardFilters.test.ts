import {describe, expect, it} from 'vitest';
import {filterDashboardItems, sortDashboardItems} from '../../src/lib/dashboardFilters';
import type {DashboardItem} from '../../src/types/equipment';

const makeItem = (overrides: Partial<DashboardItem>): DashboardItem => ({
    equipmentId: 'eq1',
    equipmentName: 'Acme X-100',
    procedureId: 'p1',
    procedureName: 'Oil Change',
    procedureDescription: null,
    intervalDays: 30,
    daysTillDue: 10,
    dueDate: '2025-05-01',
    status: 'Upcoming',
    ...overrides,
});

describe('filterDashboardItems', () => {
    const items = [
        makeItem({procedureId: 'p1', equipmentName: 'Acme X-100', procedureName: 'Oil Change', procedureDescription: 'Change the oil'}),
        makeItem({procedureId: 'p2', equipmentName: 'Beta Y-200', procedureName: 'Filter Swap', procedureDescription: null}),
    ];

    it('returns all items when searchTerm is empty', () => {
        expect(filterDashboardItems(items, '')).toEqual(items);
    });

    it('matches on equipmentName case-insensitively', () => {
        const result = filterDashboardItems(items, 'acme');
        expect(result).toEqual([items[0]]);
    });

    it('matches on procedureName case-insensitively', () => {
        const result = filterDashboardItems(items, 'filter');
        expect(result).toEqual([items[1]]);
    });

    it('matches on procedureDescription when present', () => {
        const result = filterDashboardItems(items, 'change the oil');
        expect(result).toEqual([items[0]]);
    });

    it('does not throw when procedureDescription is null', () => {
        const result = filterDashboardItems(items, 'swap');
        expect(result).toEqual([items[1]]);
    });

    it('returns an empty array when nothing matches', () => {
        expect(filterDashboardItems(items, 'nonexistent')).toEqual([]);
    });

    it('does not mutate the input array', () => {
        const copy = [...items];
        filterDashboardItems(items, 'acme');
        expect(items).toEqual(copy);
    });
});

describe('sortDashboardItems', () => {
    it('sorts by equipmentName ascending', () => {
        const items = [
            makeItem({procedureId: 'p1', equipmentName: 'Zeta'}),
            makeItem({procedureId: 'p2', equipmentName: 'Alpha'}),
        ];
        const result = sortDashboardItems(items, 'equipmentName', 'asc');
        expect(result.map(i => i.equipmentName)).toEqual(['Alpha', 'Zeta']);
    });

    it('sorts by equipmentName descending', () => {
        const items = [
            makeItem({procedureId: 'p1', equipmentName: 'Alpha'}),
            makeItem({procedureId: 'p2', equipmentName: 'Zeta'}),
        ];
        const result = sortDashboardItems(items, 'equipmentName', 'desc');
        expect(result.map(i => i.equipmentName)).toEqual(['Zeta', 'Alpha']);
    });

    it('sorts by procedureName case-insensitively', () => {
        const items = [
            makeItem({procedureId: 'p1', procedureName: 'zebra'}),
            makeItem({procedureId: 'p2', procedureName: 'Apple'}),
        ];
        const result = sortDashboardItems(items, 'procedureName', 'asc');
        expect(result.map(i => i.procedureName)).toEqual(['Apple', 'zebra']);
    });

    it('sorts by intervalDays numerically', () => {
        const items = [
            makeItem({procedureId: 'p1', intervalDays: 90}),
            makeItem({procedureId: 'p2', intervalDays: 7}),
        ];
        const result = sortDashboardItems(items, 'intervalDays', 'asc');
        expect(result.map(i => i.intervalDays)).toEqual([7, 90]);
    });

    it('sorts by daysTillDue numerically', () => {
        const items = [
            makeItem({procedureId: 'p1', daysTillDue: 45}),
            makeItem({procedureId: 'p2', daysTillDue: 5}),
        ];
        const result = sortDashboardItems(items, 'daysTillDue', 'asc');
        expect(result.map(i => i.daysTillDue)).toEqual([5, 45]);
    });

    it('always places items with null daysTillDue first, regardless of sort field or order', () => {
        const items = [
            makeItem({procedureId: 'p1', equipmentName: 'Alpha', daysTillDue: 5, dueDate: '2025-01-01'}),
            makeItem({procedureId: 'p2', equipmentName: 'Zeta', daysTillDue: null, dueDate: null}),
        ];
        const asc = sortDashboardItems(items, 'equipmentName', 'asc');
        expect(asc.map(i => i.procedureId)).toEqual(['p2', 'p1']);

        const desc = sortDashboardItems(items, 'equipmentName', 'desc');
        expect(desc.map(i => i.procedureId)).toEqual(['p2', 'p1']);
    });

    it('does not mutate the input array', () => {
        const items = [
            makeItem({procedureId: 'p1', equipmentName: 'Zeta'}),
            makeItem({procedureId: 'p2', equipmentName: 'Alpha'}),
        ];
        const copy = [...items];
        sortDashboardItems(items, 'equipmentName', 'asc');
        expect(items).toEqual(copy);
    });
});
