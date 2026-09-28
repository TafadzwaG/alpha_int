import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Pencil, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

type Option = { value: string | number | boolean; label: string };
type Field = {
    name: string;
    label: string;
    type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'datetime-local' | 'textarea' | 'select' | 'checkbox' | 'multiselect';
    options?: string;
    choices?: Option[];
    default?: unknown;
    required?: boolean;
    help?: string;
    step?: string;
};
type Column = { key: string; label: string; badge?: boolean };
type Resource = {
    key: string;
    title: string;
    description: string;
    columns: Column[];
    fields: Field[];
    readOnly: boolean;
};
type RecordData = Record<string, unknown>;
type Pagination = {
    data: RecordData[];
    from: number | null;
    to: number | null;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
};
type Props = {
    resource: Resource;
    records: Pagination;
    options: Record<string, Option[]>;
    filters: { search: string };
};

function displayValue(value: unknown, badge = false, key = '') {
    if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">—</span>;
    if (typeof value === 'boolean' || badge) {
        const positive = value === true || value === 1 || value === '1' || value === 'active' || value === 'enabled';
        const label = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
        return <Badge variant={positive ? 'default' : 'secondary'}>{label}</Badge>;
    }
    if ((key.endsWith('_at') || key.endsWith('_date')) && typeof value === 'string') {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return <span>{new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium' }).format(parsed)}</span>;
        }
    }
    if (
        [
            'amount',
            'total_amount',
            'expected_cash',
            'declared_cash',
            'variance',
            'expected_total',
            'declared_total',
            'deposited_total',
            'list_price',
            'effective_price',
        ].includes(key)
    ) {
        const numeric = Number(value);
        if (!Number.isNaN(numeric))
            return <span>{new Intl.NumberFormat('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numeric)}</span>;
    }
    const text = String(value);
    return <span title={text}>{text.length > 48 ? `${text.slice(0, 45)}…` : text}</span>;
}

function normalizeForInput(field: Field, value: unknown): unknown {
    if (field.type === 'multiselect') return Array.isArray(value) ? value : [];
    if (field.type === 'checkbox') return Boolean(value);
    if (field.type === 'datetime-local' && typeof value === 'string') return value.slice(0, 16);
    if (field.type === 'date' && typeof value === 'string') return value.slice(0, 10);
    return value ?? '';
}

export default function ResourcePage({ resource, records, options, filters }: Props) {
    const { auth, flash } = usePage<SharedData>().props;
    const managePermission = ['expenses', 'petty-cash-entries'].includes(resource.key) ? 'expenses.manage' : 'phase-one.manage';
    const canManage = auth.permissions.includes(managePermission) && !resource.readOnly;
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<RecordData | null>(null);
    const [search, setSearch] = useState(filters.search ?? '');
    const defaults = useMemo(
        () => Object.fromEntries(resource.fields.map((field) => [field.name, normalizeForInput(field, field.default)])),
        [resource],
    );
    const form = useForm<Record<string, unknown>>(defaults);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Administration', href: '/administration' },
        { title: resource.title, href: `/administration/${resource.key}` },
    ];

    const beginCreate = () => {
        setEditing(null);
        form.clearErrors();
        form.setData(defaults);
        setDialogOpen(true);
    };

    const beginEdit = (record: RecordData) => {
        setEditing(record);
        form.clearErrors();
        form.setData(Object.fromEntries(resource.fields.map((field) => [field.name, normalizeForInput(field, record[field.name])])));
        setDialogOpen(true);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const key = editing ? String(editing.id ?? editing.code) : '';
        const url = editing ? `/administration/${resource.key}/${key}` : `/administration/${resource.key}`;
        const options = { preserveScroll: true, onSuccess: () => setDialogOpen(false) };
        if (editing) form.put(url, options);
        else form.post(url, options);
    };

    const remove = (record: RecordData) => {
        if (!window.confirm('Remove this record from active use? This action is captured in the audit trail.')) return;
        router.delete(`/administration/${resource.key}/${String(record.id ?? record.code)}`, { preserveScroll: true });
    };

    const runSearch = (event: FormEvent) => {
        event.preventDefault();
        router.get(`/administration/${resource.key}`, search ? { search } : {}, { preserveState: true, replace: true });
    };

    const fieldOptions = (field: Field) => field.choices ?? (field.options ? (options[field.options] ?? []) : []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={resource.title} />
            <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
                    <div>
                        <Button variant="ghost" size="sm" className="mb-1 -ml-3" asChild>
                            <Link href="/administration">
                                <ArrowLeft data-icon="inline-start" /> Administration
                            </Link>
                        </Button>
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="text-primary size-5" />
                            <h1 className="text-2xl font-semibold tracking-tight">{resource.title}</h1>
                        </div>
                        <p className="text-muted-foreground mt-1">{resource.description}</p>
                    </div>
                    {canManage && (
                        <Button onClick={beginCreate}>
                            <Plus data-icon="inline-start" /> Add record
                        </Button>
                    )}
                </div>

                {flash?.success && (
                    <Alert>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}

                <Card className="min-w-0 overflow-hidden">
                    <CardContent className="p-0">
                        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
                            <form onSubmit={runSearch} className="flex w-full max-w-sm gap-2">
                                <div className="relative flex-1">
                                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                    <Input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        className="h-9 pl-9"
                                        placeholder={`Search ${resource.title.toLowerCase()}…`}
                                    />
                                </div>
                                <Button type="submit" variant="outline" size="sm">
                                    Search
                                </Button>
                            </form>
                            <p className="text-muted-foreground text-xs">
                                {records.total} record{records.total === 1 ? '' : 's'}
                            </p>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {resource.columns.map((column) => (
                                        <TableHead key={column.key}>{column.label}</TableHead>
                                    ))}
                                    {canManage && <TableHead className="w-28 text-right">Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {records.data.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={resource.columns.length + (canManage ? 1 : 0)}
                                            className="text-muted-foreground h-32 text-center"
                                        >
                                            No records found.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {records.data.map((record) => (
                                    <TableRow key={String(record.id ?? record.code)}>
                                        {resource.columns.map((column) => (
                                            <TableCell key={column.key} className={column.key === resource.columns[0]?.key ? 'font-medium' : ''}>
                                                {displayValue(record[column.key], column.badge, column.key)}
                                            </TableCell>
                                        ))}
                                        {canManage && (
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8"
                                                        onClick={() => beginEdit(record)}
                                                        aria-label="Edit record"
                                                    >
                                                        <Pencil data-icon="inline-start" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive size-8"
                                                        onClick={() => remove(record)}
                                                        aria-label="Deactivate record"
                                                    >
                                                        <Trash2 data-icon="inline-start" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {records.links.length > 3 && (
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
                                <p className="text-muted-foreground text-xs">
                                    Showing {records.from ?? 0}–{records.to ?? 0} of {records.total}
                                </p>
                                <div className="flex gap-1">
                                    {records.links.map((link, index) => (
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
                    </CardContent>
                </Card>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editing ? `Edit ${resource.title}` : `Add ${resource.title}`}</DialogTitle>
                        <DialogDescription>Fields marked with an asterisk are required. Every saved change is audited.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="flex flex-col gap-4">
                        <FieldGroup className="grid gap-4 sm:grid-cols-2">
                            {resource.fields.map((field) => {
                                const value = form.data[field.name];
                                const error = form.errors[field.name];
                                const fullWidth = field.type === 'textarea' || field.type === 'multiselect';
                                return (
                                    <Field key={field.name} data-invalid={Boolean(error)} className={fullWidth ? 'sm:col-span-2' : undefined}>
                                        {field.type === 'checkbox' ? (
                                            <div className="flex items-center gap-2 rounded-md border p-3">
                                                <Checkbox
                                                    id={field.name}
                                                    checked={Boolean(value)}
                                                    aria-invalid={Boolean(error)}
                                                    onCheckedChange={(checked) => form.setData(field.name, checked === true)}
                                                />
                                                <FieldLabel htmlFor={field.name}>{field.label}</FieldLabel>
                                            </div>
                                        ) : field.type === 'multiselect' ? (
                                            <>
                                                <FieldLabel>{field.label}</FieldLabel>
                                                <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
                                                    {fieldOptions(field).map((option) => {
                                                        const selected = Array.isArray(value) && value.map(String).includes(String(option.value));
                                                        return (
                                                            <label
                                                                key={String(option.value)}
                                                                className="flex cursor-pointer items-center gap-2 text-sm"
                                                            >
                                                                <Checkbox
                                                                    checked={selected}
                                                                    aria-invalid={Boolean(error)}
                                                                    onCheckedChange={(checked) => {
                                                                        const current = Array.isArray(value) ? value : [];
                                                                        form.setData(
                                                                            field.name,
                                                                            checked === true
                                                                                ? [...current, option.value]
                                                                                : current.filter((item) => String(item) !== String(option.value)),
                                                                        );
                                                                    }}
                                                                />
                                                                {option.label}
                                                            </label>
                                                        );
                                                    })}
                                                    {fieldOptions(field).length === 0 && (
                                                        <p className="text-muted-foreground text-sm">No options available.</p>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <FieldLabel htmlFor={field.name}>
                                                    {field.label}
                                                    {field.required ? ' *' : ''}
                                                </FieldLabel>
                                                {field.type === 'textarea' ? (
                                                    <Textarea
                                                        id={field.name}
                                                        value={String(value ?? '')}
                                                        aria-invalid={Boolean(error)}
                                                        onChange={(event) => form.setData(field.name, event.target.value)}
                                                        className="min-h-24"
                                                    />
                                                ) : field.type === 'select' ? (
                                                    <Select
                                                        value={value === '' || value === null || value === undefined ? '__none__' : String(value)}
                                                        onValueChange={(selected) => {
                                                            if (selected === '__none__') return form.setData(field.name, '');
                                                            const match = fieldOptions(field).find((option) => String(option.value) === selected);
                                                            form.setData(field.name, match?.value ?? selected);
                                                        }}
                                                    >
                                                        <SelectTrigger id={field.name} className="h-9" aria-invalid={Boolean(error)}>
                                                            <SelectValue placeholder="Select an option" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectGroup>
                                                                {!field.required && <SelectItem value="__none__">None</SelectItem>}
                                                                {fieldOptions(field).map((option) => (
                                                                    <SelectItem key={String(option.value)} value={String(option.value)}>
                                                                        {option.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectGroup>
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <Input
                                                        id={field.name}
                                                        type={field.type ?? 'text'}
                                                        step={field.step}
                                                        value={String(value ?? '')}
                                                        aria-invalid={Boolean(error)}
                                                        onChange={(event) => form.setData(field.name, event.target.value)}
                                                        className="h-9"
                                                    />
                                                )}
                                                {field.help && <FieldDescription>{field.help}</FieldDescription>}
                                            </>
                                        )}
                                        <FieldError>{error}</FieldError>
                                    </Field>
                                );
                            })}
                        </FieldGroup>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Saving…' : 'Save record'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
