import React, {useEffect, useMemo, useState} from "react";
import {Link} from "react-router-dom";
import type {User} from "../types/user";
import {canManageUsers, roleBadgeClass} from "../types/user";
import {deleteUser, fetchUsers} from "../api/client";
import {useAuth, useSort} from "../hooks";
import {Button} from "../components/ui/button";
import {Alert, AlertDescription} from "../components/ui/alert";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "../components/ui/table";
import {PageContainer, SearchInput, SortIndicator, TableSkeleton} from "../components";

const ROLE_ORDER = ["SYSTEM_ADMIN", "ADMIN", "EDIT", "USER"];

type SortField = "name" | "email";

const UsersPage = (): React.JSX.Element => {
    const {roles, userId} = useAuth();
    const isAdmin = canManageUsers(roles);

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const {sortField, sortOrder, handleSort} = useSort<SortField>("name", "asc");

    useEffect(() => {
        fetchUsers()
            .then(setUsers)
            .catch(() => setError("Failed to load users."))
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (id: string): Promise<void> => {
        if (!confirm("Are you sure you want to delete this user?")) return;
        try {
            await deleteUser(id);
            setUsers(users.filter((u) => u.id !== id));
        } catch {
            alert("Failed to delete user.");
        }
    };

    const filteredAndSortedUsers = useMemo(() => {
        let result = [...users];
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter((user) =>
                user.name.toLowerCase().includes(lowerSearch) ||
                user.email.toLowerCase().includes(lowerSearch) ||
                user.roles.some((role) => role.name.toLowerCase().includes(lowerSearch))
            );
        }
        result.sort((a, b) => {
            const aValue = a[sortField]?.toLowerCase() ?? "";
            const bValue = b[sortField]?.toLowerCase() ?? "";
            if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
            if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });
        return result;
    }, [users, searchTerm, sortField, sortOrder]);

    const renderRoles = (user: User): React.JSX.Element => (
        <div className="flex flex-wrap gap-1">
            {user.roles
                .slice()
                .sort((a, b) => ROLE_ORDER.indexOf(a.name) - ROLE_ORDER.indexOf(b.name))
                .map((role) => (
                    <span
                        key={role.id}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadgeClass(role.name)}`}
                    >
                        {role.name}
                    </span>
                ))}
        </div>
    );

    if (loading) return <TableSkeleton rows={5} columns={4}/>;
    if (error) return (
        <div className="p-8">
            <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
        </div>
    );

    return (
        <PageContainer>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                <h1 data-testid="page-header" className="text-2xl font-bold text-foreground">Users</h1>
            </div>

            <div className="bg-card shadow rounded-lg overflow-hidden">
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <SearchInput
                            value={searchTerm}
                            onChange={setSearchTerm}
                            placeholder="Search users..."
                            className="flex-grow"
                        />
                        {isAdmin && (
                            <Button asChild>
                                <Link to="/users/new">New User</Link>
                            </Button>
                        )}
                    </div>

                    <div className="hidden md:block overflow-x-auto">
                        <Table data-testid="users-table">
                            <TableHeader className="bg-muted">
                                <TableRow>
                                    <TableHead
                                        className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                                        onClick={() => handleSort("name")}>
                                        Name <SortIndicator field="name" sortField={sortField} sortOrder={sortOrder}/>
                                    </TableHead>
                                    <TableHead
                                        className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                                        onClick={() => handleSort("email")}>
                                        Email <SortIndicator field="email" sortField={sortField} sortOrder={sortOrder}/>
                                    </TableHead>
                                    <TableHead
                                        className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Roles</TableHead>
                                    {isAdmin && (
                                        <TableHead
                                            className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</TableHead>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody className="bg-card divide-y divide-border">
                                {filteredAndSortedUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell
                                            className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                                            {user.name}
                                        </TableCell>
                                        <TableCell
                                            className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                            {user.email}
                                        </TableCell>
                                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                            {renderRoles(user)}
                                        </TableCell>
                                        {isAdmin && (
                                            <TableCell
                                                className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex gap-3 justify-end">
                                                    <Link
                                                        to={`/users/${user.id}/edit`}
                                                        className="text-primary hover:underline text-sm font-medium"
                                                    >
                                                        Edit
                                                    </Link>
                                                    {user.id !== userId && (
                                                        <button
                                                            onClick={() => handleDelete(user.id)}
                                                            className="text-destructive hover:opacity-80 text-sm font-medium cursor-pointer"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="md:hidden divide-y" style={{borderColor: "var(--border)"}}>
                        {filteredAndSortedUsers.map((user) => (
                            <div key={user.id} className="p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-sm font-bold text-foreground">{user.name}</h3>
                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                    </div>
                                </div>
                                {renderRoles(user)}
                                {isAdmin && (
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link to={`/users/${user.id}/edit`}>Edit</Link>
                                        </Button>
                                        {user.id !== userId && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive"
                                                onClick={() => handleDelete(user.id)}
                                            >
                                                Delete
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {filteredAndSortedUsers.length === 0 && (
                        <div className="py-10 text-center text-sm text-muted-foreground">
                            {searchTerm ? "No users match your search." : "No users found."}
                        </div>
                    )}
                </div>
            </div>
        </PageContainer>
    );
};

export {UsersPage};
