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
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { BadgeCheck, CircleAlert, FileCheck2, FileSpreadsheet, Link2, LoaderCircle, RefreshCw, Scale, ScanSearch, Upload } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

type Option = { value: string; label: string };
type Supplier = { id: number; supplier_no: string; name: string; currency_code: string };
type StatementLine = {
    id: number;
    transaction_date: string;
    transaction_type: string;
    reference: string | null;
    description: string;
    amount: number;
    match_status: 'unmatched' | 'matched' | 'exception';
    match_label: string | null;
    resolution_note: string | null;
};
type Reconciliation = {
    id: number;
    statement_no: string;
    statement_date: string;
    from_date: string;
    to_date: string;
    currency_code: string;
    statement_balance: number;
    ledger_balance: number;
    variance: number;
    status: 'in_review' | 'reconciled';
    original_filename: string;
    supplier: { supplier_no: string; name: string };
    branch: { name: string } | null;
    lines?: StatementLine[];
    lines_count?: number;
    unmatched_lines_count?: number;
};
type Props = {
    reconciliations: Reconciliation[];
    selected: Reconciliation | null;
    matchOptions: Option[];
    suppliers: Supplier[];
    branches: Option[];
    currency: string;
    permissions: { manage: boolean; post: boolean };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '/accounting' },
    { title: 'Supplier reconciliation', href: '/accounting/supplier-reconciliation' },
];
const money = (value: number, currency: string) => new Intl.NumberFormat('en-ZW', { style: 'currency', currency }).format(Number(value));
const date = (value: string) => new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium' }).format(new Date(`${value.slice(0, 10)}T00:00:00`));

export default function SupplierReconciliationPage({ reconciliations, selected, matchOptions, suppliers, branches, currency, permissions }: Props) {
    const [importOpen, setImportOpen] = useState(false);
    const [matchingLine, setMatchingLine] = useState<StatementLine | null>(null);
    const [exceptionLine, setExceptionLine] = useState<StatementLine | null>(null);
    const [target, setTarget] = useState('');
    const [resolution, setResolution] = useState('');
    const [busyAction, setBusyAction] = useState<string | null>(null);
    const initialSupplier = suppliers[0];
    const form = useForm<{
        supplier_id: string;
        branch_id: string;
        statement_no: string;
        statement_date: string;
        from_date: string;
        to_date: string;
        currency_code: string;
        opening_balance: string;
        statement_balance: string;
        notes: string;
        statement: File | null;
    }>({
        supplier_id: initialSupplier ? String(initialSupplier.id) : '',
        branch_id: '',
        statement_no: '',
        statement_date: new Date().toISOString().slice(0, 10),
        from_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
        to_date: new Date().toISOString().slice(0, 10),
        currency_code: initialSupplier?.currency_code ?? currency,
        opening_balance: '0',
        statement_balance: '',
        notes: '',
        statement: null,
    });
    const stats = useMemo(
        () => ({
            inReview: reconciliations.filter((item) => item.status === 'in_review').length,
            reconciled: reconciliations.filter((item) => item.status === 'reconciled').length,
            unmatched: reconciliations.reduce((sum, item) => sum + Number(item.unmatched_lines_count ?? 0), 0),
            variance: reconciliations.reduce((sum, item) => sum + Math.abs(Number(item.variance)), 0),
        }),
        [reconciliations],
    );
    const open = selected?.status !== 'reconciled';

    const submitImport = (event: FormEvent) => {
        event.preventDefault();
        form.post('/accounting/supplier-reconciliations', {
            forceFormData: true,
            onSuccess: () => {
                setImportOpen(false);
                form.reset();
            },
        });
    };
    const selectSupplier = (value: string) => {
        form.setData('supplier_id', value);
        const supplier = suppliers.find((item) => String(item.id) === value);
        if (supplier) form.setData('currency_code', supplier.currency_code);
    };
    const postAction = (key: string, url: string) => {
        setBusyAction(key);
        router.post(url, {}, { preserveScroll: true, onFinish: () => setBusyAction(null) });
    };
    const saveMatch = () => {
        if (!matchingLine || !target) return;
        setBusyAction(`match-${matchingLine.id}`);
        router.patch(
            `/accounting/supplier-reconciliation-lines/${matchingLine.id}/match`,
            { target },
            { preserveScroll: true, onSuccess: () => setMatchingLine(null), onFinish: () => setBusyAction(null) },
        );
    };
    const saveException = () => {
        if (!exceptionLine || resolution.trim().length < 10) return;
        setBusyAction(`exception-${exceptionLine.id}`);
        router.patch(
            `/accounting/supplier-reconciliation-lines/${exceptionLine.id}/exception`,
            { resolution_note: resolution },
            { preserveScroll: true, onSuccess: () => setExceptionLine(null), onFinish: () => setBusyAction(null) },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Supplier reconciliation" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <section className="overflow-hidden rounded-xl border bg-slate-950 text-white shadow-sm">
                    <div className="flex flex-col justify-between gap-5 p-6 lg:flex-row lg:items-end">
                        <div className="max-w-2xl">
                            <Badge className="mb-3 border-white/15 bg-white/10 text-white">Purchase ledger control</Badge>
                            <h1 className="text-2xl font-semibold tracking-tight">Supplier reconciliation</h1>
                            <p className="mt-2 text-sm leading-6 text-slate-300">
                                Match supplier statements to posted bills and payments, investigate exceptions, and sign off a zero-variance control.
                            </p>
                        </div>
                        {permissions.manage && (
                            <Button className="bg-emerald-500 text-slate-950 hover:bg-emerald-400" onClick={() => setImportOpen(true)}>
                                <Upload data-icon="inline-start" /> Import supplier statement
                            </Button>
                        )}
                    </div>
                </section>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        {
                            label: 'In review',
                            value: stats.inReview,
                            helper: 'Awaiting control sign-off',
                            Icon: ScanSearch,
                            tone: 'text-amber-700 bg-amber-100',
                        },
                        {
                            label: 'Reconciled',
                            value: stats.reconciled,
                            helper: 'Locked statement periods',
                            Icon: BadgeCheck,
                            tone: 'text-emerald-700 bg-emerald-100',
                        },
                        {
                            label: 'Unmatched lines',
                            value: stats.unmatched,
                            helper: 'Require matching or exception',
                            Icon: Link2,
                            tone: 'text-blue-700 bg-blue-100',
                        },
                        {
                            label: 'Open variance',
                            value: money(stats.variance, currency),
                            helper: 'Absolute variance in review',
                            Icon: Scale,
                            tone: 'text-rose-700 bg-rose-100',
                        },
                    ].map(({ label, value, helper, Icon, tone }) => (
                        <Card key={label}>
                            <CardContent className="flex items-start justify-between p-5">
                                <div>
                                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
                                    <p className="mt-2 text-2xl font-semibold">{value}</p>
                                    <p className="text-muted-foreground mt-1 text-xs">{helper}</p>
                                </div>
                                <span className={`rounded-lg p-2 ${tone}`}>
                                    <Icon className="size-4" />
                                </span>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid min-w-0 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
                    <Card className="min-w-0">
                        <CardHeader>
                            <CardTitle className="text-base">Statement register</CardTitle>
                            <CardDescription>Imported supplier statements and control status.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {reconciliations.length === 0 && (
                                <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                                    No supplier statements imported yet.
                                </div>
                            )}
                            {reconciliations.map((item) => (
                                <Link
                                    key={item.id}
                                    href={`/accounting/supplier-reconciliation?reconciliation=${item.id}`}
                                    className={`hover:bg-muted/60 block rounded-lg border p-3 transition-colors ${selected?.id === item.id ? 'border-emerald-500 bg-emerald-50/70' : ''}`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-medium">{item.supplier.name}</p>
                                            <p className="text-muted-foreground text-xs">
                                                {item.statement_no} · {date(item.statement_date)}
                                            </p>
                                        </div>
                                        <Badge
                                            className={
                                                item.status === 'reconciled' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                            }
                                        >
                                            {item.status === 'reconciled' ? 'Reconciled' : 'In review'}
                                        </Badge>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between text-xs">
                                        <span>{Number(item.unmatched_lines_count ?? 0)} unmatched</span>
                                        <span className={Math.abs(Number(item.variance)) > 0.01 ? 'font-medium text-rose-700' : 'text-emerald-700'}>
                                            {money(Number(item.variance), item.currency_code)} variance
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>

                    <div className="min-w-0 space-y-5">
                        {!selected && (
                            <Card>
                                <CardContent className="flex min-h-72 flex-col items-center justify-center text-center">
                                    <FileCheck2 className="text-muted-foreground mb-3 size-8" />
                                    <h2 className="font-semibold">Select a supplier statement</h2>
                                    <p className="text-muted-foreground mt-1 max-w-md text-sm">
                                        Open a statement from the register to review its balance bridge, matched transactions, and exceptions.
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                        {selected && (
                            <>
                                <Card>
                                    <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                                        <div>
                                            <CardTitle className="text-lg">
                                                {selected.supplier.name} · {selected.statement_no}
                                            </CardTitle>
                                            <CardDescription>
                                                {date(selected.from_date)} – {date(selected.to_date)} · {selected.branch?.name ?? 'All branches'} ·{' '}
                                                {selected.original_filename}
                                            </CardDescription>
                                        </div>
                                        <div className="flex flex-wrap justify-end gap-2">
                                            {open && permissions.manage && (
                                                <Button
                                                    variant="outline"
                                                    disabled={busyAction === 'auto'}
                                                    onClick={() =>
                                                        postAction('auto', `/accounting/supplier-reconciliations/${selected.id}/auto-match`)
                                                    }
                                                >
                                                    {busyAction === 'auto' ? <LoaderCircle className="animate-spin" /> : <RefreshCw />} Auto-match
                                                </Button>
                                            )}
                                            {open && permissions.post && (
                                                <Button
                                                    disabled={busyAction === 'approve'}
                                                    onClick={() =>
                                                        postAction('approve', `/accounting/supplier-reconciliations/${selected.id}/approve`)
                                                    }
                                                >
                                                    {busyAction === 'approve' ? <LoaderCircle className="animate-spin" /> : <BadgeCheck />} Sign off
                                                </Button>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="grid gap-3 sm:grid-cols-3">
                                        <div className="rounded-lg bg-slate-50 p-4">
                                            <p className="text-muted-foreground text-xs tracking-wide uppercase">Statement balance</p>
                                            <p className="mt-1 text-xl font-semibold">{money(selected.statement_balance, selected.currency_code)}</p>
                                        </div>
                                        <div className="rounded-lg bg-slate-50 p-4">
                                            <p className="text-muted-foreground text-xs tracking-wide uppercase">Purchase ledger</p>
                                            <p className="mt-1 text-xl font-semibold">{money(selected.ledger_balance, selected.currency_code)}</p>
                                        </div>
                                        <div
                                            className={`rounded-lg p-4 ${Math.abs(Number(selected.variance)) <= 0.01 ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'}`}
                                        >
                                            <p className="text-xs tracking-wide uppercase opacity-70">Variance</p>
                                            <p className="mt-1 text-xl font-semibold">{money(selected.variance, selected.currency_code)}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="min-w-0">
                                    <CardHeader>
                                        <CardTitle className="text-base">Statement transactions</CardTitle>
                                        <CardDescription>Every line must be matched or documented as an exception before sign-off.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="overflow-x-auto p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Reference</TableHead>
                                                    <TableHead>Description</TableHead>
                                                    <TableHead className="text-right">Amount</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>System match / resolution</TableHead>
                                                    <TableHead className="text-right">Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selected.lines?.map((line) => (
                                                    <TableRow key={line.id}>
                                                        <TableCell className="whitespace-nowrap">{date(line.transaction_date)}</TableCell>
                                                        <TableCell>{line.reference ?? '—'}</TableCell>
                                                        <TableCell className="min-w-52">
                                                            <p>{line.description}</p>
                                                            <p className="text-muted-foreground text-xs capitalize">{line.transaction_type}</p>
                                                        </TableCell>
                                                        <TableCell
                                                            className={`text-right font-medium whitespace-nowrap ${Number(line.amount) < 0 ? 'text-emerald-700' : ''}`}
                                                        >
                                                            {money(Number(line.amount), selected.currency_code)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                className={
                                                                    line.match_status === 'matched'
                                                                        ? 'bg-emerald-100 text-emerald-800'
                                                                        : line.match_status === 'exception'
                                                                          ? 'bg-amber-100 text-amber-800'
                                                                          : 'bg-rose-100 text-rose-800'
                                                                }
                                                            >
                                                                {line.match_status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="max-w-64">
                                                            <p className="truncate text-sm">
                                                                {line.match_label ?? line.resolution_note ?? 'Not matched'}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex justify-end gap-1">
                                                                {open && permissions.manage && line.match_status === 'unmatched' && (
                                                                    <>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => {
                                                                                setTarget('');
                                                                                setMatchingLine(line);
                                                                            }}
                                                                        >
                                                                            <Link2 /> Match
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => {
                                                                                setResolution('');
                                                                                setExceptionLine(line);
                                                                            }}
                                                                        >
                                                                            <CircleAlert /> Exception
                                                                        </Button>
                                                                    </>
                                                                )}
                                                                {open && permissions.manage && line.match_status !== 'unmatched' && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() =>
                                                                            router.patch(
                                                                                `/accounting/supplier-reconciliation-lines/${line.id}/reopen`,
                                                                            )
                                                                        }
                                                                    >
                                                                        <RefreshCw /> Reopen
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <Dialog open={importOpen} onOpenChange={setImportOpen}>
                <DialogContent className="sm:max-w-3xl" onInteractOutside={(event) => event.preventDefault()}>
                    <form onSubmit={submitImport}>
                        <DialogHeader>
                            <DialogTitle>Import supplier statement</DialogTitle>
                            <DialogDescription>
                                Upload a CSV exported by the supplier. Required headers: date, description, amount. Optional: type, reference.
                                Invoices are positive and payments are negative.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-5 sm:grid-cols-2">
                            <Field>
                                <FieldLabel>Supplier</FieldLabel>
                                <Select value={form.data.supplier_id} onValueChange={selectSupplier}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose supplier" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {suppliers.map((supplier) => (
                                            <SelectItem key={supplier.id} value={String(supplier.id)}>
                                                {supplier.supplier_no} · {supplier.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldError>{form.errors.supplier_id}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel>Branch scope</FieldLabel>
                                <Select
                                    value={form.data.branch_id || 'all'}
                                    onValueChange={(value) => form.setData('branch_id', value === 'all' ? '' : value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All accessible branches</SelectItem>
                                        {branches.map((branch) => (
                                            <SelectItem key={branch.value} value={branch.value}>
                                                {branch.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldError>{form.errors.branch_id}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel>Statement number</FieldLabel>
                                <Input
                                    value={form.data.statement_no}
                                    onChange={(event) => form.setData('statement_no', event.target.value)}
                                    required
                                />
                                <FieldError>{form.errors.statement_no}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel>Statement date</FieldLabel>
                                <Input
                                    type="date"
                                    value={form.data.statement_date}
                                    onChange={(event) => form.setData('statement_date', event.target.value)}
                                    required
                                />
                                <FieldError>{form.errors.statement_date}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel>Period from</FieldLabel>
                                <Input
                                    type="date"
                                    value={form.data.from_date}
                                    onChange={(event) => form.setData('from_date', event.target.value)}
                                    required
                                />
                                <FieldError>{form.errors.from_date}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel>Period to</FieldLabel>
                                <Input
                                    type="date"
                                    value={form.data.to_date}
                                    onChange={(event) => form.setData('to_date', event.target.value)}
                                    required
                                />
                                <FieldError>{form.errors.to_date}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel>Opening balance</FieldLabel>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={form.data.opening_balance}
                                    onChange={(event) => form.setData('opening_balance', event.target.value)}
                                    required
                                />
                                <FieldError>{form.errors.opening_balance}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel>Closing statement balance</FieldLabel>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={form.data.statement_balance}
                                    onChange={(event) => form.setData('statement_balance', event.target.value)}
                                    required
                                />
                                <FieldError>{form.errors.statement_balance}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel>Currency</FieldLabel>
                                <Input value={form.data.currency_code} readOnly />
                                <FieldError>{form.errors.currency_code}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel>Statement CSV</FieldLabel>
                                <label className="hover:bg-muted flex h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 text-sm">
                                    <FileSpreadsheet className="size-4" />
                                    <span className="truncate">{form.data.statement?.name ?? 'Choose CSV file'}</span>
                                    <Input
                                        className="sr-only"
                                        type="file"
                                        accept=".csv,text/csv"
                                        onChange={(event) => form.setData('statement', event.target.files?.[0] ?? null)}
                                    />
                                </label>
                                <FieldError>{form.errors.statement}</FieldError>
                            </Field>
                            <Field className="sm:col-span-2">
                                <FieldLabel>Review notes</FieldLabel>
                                <Textarea value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} />
                                <FieldError>{form.errors.notes}</FieldError>
                            </Field>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setImportOpen(false)}>
                                Cancel
                            </Button>
                            <Button disabled={form.processing}>
                                {form.processing ? <LoaderCircle className="animate-spin" /> : <Upload />} Import statement
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={matchingLine !== null} onOpenChange={(value) => !value && setMatchingLine(null)}>
                <DialogContent className="sm:max-w-lg" onInteractOutside={(event) => event.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>Match statement line</DialogTitle>
                        <DialogDescription>
                            Select the corresponding posted bill or supplier payment. The system validates supplier, branch and amount.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="bg-muted rounded-lg p-3 text-sm">
                            <p className="font-medium">{matchingLine?.description}</p>
                            <p className="text-muted-foreground mt-1">
                                {matchingLine && money(Number(matchingLine.amount), selected?.currency_code ?? currency)}
                            </p>
                        </div>
                        <Field>
                            <FieldLabel>System transaction</FieldLabel>
                            <Select value={target} onValueChange={setTarget}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose matching transaction" />
                                </SelectTrigger>
                                <SelectContent>
                                    {matchOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMatchingLine(null)}>
                            Cancel
                        </Button>
                        <Button disabled={!target || busyAction?.startsWith('match-')} onClick={saveMatch}>
                            {busyAction?.startsWith('match-') ? <LoaderCircle className="animate-spin" /> : <Link2 />} Confirm match
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={exceptionLine !== null} onOpenChange={(value) => !value && setExceptionLine(null)}>
                <DialogContent className="sm:max-w-lg" onInteractOutside={(event) => event.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>Document reconciliation exception</DialogTitle>
                        <DialogDescription>
                            Explain why this supplier statement line has no corresponding system transaction. This note forms part of the sign-off
                            evidence.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Field>
                            <FieldLabel>Resolution note</FieldLabel>
                            <Textarea
                                rows={5}
                                value={resolution}
                                onChange={(event) => setResolution(event.target.value)}
                                placeholder="Describe the investigation, evidence and resolution…"
                            />
                            <p className="text-muted-foreground text-xs">Minimum 10 characters.</p>
                        </Field>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setExceptionLine(null)}>
                            Cancel
                        </Button>
                        <Button disabled={resolution.trim().length < 10 || busyAction?.startsWith('exception-')} onClick={saveException}>
                            {busyAction?.startsWith('exception-') ? <LoaderCircle className="animate-spin" /> : <CircleAlert />} Save exception
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
