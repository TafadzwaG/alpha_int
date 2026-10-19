import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowDownUp,
    CalendarDays,
    CheckCheck,
    Eye,
    FileDown,
    Printer,
    ReceiptText,
    Search,
    ShieldCheck,
    SlidersHorizontal,
    TriangleAlert,
    X,
} from 'lucide-react';
import { FormEvent, useState } from 'react';

type ReceiptRow = {
    id: number;
    receipt_no: string;
    payment_id: number;
    client: string;
    client_no: string;
    branch: string;
    amount: number;
    currency: string;
    method: string;
    issued_at: string | null;
    issuer: string | null;
    available: boolean;
    payment_status: string;
};
type Option = { value: string; label: string };
type Props = {
    records: {
        data: ReceiptRow[];
        total: number;
        from: number | null;
        to: number | null;
        prev_page_url: string | null;
        next_page_url: string | null;
        current_page: number;
        last_page: number;
        per_page: number;
    };
    stats: { total: number; thisMonth: number; available: number; unavailable: number };
    filters: Record<string, string>;
    branches: Option[];
    methods: Option[];
};
const money = (amount: number, currency: string) =>
    new Intl.NumberFormat('en', { style: 'currency', currency, currencyDisplay: 'code' }).format(amount);
const date = (value: string | null) => (value ? new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium' }).format(new Date(value)) : '—');

export default function ReceiptRegister({ records, stats, filters, branches, methods }: Props) {
    const [values, setValues] = useState<Record<string, string>>(filters);
    const [advanced, setAdvanced] = useState(Boolean(filters.issued_from || filters.issued_to || filters.method || filters.currency));
    const { errors } = usePage().props;
    const update = (key: string, value: string) => setValues((old) => ({ ...old, [key]: value }));
    const navigate = (next: Record<string, string | number>) =>
        router.get('/administration/receipts', Object.fromEntries(Object.entries(next).filter(([, v]) => v && v !== 'all')), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    const submit = (event: FormEvent) => {
        event.preventDefault();
        navigate(values);
    };
    const select = (key: string, label: string, options: Option[]) => (
        <div className="flex flex-col gap-2">
            <Label htmlFor={`receipt-${key}`}>{label}</Label>
            <Select value={values[key] || 'all'} onValueChange={(v) => update(key, v)}>
                <SelectTrigger id={`receipt-${key}`} className="w-full">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All {label.toLowerCase()}</SelectItem>
                    {options.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                            {o.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
    const sort = (column: string) => {
        const next = { ...values, sort: column, direction: filters.sort === column && filters.direction !== 'asc' ? 'asc' : 'desc' };
        setValues(next);
        navigate(next);
    };
    return (
        <AppLayout breadcrumbs={[{ title: 'Receipts', href: '/administration/receipts' }]}>
            <Head title="Receipts" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-semibold">
                            <ReceiptText className="size-6 text-emerald-700" />
                            Receipts
                        </h1>
                        <p className="text-muted-foreground mt-1">Find issued receipts and download branded PDFs with QR verification.</p>
                    </div>
                    <Button asChild variant="view">
                        <Link href="/administration/payments">
                            <Eye className="size-4" />
                            View payments
                        </Link>
                    </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        { label: 'Matching receipts', value: stats.total, icon: ReceiptText, color: 'bg-blue-100 text-blue-700' },
                        { label: 'Issued this month', value: stats.thisMonth, icon: CalendarDays, color: 'bg-emerald-100 text-emerald-700' },
                        { label: 'PDF available', value: stats.available, icon: CheckCheck, color: 'bg-cyan-100 text-cyan-700' },
                        { label: 'Payment needs review', value: stats.unavailable, icon: TriangleAlert, color: 'bg-amber-100 text-amber-800' },
                    ].map((card) => (
                        <Card key={card.label}>
                            <CardHeader className="flex-row items-center justify-between pb-2">
                                <CardDescription>{card.label}</CardDescription>
                                <span className={`rounded-lg p-2 ${card.color}`}>
                                    <card.icon className="size-5" />
                                </span>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-semibold">{card.value}</p>
                                <p className="text-muted-foreground mt-1 text-xs">Within current filters</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <Card>
                    <CardContent className="p-0">
                        <form onSubmit={submit} className="flex flex-col gap-4 border-b p-4">
                            <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_1fr_1fr_auto]">
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="receipt-search">Search receipts</Label>
                                    <Input
                                        id="receipt-search"
                                        placeholder="Receipt, client, account, reference or issuer..."
                                        value={values.search || ''}
                                        onChange={(e) => update('search', e.target.value)}
                                    />
                                </div>
                                {select('branch', 'Branches', branches)}
                                {select('availability', 'Availability', [
                                    { value: 'available', label: 'PDF available' },
                                    { value: 'unavailable', label: 'Payment needs review' },
                                ])}
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
                                            setValues({});
                                            setAdvanced(false);
                                            navigate({});
                                        }}
                                    >
                                        <X className="size-4" />
                                        Reset
                                    </Button>
                                </div>
                            </div>
                            {advanced && (
                                <div className="bg-muted/30 grid gap-4 rounded-lg p-4 sm:grid-cols-2 xl:grid-cols-4">
                                    {select('method', 'Methods', methods)}
                                    {select(
                                        'currency',
                                        'Currencies',
                                        ['USD', 'ZWG', 'ZAR'].map((value) => ({ value, label: value })),
                                    )}
                                    {[
                                        ['issued_from', 'Issued from'],
                                        ['issued_to', 'Issued to'],
                                    ].map(([key, label]) => (
                                        <div className="flex flex-col gap-2" key={key}>
                                            <Label htmlFor={key}>{label}</Label>
                                            <Input id={key} type="date" value={values[key] || ''} onChange={(e) => update(key, e.target.value)} />
                                        </div>
                                    ))}
                                </div>
                            )}
                            {Object.entries(errors).map(([key, error]) => (
                                <p role="alert" key={key} className="text-destructive text-sm">
                                    {String(error)}
                                </p>
                            ))}
                        </form>
                        <div className="text-muted-foreground flex items-center gap-2 border-b px-4 py-3 text-xs">
                            <ShieldCheck className="size-4 shrink-0 text-emerald-700" />
                            Receipt values use the original issued snapshot. Changes to payment approval can prevent PDF download.
                        </div>
                        <Table pagination={false}>
                            <TableHeader>
                                <TableRow>
                                    <TableHead sortable={false}>
                                        <button className="inline-flex items-center gap-1" onClick={() => sort('receipt_no')}>
                                            Receipt
                                            <ArrowDownUp className="size-3" />
                                        </button>
                                    </TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Branch</TableHead>
                                    <TableHead>Method</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead sortable={false}>
                                        <button className="inline-flex items-center gap-1" onClick={() => sort('issued_at')}>
                                            Issued
                                            <ArrowDownUp className="size-3" />
                                        </button>
                                    </TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {records.data.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-medium">
                                            <Link
                                                className="text-blue-700 hover:underline dark:text-blue-300"
                                                href={`/administration/payments/${row.payment_id}`}
                                            >
                                                {row.receipt_no}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-medium">{row.client}</p>
                                            <p className="text-muted-foreground text-xs">{row.client_no}</p>
                                        </TableCell>
                                        <TableCell>{row.branch}</TableCell>
                                        <TableCell>{row.method}</TableCell>
                                        <TableCell className="text-right tabular-nums">{money(row.amount, row.currency)}</TableCell>
                                        <TableCell>
                                            <p>{date(row.issued_at)}</p>
                                            <p className="text-muted-foreground text-xs">{row.issuer ?? 'Unknown issuer'}</p>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={row.available ? 'bg-emerald-700 text-white' : 'bg-amber-100 text-amber-900'}>
                                                {row.available ? 'Issued' : row.payment_status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-1">
                                                <Button variant="view" size="sm" asChild>
                                                    <Link href={`/administration/payments/${row.payment_id}`}>
                                                        <Eye className="size-4" />
                                                        View
                                                    </Link>
                                                </Button>
                                                <Button variant="pdf" size="sm" disabled={!row.available} asChild={row.available}>
                                                    {row.available ? (
                                                        <a href={`/administration/payments/${row.payment_id}/receipt`}>
                                                            <FileDown className="size-4" />
                                                            PDF
                                                        </a>
                                                    ) : (
                                                        <span title="Payment must be approved to download">
                                                            <FileDown className="size-4" />
                                                            PDF
                                                        </span>
                                                    )}
                                                </Button>
                                                <Button variant="outline" size="sm" disabled={!row.available} asChild={row.available}>
                                                    {row.available ? (
                                                        <a
                                                            href={`/administration/payments/${row.payment_id}/receipt/print`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            <Printer className="size-4" />
                                                            Print
                                                        </a>
                                                    ) : (
                                                        <span title="Payment must be approved to print">
                                                            <Printer className="size-4" />
                                                            Print
                                                        </span>
                                                    )}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!records.data.length && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="py-12 text-center">
                                            <ReceiptText className="text-muted-foreground mx-auto mb-3 size-8" />
                                            <p className="font-medium">No receipts found</p>
                                            <p className="text-muted-foreground mt-1 text-sm">
                                                Try clearing your filters. Receipts are issued when payments are approved.
                                            </p>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        {records.total >= 10 && (
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm">
                                <span className="text-muted-foreground">
                                    Showing {records.from}–{records.to} of {records.total}
                                </span>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Label htmlFor="receipt-per-page">Rows per page</Label>
                                    <Select
                                        value={String(records.per_page)}
                                        onValueChange={(v) => {
                                            update('per_page', v);
                                            navigate({ ...values, per_page: v });
                                        }}
                                    >
                                        <SelectTrigger id="receipt-per-page" className="w-20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[10, 20, 50, 100].map((v) => (
                                                <SelectItem key={v} value={String(v)}>
                                                    {v}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        disabled={!records.prev_page_url}
                                        onClick={() => records.prev_page_url && router.get(records.prev_page_url, {}, { preserveScroll: true })}
                                    >
                                        Previous
                                    </Button>
                                    <span>
                                        Page {records.current_page} of {records.last_page}
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        disabled={!records.next_page_url}
                                        onClick={() => records.next_page_url && router.get(records.next_page_url, {}, { preserveScroll: true })}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
