import type {DashboardItem} from "../types/equipment";
import type {SortOrder} from "../hooks/useSort";

export type DashboardSortField = 'equipmentName' | 'procedureName' | 'intervalDays' | 'daysTillDue';

export const filterDashboardItems = (items: DashboardItem[], searchTerm: string): DashboardItem[] => {
    if (!searchTerm) {
        return items;
    }

    const lower = searchTerm.toLowerCase();
    return items.filter(item =>
        item.equipmentName.toLowerCase().includes(lower) ||
        item.procedureName.toLowerCase().includes(lower) ||
        (item.procedureDescription && item.procedureDescription.toLowerCase().includes(lower))
    );
};

export const sortDashboardItems = (
    items: DashboardItem[],
    sortField: DashboardSortField,
    sortOrder: SortOrder,
): DashboardItem[] => {
    return [...items].sort((a, b) => {
        const aNA = a.daysTillDue === null;
        const bNA = b.daysTillDue === null;
        if (aNA && !bNA) return -1;
        if (!aNA && bNA) return 1;
        if (aNA && bNA) return 0;

        let aValue: string | number;
        let bValue: string | number;

        if (sortField === 'daysTillDue') {
            aValue = a.daysTillDue ?? Number.MAX_SAFE_INTEGER;
            bValue = b.daysTillDue ?? Number.MAX_SAFE_INTEGER;
        } else if (sortField === 'intervalDays') {
            aValue = a.intervalDays;
            bValue = b.intervalDays;
        } else {
            aValue = a[sortField].toLowerCase();
            bValue = b[sortField].toLowerCase();
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });
};
