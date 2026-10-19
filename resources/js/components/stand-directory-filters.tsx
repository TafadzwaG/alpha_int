import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { router, usePage } from '@inertiajs/react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { FormEvent, useState } from 'react';
type Option = { value: string | number | boolean; label: string };
export default function StandDirectoryFilters({ filters, options }: { filters: Record<string, string>; options: Record<string, Option[]> }) {
    const defaults: Record<string, string> = {
        search: '',
        branch: 'all',
        status: 'all',
        phase_id: 'all',
        stand_type_id: 'all',
        currency_code: 'all',
        price_min: '',
        price_max: '',
        area_min: '',
        area_max: '',
        sort: 'newest',
        per_page: '10',
    };
    const [values, setValues] = useState({ ...defaults, ...filters });
    const [open, setOpen] = useState(false);
    const { errors } = usePage().props;
    const update = (key: string, value: string) => setValues((old) => ({ ...old, [key]: value }));
    const submit = (event: FormEvent) => {
        event.preventDefault();
        router.get('/administration/stands', Object.fromEntries(Object.entries(values).filter(([, v]) => v && v !== 'all')), {
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
                    <FieldLabel htmlFor="stand-search">Search stands</FieldLabel>
                    <Input id="stand-search" placeholder="Stand number..." value={values.search} onChange={(e) => update('search', e.target.value)} />
                </Field>
                {select('branch', 'Allocation branch', [{ value: 'all', label: 'All branches' }, ...(options.branches ?? [])])}
                {select('status', 'Status', [
                    { value: 'all', label: 'All statuses' },
                    ...['planned', 'available', 'reserved', 'allocated', 'withdrawn'].map((value) => ({ value, label: value })),
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
                            router.get('/administration/stands', {}, { preserveState: true, replace: true });
                        }}
                    >
                        Reset
                    </Button>
                </div>
            </div>
            {open && (
                <div className="bg-muted/30 grid gap-4 rounded-lg p-4 sm:grid-cols-2 xl:grid-cols-3">
                    {select('phase_id', 'Development phase', [{ value: 'all', label: 'All phases' }, ...(options['development-phases'] ?? [])])}
                    {select('stand_type_id', 'Stand type', [{ value: 'all', label: 'All types' }, ...(options['stand-types'] ?? [])])}
                    {select('currency_code', 'Currency', [{ value: 'all', label: 'All currencies' }, ...(options.currencies ?? [])])}
                    {[
                        ['price_min', 'Minimum price'],
                        ['price_max', 'Maximum price'],
                        ['area_min', 'Minimum area (m²)'],
                        ['area_max', 'Maximum area (m²)'],
                    ].map(([key, label]) => (
                        <Field key={key}>
                            <FieldLabel htmlFor={key}>{label}</FieldLabel>
                            <Input id={key} type="number" min="0" step="0.01" value={values[key]} onChange={(e) => update(key, e.target.value)} />
                        </Field>
                    ))}
                    {select(
                        'sort',
                        'Sort',
                        [
                            ['newest', 'Newest'],
                            ['oldest', 'Oldest'],
                            ['stand_asc', 'Stand number'],
                            ['price_asc', 'Price low to high'],
                            ['price_desc', 'Price high to low'],
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
