import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { router, usePage } from '@inertiajs/react';
import { Banknote, CheckCheck, Clock3, FileDown, Search, Sheet, SlidersHorizontal, TriangleAlert, Wallet, X } from 'lucide-react';
import { FormEvent, useState } from 'react';

export const financeKeys = ['bank-deposits', 'cash-sessions', 'expenses', 'petty-cash-entries'];
type Option = { value: string | number | boolean; label: string };
export type FinanceCard = { label: string; value?: number; totals?: { currency: string; amount: number }[]; icon: string };
const icons = { records: Wallet, open: CheckCheck, clock: Clock3, alert: TriangleAlert, cash: Banknote };
const colors = ['bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-800', 'bg-cyan-100 text-cyan-700'];
export function FinanceSummary({ cards }: { cards: FinanceCard[] }) {
    return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card, index) => {
                const Icon = icons[card.icon as keyof typeof icons] || Wallet;
                return (
                    <Card key={card.label}>
                        <CardHeader className="flex-row items-center justify-between pb-2">
                            <CardDescription>{card.label}</CardDescription>
                            <span className={`rounded-lg p-2 ${colors[index % colors.length]}`}>
                                <Icon className="size-5" />
                            </span>
                        </CardHeader>
                        <CardContent>
                            {card.totals ? (
                                <div className="flex flex-col gap-1">
                                    {card.totals.length ? (
                                        card.totals.map((total) => (
                                            <p key={total.currency} className="text-xl font-semibold tabular-nums">
                                                {total.currency}{' '}
                                                {new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
                                                    total.amount,
                                                )}
                                            </p>
                                        ))
                                    ) : (
                                        <p className="text-xl font-semibold">No entries</p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-2xl font-semibold">{card.value?.toLocaleString()}</p>
                            )}
                            <p className="text-muted-foreground mt-1 text-xs">
                                {card.label === 'Net movement' ? 'Filtered movement, not the opening balance' : 'Within current filters'}
                            </p>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
const statuses: Record<string, string[]> = {
    'bank-deposits': ['draft', 'submitted', 'approved', 'cleared', 'void'],
    'cash-sessions': ['open', 'closing', 'closed', 'void'],
    expenses: ['draft', 'submitted', 'approved', 'rejected', 'paid', 'cancelled'],
};
export function FinanceFilters({
    resourceKey,
    filters,
    options,
}: {
    resourceKey: string;
    filters: Record<string, string>;
    options: Record<string, Option[]>;
}) {
    const [values, setValues] = useState(filters);
    const [advanced, setAdvanced] = useState(
        Boolean(filters.date_from || filters.date_to || filters.amount_min || filters.amount_max || filters.currency_code || filters.variance),
    );
    const { errors } = usePage().props;
    const update = (key: string, value: string) => setValues((old) => ({ ...old, [key]: value }));
    const submit = (event: FormEvent) => {
        event.preventDefault();
        router.get(`/administration/${resourceKey}`, Object.fromEntries(Object.entries(values).filter(([, v]) => v && v !== 'all')), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };
    const select = (key: string, label: string, choices: Option[]) => (
        <Field key={key}>
            <FieldLabel htmlFor={`finance-${key}`}>{label}</FieldLabel>
            <Select value={values[key] || 'all'} onValueChange={(v) => update(key, v)}>
                <SelectTrigger id={`finance-${key}`} className="w-full">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {choices.map((o) => (
                        <SelectItem key={String(o.value)} value={String(o.value)}>
                            {o.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </Field>
    );
    const exportUrl = (format: string) =>
        `/administration/${resourceKey}/export/${format}?${new URLSearchParams(Object.entries(filters).filter(([, v]) => v && v !== 'all'))}`;
    return (
        <>
            <form onSubmit={submit} className="flex flex-col gap-4 border-b p-4">
                <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_1fr_1fr_auto]">
                    <Field>
                        <FieldLabel htmlFor="finance-search">Search {resourceKey.replaceAll('-', ' ')}</FieldLabel>
                        <Input
                            id="finance-search"
                            value={values.search || ''}
                            onChange={(e) => update('search', e.target.value)}
                            placeholder={
                                resourceKey === 'cash-sessions'
                                    ? 'Cashier or branch...'
                                    : resourceKey === 'bank-deposits'
                                      ? 'Reference, bank or branch...'
                                      : resourceKey === 'expenses'
                                        ? 'Expense, payee, purpose or category...'
                                        : 'Expense, payee, entry type or posted by...'
                            }
                        />
                    </Field>
                    {select('branch', 'Branch', options.branches || [])}
                    {resourceKey === 'petty-cash-entries'
                        ? select(
                              'entry_type',
                              'Entry type',
                              ['replenishment', 'refund', 'disbursement', 'adjustment'].map((value) => ({ value, label: value })),
                          )
                        : select(
                              'status',
                              'Status',
                              (statuses[resourceKey] || []).map((value) => ({ value, label: value })),
                          )}
                    <div className="flex flex-wrap gap-2">
                        <Button>
                            <Search className="size-4" />
                            Search
                        </Button>
                        <Button type="button" variant="outline" aria-expanded={advanced} onClick={() => setAdvanced(!advanced)}>
                            <SlidersHorizontal className="size-4" />
                            Advanced
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setValues({ search: '', status: '', branch: 'all' });
                                setAdvanced(false);
                                router.get(`/administration/${resourceKey}`, {}, { preserveState: true, replace: true });
                            }}
                        >
                            <X className="size-4" />
                            Reset
                        </Button>
                    </div>
                </div>
                {advanced && (
                    <div className="bg-muted/30 grid gap-4 rounded-lg p-4 sm:grid-cols-2 xl:grid-cols-4">
                        {select('currency_code', 'Currency', options.currencies || [])}
                        {[
                            ['date_from', 'From date'],
                            ['date_to', 'To date'],
                            ['amount_min', 'Minimum amount'],
                            ['amount_max', 'Maximum amount'],
                        ].map(([key, label]) => (
                            <Field key={key}>
                                <FieldLabel htmlFor={`finance-${key}`}>{label}</FieldLabel>
                                <Input
                                    id={`finance-${key}`}
                                    type={key.startsWith('date') ? 'date' : 'number'}
                                    min={key.startsWith('amount') ? '0' : undefined}
                                    step={key.startsWith('amount') ? '0.01' : undefined}
                                    value={values[key] || ''}
                                    onChange={(e) => update(key, e.target.value)}
                                />
                            </Field>
                        ))}
                        {resourceKey === 'cash-sessions' && (
                            <>
                                {select('cashier_id', 'Cashier', options.users || [])}
                                {select('variance', 'Declared difference', [
                                    { value: 'balanced', label: 'Balanced' },
                                    { value: 'short', label: 'Shortage' },
                                    { value: 'over', label: 'Overage' },
                                    { value: 'undeclared', label: 'Not yet declared' },
                                ])}
                            </>
                        )}
                        {resourceKey === 'bank-deposits' && select('bank_account_id', 'Bank account', options['bank-accounts'] || [])}
                        {resourceKey === 'expenses' && select('category_id', 'Expense category', options['expense-categories'] || [])}
                        {select('sort', 'Sort order', [
                            { value: 'date_newest', label: 'Date: newest first' },
                            { value: 'date_oldest', label: 'Date: oldest first' },
                            { value: 'amount_high', label: 'Amount: highest first' },
                            { value: 'amount_low', label: 'Amount: lowest first' },
                        ])}
                    </div>
                )}
                {Object.entries(errors).map(([key, error]) => (
                    <p role="alert" key={key} className="text-destructive text-sm">
                        {String(error)}
                    </p>
                ))}
            </form>
            <div className="flex flex-wrap items-center gap-2 border-b p-4">
                <span className="text-muted-foreground mr-auto text-xs">Export all records matching the applied filters</span>
                <Button size="sm" variant="excel" asChild>
                    <a href={exportUrl('excel')}>
                        <Sheet className="size-4" />
                        Export Excel
                    </a>
                </Button>
                <Button size="sm" variant="pdf" asChild>
                    <a href={exportUrl('pdf')}>
                        <FileDown className="size-4" />
                        Export PDF
                    </a>
                </Button>
            </div>
        </>
    );
}
