import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { BarChart3, BookOpenText, FileDown, Landmark, Scale, Sheet } from 'lucide-react';
import { FormEvent, useState } from 'react';

type Option = { value: string; label: string };
type Summary = {
    debits?: number;
    credits?: number;
    revenue?: number;
    expenses?: number;
    profit?: number;
    assets?: number;
    liabilities?: number;
    equity?: number;
};
type AccountRow = { id: number; code: string; name: string; type: string; debit: number; credit: number; balance: number };
type LedgerRow = {
    entry_date: string;
    journal_no: string;
    reference: string | null;
    journal_description: string;
    code: string;
    name: string;
    description: string | null;
    debit: number;
    credit: number;
};
type Props = {
    report: { type: string; rows: Array<AccountRow | LedgerRow>; summary: Summary };
    filters: { report: string; from: string; to: string; branch_id: number | null };
    branches: Option[];
    currency: string;
};
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '/accounting' },
    { title: 'Financial reports', href: '/accounting/financial-reports' },
];
const money = (value: number, currency: string) => new Intl.NumberFormat('en-ZW', { style: 'currency', currency }).format(value);
const reports = [
    { value: 'trial-balance', label: 'Trial balance' },
    { value: 'general-ledger', label: 'General ledger detail' },
    { value: 'income-statement', label: 'Income statement' },
    { value: 'balance-sheet', label: 'Balance sheet' },
    { value: 'cash-flow', label: 'Cash flow statement' },
    { value: 'comparative-income', label: 'Comparative income statement' },
    { value: 'monthly-performance', label: 'Monthly performance' },
    { value: 'budget-variance', label: 'Budget versus actual' },
    { value: 'control-reconciliation', label: 'Control account reconciliation' },
];

export default function FinancialReports({ report, filters, branches, currency }: Props) {
    const [type, setType] = useState(filters.report);
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);
    const [branch, setBranch] = useState(filters.branch_id ? String(filters.branch_id) : 'all');
    const apply = (event: FormEvent) => {
        event.preventDefault();
        router.get(
            '/accounting/financial-reports',
            { report: type, from, to, branch_id: branch === 'all' ? '' : branch },
            { preserveState: true, replace: true },
        );
    };
    const accountRows = report.rows as AccountRow[];
    const ledgerRows = report.rows as LedgerRow[];
    const title = reports.find((item) => item.value === report.type)?.label ?? 'Financial report';
    const exportQuery = new URLSearchParams({
        report: type,
        from,
        to,
        ...(branch !== 'all' ? { branch_id: branch } : {}),
    }).toString();
    const summaryCards =
        report.type === 'income-statement'
            ? [
                  { label: 'Revenue', value: report.summary.revenue ?? 0, icon: BarChart3 },
                  { label: 'Expenses', value: report.summary.expenses ?? 0, icon: BookOpenText },
                  { label: 'Net profit / loss', value: report.summary.profit ?? 0, icon: Scale },
              ]
            : report.type === 'balance-sheet'
              ? [
                    { label: 'Assets', value: report.summary.assets ?? 0, icon: Landmark },
                    { label: 'Liabilities', value: report.summary.liabilities ?? 0, icon: BookOpenText },
                    { label: 'Equity', value: (report.summary.equity ?? 0) + (report.summary.profit ?? 0), icon: Scale },
                ]
              : [
                    { label: report.type === 'budget-variance' ? 'Budget' : 'Total / inflow', value: report.summary.debits ?? 0, icon: BookOpenText },
                    { label: report.type === 'budget-variance' ? 'Actual' : 'Comparison / outflow', value: report.summary.credits ?? 0, icon: BookOpenText },
                    { label: report.type === 'cash-flow' ? 'Net cash movement' : 'Variance / difference', value: report.summary.profit ?? Math.abs((report.summary.debits ?? 0) - (report.summary.credits ?? 0)), icon: Scale },
                ];
    const valueHeadings =
        report.type === 'budget-variance'
            ? ['Budget', 'Actual', 'Variance']
            : report.type === 'comparative-income'
              ? ['Current', 'Prior', 'Movement']
              : report.type === 'monthly-performance'
                ? ['Revenue', 'Expenses', 'Profit']
                : report.type === 'cash-flow'
                  ? ['Cash in', 'Cash out', 'Net movement']
                  : report.type === 'control-reconciliation'
                    ? ['GL balance', 'Subledger', 'Difference']
                    : ['Debit', 'Credit', 'Balance'];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Financial reports" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                    <div>
                        <Badge variant="secondary" className="mb-2">
                            Posted ledger only
                        </Badge>
                        <h1 className="text-2xl font-semibold tracking-tight">Financial reports</h1>
                        <p className="text-muted-foreground mt-1">Run branch-aware statements directly from posted double-entry journals.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="excel" asChild>
                            <a href={`/accounting/financial-reports/export/excel?${exportQuery}`}>
                                <Sheet data-icon="inline-start" /> Excel
                            </a>
                        </Button>
                        <Button variant="pdf" asChild>
                            <a href={`/accounting/financial-reports/export/pdf?${exportQuery}`}>
                                <FileDown data-icon="inline-start" /> PDF
                            </a>
                        </Button>
                    </div>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Report controls</CardTitle>
                        <CardDescription>Choose the statement, posting period and optional branch.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={apply} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[240px_180px_180px_240px_auto] xl:items-end">
                            <Field>
                                <FieldLabel>Report</FieldLabel>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {reports.map((item) => (
                                                <SelectItem key={item.value} value={item.value}>
                                                    {item.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field>
                                <FieldLabel>From</FieldLabel>
                                <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
                            </Field>
                            <Field>
                                <FieldLabel>To</FieldLabel>
                                <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
                            </Field>
                            <Field>
                                <FieldLabel>Branch</FieldLabel>
                                <Select value={branch} onValueChange={setBranch}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="all">All accessible branches</SelectItem>
                                            {branches.map((item) => (
                                                <SelectItem key={item.value} value={item.value}>
                                                    {item.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Button type="submit">Run report</Button>
                        </form>
                    </CardContent>
                </Card>
                {report.type !== 'general-ledger' && (
                    <div className="grid gap-3 sm:grid-cols-3">
                        {summaryCards.map(({ label, value, icon: Icon }) => (
                            <Card key={label}>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardDescription>{label}</CardDescription>
                                    <Icon className="text-muted-foreground size-4" />
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xl font-semibold">{money(value, currency)}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
                <Card>
                    <CardHeader>
                        <CardTitle>{title}</CardTitle>
                        <CardDescription>
                            {filters.from} to {filters.to} ·{' '}
                            {filters.branch_id ? branches.find((item) => item.value === String(filters.branch_id))?.label : 'All accessible branches'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-hidden rounded-md border">
                            <Table pagination={false}>
                                {report.type === 'general-ledger' ? (
                                    <>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Journal</TableHead>
                                                <TableHead>Account</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead className="text-right">Debit</TableHead>
                                                <TableHead className="text-right">Credit</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {ledgerRows.map((row, index) => (
                                                <TableRow key={`${row.journal_no}-${index}`}>
                                                    <TableCell>{row.entry_date}</TableCell>
                                                    <TableCell>
                                                        <p className="font-medium">{row.journal_no}</p>
                                                        <p className="text-muted-foreground text-xs">{row.reference ?? '—'}</p>
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.code} · {row.name}
                                                    </TableCell>
                                                    <TableCell>{row.description ?? row.journal_description}</TableCell>
                                                    <TableCell className="text-right">
                                                        {row.debit ? money(Number(row.debit), currency) : '—'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {row.credit ? money(Number(row.credit), currency) : '—'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {ledgerRows.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-muted-foreground h-28 text-center">
                                                        No posted ledger lines in this period.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </>
                                ) : (
                                    <>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Code</TableHead>
                                                <TableHead>Account</TableHead>
                                                <TableHead>Class</TableHead>
                                                <TableHead className="text-right">{valueHeadings[0]}</TableHead>
                                                <TableHead className="text-right">{valueHeadings[1]}</TableHead>
                                                <TableHead className="text-right">{valueHeadings[2]}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {accountRows.map((row) => (
                                                <TableRow key={row.id}>
                                                    <TableCell className="font-mono">{row.code}</TableCell>
                                                    <TableCell className="font-medium">{row.name}</TableCell>
                                                    <TableCell className="capitalize">{row.type}</TableCell>
                                                    <TableCell className="text-right">{row.debit ? money(row.debit, currency) : '—'}</TableCell>
                                                    <TableCell className="text-right">{row.credit ? money(row.credit, currency) : '—'}</TableCell>
                                                    <TableCell className="text-right font-semibold">{money(row.balance, currency)}</TableCell>
                                                </TableRow>
                                            ))}
                                            {accountRows.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-muted-foreground h-28 text-center">
                                                        No posted balances in this period.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </>
                                )}
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
