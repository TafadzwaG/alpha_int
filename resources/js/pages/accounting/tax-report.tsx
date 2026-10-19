import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { BadgeCheck, Building2, Download, FileSpreadsheet, Landmark, ReceiptText, Scale, TriangleAlert } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

type Option = { value: string; label: string };
type TaxCode = { code: string; name: string; rate: number };
type ReportRow = {
    date: string;
    source: string;
    document_no: string;
    counterparty: string;
    branch: string | null;
    tax_code: string;
    description: string;
    taxable_amount: number;
    input_tax: number;
    output_tax: number;
};
type CodeSummary = { tax_code: string; taxable_amount: number; input_tax: number; output_tax: number; transactions: number };
type Summary = {
    taxable_sales: number;
    taxable_purchases: number;
    output_tax: number;
    input_tax: number;
    net_tax: number;
    control_output: number | null;
    control_input: number | null;
    output_variance: number | null;
    input_variance: number | null;
    control_reconciliation_available: boolean;
};
type Props = {
    report: { rows: ReportRow[]; byCode: CodeSummary[]; summary: Summary };
    filters: { from: string; to: string; branch_id: number | null; tax_code: string | null };
    branches: Option[];
    taxCodes: TaxCode[];
    currency: string;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '/accounting' },
    { title: 'VAT & tax report', href: '/accounting/tax-report' },
];
const money = (value: number, currency: string) => new Intl.NumberFormat('en-ZW', { style: 'currency', currency }).format(Number(value));
const shortDate = (value: string) => new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium' }).format(new Date(`${value.slice(0, 10)}T00:00:00`));

export default function TaxReportPage({ report, filters, branches, taxCodes, currency }: Props) {
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);
    const [branch, setBranch] = useState(filters.branch_id ? String(filters.branch_id) : 'all');
    const [taxCode, setTaxCode] = useState(filters.tax_code ?? 'all');
    const reconciled =
        report.summary.control_reconciliation_available &&
        Math.abs(Number(report.summary.output_variance)) <= 0.01 &&
        Math.abs(Number(report.summary.input_variance)) <= 0.01;
    const exportUrl = useMemo(() => {
        const params = new URLSearchParams({ from, to });
        if (branch !== 'all') params.set('branch_id', branch);
        if (taxCode !== 'all') params.set('tax_code', taxCode);
        return `/accounting/tax-report/export?${params.toString()}`;
    }, [branch, from, taxCode, to]);
    const apply = (event: FormEvent) => {
        event.preventDefault();
        router.get(
            '/accounting/tax-report',
            { from, to, branch_id: branch === 'all' ? '' : branch, tax_code: taxCode === 'all' ? '' : taxCode },
            { preserveState: true, replace: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="VAT & tax report" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <section className="overflow-hidden rounded-xl border bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-900 text-white shadow-sm">
                    <div className="flex flex-col justify-between gap-5 p-6 lg:flex-row lg:items-end">
                        <div className="max-w-2xl">
                            <Badge className="mb-3 border-white/15 bg-white/10 text-white">Statutory reporting</Badge>
                            <h1 className="text-2xl font-semibold tracking-tight">VAT & tax report</h1>
                            <p className="mt-2 text-sm leading-6 text-slate-300">
                                Build the VAT return from posted sales and purchase documents, then reconcile output and input tax to the general
                                ledger control accounts.
                            </p>
                        </div>
                        <Button asChild className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">
                            <a href={exportUrl}>
                                <Download data-icon="inline-start" /> Export Excel
                            </a>
                        </Button>
                    </div>
                </section>

                <Card>
                    <CardContent className="p-4">
                        <form onSubmit={apply} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.2fr_1.2fr_auto]">
                            <div>
                                <label className="mb-1.5 block text-xs font-medium">From</label>
                                <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-medium">To</label>
                                <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-medium">Branch</label>
                                <Select value={branch} onValueChange={setBranch}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All accessible branches</SelectItem>
                                        {branches.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-medium">Tax code</label>
                                <Select value={taxCode} onValueChange={setTaxCode}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All tax codes</SelectItem>
                                        {taxCodes.map((item) => (
                                            <SelectItem key={item.code} value={item.code}>
                                                {item.code} · {item.name} ({Number(item.rate).toFixed(2)}%)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button className="self-end" type="submit">
                                <FileSpreadsheet /> Run report
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                        { label: 'Taxable sales', value: report.summary.taxable_sales, Icon: ReceiptText, tone: 'bg-blue-100 text-blue-700' },
                        {
                            label: 'Taxable purchases',
                            value: report.summary.taxable_purchases,
                            Icon: Building2,
                            tone: 'bg-violet-100 text-violet-700',
                        },
                        { label: 'Output VAT', value: report.summary.output_tax, Icon: Landmark, tone: 'bg-amber-100 text-amber-700' },
                        { label: 'Input VAT', value: report.summary.input_tax, Icon: BadgeCheck, tone: 'bg-emerald-100 text-emerald-700' },
                        {
                            label: report.summary.net_tax >= 0 ? 'VAT payable' : 'VAT refundable',
                            value: Math.abs(report.summary.net_tax),
                            Icon: Scale,
                            tone: report.summary.net_tax >= 0 ? 'bg-rose-100 text-rose-700' : 'bg-teal-100 text-teal-700',
                        },
                    ].map(({ label, value, Icon, tone }) => (
                        <Card key={label}>
                            <CardContent className="flex items-start justify-between p-5">
                                <div>
                                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
                                    <p className="mt-2 text-xl font-semibold">{money(value, currency)}</p>
                                </div>
                                <span className={`rounded-lg p-2 ${tone}`}>
                                    <Icon className="size-4" />
                                </span>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
                    <Card>
                        <CardHeader className="flex-row items-start justify-between space-y-0">
                            <div>
                                <CardTitle className="text-base">GL control reconciliation</CardTitle>
                                <CardDescription>Document-derived tax compared with posted VAT control accounts.</CardDescription>
                            </div>
                            {report.summary.control_reconciliation_available && (
                                <Badge className={reconciled ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}>
                                    {reconciled ? 'Reconciled' : 'Variance found'}
                                </Badge>
                            )}
                        </CardHeader>
                        <CardContent>
                            {!report.summary.control_reconciliation_available ? (
                                <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
                                    <TriangleAlert className="mt-0.5 size-5 shrink-0" />
                                    <div>
                                        <p className="font-medium">Control comparison unavailable for a single tax code</p>
                                        <p className="mt-1 text-sm">
                                            Journal control lines are posted at account level. Clear the tax-code filter to reconcile the complete VAT
                                            control accounts.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-lg border p-4">
                                        <p className="text-muted-foreground text-xs font-medium uppercase">Output VAT control</p>
                                        <p className="mt-2 text-lg font-semibold">{money(Number(report.summary.control_output), currency)}</p>
                                        <p
                                            className={`mt-1 text-xs ${Math.abs(Number(report.summary.output_variance)) <= 0.01 ? 'text-emerald-700' : 'text-rose-700'}`}
                                        >
                                            Variance {money(Number(report.summary.output_variance), currency)}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border p-4">
                                        <p className="text-muted-foreground text-xs font-medium uppercase">Input VAT control</p>
                                        <p className="mt-2 text-lg font-semibold">{money(Number(report.summary.control_input), currency)}</p>
                                        <p
                                            className={`mt-1 text-xs ${Math.abs(Number(report.summary.input_variance)) <= 0.01 ? 'text-emerald-700' : 'text-rose-700'}`}
                                        >
                                            Variance {money(Number(report.summary.input_variance), currency)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Tax code analysis</CardTitle>
                            <CardDescription>Taxable value and tax split by configured code.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {report.byCode.length === 0 && (
                                <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                                    No posted taxable documents in this period.
                                </div>
                            )}
                            {report.byCode.map((item) => (
                                <div key={item.tax_code} className="flex items-center justify-between rounded-lg border p-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">{item.tax_code}</Badge>
                                            <span className="text-muted-foreground text-xs">{item.transactions} transactions</span>
                                        </div>
                                        <p className="text-muted-foreground mt-1 text-xs">Taxable {money(item.taxable_amount, currency)}</p>
                                    </div>
                                    <div className="text-right text-xs">
                                        <p>
                                            Output <span className="font-medium">{money(item.output_tax, currency)}</span>
                                        </p>
                                        <p className="mt-1">
                                            Input <span className="font-medium">{money(item.input_tax, currency)}</span>
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                <Card className="min-w-0">
                    <CardHeader>
                        <CardTitle className="text-base">VAT transaction detail</CardTitle>
                        <CardDescription>Posted source documents included in this report.</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Document</TableHead>
                                    <TableHead>Counterparty</TableHead>
                                    <TableHead>Branch</TableHead>
                                    <TableHead>Tax code</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Taxable</TableHead>
                                    <TableHead className="text-right">Input VAT</TableHead>
                                    <TableHead className="text-right">Output VAT</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {report.rows.map((row, index) => (
                                    <TableRow key={`${row.source}-${row.document_no}-${index}`}>
                                        <TableCell className="whitespace-nowrap">{shortDate(row.date)}</TableCell>
                                        <TableCell>
                                            <p className="font-medium">{row.document_no}</p>
                                            <p className="text-muted-foreground text-xs">{row.source}</p>
                                        </TableCell>
                                        <TableCell>{row.counterparty || '—'}</TableCell>
                                        <TableCell>{row.branch ?? '—'}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{row.tax_code}</Badge>
                                        </TableCell>
                                        <TableCell className="min-w-52">{row.description}</TableCell>
                                        <TableCell className="text-right">{money(row.taxable_amount, currency)}</TableCell>
                                        <TableCell className="text-right">{money(row.input_tax, currency)}</TableCell>
                                        <TableCell className="text-right">{money(row.output_tax, currency)}</TableCell>
                                    </TableRow>
                                ))}
                                {report.rows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-muted-foreground h-28 text-center">
                                            No posted taxable documents match these filters.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
