import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { router, usePage } from '@inertiajs/react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { FormEvent, useState } from 'react';
type Option = { value: string | number | boolean; label: string };
export default function PaymentDirectoryFilters({ filters, options }: { filters: Record<string, string>; options: Record<string, Option[]> }) {
    const defaults: Record<string, string> = {
        search: '',
        branch: 'all',
        status: 'all',
        method_id: 'all',
        unused_type: 'all',
        currency_code: 'all',
        amount_min: '',
        amount_max: '',
        received_from: '',
        received_to: '',
        sort: 'newest',
        per_page: '10',
    };
    const [values, setValues] = useState({ ...defaults, ...filters });
    const [open, setOpen] = useState(false);
    const { errors } = usePage().props;
    const update = (key: string, value: string) => setValues((old) => ({ ...old, [key]: value }));
    const submit = (event: FormEvent) => {
        event.preventDefault();
        router.get('/administration/payments', Object.fromEntries(Object.entries(values).filter(([, v]) => v && v !== 'all')), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };
    const select = (key: string, label: string, choices: Option[]) => (
        <Field key={key}>
            <FieldLabel htmlFor={`stand-filter-${key}`}>{label}</FieldLabel>
            <Select value={values[key] || 'all'} onValueChange={(v) => update(key, v)}>
                <SelectTrigger id={`stand-filter-${key}`}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {choices.map((o) => (
                            <SelectItem key={String(o.value)} value={String(o.value)}>
                                {o.label}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </Field>
    );
    return (
        <form onSubmit={submit} className="flex flex-col gap-4 border-b p-4">
            <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Field>
                    <FieldLabel htmlFor="stand-search">Search payments</FieldLabel>
                    <Input
                        id="stand-search"
                        placeholder="Client, phone, reference, receipt or account..."
                        value={values.search}
                        onChange={(e) => update('search', e.target.value)}
                    />
                </Field>
                {select('branch', 'Branch', [{ value: 'all', label: 'All branches' }, ...(options.branches ?? [])])}
                {select('status', 'Status', [
                    { value: 'all', label: 'All statuses' },
                    ...['draft', 'pending', 'approved', 'rejected', 'reversed'].map((value) => ({ value, label: value })),
                ])}
                <div className="flex gap-2">
                    <Button>
                        <Search data-icon="inline-start" />
                        Search
                    </Button>
                    <Button type="button" variant="outline" aria-expanded={open} onClick={() => setOpen(!open)}>
                        <SlidersHorizontal data-icon="inline-start" />
                        Advanced
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                            setValues(defaults);
                            router.get('/administration/payments', {}, { preserveState: true, replace: true });
                        }}
                    >
                        Reset
                    </Button>
                </div>
            </div>
            {open && (
                <div className="bg-muted/30 grid gap-4 rounded-lg p-4 sm:grid-cols-2 xl:grid-cols-3">
                    {select('method_id', 'Payment method', [{ value: 'all', label: 'All methods' }, ...(options['payment-methods'] ?? [])])}

                    {select('currency_code', 'Currency', [{ value: 'all', label: 'All currencies' }, ...(options.currencies ?? [])])}
                    {[
                        ['amount_min', 'Minimum amount'],
                        ['amount_max', 'Maximum amount'],
                        ['received_from', 'Received from'],
                        ['received_to', 'Received to'],
                    ].map(([key, label]) => (
                        <Field key={key}>
                            <FieldLabel htmlFor={key}>{label}</FieldLabel>
                            <Input
                                id={key}
                                type={key.startsWith('received_') ? 'date' : 'number'}
                                min="0"
                                step="0.01"
                                value={values[key]}
                                onChange={(e) => update(key, e.target.value)}
                            />
                        </Field>
                    ))}
                    {select(
                        'sort',
                        'Sort',
                        [
                            ['newest', 'Newest'],
                            ['oldest', 'Oldest'],

                            ['amount_asc', 'Amount low to high'],
                            ['amount_desc', 'Amount high to low'],
                        ].map(([value, label]) => ({ value, label })),
                    )}
                    {select(
                        'per_page',
                        'Rows per page',
                        [10, 20, 50, 100].map((n) => ({ value: String(n), label: String(n) })),
                    )}
                </div>
            )}
            {Object.entries(errors ?? {}).map(([key, error]) => (
                <p key={key} role="alert" className="text-destructive text-sm">
                    {String(error)}
                </p>
            ))}
        </form>
    );
}
