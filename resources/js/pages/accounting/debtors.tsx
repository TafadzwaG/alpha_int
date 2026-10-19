import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, CalendarClock, FileText, Search, Users } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { type AgingBucket, type Debtor, type DebtorStatement, type Paginated } from './types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '/accounting' },
    { title: 'Debtors & ageing', href: '/accounting/debtors' },
];

type Props = {
    currency: string;
    summary: {
        totalReceivables: number;
        overdueReceivables: number;
        over90: number;
        debtorCount: number;
        overdueDebtorCount: number;
    };
    aging: AgingBucket[];
    debtors: Paginated<Debtor>;
    statement: DebtorStatement | null;
    filters: { search: string; bucket: string; account: number | null };
};

const money = (value: number, currency: string) =>
    new Intl.NumberFormat('en-ZW', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const amount = (value: number) => new Intl.NumberFormat('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const date = (value: string | null) =>
    value ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value)) : '—';

const statementUrl = (account: number, filters: Props['filters']) => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.bucket) params.set('bucket', filters.bucket);
    params.set('account', account.toString());

    return `/accounting/debtors?${params.toString()}`;
};

function AgeingStrip({ statement }: { statement: DebtorStatement }) {
    return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
            {statement.aging.map((bucket) => (
                <div key={bucket.key} className="text-center">
                    <p className="mb-1 text-xs font-semibold sm:text-sm">{bucket.label}</p>
                    <div className="border-foreground/70 rounded-md border px-2 py-1.5 tabular-nums">{amount(bucket.total)}</div>
                </div>
            ))}
            <div className="text-center">
                <p className="mb-1 text-xs font-semibold sm:text-sm">Amount due</p>
                <div className="border-foreground/70 rounded-md border px-2 py-1.5 font-bold tabular-nums">{amount(statement.amount_due)}</div>
            </div>
        </div>
    );
}

function Statement({ statement, currency }: { statement: DebtorStatement; currency: string }) {
    return (
        <Card className="border-foreground/20 overflow-hidden bg-white text-slate-950 shadow-sm dark:bg-white dark:text-slate-950">
            <CardContent className="flex flex-col gap-8 p-5 md:p-8">
                <div className="rounded-xl border-2 border-slate-900 px-4 py-2 text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-blue-800 md:text-5xl">Statement</h2>
                </div>

                <div className="grid gap-8 md:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
                    <div className="flex flex-col gap-8">
                        <div>
                            <p className="text-lg font-bold">{statement.organization.name}</p>
                            {statement.organization.branch && <p>{statement.organization.branch}</p>}
                            {statement.organization.address && <p className="whitespace-pre-line">{statement.organization.address}</p>}
                            {statement.organization.email && <p>{statement.organization.email}</p>}
                        </div>
                        <div>
                            <p className="text-lg font-bold">{statement.customer.account_no}</p>
                            <p className="font-bold uppercase">{statement.customer.name}</p>
                            {statement.customer.address ? (
                                <p className="whitespace-pre-line uppercase">{statement.customer.address}</p>
                            ) : (
                                <p className="text-slate-500">Address not recorded</p>
                            )}
                            {statement.customer.phone && <p>{statement.customer.phone}</p>}
                        </div>
                    </div>
                    <div className="self-start">
                        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1.5">
                            <dt className="font-bold">Telephone</dt>
                            <dd className="rounded-md border-2 border-slate-900 px-3 py-1.5 text-center">
                                {statement.organization.telephone ?? '—'}
                            </dd>
                            <dt className="font-bold">Date</dt>
                            <dd className="rounded-md border-2 border-slate-900 px-3 py-1.5 text-center">{date(statement.statement_date)}</dd>
                            <dt className="font-bold">Amount due</dt>
                            <dd className="rounded-md border-2 border-slate-900 px-3 py-1.5 text-center font-bold">{amount(statement.amount_due)}</dd>
                        </dl>
                        <div className="mt-5 flex items-center justify-between gap-3">
                            <span className="text-lg">{statement.status}</span>
                            <Badge variant={statement.status === 'Overdue' ? 'destructive' : 'secondary'}>{currency} account</Badge>
                        </div>
                    </div>
                </div>

                <div className="min-w-0 overflow-x-auto">
                    <table className="w-full min-w-[880px] border-collapse text-sm">
                        <thead>
                            <tr className="text-left">
                                {['Date', 'Reference', 'Description', 'Allocated to', 'Debit', 'Credit', 'Balance'].map((heading, index) => (
                                    <th
                                        key={heading}
                                        className={cn('px-2 py-2 font-bold underline decoration-2 underline-offset-4', index > 3 && 'text-right')}
                                    >
                                        {heading}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="px-2 py-2">
                                    {statement.transactions[0] ? date(statement.transactions[0].date) : date(statement.statement_date)}
                                </td>
                                <td className="px-2 py-2" />
                                <td className="px-2 py-2">Balance brought forward</td>
                                <td className="px-2 py-2" />
                                <td className="px-2 py-2 text-right tabular-nums">0.00</td>
                                <td className="px-2 py-2 text-right" />
                                <td className="px-2 py-2 text-right tabular-nums">0.00</td>
                            </tr>
                            {statement.transactions.map((transaction, index) => (
                                <tr key={`${transaction.reference}-${transaction.date}-${index}`}>
                                    <td className="px-2 py-2 whitespace-nowrap">{date(transaction.date)}</td>
                                    <td className="px-2 py-2 whitespace-nowrap">{transaction.reference}</td>
                                    <td className="px-2 py-2">{transaction.description}</td>
                                    <td className="px-2 py-2 text-slate-600">{transaction.allocated_to ?? '—'}</td>
                                    <td className="px-2 py-2 text-right tabular-nums">{transaction.debit ? amount(transaction.debit) : ''}</td>
                                    <td className="px-2 py-2 text-right tabular-nums">{transaction.credit ? amount(transaction.credit) : ''}</td>
                                    <td className="px-2 py-2 text-right font-medium tabular-nums">{amount(transaction.balance)}</td>
                                </tr>
                            ))}
                            {statement.transactions.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-2 py-10 text-center text-slate-500">
                                        No posted transactions are available for this account.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <AgeingStrip statement={statement} />

                <div className="border-t-2 border-dashed border-slate-900 pt-6">
                    <div className="mb-8 grid gap-6 md:grid-cols-2">
                        <div>
                            <p className="font-bold">{statement.customer.account_no}</p>
                            <p className="font-bold uppercase">{statement.customer.name}</p>
                            <p>{statement.customer.address ?? statement.customer.phone ?? 'No contact address recorded'}</p>
                        </div>
                        <div>
                            <p className="font-bold">{statement.organization.name}</p>
                            <p>{statement.organization.branch}</p>
                            <p>{statement.organization.address}</p>
                        </div>
                    </div>
                    <AgeingStrip statement={statement} />
                </div>
            </CardContent>
        </Card>
    );
}

export default function Debtors({ currency, summary, aging, debtors, statement, filters }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [bucket, setBucket] = useState(filters.bucket || 'all');

    const applyFilters = (event: FormEvent) => {
        event.preventDefault();
        router.get(
            '/accounting/debtors',
            Object.fromEntries(Object.entries({ search, bucket: bucket === 'all' ? '' : bucket }).filter(([, value]) => value)),
            { preserveState: true, replace: true },
        );
    };

    const clearFilters = () => {
        setSearch('');
        setBucket('all');
        router.get('/accounting/debtors', {}, { preserveState: true, replace: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Debtors and ageing" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
                    <div>
                        <Button variant="ghost" size="sm" className="mb-1 -ml-3" asChild>
                            <Link href="/accounting">
                                <ArrowLeft data-icon="inline-start" /> Accounting dashboard
                            </Link>
                        </Button>
                        <div className="flex items-center gap-2">
                            <Users className="text-primary size-5" />
                            <h1 className="text-2xl font-semibold tracking-tight">Debtors and ageing</h1>
                        </div>
                        <p className="text-muted-foreground mt-1">
                            Customer statements with a running debit-credit ledger and seven-period ageing analysis.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{summary.debtorCount} debtor accounts</Badge>
                        <Badge>{money(summary.totalReceivables, currency)} outstanding</Badge>
                    </div>
                </div>

                <Card>
                    <CardContent className="pt-6">
                        <form onSubmit={applyFilters}>
                            <FieldGroup className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_220px_auto] md:items-end">
                                <Field>
                                    <FieldLabel htmlFor="debtor-search">Find a debtor statement</FieldLabel>
                                    <Input
                                        id="debtor-search"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="Client, account, branch or phone"
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="ageing-bucket">Ageing period</FieldLabel>
                                    <Select value={bucket} onValueChange={setBucket}>
                                        <SelectTrigger id="ageing-bucket">
                                            <SelectValue placeholder="All periods" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="all">All periods</SelectItem>
                                                {[...aging].reverse().map((item) => (
                                                    <SelectItem key={item.key} value={item.key}>
                                                        {item.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <div className="flex gap-2">
                                    <Button type="submit">
                                        <Search data-icon="inline-start" /> Search
                                    </Button>
                                    {(filters.search || filters.bucket) && (
                                        <Button type="button" variant="outline" onClick={clearFilters}>
                                            Clear
                                        </Button>
                                    )}
                                </div>
                            </FieldGroup>
                        </form>
                    </CardContent>
                </Card>

                {statement ? (
                    <Statement statement={statement} currency={currency} />
                ) : (
                    <Card>
                        <CardContent className="flex min-h-52 flex-col items-center justify-center gap-2 text-center">
                            <FileText className="text-muted-foreground size-8" />
                            <p className="font-medium">No debtor statement available</p>
                            <p className="text-muted-foreground text-sm">No open debtor account matches the selected filters.</p>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Debtor statement register</CardTitle>
                        <CardDescription>Select an account to load its full statement above.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <Table pagination={false}>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Debtor</TableHead>
                                    <TableHead>Account</TableHead>
                                    <TableHead>Last payment</TableHead>
                                    {[...aging].reverse().map((item) => (
                                        <TableHead key={item.key} className="text-right">
                                            {item.label}
                                        </TableHead>
                                    ))}
                                    <TableHead className="text-right">Amount due</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {debtors.data.map((debtor) => (
                                    <TableRow
                                        key={debtor.account_id}
                                        className={cn(filters.account === debtor.account_id && 'bg-primary/5 ring-primary/30 ring-1 ring-inset')}
                                    >
                                        <TableCell>
                                            <Link
                                                href={statementUrl(debtor.account_id, filters)}
                                                preserveScroll
                                                className="font-medium hover:underline"
                                            >
                                                {debtor.client}
                                            </Link>
                                            <p className="text-muted-foreground text-xs">{debtor.client_no ?? 'No client number'}</p>
                                        </TableCell>
                                        <TableCell>
                                            <p>{debtor.account_no}</p>
                                            <p className="text-muted-foreground text-xs">{debtor.branch}</p>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <CalendarClock className="text-muted-foreground size-3.5" />
                                                {date(debtor.last_payment_at)}
                                            </div>
                                        </TableCell>
                                        {[...aging].reverse().map((item) => (
                                            <TableCell key={item.key} className="text-right tabular-nums">
                                                {debtor.aging[item.key] > 0 ? amount(debtor.aging[item.key]) : '—'}
                                            </TableCell>
                                        ))}
                                        <TableCell className="text-right font-semibold tabular-nums">{amount(debtor.outstanding)}</TableCell>
                                    </TableRow>
                                ))}
                                {debtors.data.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={11} className="text-muted-foreground h-32 text-center">
                                            No debtors match the selected filters.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        {debtors.links.length > 3 && (
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="text-muted-foreground text-xs">
                                    Showing {debtors.from ?? 0}–{debtors.to ?? 0} of {debtors.total} debtors
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {debtors.links.map((link, index) => (
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
        </AppLayout>
    );
}
