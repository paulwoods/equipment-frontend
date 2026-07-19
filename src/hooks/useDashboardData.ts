import {useCallback, useEffect, useMemo, useState} from "react";
import {getDashboard} from "../api/client";
import type {DashboardItem} from "../types/equipment";
import {type DashboardSortField, filterDashboardItems, sortDashboardItems} from "../lib/dashboardFilters";
import type {SortOrder} from "./useSort";

interface UseDashboardDataReturn {
    items: DashboardItem[];
    loading: boolean;
    refresh: () => void;
}

/**
 * Owns fetching the dashboard items (with a refresh/cache-busting mechanism)
 * and derives the final displayed list by applying the pure filter/sort
 * functions for the given search term and sort state.
 */
export const useDashboardData = (
    searchTerm: string,
    sortField: DashboardSortField,
    sortOrder: SortOrder,
): UseDashboardDataReturn => {
    const [rawItems, setRawItems] = useState<DashboardItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshCount, setRefreshCount] = useState(0);

    useEffect(() => {
        let cancelled = false;
        getDashboard().then((data) => {
            if (!cancelled) {
                setRawItems(data);
                setLoading(false);
            }
        }).catch(() => {
            if (!cancelled) setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [refreshCount]);

    const refresh = useCallback(() => setRefreshCount(c => c + 1), []);

    const items = useMemo(
        () => sortDashboardItems(filterDashboardItems(rawItems, searchTerm), sortField, sortOrder),
        [rawItems, searchTerm, sortField, sortOrder],
    );

    return {items, loading, refresh};
};
