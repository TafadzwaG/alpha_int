import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { BookOpenText, CircleCheck, FilePlus2, RefreshCw, RotateCcw, Scale, Send, X } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

type Option = { value: string; label: string };
type Account = {
    id: number;
    code: string;
    name: string;
    type: string;
    subtype: string | null;
    normal_balance: string;
    control_account: boolean;
    allow_manual_posting: boolean;
    active: boolean;
};
type JournalLine = { id: number; account: string; description: string | null; debit: number; credit: number };
type Journal = {
    id: number;
    journal_no: string;
    journal_type: string;
    entry_date: string;
    reference: string | null;
    description: string;
    currency_code: string;
    status: string;
    branch: string | null;
    creator: string | null;
    total: number;
    lines: JournalLine[];
};
type Paginated<T> = {
    data: T[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    from: number | null;
    to: number | null;
    total: number;
};
type Props = {
    accounts: Account[];
    manualAccounts: Option[];
    branches: Option[];
    dimensions: Option[];
    journals: Paginated<Journal>;
    filters: { search: string; status: string; type: string };
    currency: string;
    permissions: { manage: boolean; post: boolean };
    stats: { accounts: number; drafts: number; postedThisMonth: number; period: string | null };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '/accounting' },
    { title: 'General ledger', href: '/accounting/general-ledger' },
];
const money = (value: number, currency: string) => new Intl.NumberFormat('en-ZW', { style: 'currency', currency }).format(value);
const journalTypes = ['general', 'cashbook', 'accrual', 'adjustment', 'opening'];

export default function GeneralLedger({ accounts, manualAccounts, branches, dimensions, journals, filters, currency, permissions, stats }: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [selected, setSelected] = useState<Journal | null>(null);
    const [reverseReason, setReverseReason] = useState('');
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);
    const [type, setType] = useState(filters.type);
    const form = useForm({
        branch_id: branches[0]?.value ?? '',
        entry_date: new Date().toISOString().slice(0, 10),
        journal_type: 'general',
        reference: '',
        description: '',
        currency_code: currency,
        exchange_rate: '1',
        lines: [
            { gl_account_id: '', accounting_dimension_id: '', description: '', debit: '', credit: '' },
            { gl_account_id: '', accounting_dimension_id: '', description: '', debit: '', credit: '' },
        ],
    });
    const totals = useMemo(
        () =>
            form.data.lines.reduce(
                (result, line) => ({ debit: result.debit + Number(line.debit || 0), credit: result.credit + Number(line.credit || 0) }),
                { debit: 0, credit: 0 },
            ),
        [form.data.lines],
    );
    const balanced = totals.debit > 0 && Math.abs(totals.debit - totals.credit) < 0.0001;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/accounting/journals', {
            preserveScroll: true,
            onSuccess: () => {
                setCreateOpen(false);
                form.reset();
            },
        });
    };
    const updateLine = (index: number, field: string, value: string) =>
        form.setData(
            'lines',
            form.data.lines.map((line, position) =>
                position === index
                    ? {
                          ...line,
                          [field]: value,
                          ...(field === 'debit' && value ? { credit: '' } : {}),
                          ...(field === 'credit' && value ? { debit: '' } : {}),
                      }
                    : line,
            ),
        );
    const applyFilters = (event: FormEvent) => {
        event.preventDefault();
        router.get(
            '/accounting/general-ledger',
            { search, status: status === 'all' ? '' : status, type: type === 'all' ? '' : type },
            { preserveState: true, replace: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="General ledger" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
                    <div>
                        <Badge variant="secondary" className="mb-2">
                            Double-entry accounting
                        </Badge>
                        <h1 className="text-2xl font-semibold tracking-tight">General ledger</h1>
                        <p className="text-muted-foreground mt-1">Control the chart of accounts and post balanced, traceable journals.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {permissions.post && (
                            <Button variant="outline" onClick={() => router.post('/accounting/sync-source-documents')}>
                                <RefreshCw data-icon="inline-start" />
                                Sync source documents
                            </Button>
                        )}
                        {permissions.manage && (
                            <Button onClick={() => setCreateOpen(true)}>
                                <FilePlus2 data-icon="inline-start" />
                                New journal
                            </Button>
                        )}
                    </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        { label: 'Active accounts', value: stats.accounts, Icon: BookOpenText },
                        { label: 'Draft journals', value: stats.drafts, Icon: FilePlus2 },
                        { label: 'Posted this month', value: stats.postedThisMonth, Icon: CircleCheck },
                        { label: 'Current period', value: stats.period ?? 'Not configured', Icon: Scale },
                    ].map(({ label, value, Icon }) => (
                        <Card key={label}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardDescription>{label}</CardDescription>
                                <Icon className="text-muted-foreground size-4" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-xl font-semibold">{String(value)}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Journal register</CardTitle>
                        <CardDescription>Draft, posted and reversed journals across accessible branches.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <form onSubmit={applyFilters} className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_180px_auto]">
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Journal, reference or description"
                            />
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="all">All statuses</SelectItem>
                                        {['draft', 'posted', 'reversed'].map((item) => (
                                            <SelectItem key={item} value={item}>
                                                {item}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All journal types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="all">All journal types</SelectItem>
                                        {journalTypes.map((item) => (
                                            <SelectItem key={item} value={item}>
                                                {item}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <Button type="submit">Apply filters</Button>
                        </form>
                        <div className="overflow-hidden rounded-md border">
                            <Table pagination={false}>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Journal</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Branch</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {journals.data.map((journal) => (
                                        <TableRow key={journal.id}>
                                            <TableCell>
                                                <p className="font-medium">{journal.journal_no}</p>
                                                <p className="text-muted-foreground max-w-72 truncate text-xs">
                                                    {journal.reference ?? journal.description}
                                                </p>
                                            </TableCell>
                                            <TableCell>{journal.entry_date}</TableCell>
                                            <TableCell className="capitalize">{journal.journal_type.replace('_', ' ')}</TableCell>
                                            <TableCell>{journal.branch ?? 'Organization'}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        journal.status === 'posted'
                                                            ? 'default'
                                                            : journal.status === 'reversed'
                                                              ? 'destructive'
                                                              : 'secondary'
                                                    }
                                                >
                                                    {journal.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{money(journal.total, journal.currency_code)}</TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSelected(journal);
                                                            setReverseReason('');
                                                        }}
                                                    >
                                                        View
                                                    </Button>
                                                    {permissions.post && journal.status === 'draft' && (
                                                        <Button size="sm" onClick={() => router.post(`/accounting/journals/${journal.id}/post`)}>
                                                            <Send data-icon="inline-start" />
                                                            Post
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {journals.data.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-muted-foreground h-28 text-center">
                                                No journals match these filters.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        {journals.links.length > 3 && (
                            <div className="flex flex-wrap justify-end gap-1">
                                {journals.links.map((link, index) => (
                                    <Button
                                        key={index}
                                        size="sm"
                                        variant={link.active ? 'default' : 'outline'}
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
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Chart of accounts</CardTitle>
                        <CardDescription>Pastel-style control and posting accounts grouped by accounting class.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-hidden rounded-md border">
                            <Table pagination={false}>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Code</TableHead>
                                        <TableHead>Account</TableHead>
                                        <TableHead>Class</TableHead>
                                        <TableHead>Normal balance</TableHead>
                                        <TableHead>Posting policy</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {accounts.map((account) => (
                                        <TableRow key={account.id}>
                                            <TableCell className="font-mono">{account.code}</TableCell>
                                            <TableCell className="font-medium">{account.name}</TableCell>
                                            <TableCell className="capitalize">{account.type}</TableCell>
                                            <TableCell className="capitalize">{account.normal_balance}</TableCell>
                                            <TableCell>
                                                {account.control_account
                                                    ? 'Control account'
                                                    : account.allow_manual_posting
                                                      ? 'Manual posting'
                                                      : 'System only'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={account.active ? 'default' : 'outline'}>
                                                    {account.active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={createOpen} onOpenChange={(open) => !form.processing && setCreateOpen(open)}>
                <DialogContent
                    className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-4xl"
                    onInteractOutside={(event) => event.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>Create balanced journal</DialogTitle>
                        <DialogDescription>Save a draft first. Posting is a separate controlled action.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="flex flex-col gap-5">
                        <FieldGroup className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <Field>
                                <FieldLabel>Branch</FieldLabel>
                                <Select value={form.data.branch_id} onValueChange={(value) => form.setData('branch_id', value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {branches.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field>
                                <FieldLabel>Journal date</FieldLabel>
                                <Input
                                    type="date"
                                    value={form.data.entry_date}
                                    onChange={(event) => form.setData('entry_date', event.target.value)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel>Journal type</FieldLabel>
                                <Select value={form.data.journal_type} onValueChange={(value) => form.setData('journal_type', value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {journalTypes.map((item) => (
                                                <SelectItem key={item} value={item}>
                                                    {item}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field>
                                <FieldLabel>Reference</FieldLabel>
                                <Input value={form.data.reference} onChange={(event) => form.setData('reference', event.target.value)} />
                            </Field>
                            <Field>
                                <FieldLabel>Currency</FieldLabel>
                                <Input
                                    value={form.data.currency_code}
                                    onChange={(event) => form.setData('currency_code', event.target.value.toUpperCase())}
                                    maxLength={3}
                                />
                            </Field>
                            <Field>
                                <FieldLabel>Exchange rate</FieldLabel>
                                <Input
                                    type="number"
                                    step="0.00000001"
                                    min="0.00000001"
                                    value={form.data.exchange_rate}
                                    onChange={(event) => form.setData('exchange_rate', event.target.value)}
                                />
                            </Field>
                            <Field className="md:col-span-2 lg:col-span-3">
                                <FieldLabel>Description</FieldLabel>
                                <Textarea value={form.data.description} onChange={(event) => form.setData('description', event.target.value)} />
                            </Field>
                        </FieldGroup>
                        <FieldError>{form.errors.entry_date || form.errors.lines}</FieldError>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">Journal lines</h3>
                                    <p className="text-muted-foreground text-xs">Every line must have either a debit or a credit.</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        form.setData('lines', [
                                            ...form.data.lines,
                                            { gl_account_id: '', accounting_dimension_id: '', description: '', debit: '', credit: '' },
                                        ])
                                    }
                                >
                                    Add line
                                </Button>
                            </div>
                            {form.data.lines.map((line, index) => (
                                <div
                                    key={index}
                                    className="grid gap-2 rounded-lg border p-3 md:grid-cols-[minmax(200px,1.2fr)_minmax(180px,1fr)_minmax(160px,1fr)_120px_120px_auto]"
                                >
                                    <Select value={line.gl_account_id} onValueChange={(value) => updateLine(index, 'gl_account_id', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Ledger account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {manualAccounts.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    <Select
                                        value={line.accounting_dimension_id || 'none'}
                                        onValueChange={(value) => updateLine(index, 'accounting_dimension_id', value === 'none' ? '' : value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Dimension" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No dimension</SelectItem>
                                            {dimensions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        placeholder="Line description"
                                        value={line.description}
                                        onChange={(event) => updateLine(index, 'description', event.target.value)}
                                    />
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="Debit"
                                        value={line.debit}
                                        onChange={(event) => updateLine(index, 'debit', event.target.value)}
                                    />
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="Credit"
                                        value={line.credit}
                                        onChange={(event) => updateLine(index, 'credit', event.target.value)}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled={form.data.lines.length <= 2}
                                        onClick={() =>
                                            form.setData(
                                                'lines',
                                                form.data.lines.filter((_, position) => position !== index),
                                            )
                                        }
                                    >
                                        <X />
                                        <span className="sr-only">Remove line</span>
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <div className="bg-muted/50 grid gap-3 rounded-lg p-4 sm:grid-cols-3">
                            <div>
                                <p className="text-muted-foreground text-xs">Total debits</p>
                                <p className="font-semibold">{money(totals.debit, currency)}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs">Total credits</p>
                                <p className="font-semibold">{money(totals.credit, currency)}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs">Balance check</p>
                                <Badge variant={balanced ? 'default' : 'destructive'}>
                                    {balanced ? 'Balanced' : money(Math.abs(totals.debit - totals.credit), currency) + ' difference'}
                                </Badge>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing || !balanced}>
                                {form.processing ? 'Saving…' : 'Save draft journal'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{selected?.journal_no}</DialogTitle>
                        <DialogDescription>{selected?.description}</DialogDescription>
                    </DialogHeader>
                    {selected && (
                        <div className="flex flex-col gap-4">
                            <div className="bg-muted/50 grid grid-cols-2 gap-3 rounded-lg p-4 text-sm">
                                <p>
                                    <span className="text-muted-foreground">Date:</span> {selected.entry_date}
                                </p>
                                <p>
                                    <span className="text-muted-foreground">Status:</span> {selected.status}
                                </p>
                                <p>
                                    <span className="text-muted-foreground">Branch:</span> {selected.branch ?? 'Organization'}
                                </p>
                                <p>
                                    <span className="text-muted-foreground">Reference:</span> {selected.reference ?? '—'}
                                </p>
                            </div>
                            <div className="overflow-hidden rounded-md border">
                                <Table pagination={false}>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Account</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="text-right">Debit</TableHead>
                                            <TableHead className="text-right">Credit</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selected.lines.map((line) => (
                                            <TableRow key={line.id}>
                                                <TableCell>{line.account}</TableCell>
                                                <TableCell>{line.description}</TableCell>
                                                <TableCell className="text-right">
                                                    {line.debit ? money(line.debit, selected.currency_code) : '—'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {line.credit ? money(line.credit, selected.currency_code) : '—'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {permissions.post && selected.status === 'posted' && (
                                <Field>
                                    <FieldLabel>Reversal reason</FieldLabel>
                                    <Textarea
                                        value={reverseReason}
                                        onChange={(event) => setReverseReason(event.target.value)}
                                        placeholder="Explain why this posted journal must be reversed"
                                    />
                                </Field>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelected(null)}>
                            Close
                        </Button>
                        {permissions.post && selected?.status === 'draft' && (
                            <Button
                                onClick={() => router.post(`/accounting/journals/${selected.id}/post`, {}, { onSuccess: () => setSelected(null) })}
                            >
                                <Send data-icon="inline-start" />
                                Post journal
                            </Button>
                        )}
                        {permissions.post && selected?.status === 'posted' && (
                            <Button
                                variant="destructive"
                                disabled={!reverseReason.trim()}
                                onClick={() =>
                                    router.post(
                                        `/accounting/journals/${selected.id}/reverse`,
                                        { reason: reverseReason },
                                        { onSuccess: () => setSelected(null) },
                                    )
                                }
                            >
                                <RotateCcw data-icon="inline-start" />
                                Reverse journal
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
