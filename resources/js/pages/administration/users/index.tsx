import ImpersonateUserButton from '@/components/impersonate-user-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, Download, KeyRound, Plus, Search, ShieldCheck, Pencil as TableEditIcon, UserCheck, UserRoundCog, Users } from 'lucide-react';
import { FormEvent, useState } from 'react';

type Option = { value: string; label: string; code?: string };
type ManagedUser = {
    id: number;
    name: string;
    email: string;
    status: 'active' | 'suspended' | 'inactive';
    mfa_state: 'disabled' | 'required' | 'enabled';
    home_branch: { id: number; name: string; code: string } | null;
    roles: Array<{ id: number; name: string; code: string }>;
    branch_count: number;
    last_login_at: string | null;
    can_impersonate: boolean;
};
type Pagination = {
    data: ManagedUser[];
    from: number | null;
    to: number | null;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
};
type Props = {
    users: Pagination;
    stats: { total: number; active: number; restricted: number; mfaProtected: number };
    filters: { search: string; status: string; branch: string };
    branches: Option[];
    canManage: boolean;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Administration', href: '/administration' },
    { title: 'Users & access', href: '/administration/users' },
];

function formatDate(value: string | null) {
    if (!value) return 'Never';

    return new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function statusBadge(status: ManagedUser['status']) {
    const variant = status === 'active' ? 'default' : status === 'suspended' ? 'destructive' : 'secondary';
    return <Badge variant={variant}>{status}</Badge>;
}

export default function UsersIndex({ users, stats, filters, branches, canManage }: Props) {
    const { flash } = usePage<SharedData>().props;
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status || 'all');
    const [branch, setBranch] = useState(filters.branch || 'all');

    const submitFilters = (event: FormEvent) => {
        event.preventDefault();
        router.get(
            '/administration/users',
            {
                search: search || undefined,
                status: status === 'all' ? undefined : status,
                branch: branch === 'all' ? undefined : branch,
            },
            { preserveState: true, replace: true },
        );
    };

    const exportUrl = `/administration/users/export?${new URLSearchParams({
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.status !== 'all' ? { status: filters.status } : {}),
        ...(filters.branch !== 'all' ? { branch: filters.branch } : {}),
    }).toString()}`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Users & access" />
            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0 flex-1">
                        <Button variant="ghost" size="sm" className="mb-1 -ml-3" asChild>
                            <Link href="/administration">
                                <ArrowLeft data-icon="inline-start" /> Administration
                            </Link>
                        </Button>
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="size-5" />
                            <h1 className="text-2xl font-semibold tracking-tight">Users & access</h1>
                        </div>
                        <p className="text-muted-foreground mt-1">Invite users, manage security and control branch-level access.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" asChild>
                            <a href={exportUrl}>
                                <Download data-icon="inline-start" /> Export Excel
                            </a>
                        </Button>
                        {canManage && (
                            <Button asChild>
                                <Link href="/administration/users/invite">
                                    <Plus data-icon="inline-start" /> Invite user
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                {flash?.success && (
                    <Alert>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between text-base">
                                Total users <Users className="text-muted-foreground size-4" />
                            </CardTitle>
                            <CardDescription>Accounts in this organization</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <span className="text-3xl font-semibold tracking-tight">{stats.total}</span>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between text-base">
                                Active users <UserCheck className="text-muted-foreground size-4" />
                            </CardTitle>
                            <CardDescription>Users currently allowed to sign in</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <span className="text-3xl font-semibold tracking-tight">{stats.active}</span>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between text-base">
                                Restricted <UserRoundCog className="text-muted-foreground size-4" />
                            </CardTitle>
                            <CardDescription>Suspended or inactive accounts</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <span className="text-3xl font-semibold tracking-tight">{stats.restricted}</span>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between text-base">
                                MFA protected <KeyRound className="text-muted-foreground size-4" />
                            </CardTitle>
                            <CardDescription>Accounts with MFA enabled or required</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <span className="text-3xl font-semibold tracking-tight">{stats.mfaProtected}</span>
                        </CardContent>
                    </Card>
                </div>

                <section className="bg-card overflow-hidden rounded-lg border">
                    <form onSubmit={submitFilters} className="border-b p-4">
                        <FieldGroup className="grid gap-3 md:grid-cols-[minmax(16rem,1fr)_13rem_13rem_auto] md:items-end">
                            <Field>
                                <FieldLabel htmlFor="user-search">Search</FieldLabel>
                                <div className="relative">
                                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                    <Input id="user-search" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
                                </div>
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="user-status">Status</FieldLabel>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger id="user-status">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="all">All statuses</SelectItem>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="suspended">Suspended</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="user-branch">Branch</FieldLabel>
                                <Select value={branch} onValueChange={setBranch}>
                                    <SelectTrigger id="user-branch">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="all">All branches</SelectItem>
                                            {branches.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Button type="submit">
                                <Search data-icon="inline-start" /> Apply filters
                            </Button>
                        </FieldGroup>
                    </form>

                    <div className="overflow-x-auto">
                        <Table pagination={false}>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Roles</TableHead>
                                    <TableHead>Home branch</TableHead>
                                    <TableHead>Access</TableHead>
                                    <TableHead>Last login</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.data.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-muted-foreground h-32 text-center">
                                            No users match these filters.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {users.data.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium">{user.name}</span>
                                                <span className="text-muted-foreground text-xs">{user.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex max-w-64 flex-wrap gap-1">
                                                {user.roles.length ? (
                                                    user.roles.map((role) => (
                                                        <Badge key={role.id} variant="outline">
                                                            {role.name}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-muted-foreground">No role</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{user.home_branch?.name ?? <span className="text-muted-foreground">Not assigned</span>}</TableCell>
                                        <TableCell>
                                            {user.branch_count} branch{user.branch_count === 1 ? '' : 'es'}
                                        </TableCell>
                                        <TableCell>{formatDate(user.last_login_at)}</TableCell>
                                        <TableCell>{statusBadge(user.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {user.can_impersonate && <ImpersonateUserButton user={user} />}
                                                <Button variant="edit" size="sm" asChild>
                                                    <Link href={`/administration/users/${user.id}`}>
                                                        <TableEditIcon data-icon="inline-start" />
                                                        Manage
                                                    </Link>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {users.links.length > 3 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
                            <p className="text-muted-foreground text-xs">
                                Showing {users.from ?? 0}–{users.to ?? 0} of {users.total}
                            </p>
                            <div className="flex gap-1">
                                {users.links.map((link, index) => (
                                    <Button
                                        key={`${link.label}-${index}`}
                                        variant={link.active ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={!link.url}
                                        asChild={Boolean(link.url)}
                                    >
                                        {link.url ? (
                                            <Link href={link.url} preserveScroll dangerouslySetInnerHTML={{ __html: link.label }} />
                                        ) : (
                                            <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                        )}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </AppLayout>
    );
}
