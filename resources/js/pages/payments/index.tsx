import PaymentDirectoryFilters from '@/components/payment-directory-filters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Banknote,
    Check,
    CircleCheck,
    Clock3,
    Eye,
    FileDown,
    Plus,
    ReceiptText,
    Search,
    ShieldCheck,
    WalletCards,
} from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

type Option = { value: string; label: string };
type Charge = { id: string; description: string; type: string; due_date: string | null; original_amount: number; outstanding: number };
type Account = {
    id: string;
    account_no: string;
    client: string;
    client_no: string;
    phone: string | null;
    branch_id: string;
    branch: string;
    timezone: string;
    currency: string;
    stand: string | null;
    development: string | null;
    outstanding: number;
    charges: Charge[];
};
type Method = { id: string; name: string; requires_reference: boolean; cash_equivalent: boolean };
type CashSession = { id: string; branch_id: string; currency: string; label: string };
type PaymentRecord = {
    id: number;
    client_name: string;
    account_no: string;
    branch_name: string;
    external_reference: string | null;
    method_name: string;
    amount: number;
    currency_code: string;
    received_at: string;
    receipt_no: string | null;
    status: string;
};
type PageLink = { url: string | null; label: string; active: boolean };
type Props = {
    canCapture: boolean;
    records: { data: PaymentRecord[]; links: PageLink[]; from: number | null; to: number | null; total: number };
    paymentStats: { total: number; approved: number; pending: number; totals: { currency: string; amount: number }[] };
    filters: Record<string, string>;
    branches: Option[];
    currencies: Option[];
    accounts: Account[];
    methods: Method[];
    cashSessions: CashSession[];
    systemTimezone: string;
};

const money = (value: number, currency: string) =>
    `${currency} ${new Intl.NumberFormat('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
const readableDate = (value: string | null) =>
    value ? new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const currentDateTimeIn = (timezone: string) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    })
        .formatToParts(new Date())
        .reduce<Record<string, string>>((values, part) => {
            if (part.type !== 'literal') values[part.type] = part.value;
            return values;
        }, {});

    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};
const statusVariant = (status: string) =>
    status === 'approved' ? 'default' : status === 'rejected' || status === 'reversed' ? 'destructive' : 'secondary';

export default function PaymentsIndex({
    canCapture,
    records,
    paymentStats,
    filters,
    branches,
    currencies,
    accounts,
    methods,
    cashSessions,
    systemTimezone,
}: Props) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [accountSearch, setAccountSearch] = useState('');
    const [allocations, setAllocations] = useState<Record<string, string>>({});
    const form = useForm({
        account_id: '',
        amount: '',
        method_id: '',
        cash_session_id: '',
        external_reference: '',
        received_at: currentDateTimeIn(systemTimezone),
        notes: '',
        allocations: [] as { charge_id: string; amount: number }[],
    });
    const account = accounts.find((item) => item.id === form.data.account_id) ?? null;
    const method = methods.find((item) => item.id === form.data.method_id) ?? null;
    const filteredAccounts = useMemo(() => {
        const needle = accountSearch.trim().toLowerCase();
        if (!needle) return accounts.slice(0, 12);
        return accounts
            .filter((item) =>
                [item.client, item.client_no, item.account_no, item.phone, item.stand, item.development].some((value) =>
                    value?.toLowerCase().includes(needle),
                ),
            )
            .slice(0, 20);
    }, [accountSearch, accounts]);
    const allocated = Object.values(allocations).reduce((sum, value) => sum + (Number(value) || 0), 0);
    const received = Number(form.data.amount) || 0;
    const unallocated = Math.max(0, received - allocated);
    const availableTills = cashSessions.filter(
        (session) => !account || (session.branch_id === account.branch_id && session.currency === account.currency),
    );
    const filterOptions = {
        branches,
        currencies,
        'payment-methods': methods.map((item) => ({ value: item.id, label: item.name })),
    };

    const reset = () => {
        form.reset();
        form.setData('received_at', currentDateTimeIn(systemTimezone));
        form.clearErrors();
        setAllocations({});
        setAccountSearch('');
        setStep(1);
    };
    const chooseAccount = (selected: Account) => {
        form.setData({
            ...form.data,
            account_id: selected.id,
            received_at: currentDateTimeIn(selected.timezone || systemTimezone),
        });
        form.clearErrors('received_at');
        setAllocations({});
    };
    const autoAllocate = () => {
        if (!account || received <= 0) return;
        let balance = received;
        const next: Record<string, string> = {};
        account.charges.forEach((charge) => {
            const applied = Math.min(balance, charge.outstanding);
            if (applied > 0) next[charge.id] = applied.toFixed(2);
            balance = Math.max(0, balance - applied);
        });
        setAllocations(next);
    };
    const canContinue = () => {
        if (step === 1) return Boolean(account);
        if (step === 2)
            return (
                received > 0 &&
                Boolean(method) &&
                (!method?.requires_reference || Boolean(form.data.external_reference.trim())) &&
                (!method?.cash_equivalent || Boolean(form.data.cash_session_id))
            );
        if (step === 3)
            return (
                allocated <= received + 0.005 &&
                Object.entries(allocations).every(
                    ([id, value]) =>
                        Number(value) >= 0 && Number(value) <= (account?.charges.find((charge) => charge.id === id)?.outstanding ?? 0) + 0.005,
                )
            );
        return true;
    };
    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!canContinue()) return;
        form.transform((data) => ({
            ...data,
            cash_session_id: data.cash_session_id || null,
            external_reference: data.external_reference || null,
            notes: data.notes || null,
            allocations: Object.entries(allocations)
                .filter(([, value]) => Number(value) > 0)
                .map(([charge_id, value]) => ({ charge_id, amount: Number(value) })),
        }));
        form.post('/administration/payments', {
            preserveScroll: true,
            onSuccess: () => {
                setOpen(false);
                reset();
            },
        });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Payments', href: '/administration/payments' }]}>
            <Head title="Payments" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
                    <div>
                        <Badge variant="secondary" className="mb-2">
                            Cash collection control
                        </Badge>
                        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
                        <p className="text-muted-foreground mt-1">
                            Record money received, apply it to the client account and send it for independent approval.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <a href="/administration/payments/export/excel">
                                <FileDown />
                                Export
                            </a>
                        </Button>
                        {canCapture && (
                            <Button onClick={() => setOpen(true)}>
                                <Plus />
                                Record payment
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardDescription>All payments</CardDescription>
                            <ReceiptText className="text-muted-foreground size-4" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-semibold">{paymentStats.total}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardDescription>Awaiting approval</CardDescription>
                            <Clock3 className="size-4 text-amber-600" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-semibold">{paymentStats.pending}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardDescription>Approved</CardDescription>
                            <CircleCheck className="size-4 text-emerald-600" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-semibold">{paymentStats.approved}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardDescription>Approved collections</CardDescription>
                            <Banknote className="text-muted-foreground size-4" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-lg font-semibold">
                                {paymentStats.totals.map((item) => money(item.amount, item.currency)).join(' · ') || '—'}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Card className="overflow-hidden">
                    <PaymentDirectoryFilters filters={filters} options={filterOptions} />
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Client / account</TableHead>
                                    <TableHead>Reference</TableHead>
                                    <TableHead>Method</TableHead>
                                    <TableHead>Received</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Receipt</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {records.data.map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell>
                                            <p className="font-medium">{payment.client_name}</p>
                                            <p className="text-muted-foreground text-xs">
                                                {payment.account_no} · {payment.branch_name}
                                            </p>
                                        </TableCell>
                                        <TableCell>{payment.external_reference || '—'}</TableCell>
                                        <TableCell>{payment.method_name}</TableCell>
                                        <TableCell>{readableDate(payment.received_at)}</TableCell>
                                        <TableCell className="text-right font-medium tabular-nums">
                                            {money(payment.amount, payment.currency_code)}
                                        </TableCell>
                                        <TableCell>
                                            {payment.receipt_no ? (
                                                <a
                                                    className="font-medium underline underline-offset-4"
                                                    href={`/administration/payments/${payment.id}/receipt`}
                                                >
                                                    {payment.receipt_no}
                                                </a>
                                            ) : (
                                                <span className="text-muted-foreground">After approval</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={statusVariant(payment.status)} className="capitalize">
                                                {payment.status.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" variant="outline" asChild>
                                                <Link href={`/administration/payments/${payment.id}`}>
                                                    <Eye />
                                                    View
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {records.data.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-muted-foreground py-12 text-center">
                                            No payments match these filters.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm">
                            <p className="text-muted-foreground">
                                Showing {records.from ?? 0}–{records.to ?? 0} of {records.total}
                            </p>
                            <div className="flex gap-1">
                                {records.links.map((link, index) => (
                                    <Button
                                        key={`${link.label}-${index}`}
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
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={open} onOpenChange={() => undefined}>
                <DialogContent
                    className="max-h-[92vh] max-w-5xl overflow-y-auto"
                    showCloseButton={false}
                    onEscapeKeyDown={(event) => event.preventDefault()}
                    onInteractOutside={(event) => event.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>Record a client payment</DialogTitle>
                        <DialogDescription>
                            Follow the four short steps. The payment will not update the account until another authorized user approves it.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-4 gap-2" aria-label="Payment capture progress">
                        {['Client', 'Payment', 'Apply', 'Review'].map((label, index) => (
                            <div
                                key={label}
                                className={`rounded-md border p-2 text-center text-sm ${step === index + 1 ? 'border-primary bg-primary text-primary-foreground' : index + 1 < step ? 'bg-muted font-medium' : 'text-muted-foreground'}`}
                            >
                                {index + 1}. {label}
                            </div>
                        ))}
                    </div>
                    <form onSubmit={submit} className="flex flex-col gap-5">
                        {step === 1 && (
                            <section className="space-y-4">
                                <Field>
                                    <FieldLabel htmlFor="account-search">Find the client or stand</FieldLabel>
                                    <div className="relative">
                                        <Search className="text-muted-foreground absolute top-3 left-3 size-4" />
                                        <Input
                                            id="account-search"
                                            className="pl-9"
                                            value={accountSearch}
                                            onChange={(event) => setAccountSearch(event.target.value)}
                                            placeholder="Name, client number, account, phone or stand..."
                                        />
                                    </div>
                                    <FieldError>{form.errors.account_id}</FieldError>
                                </Field>
                                <div className="grid max-h-[45vh] gap-2 overflow-y-auto sm:grid-cols-2">
                                    {filteredAccounts.map((item) => (
                                        <button
                                            type="button"
                                            key={item.id}
                                            onClick={() => chooseAccount(item)}
                                            className={`rounded-lg border p-4 text-left transition ${item.id === account?.id ? 'border-primary bg-primary/5 ring-primary/20 ring-2' : 'hover:bg-muted/50'}`}
                                        >
                                            <div className="flex justify-between gap-3">
                                                <div>
                                                    <p className="font-semibold">{item.client}</p>
                                                    <p className="text-muted-foreground text-xs">
                                                        {item.client_no} · {item.account_no}
                                                    </p>
                                                </div>
                                                {item.id === account?.id && <Check className="text-primary size-5" />}
                                            </div>
                                            <p className="mt-3 text-sm">
                                                {item.development && item.stand ? `${item.development} · Stand ${item.stand}` : 'No stand linked'}
                                            </p>
                                            <div className="mt-2 flex justify-between text-sm">
                                                <span>{item.branch}</span>
                                                <strong>{money(item.outstanding, item.currency)} due</strong>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}
                        {step === 2 && (
                            <section className="grid gap-4 sm:grid-cols-2">
                                <Card className="sm:col-span-2">
                                    <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                                        <div>
                                            <p className="font-semibold">{account?.client}</p>
                                            <p className="text-muted-foreground text-sm">
                                                {account?.account_no} · {account?.branch}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-muted-foreground text-xs">Account balance</p>
                                            <p className="text-lg font-semibold">{account && money(account.outstanding, account.currency)}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Field>
                                    <FieldLabel htmlFor="amount">Amount received *</FieldLabel>
                                    <Input
                                        id="amount"
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={form.data.amount}
                                        onChange={(event) => form.setData('amount', event.target.value)}
                                    />
                                    <FieldError>{form.errors.amount}</FieldError>
                                </Field>
                                <Field>
                                    <FieldLabel>How was it paid? *</FieldLabel>
                                    <Select
                                        value={form.data.method_id}
                                        onValueChange={(value) => {
                                            const selectedMethod = methods.find((item) => item.id === value);

                                            form.setData({
                                                ...form.data,
                                                method_id: value,
                                                cash_session_id: '',
                                                external_reference: selectedMethod?.requires_reference ? form.data.external_reference : '',
                                            });
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select payment method" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {methods.map((item) => (
                                                <SelectItem key={item.id} value={item.id}>
                                                    {item.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FieldError>{form.errors.method_id}</FieldError>
                                </Field>
                                {method?.cash_equivalent && (
                                    <Field>
                                        <FieldLabel>Open till *</FieldLabel>
                                        <Select value={form.data.cash_session_id} onValueChange={(value) => form.setData('cash_session_id', value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select the till receiving this cash" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableTills.map((item) => (
                                                    <SelectItem key={item.id} value={item.id}>
                                                        {item.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FieldError>{form.errors.cash_session_id}</FieldError>
                                    </Field>
                                )}
                                {method?.requires_reference && (
                                    <Field>
                                        <FieldLabel htmlFor="reference">Transaction reference *</FieldLabel>
                                        <Input
                                            id="reference"
                                            value={form.data.external_reference}
                                            onChange={(event) => form.setData('external_reference', event.target.value)}
                                            placeholder="Bank, card, mobile or deposit reference"
                                        />
                                        <FieldError>{form.errors.external_reference}</FieldError>
                                    </Field>
                                )}
                                <Field>
                                    <FieldLabel htmlFor="received-at">Date and time received *</FieldLabel>
                                    <Input
                                        id="received-at"
                                        type="datetime-local"
                                        max={currentDateTimeIn(account?.timezone || systemTimezone)}
                                        value={form.data.received_at}
                                        onChange={(event) => {
                                            form.setData('received_at', event.target.value);
                                            form.clearErrors('received_at');
                                        }}
                                    />
                                    <FieldError>{form.errors.received_at}</FieldError>
                                </Field>
                                <Field className="sm:col-span-2">
                                    <FieldLabel htmlFor="notes">Cashier note</FieldLabel>
                                    <Textarea
                                        id="notes"
                                        value={form.data.notes}
                                        onChange={(event) => form.setData('notes', event.target.value)}
                                        placeholder="Optional context for the approver"
                                    />
                                    <FieldError>{form.errors.notes}</FieldError>
                                </Field>
                            </section>
                        )}
                        {step === 3 && (
                            <section className="space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h3 className="font-semibold">Apply the payment to charges</h3>
                                        <p className="text-muted-foreground text-sm">
                                            Oldest charges are listed first. You may leave some money unapplied on the account.
                                        </p>
                                    </div>
                                    <Button type="button" variant="outline" onClick={autoAllocate}>
                                        <WalletCards />
                                        Auto-apply oldest first
                                    </Button>
                                </div>
                                <div className="overflow-hidden rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Charge</TableHead>
                                                <TableHead>Due</TableHead>
                                                <TableHead className="text-right">Outstanding</TableHead>
                                                <TableHead className="w-48 text-right">Apply now</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {account?.charges.map((charge) => (
                                                <TableRow key={charge.id}>
                                                    <TableCell>
                                                        <p className="font-medium">{charge.description}</p>
                                                        <p className="text-muted-foreground text-xs">{charge.type}</p>
                                                    </TableCell>
                                                    <TableCell>{charge.due_date ? readableDate(charge.due_date) : '—'}</TableCell>
                                                    <TableCell className="text-right">{money(charge.outstanding, account.currency)}</TableCell>
                                                    <TableCell>
                                                        <Input
                                                            aria-label={`Apply to ${charge.description}`}
                                                            className="text-right"
                                                            type="number"
                                                            min="0"
                                                            max={charge.outstanding}
                                                            step="0.01"
                                                            value={allocations[charge.id] ?? ''}
                                                            onChange={(event) =>
                                                                setAllocations((old) => ({ ...old, [charge.id]: event.target.value }))
                                                            }
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardDescription>Received</CardDescription>
                                            <span className="flex size-8 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                                <Banknote className="size-4" aria-hidden="true" />
                                            </span>
                                        </CardHeader>
                                        <CardContent className="text-lg font-semibold">{money(received, account?.currency ?? 'USD')}</CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardDescription>Applied to charges</CardDescription>
                                            <span className="flex size-8 items-center justify-center rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                                <ReceiptText className="size-4" aria-hidden="true" />
                                            </span>
                                        </CardHeader>
                                        <CardContent className={`text-lg font-semibold ${allocated > received + 0.005 ? 'text-destructive' : ''}`}>
                                            {money(allocated, account?.currency ?? 'USD')}
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardDescription>Left on account</CardDescription>
                                            <span className="flex size-8 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                                <WalletCards className="size-4" aria-hidden="true" />
                                            </span>
                                        </CardHeader>
                                        <CardContent className="text-lg font-semibold">{money(unallocated, account?.currency ?? 'USD')}</CardContent>
                                    </Card>
                                </div>
                                {(allocated > received + 0.005 || form.errors.allocations) && (
                                    <p role="alert" className="text-destructive text-sm">
                                        {form.errors.allocations || 'The amount applied cannot exceed the payment received.'}
                                    </p>
                                )}
                            </section>
                        )}
                        {step === 4 && (
                            <section className="grid gap-4 md:grid-cols-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Client and payment</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        <div className="flex justify-between gap-4">
                                            <span className="text-muted-foreground">Client</span>
                                            <strong>{account?.client}</strong>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <span className="text-muted-foreground">Account</span>
                                            <span>{account?.account_no}</span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <span className="text-muted-foreground">Branch</span>
                                            <span>{account?.branch}</span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <span className="text-muted-foreground">Method</span>
                                            <span>{method?.name}</span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <span className="text-muted-foreground">Amount received</span>
                                            <strong>{money(received, account?.currency ?? 'USD')}</strong>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Application summary</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        {Object.entries(allocations)
                                            .filter(([, value]) => Number(value) > 0)
                                            .map(([id, value]) => (
                                                <div className="flex justify-between gap-4" key={id}>
                                                    <span className="text-muted-foreground">
                                                        {account?.charges.find((charge) => charge.id === id)?.description}
                                                    </span>
                                                    <span>{money(Number(value), account?.currency ?? 'USD')}</span>
                                                </div>
                                            ))}
                                        <div className="flex justify-between gap-4 border-t pt-2">
                                            <span>Left on account</span>
                                            <strong>{money(unallocated, account?.currency ?? 'USD')}</strong>
                                        </div>
                                    </CardContent>
                                </Card>
                                <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 md:col-span-2">
                                    <ShieldCheck className="size-5 shrink-0" />
                                    <div>
                                        <p className="font-semibold">Independent approval is required</p>
                                        <p>
                                            The client balance, accounting ledger and till total change only after another authorized user approves
                                            this payment. The POS receipt is then generated automatically.
                                        </p>
                                    </div>
                                </div>
                                {Object.entries(form.errors).map(([key, error]) => (
                                    <p key={key} role="alert" className="text-destructive text-sm md:col-span-2">
                                        {String(error)}
                                    </p>
                                ))}
                            </section>
                        )}
                        <DialogFooter className="border-t pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setOpen(false);
                                    reset();
                                }}
                            >
                                Cancel
                            </Button>
                            {step > 1 && (
                                <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                                    <ArrowLeft />
                                    Back
                                </Button>
                            )}
                            {step < 4 ? (
                                <Button type="button" disabled={!canContinue()} onClick={() => setStep(step + 1)}>
                                    Continue
                                    <ArrowRight />
                                </Button>
                            ) : (
                                <Button type="submit" disabled={form.processing || !canContinue()}>
                                    {form.processing ? 'Submitting…' : 'Submit for approval'}
                                    <ShieldCheck />
                                </Button>
                            )}
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
