import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { router, usePage } from '@inertiajs/react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { FormEvent, useState } from 'react';

type Props = { filters: Record<string, string>; branches: Array<{ value: string | number | boolean; label: string }>; total: number };
const defaults = {
    search: '',
    branch: 'all',
    status: 'all',
    payment: 'all',
    follow_up: 'all',
    phone: 'all',
    created_from: '',
    created_to: '',
    sort: 'newest',
    per_page: '10',
};
export default function ClientDirectoryFilters({ filters, branches, total }: Props) {
    const [values, setValues] = useState({ ...defaults, ...filters });
    const [expanded, setExpanded] = useState(
        Boolean(filters.payment || filters.follow_up || filters.phone || filters.created_from || filters.created_to),
    );
    const { errors } = usePage().props;
    const update = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));
    const active = Object.entries(filters).filter(
        ([key, value]) => value && value !== 'all' && value !== defaults[key as keyof typeof defaults],
    ).length;
    const submit = (event: FormEvent) => {
        event.preventDefault();
        const query = Object.fromEntries(Object.entries(values).filter(([, value]) => value && value !== 'all'));
        router.get('/administration/clients', query, { preserveState: true, preserveScroll: true, replace: true });
    };
    const select = (key: string, label: string, options: Array<[string, string]>) => (
        <Field>
            <FieldLabel htmlFor={`filter-${key}`}>{label}</FieldLabel>
            <Select value={String(values[key as keyof typeof values])} onValueChange={(value) => update(key, value)}>
                <SelectTrigger id={`filter-${key}`}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {options.map(([value, text]) => (
                            <SelectItem key={value} value={value}>
                                {text}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </Field>
    );
    return (
        <form onSubmit={submit} className="flex flex-col gap-4 border-b p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <Field className="min-w-0 flex-1">
                    <FieldLabel htmlFor="client-search">Search clients</FieldLabel>
                    <div className="relative">
                        <Search aria-hidden="true" className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                            id="client-search"
                            className="pl-9"
                            placeholder="Name, client number, phone, stand or development..."
                            value={values.search}
                            onChange={(event) => update('search', event.target.value)}
                        />
                    </div>
                </Field>
                <div className="grid gap-3 sm:grid-cols-2 lg:w-96">
                    {select('branch', 'Owning branch', [
                        ['all', 'All branches'],
                        ...branches.map((item): [string, string] => [String(item.value), item.label]),
                    ])}
                    {select('status', 'Client status', [
                        ['all', 'All statuses'],
                        ['prospect', 'Prospect'],
                        ['active', 'Active'],
                        ['inactive', 'Inactive'],
                        ['blocked', 'Blocked'],
                    ])}
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button type="submit">
                        <Search data-icon="inline-start" />
                        Search
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        aria-expanded={expanded}
                        aria-controls="client-advanced-filters"
                        onClick={() => setExpanded(!expanded)}
                    >
                        <SlidersHorizontal data-icon="inline-start" />
                        Advanced{active > 0 ? ` (${active})` : ''}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                            setValues(defaults);
                            router.get('/administration/clients', {}, { preserveState: true, preserveScroll: true, replace: true });
                        }}
                    >
                        <X data-icon="inline-start" />
                        Reset
                    </Button>
                </div>
            </div>
            {expanded && (
                <div id="client-advanced-filters" className="bg-muted/30 grid gap-4 rounded-lg p-4 sm:grid-cols-2 xl:grid-cols-3">
                    {select('payment', 'Payment schedule', [
                        ['all', 'All payment schedules'],
                        ['overdue', 'Has overdue payments'],
                        ['upcoming', 'Has upcoming payments'],
                        ['none', 'No unpaid installments'],
                    ])}
                    {select('follow_up', 'Follow-up schedule', [
                        ['all', 'All follow-up schedules'],
                        ['overdue', 'Has overdue follow-ups'],
                        ['upcoming', 'Has upcoming follow-ups'],
                        ['none', 'No open follow-ups'],
                    ])}
                    {select('phone', 'SMS readiness', [
                        ['all', 'All clients'],
                        ['with_phone', 'Has phone number'],
                        ['without_phone', 'Missing phone number'],
                    ])}
                    {select('sort', 'Sort clients', [
                        ['newest', 'Newest first'],
                        ['oldest', 'Oldest first'],
                        ['name_asc', 'Surname A to Z'],
                        ['name_desc', 'Surname Z to A'],
                    ])}
                    <Field>
                        <FieldLabel htmlFor="created-from">Client created from</FieldLabel>
                        <Input
                            id="created-from"
                            type="date"
                            value={values.created_from}
                            max={values.created_to || undefined}
                            onChange={(event) => update('created_from', event.target.value)}
                        />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="created-to">Client created to</FieldLabel>
                        <Input
                            id="created-to"
                            type="date"
                            value={values.created_to}
                            min={values.created_from || undefined}
                            onChange={(event) => update('created_to', event.target.value)}
                        />
                    </Field>
                    {select('per_page', 'Rows per page', [
                        ['10', '10 clients'],
                        ['20', '20 clients'],
                        ['50', '50 clients'],
                        ['100', '100 clients'],
                    ])}
                </div>
            )}
            {Object.entries(errors ?? {})
                .filter(([key]) => ['created_from', 'created_to', 'payment', 'follow_up', 'phone', 'sort', 'per_page'].includes(key))
                .map(([key, error]) => (
                    <p key={key} role="alert" className="text-destructive text-sm">
                        {String(error)}
                    </p>
                ))}
            <p className="text-muted-foreground text-xs">
                {total.toLocaleString()} matching client{total === 1 ? '' : 's'} � Use multiple search words to narrow results. Apply changes with
                Search.
            </p>
        </form>
    );
}
