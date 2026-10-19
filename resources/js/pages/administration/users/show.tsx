import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Building2, CalendarClock, KeyRound, LoaderCircle, LogIn, Mail, Save, ShieldCheck, UserCog } from 'lucide-react';
import { FormEvent, useState } from 'react';

type Option = { value: string; label: string; code?: string; description?: string | null };
type ManagedUser = {
    id: number;
    name: string;
    email: string;
    status: 'active' | 'suspended' | 'inactive';
    mfa_state: 'disabled' | 'required' | 'enabled';
    home_branch_id: string;
    home_branch: { id: number; name: string; code: string } | null;
    role_ids: string[];
    roles: Array<{ id: number; name: string; code: string }>;
    branch_ids: string[];
    branches: Array<{ id: number; name: string; code: string; access_level: string }>;
    last_login_at: string | null;
    email_verified_at: string | null;
    created_at: string | null;
    updated_at: string | null;
};
type AuditEvent = { id: number; event_type: string; actor: string; occurred_at: string | null };
type Props = {
    managedUser: ManagedUser;
    branches: Option[];
    roles: Option[];
    canManage: boolean;
    canImpersonate: boolean;
    recentEvents: AuditEvent[];
};
type UserForm = {
    name: string;
    email: string;
    home_branch_id: string;
    role_ids: string[];
    branch_ids: string[];
    mfa_state: ManagedUser['mfa_state'];
    status: ManagedUser['status'];
};

function formatDate(value: string | null) {
    if (!value) return 'Never';

    return new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function eventLabel(value: string) {
    return value.replace('users.', '').replaceAll('_', ' ');
}

export default function UserShow({ managedUser, branches, roles, canManage, canImpersonate, recentEvents }: Props) {
    const { flash, errors } = usePage<SharedData & { errors?: Record<string, string> }>().props;
    const form = useForm<UserForm>({
        name: managedUser.name,
        email: managedUser.email,
        home_branch_id: managedUser.home_branch_id,
        role_ids: managedUser.role_ids,
        branch_ids: managedUser.branch_ids,
        mfa_state: managedUser.mfa_state,
        status: managedUser.status,
    });
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Administration', href: '/administration' },
        { title: 'Users & access', href: '/administration/users' },
        { title: managedUser.name, href: `/administration/users/${managedUser.id}` },
    ];

    const toggleValue = (key: 'role_ids' | 'branch_ids', value: string, checked: boolean) => {
        const current = form.data[key];
        form.setData(key, checked ? [...new Set([...current, value])] : current.filter((item) => item !== value));
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.put(`/administration/users/${managedUser.id}`, { preserveScroll: true });
    };

    const sendResetLink = () => {
        if (!window.confirm(`Send a password reset link to ${managedUser.email}?`)) return;
        router.post(`/administration/users/${managedUser.id}/password-reset`, {}, { preserveScroll: true });
    };

    const [impersonationOpen, setImpersonationOpen] = useState(false);
    const [impersonating, setImpersonating] = useState(false);
    const startImpersonation = () => setImpersonationOpen(true);
    const confirmImpersonation = () => {
        if (impersonating) return;
        router.post(
            `/administration/users/${managedUser.id}/impersonate`,
            {},
            {
                onStart: () => setImpersonating(true),
                onSuccess: () => setImpersonationOpen(false),
                onFinish: () => setImpersonating(false),
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={managedUser.name} />
            <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0 flex-1">
                        <Button variant="ghost" size="sm" className="mb-1 -ml-3" asChild>
                            <Link href="/administration/users">
                                <ArrowLeft data-icon="inline-start" /> Users & access
                            </Link>
                        </Button>
                        <div className="flex flex-wrap items-center gap-2">
                            <UserCog className="size-5" />
                            <h1 className="text-2xl font-semibold tracking-tight">{managedUser.name}</h1>
                            <Badge
                                variant={
                                    managedUser.status === 'active' ? 'default' : managedUser.status === 'suspended' ? 'destructive' : 'secondary'
                                }
                            >
                                {managedUser.status}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1">{managedUser.email}</p>
                    </div>
                    {canManage && (
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={sendResetLink}>
                                <KeyRound data-icon="inline-start" /> Send password reset
                            </Button>
                            {canImpersonate && (
                                <Button onClick={startImpersonation}>
                                    <LogIn data-icon="inline-start" /> Impersonate user
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {flash?.success && (
                    <Alert>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}
                {errors?.email && (
                    <Alert variant="destructive">
                        <AlertDescription>{errors.email}</AlertDescription>
                    </Alert>
                )}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between text-base">
                                Roles <ShieldCheck className="text-muted-foreground size-4" />
                            </CardTitle>
                            <CardDescription>Permission bundles assigned</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <span className="text-3xl font-semibold tracking-tight">{managedUser.roles.length}</span>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between text-base">
                                Branch access <Building2 className="text-muted-foreground size-4" />
                            </CardTitle>
                            <CardDescription>Operational locations available</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <span className="text-3xl font-semibold tracking-tight">{managedUser.branches.length}</span>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between text-base">
                                Last login <CalendarClock className="text-muted-foreground size-4" />
                            </CardTitle>
                            <CardDescription>Most recent successful sign-in</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <span className="text-sm font-semibold">{formatDate(managedUser.last_login_at)}</span>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between text-base">
                                Email <Mail className="text-muted-foreground size-4" />
                            </CardTitle>
                            <CardDescription>Account verification state</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Badge variant={managedUser.email_verified_at ? 'default' : 'secondary'}>
                                {managedUser.email_verified_at ? 'Verified' : 'Not verified'}
                            </Badge>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.6fr)]">
                    <form onSubmit={submit}>
                        <Card>
                            <CardHeader className="border-b">
                                <CardTitle className="text-lg">Profile and access</CardTitle>
                                <CardDescription>Manage identity, account state, roles, and branch assignments.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <fieldset disabled={!canManage}>
                                    <FieldGroup className="grid gap-6 lg:grid-cols-2">
                                        <Field data-invalid={Boolean(form.errors.name)}>
                                            <FieldLabel htmlFor="name">Full name</FieldLabel>
                                            <Input
                                                id="name"
                                                value={form.data.name}
                                                onChange={(event) => form.setData('name', event.target.value)}
                                                aria-invalid={Boolean(form.errors.name)}
                                            />
                                            <FieldError>{form.errors.name}</FieldError>
                                        </Field>
                                        <Field data-invalid={Boolean(form.errors.email)}>
                                            <FieldLabel htmlFor="email">Email address</FieldLabel>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={form.data.email}
                                                onChange={(event) => form.setData('email', event.target.value)}
                                                aria-invalid={Boolean(form.errors.email)}
                                            />
                                            <FieldError>{form.errors.email}</FieldError>
                                        </Field>
                                        <Field data-invalid={Boolean(form.errors.home_branch_id)}>
                                            <FieldLabel htmlFor="home_branch_id">Home branch</FieldLabel>
                                            <Select
                                                value={form.data.home_branch_id}
                                                onValueChange={(value) => form.setData('home_branch_id', value)}
                                                disabled={!canManage}
                                            >
                                                <SelectTrigger id="home_branch_id" aria-invalid={Boolean(form.errors.home_branch_id)}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectGroup>
                                                        {branches.map((branch) => (
                                                            <SelectItem key={branch.value} value={branch.value}>
                                                                {branch.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
                                            <FieldDescription>The home branch must also be selected below.</FieldDescription>
                                            <FieldError>{form.errors.home_branch_id}</FieldError>
                                        </Field>
                                        <Field data-invalid={Boolean(form.errors.status)}>
                                            <FieldLabel htmlFor="status">Account status</FieldLabel>
                                            <Select
                                                value={form.data.status}
                                                onValueChange={(value: ManagedUser['status']) => form.setData('status', value)}
                                                disabled={!canManage}
                                            >
                                                <SelectTrigger id="status" aria-invalid={Boolean(form.errors.status)}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectGroup>
                                                        <SelectItem value="active">Active</SelectItem>
                                                        <SelectItem value="suspended">Suspended</SelectItem>
                                                        <SelectItem value="inactive">Inactive</SelectItem>
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
                                            <FieldError>{form.errors.status}</FieldError>
                                        </Field>
                                        <Field data-invalid={Boolean(form.errors.mfa_state)} className="lg:col-span-2">
                                            <FieldLabel htmlFor="mfa_state">MFA policy</FieldLabel>
                                            <Select
                                                value={form.data.mfa_state}
                                                onValueChange={(value: ManagedUser['mfa_state']) => form.setData('mfa_state', value)}
                                                disabled={!canManage}
                                            >
                                                <SelectTrigger id="mfa_state" aria-invalid={Boolean(form.errors.mfa_state)}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectGroup>
                                                        <SelectItem value="disabled">Disabled</SelectItem>
                                                        <SelectItem value="required">Required</SelectItem>
                                                        <SelectItem value="enabled">Enabled</SelectItem>
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
                                            <FieldError>{form.errors.mfa_state}</FieldError>
                                        </Field>

                                        <FieldSet className="rounded-lg border p-4" data-invalid={Boolean(form.errors.role_ids)}>
                                            <FieldLegend variant="label">Roles</FieldLegend>
                                            <FieldDescription>Permission bundles assigned to this account.</FieldDescription>
                                            <FieldGroup className="gap-3">
                                                {roles.map((role) => (
                                                    <Field key={role.value} orientation="horizontal">
                                                        <Checkbox
                                                            id={`role-${role.value}`}
                                                            checked={form.data.role_ids.includes(role.value)}
                                                            onCheckedChange={(checked) => toggleValue('role_ids', role.value, checked === true)}
                                                            disabled={!canManage}
                                                        />
                                                        <div className="flex flex-col gap-0.5">
                                                            <FieldLabel htmlFor={`role-${role.value}`}>{role.label}</FieldLabel>
                                                            {role.description && <FieldDescription>{role.description}</FieldDescription>}
                                                        </div>
                                                    </Field>
                                                ))}
                                            </FieldGroup>
                                            <FieldError>{form.errors.role_ids}</FieldError>
                                        </FieldSet>

                                        <FieldSet className="rounded-lg border p-4" data-invalid={Boolean(form.errors.branch_ids)}>
                                            <FieldLegend variant="label">Branch access</FieldLegend>
                                            <FieldDescription>Locations available after sign-in.</FieldDescription>
                                            <FieldGroup className="gap-3 sm:grid sm:grid-cols-2">
                                                {branches.map((branch) => (
                                                    <Field key={branch.value} orientation="horizontal">
                                                        <Checkbox
                                                            id={`branch-${branch.value}`}
                                                            checked={form.data.branch_ids.includes(branch.value)}
                                                            onCheckedChange={(checked) => toggleValue('branch_ids', branch.value, checked === true)}
                                                            disabled={!canManage}
                                                        />
                                                        <FieldLabel htmlFor={`branch-${branch.value}`}>{branch.label}</FieldLabel>
                                                    </Field>
                                                ))}
                                            </FieldGroup>
                                            <FieldError>{form.errors.branch_ids}</FieldError>
                                        </FieldSet>
                                    </FieldGroup>
                                </fieldset>
                            </CardContent>
                            {canManage && (
                                <div className="flex justify-end border-t p-6">
                                    <Button type="submit" disabled={form.processing}>
                                        {form.processing ? (
                                            <LoaderCircle data-icon="inline-start" className="animate-spin" />
                                        ) : (
                                            <Save data-icon="inline-start" />
                                        )}
                                        Save changes
                                    </Button>
                                </div>
                            )}
                        </Card>
                    </form>

                    <div className="flex flex-col gap-6">
                        <Card>
                            <CardHeader className="border-b">
                                <CardTitle className="text-lg">Security actions</CardTitle>
                                <CardDescription>Sensitive actions are permission checked and audited.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3 pt-6">
                                <Button variant="outline" onClick={sendResetLink} disabled={!canManage}>
                                    <KeyRound data-icon="inline-start" /> Send password reset link
                                </Button>
                                <Button onClick={startImpersonation} disabled={!canImpersonate}>
                                    <LogIn data-icon="inline-start" /> Impersonate user
                                </Button>
                                <p className="text-muted-foreground text-xs leading-5">
                                    Impersonation starts a traceable session as this user. Return to your administrator account from the user menu.
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Account timeline</CardTitle>
                                <CardDescription>Creation and most recent update.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-4">
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-muted-foreground">Created</span>
                                    <span className="text-right font-medium">{formatDate(managedUser.created_at)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-muted-foreground">Updated</span>
                                    <span className="text-right font-medium">{formatDate(managedUser.updated_at)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Card>
                    <CardHeader className="border-b">
                        <CardTitle className="text-lg">Audit activity</CardTitle>
                        <CardDescription>Recent user-management events captured in the audit trail.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Event</TableHead>
                                    <TableHead>Performed by</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentEvents.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-muted-foreground h-24 text-center">
                                            No visible audit events for this user.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {recentEvents.map((event) => (
                                    <TableRow key={event.id}>
                                        <TableCell className="font-medium capitalize">{eventLabel(event.event_type)}</TableCell>
                                        <TableCell>{event.actor}</TableCell>
                                        <TableCell>{formatDate(event.occurred_at)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            <AlertDialog
                open={impersonationOpen}
                onOpenChange={(open) => {
                    if (!impersonating) setImpersonationOpen(open);
                }}
            >
                <AlertDialogContent>
                    <div className="bg-muted flex size-11 items-center justify-center rounded-full">
                        <LogIn aria-hidden="true" className="size-5" />
                    </div>
                    <AlertDialogTitle className="text-lg font-semibold">Impersonate {managedUser.name}?</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed">
                        Continue as {managedUser.name} ({managedUser.email}). This starts an audited session with this user's access. Return to your
                        administrator account from the user menu when finished.
                    </AlertDialogDescription>
                    {errors?.impersonation && (
                        <p role="alert" className="text-destructive text-sm">
                            {errors.impersonation}
                        </p>
                    )}
                    <div className="bg-muted/50 -mx-6 mt-2 -mb-6 flex justify-end gap-2 rounded-b-xl border-t p-4">
                        <AlertDialogCancel asChild>
                            <Button variant="outline" disabled={impersonating}>
                                Cancel
                            </Button>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button
                                disabled={impersonating}
                                onClick={(event) => {
                                    event.preventDefault();
                                    confirmImpersonation();
                                }}
                            >
                                {impersonating ? (
                                    <LoaderCircle data-icon="inline-start" className="animate-spin" />
                                ) : (
                                    <LogIn data-icon="inline-start" />
                                )}
                                {impersonating ? 'Starting session...' : 'Continue as user'}
                            </Button>
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
