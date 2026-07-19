import React from "react";
import {Link} from "react-router-dom";
import type {DashboardItem} from "../types/equipment";
import {deleteProcedure} from "../api/client";
import {PageContainer, PageLoader, SearchInput, SortIndicator} from "../components";
import {type SortOrder, useDashboardData, usePersistedState} from "../hooks";
import type {DashboardSortField} from "../lib/dashboardFilters";

const SEARCH_TERM_KEY = 'dashboard_searchTerm';
const SORT_FIELD_KEY = 'dashboard_sortField';
const SORT_ORDER_KEY = 'dashboard_sortOrder';

const DashboardPage = (): React.JSX.Element => {
    const [searchTerm, setSearchTerm] = usePersistedState(SEARCH_TERM_KEY, "");
    const [sortField, setSortField] = usePersistedState<DashboardSortField>(SORT_FIELD_KEY, 'daysTillDue');
    const [sortOrder, setSortOrder] = usePersistedState<SortOrder>(SORT_ORDER_KEY, 'asc');

    const handleSort = (field: DashboardSortField) => {
        if (field === sortField) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const {items: filteredAndSortedItems, loading, refresh} = useDashboardData(searchTerm, sortField, sortOrder);

    const handleDelete = async (equipmentId: string, procedureId: string) => {
        if (confirm("Are you sure you want to delete this procedure?")) {
            await deleteProcedure(equipmentId, procedureId);
            refresh();
        }
    };

    return (
        <PageContainer>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                    <h1 data-testid="page-header" className="text-2xl font-bold text-foreground">Dashboard</h1>
                </div>

                <div className="bg-card shadow rounded-lg overflow-hidden">
                    {loading ? (
                        <PageLoader/>
                    ) : (
                        <div className="space-y-4">
                            <div className="px-4 md:px-6 pt-4">
                                <SearchInput
                                    value={searchTerm}
                                    onChange={setSearchTerm}
                                    placeholder="Search procedures..."
                                />
                            </div>
                            <DashboardList
                                items={filteredAndSortedItems}
                                onDelete={handleDelete}
                                sortField={sortField}
                                sortOrder={sortOrder}
                                onSort={handleSort}
                            />
                        </div>
                    )}
                </div>
        </PageContainer>
    );
};

export {DashboardPage};

const DueStatus = ({item}: { item: DashboardItem }): React.JSX.Element => {
    if (item.daysTillDue === null || item.dueDate === null) {
        return <span className="text-muted-foreground italic text-sm">N/A</span>;
    }

    return (
        <div
            className={item.daysTillDue <= 0 ? "text-destructive font-bold" : "text-foreground"}>
            <div className="text-sm">{item.daysTillDue} days</div>
            <div className="text-xs opacity-75">({new Date(item.dueDate).toLocaleDateString()})</div>
        </div>
    );
};

const DashboardList = ({items, onDelete, sortField, sortOrder, onSort}: {
    items: DashboardItem[];
    onDelete: (eqId: string, procId: string) => void;
    sortField: DashboardSortField;
    sortOrder: SortOrder;
    onSort: (field: DashboardSortField) => void;
}): React.JSX.Element => {
    return (
        <div>
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted">
                    <tr>
                        <th
                            className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                            onClick={() => onSort('equipmentName')}
                        >
                            Equipment <SortIndicator field="equipmentName" sortField={sortField} sortOrder={sortOrder}/>
                        </th>
                        <th
                            className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                            onClick={() => onSort('procedureName')}
                        >
                            Procedure <SortIndicator field="procedureName" sortField={sortField} sortOrder={sortOrder}/>
                        </th>
                        <th
                            className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                            onClick={() => onSort('intervalDays')}
                        >
                            Interval <SortIndicator field="intervalDays" sortField={sortField} sortOrder={sortOrder}/>
                        </th>
                        <th
                            className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                            onClick={() => onSort('daysTillDue')}
                        >
                            Due In <SortIndicator field="daysTillDue" sortField={sortField} sortOrder={sortOrder}/>
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                    {items.map((item) => (
                        <tr key={`${item.equipmentId}-${item.procedureId}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                                <Link to={`/equipment/${item.equipmentId}`}
                                      className="hover:underline text-primary">
                                    {item.equipmentName}
                                </Link>
                            </td>
                            <td className="px-6 py-4 text-sm text-foreground">
                                <Link to={`/equipment/${item.equipmentId}/procedures/${item.procedureId}`}
                                      className="font-medium text-primary hover:underline transition-colors">
                                    {item.procedureName}
                                </Link>
                                <div
                                    className="text-xs text-muted-foreground line-clamp-1">{item.procedureDescription}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{item.intervalDays} days</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                <DueStatus item={item}/>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex gap-3 justify-end">
                                    <Link
                                        to={`/equipment/${item.equipmentId}/procedures/${item.procedureId}/perform`}
                                        className="text-green-500 hover:text-green-600 text-sm font-medium"
                                    >
                                        Perform
                                    </Link>
                                    <Link
                                        to={`/equipment/${item.equipmentId}/procedures/${item.procedureId}/history`}
                                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                                    >
                                        History
                                    </Link>
                                </div>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            <div className="md:hidden divide-y divide-border">
                {items.map((item) => (
                    <div key={`${item.equipmentId}-${item.procedureId}`} className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <Link to={`/equipment/${item.equipmentId}`}
                                      className="text-xs font-semibold text-primary hover:underline">
                                    {item.equipmentName}
                                </Link>
                                <Link to={`/equipment/${item.equipmentId}/procedures/${item.procedureId}`}
                                      className="hover:underline text-primary">
                                    <h3 className="text-sm font-bold">{item.procedureName}</h3>
                                </Link>
                            </div>
                            <DueStatus item={item}/>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Interval: {item.intervalDays} days
                        </div>
                        <div className="flex flex-wrap justify-end gap-3 pt-2">
                            <Link
                                to={`/equipment/${item.equipmentId}/procedures/${item.procedureId}/perform`}
                                className="text-green-500 hover:text-green-600 text-sm font-medium"
                            >
                                Perform
                            </Link>
                            <Link
                                to={`/equipment/${item.equipmentId}/procedures/${item.procedureId}/history`}
                                className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                            >
                                History
                            </Link>
                            <button
                                onClick={() => onDelete(item.equipmentId, item.procedureId)}
                                className="text-destructive hover:opacity-80 text-sm font-medium cursor-pointer"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {items.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                    No procedures found.
                </div>
            )}
        </div>
    );
};
