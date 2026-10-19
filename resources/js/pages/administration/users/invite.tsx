import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, LoaderCircle, MailPlus } from 'lucide-react';
import { FormEvent } from 'react';

type Option = { value: string; label: string; code?: string; description?: string | null };
type Props = { branches: Option[]; roles: Option[] };
type InviteForm = {
    name: string;
    email: string;
    home_branch_id: string;
    role_ids: string[];
    branch_ids: string[];
    mfa_state: 'disabled' | 'required' | 'enabled';
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Administration', href: '/administration' },
    { title: 'Users & access', href: '/administration/users' },
    { title: 'Invite user', href: '/administration/users/invite' },
];

export default function InviteUser({ branches, roles }: Props) {
    const form = useForm<InviteForm>({
        name: '',
        email: '',
        home_branch_id: branches[0]?.value ?? '',
        role_ids: [],
        branch_ids: branches[0] ? [branches[0].value] : [],
        mfa_state: 'disabled',
    });

    const toggleValue = (key: 'role_ids' | 'branch_ids', value: string, checked: boolean) => {
        const current = form.data[key];
        form.setData(key, checked ? [...new Set([...current, value])] : current.filter((item) => item !== value));
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/administration/users/invite');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Invite user" />
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 md:p-6">
                <div>
                    <Button variant="ghost" size="sm" className="mb-1 -ml-3" asChild>
                        <Link href="/administration/users">
                            <ArrowLeft data-icon="inline-start" /> Users & access
                        </Link>
                    </Button>
                    <div className="flex items-center gap-2">
                        <MailPlus className="size-5" />
                        <h1 className="text-2xl font-semibold tracking-tight">Invite a user</h1>
                    </div>
                    <p className="text-muted-foreground mt-1">Create the account, assign access, and email a secure password setup link.</p>
                </div>

                <form onSubmit={submit}>
                    <Card>
                        <CardHeader className="border-b">
                            <CardTitle className="text-lg">Account and access</CardTitle>
                            <CardDescription>The user will only see branches and actions granted here.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <FieldGroup className="grid gap-6 lg:grid-cols-2">
                                <Field data-invalid={Boolean(form.errors.name)}>
                                    <FieldLabel htmlFor="name">Full name</FieldLabel>
                                    <Input
                                        id="name"
                                        value={form.data.name}
                                        onChange={(event) => form.setData('name', event.target.value)}
                                        aria-invalid={Boolean(form.errors.name)}
                                        autoComplete="name"
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
                                        autoComplete="email"
                                    />
                                    <FieldError>{form.errors.email}</FieldError>
                                </Field>
                                <Field data-invalid={Boolean(form.errors.home_branch_id)}>
                                    <FieldLabel htmlFor="home_branch_id">Home branch</FieldLabel>
                                    <Select value={form.data.home_branch_id} onValueChange={(value) => form.setData('home_branch_id', value)}>
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
                                    <FieldDescription>The home branch must also be selected under branch access.</FieldDescription>
                                    <FieldError>{form.errors.home_branch_id}</FieldError>
                                </Field>
                                <Field data-invalid={Boolean(form.errors.mfa_state)}>
                                    <FieldLabel htmlFor="mfa_state">MFA policy</FieldLabel>
                                    <Select
                                        value={form.data.mfa_state}
                                        onValueChange={(value: InviteForm['mfa_state']) => form.setData('mfa_state', value)}
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
                                    <FieldDescription>Choose at least one role for permissions.</FieldDescription>
                                    <FieldGroup className="gap-3">
                                        {roles.map((role) => (
                                            <Field key={role.value} orientation="horizontal">
                                                <Checkbox
                                                    id={`role-${role.value}`}
                                                    checked={form.data.role_ids.includes(role.value)}
                                                    onCheckedChange={(checked) => toggleValue('role_ids', role.value, checked === true)}
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
                                    <FieldDescription>Select every branch the user may enter.</FieldDescription>
                                    <FieldGroup className="gap-3 sm:grid sm:grid-cols-2">
                                        {branches.map((branch) => (
                                            <Field key={branch.value} orientation="horizontal">
                                                <Checkbox
                                                    id={`branch-${branch.value}`}
                                                    checked={form.data.branch_ids.includes(branch.value)}
                                                    onCheckedChange={(checked) => toggleValue('branch_ids', branch.value, checked === true)}
                                                />
                                                <FieldLabel htmlFor={`branch-${branch.value}`}>{branch.label}</FieldLabel>
                                            </Field>
                                        ))}
                                    </FieldGroup>
                                    <FieldError>{form.errors.branch_ids}</FieldError>
                                </FieldSet>
                            </FieldGroup>
                        </CardContent>
                        <CardFooter className="justify-end gap-2 border-t pt-6">
                            <Button type="button" variant="outline" asChild>
                                <Link href="/administration/users">Cancel</Link>
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing && <LoaderCircle data-icon="inline-start" className="animate-spin" />}
                                Send invitation
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </div>
        </AppLayout>
    );
}
