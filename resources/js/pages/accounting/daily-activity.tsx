import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowDownToLine,
    BadgeCheck,
    Banknote,
    ClipboardCheck,
    FilePlus2,
    Landmark,
    PackageCheck,
    Plus,
    Printer,
    ReceiptText,
    RefreshCw,
    ShoppingCart,
    Trash2,
    Upload,
} from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

type Option = { value: string; label: string; type?: string; branch_id?: number; currency?: string };
type Item = {
    id: number;
    code: string;
    name: string;
    type: string;
    track_inventory: boolean;
    stock_on_hand: number;
    default_unit_price: number;
    default_cost: number;
    expense_account_id: number | null;
    revenue_account_id: number | null;
    tax_code: string | null;
    tax_rate: number;
};
type Invoice = {
    id: number;
    invoice_no: string;
    invoice_date: string;
    due_date: string;
    currency_code: string;
    total_amount: number;
    paid_amount: number;
    status: string;
    account: { client_file: { client: { first_name: string; last_name: string; client_no: string } } };
    branch: { name: string };
};
type Order = {
    id: number;
    po_no: string;
    order_date: string;
    expected_date: string | null;
    currency_code: string;
    total_amount: number;
    status: string;
    supplier: { name: string; supplier_no: string };
    branch: { name: string };
    bills: Array<{ bill_no: string; status: string }>;
};
type StatementLine = {
    id: number;
    transaction_date: string;
    reference: string | null;
    description: string;
    amount: number;
    match_type: string | null;
};
type Statement = {
    id: number;
    statement_no: string;
    from_date: string;
    to_date: string;
    status: string;
    bank_account: { bank_name: string; account_mask: string };
    lines: StatementLine[];
};
type Props = {
    invoices: Invoice[];
    purchaseOrders: Order[];
    statements: Statement[];
    summary: { draftInvoices: number; receivables: number; openOrders: number; unmatchedBankLines: number };
    accounts: Option[];
    suppliers: Array<{ id: number; supplier_no: string; name: string; currency_code: string }>;
    catalogItems: Item[];
    branches: Option[];
    bankAccounts: Option[];
    ledgerAccounts: Option[];
    currency: string;
    permissions: { manage: boolean; post: boolean };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '/accounting' },
    { title: 'Daily activity', href: '/accounting/daily-activity' },
];
const money = (value: number, currency: string) => new Intl.NumberFormat('en-ZW', { style: 'currency', currency }).format(value);
const shortDate = (value: string) => new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium' }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
const statusTone = (status: string) =>
    status === 'paid' || status === 'received' || status === 'matched'
        ? 'bg-emerald-100 text-emerald-800'
        : status === 'draft' || status === 'imported'
          ? 'bg-amber-100 text-amber-800'
          : 'bg-blue-100 text-blue-800';

export default function DailyActivity({
    invoices,
    purchaseOrders,
    statements,
    summary,
    accounts,
    suppliers,
    catalogItems,
    branches,
    bankAccounts,
    ledgerAccounts,
    currency,
    permissions,
}: Props) {
    const [section, setSection] = useState<'sales' | 'purchases' | 'banking'>('sales');
    const [invoiceOpen, setInvoiceOpen] = useState(false);
    const [orderOpen, setOrderOpen] = useState(false);
    const [statementOpen, setStatementOpen] = useState(false);
    const [invoiceLines, setInvoiceLines] = useState<Array<{ catalog_item_id: string; quantity: string; unit_price: string }>>([]);
    const [orderLines, setOrderLines] = useState<Array<{ catalog_item_id: string; ordered_quantity: string; unit_price: string }>>([]);
    const [postingLine, setPostingLine] = useState<StatementLine | null>(null);
    const [postingStatement, setPostingStatement] = useState<Statement | null>(null);
    const invoiceForm = useForm({
        branch_id: branches[0]?.value ?? '',
        client_account_id: '',
        invoice_date: new Date().toISOString().slice(0, 10),
        due_date: '',
        currency_code: currency,
        description: '',
        catalog_item_id: '',
        quantity: '1',
        unit_price: '0',
    });
    const orderForm = useForm({
        branch_id: branches[0]?.value ?? '',
        supplier_id: '',
        order_date: new Date().toISOString().slice(0, 10),
        expected_date: '',
        currency_code: currency,
        notes: '',
        catalog_item_id: '',
        ordered_quantity: '1',
        unit_price: '0',
    });
    const statementForm = useForm<{
        bank_account_id: string;
        statement_no: string;
        from_date: string;
        to_date: string;
        currency_code: string;
        statement: File | null;
    }>({ bank_account_id: bankAccounts[0]?.value ?? '', statement_no: '', from_date: '', to_date: '', currency_code: currency, statement: null });
    const postForm = useForm({ counter_account_id: '' });
    const selectedInvoiceItem = useMemo(
        () => catalogItems.find((item) => String(item.id) === invoiceForm.data.catalog_item_id),
        [catalogItems, invoiceForm.data.catalog_item_id],
    );
    const selectedOrderItem = useMemo(
        () => catalogItems.find((item) => String(item.id) === orderForm.data.catalog_item_id),
        [catalogItems, orderForm.data.catalog_item_id],
    );
    const pendingInvoiceLines = invoiceForm.data.catalog_item_id
        ? [
              ...invoiceLines,
              { catalog_item_id: invoiceForm.data.catalog_item_id, quantity: invoiceForm.data.quantity, unit_price: invoiceForm.data.unit_price },
          ]
        : invoiceLines;
    const pendingOrderLines = orderForm.data.catalog_item_id
        ? [
              ...orderLines,
              {
                  catalog_item_id: orderForm.data.catalog_item_id,
                  ordered_quantity: orderForm.data.ordered_quantity,
                  unit_price: orderForm.data.unit_price,
              },
          ]
        : orderLines;

    const submitInvoice = (event: FormEvent) => {
        event.preventDefault();
        invoiceForm.transform((data) => ({
            ...data,
            description: data.description || null,
            lines: pendingInvoiceLines,
        }));
        invoiceForm.post('/accounting/customer-invoices', {
            onSuccess: () => {
                setInvoiceOpen(false);
                setInvoiceLines([]);
            },
            preserveScroll: true,
        });
    };
    const submitOrder = (event: FormEvent) => {
        event.preventDefault();
        orderForm.transform((data) => ({
            ...data,
            expected_date: data.expected_date || null,
            notes: data.notes || null,
            lines: pendingOrderLines,
        }));
        orderForm.post('/accounting/purchase-orders', {
            onSuccess: () => {
                setOrderOpen(false);
                setOrderLines([]);
            },
            preserveScroll: true,
        });
    };
    const submitStatement = (event: FormEvent) => {
        event.preventDefault();
        statementForm.post('/accounting/bank-statements', { forceFormData: true, onSuccess: () => setStatementOpen(false), preserveScroll: true });
    };
    const submitBankLine = (event: FormEvent) => {
        event.preventDefault();
        if (!postingLine) return;
        postForm.post(`/accounting/bank-statement-lines/${postingLine.id}/post`, {
            onSuccess: () => {
                setPostingLine(null);
                setPostingStatement(null);
            },
            preserveScroll: true,
        });
    };

    const tabs = [
        {
            key: 'sales' as const,
            label: 'Sales & invoicing',
            subtitle: 'Customer invoices and receivables',
            icon: ReceiptText,
            count: invoices.length,
            tone: 'data-[active=true]:bg-blue-600',
        },
        {
            key: 'purchases' as const,
            label: 'Purchases',
            subtitle: 'Orders, receiving and supplier bills',
            icon: ShoppingCart,
            count: purchaseOrders.length,
            tone: 'data-[active=true]:bg-amber-600',
        },
        {
            key: 'banking' as const,
            label: 'Cash & banking',
            subtitle: 'Statement import and reconciliation',
            icon: Landmark,
            count: summary.unmatchedBankLines,
            tone: 'data-[active=true]:bg-emerald-600',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Daily accounting activity" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <section className="overflow-hidden rounded-xl bg-slate-950 text-white shadow-sm">
                    <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-end">
                        <div>
                            <Badge className="mb-3 border-white/15 bg-white/10 text-white">Source document centre</Badge>
                            <h1 className="text-2xl font-semibold tracking-tight">Daily accounting activity</h1>
                            <p className="mt-2 max-w-3xl text-sm text-slate-300">
                                Capture the document once. Customer balances, supplier balances, stock, cash controls and the general ledger update
                                from the same source record.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
                            <RefreshCw className="size-4 text-emerald-400" />
                            <span>
                                Connected posting
                                <br />
                                <strong className="text-white">Document → subledger → GL</strong>
                            </span>
                        </div>
                    </div>
                </section>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        { label: 'Draft customer invoices', value: summary.draftInvoices, icon: FilePlus2, tone: 'bg-amber-50 text-amber-700' },
                        {
                            label: 'Open receivables',
                            value: money(summary.receivables, currency),
                            icon: ReceiptText,
                            tone: 'bg-blue-50 text-blue-700',
                        },
                        { label: 'Open purchase orders', value: summary.openOrders, icon: ShoppingCart, tone: 'bg-violet-50 text-violet-700' },
                        { label: 'Unmatched bank lines', value: summary.unmatchedBankLines, icon: Banknote, tone: 'bg-emerald-50 text-emerald-700' },
                    ].map(({ label, value, icon: Icon, tone }) => (
                        <Card key={label}>
                            <CardContent className="flex items-center justify-between p-5">
                                <div>
                                    <p className="text-muted-foreground text-xs font-medium">{label}</p>
                                    <p className="mt-2 text-2xl font-semibold">{value}</p>
                                </div>
                                <span className={`rounded-lg p-3 ${tone}`}>
                                    <Icon className="size-5" />
                                </span>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid gap-3 lg:grid-cols-3">
                    {tabs.map(({ key, label, subtitle, icon: Icon, count, tone }) => (
                        <button
                            key={key}
                            type="button"
                            data-active={section === key}
                            onClick={() => setSection(key)}
                            className={`bg-card flex items-center gap-3 rounded-xl border p-4 text-left transition hover:border-slate-400 data-[active=true]:border-transparent data-[active=true]:text-white ${tone}`}
                        >
                            <span className="rounded-lg bg-black/5 p-2.5">
                                <Icon className="size-5" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-semibold">{label}</span>
                                <span className={`block truncate text-xs ${section === key ? 'text-white/75' : 'text-muted-foreground'}`}>
                                    {subtitle}
                                </span>
                            </span>
                            <Badge variant="secondary">{count}</Badge>
                        </button>
                    ))}
                </div>

                {section === 'sales' && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Customer invoices</CardTitle>
                                <CardDescription>Posting creates the receivable charge, sales/VAT journal and stock issue together.</CardDescription>
                            </div>
                            {permissions.manage && (
                                <Button onClick={() => setInvoiceOpen(true)} className="bg-blue-600 hover:bg-blue-500">
                                    <Plus /> New invoice
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Invoice</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Branch</TableHead>
                                        <TableHead>Dates</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoices.map((invoice) => (
                                        <TableRow key={invoice.id}>
                                            <TableCell className="font-medium">{invoice.invoice_no}</TableCell>
                                            <TableCell>
                                                {invoice.account.client_file.client.first_name} {invoice.account.client_file.client.last_name}
                                                <span className="text-muted-foreground block text-xs">
                                                    {invoice.account.client_file.client.client_no}
                                                </span>
                                            </TableCell>
                                            <TableCell>{invoice.branch.name}</TableCell>
                                            <TableCell>
                                                {shortDate(invoice.invoice_date)}
                                                <span className="text-muted-foreground block text-xs">Due {shortDate(invoice.due_date)}</span>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {money(invoice.total_amount, invoice.currency_code)}
                                                <span className="text-muted-foreground block text-xs">
                                                    Paid {money(invoice.paid_amount, invoice.currency_code)}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={statusTone(invoice.status)}>{invoice.status.replace('_', ' ')}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button asChild size="sm" variant="outline">
                                                        <a href={`/accounting/customer-invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
                                                            <Printer /> Invoice
                                                        </a>
                                                    </Button>
                                                    {invoice.status === 'draft' && permissions.post && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() =>
                                                                router.post(
                                                                    `/accounting/customer-invoices/${invoice.id}/post`,
                                                                    {},
                                                                    { preserveScroll: true },
                                                                )
                                                            }
                                                        >
                                                            <BadgeCheck /> Post
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {!invoices.length && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-muted-foreground h-28 text-center">
                                                No customer invoices yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {section === 'purchases' && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Purchase orders</CardTitle>
                                <CardDescription>Approve the commitment, receive goods into stock, then create the supplier bill.</CardDescription>
                            </div>
                            {permissions.manage && (
                                <Button onClick={() => setOrderOpen(true)} className="bg-amber-600 hover:bg-amber-500">
                                    <Plus /> New purchase order
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order</TableHead>
                                        <TableHead>Supplier</TableHead>
                                        <TableHead>Branch</TableHead>
                                        <TableHead>Expected</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Workflow</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {purchaseOrders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium">
                                                {order.po_no}
                                                <span className="text-muted-foreground block text-xs">{shortDate(order.order_date)}</span>
                                            </TableCell>
                                            <TableCell>
                                                {order.supplier.name}
                                                <span className="text-muted-foreground block text-xs">{order.supplier.supplier_no}</span>
                                            </TableCell>
                                            <TableCell>{order.branch.name}</TableCell>
                                            <TableCell>{order.expected_date ? shortDate(order.expected_date) : '—'}</TableCell>
                                            <TableCell className="text-right font-medium">{money(order.total_amount, order.currency_code)}</TableCell>
                                            <TableCell>
                                                <Badge className={statusTone(order.status)}>{order.status.replace('_', ' ')}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-1">
                                                    {order.status === 'draft' && permissions.post && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                router.post(
                                                                    `/accounting/purchase-orders/${order.id}/approve`,
                                                                    {},
                                                                    { preserveScroll: true },
                                                                )
                                                            }
                                                        >
                                                            <ClipboardCheck /> Approve
                                                        </Button>
                                                    )}
                                                    {['approved', 'part_received'].includes(order.status) && permissions.post && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                router.post(
                                                                    `/accounting/purchase-orders/${order.id}/receive`,
                                                                    {},
                                                                    { preserveScroll: true },
                                                                )
                                                            }
                                                        >
                                                            <PackageCheck /> Receive
                                                        </Button>
                                                    )}
                                                    {['approved', 'part_received', 'received'].includes(order.status) &&
                                                        !order.bills.length &&
                                                        permissions.manage && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() =>
                                                                    router.post(
                                                                        `/accounting/purchase-orders/${order.id}/supplier-bill`,
                                                                        {},
                                                                        { preserveScroll: true },
                                                                    )
                                                                }
                                                            >
                                                                <ReceiptText /> Create bill
                                                            </Button>
                                                        )}
                                                    {order.bills[0] && <Badge variant="outline">{order.bills[0].bill_no}</Badge>}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {!purchaseOrders.length && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-muted-foreground h-28 text-center">
                                                No purchase orders yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {section === 'banking' && (
                    <div className="space-y-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Bank statement workspace</CardTitle>
                                    <CardDescription>
                                        Import CSV bank feeds, auto-match receipts and supplier payments, then post remaining lines.
                                    </CardDescription>
                                </div>
                                {permissions.manage && (
                                    <Button onClick={() => setStatementOpen(true)} className="bg-emerald-600 hover:bg-emerald-500">
                                        <Upload /> Import statement
                                    </Button>
                                )}
                            </CardHeader>
                        </Card>
                        {statements.map((statement) => (
                            <Card key={statement.id}>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-base">
                                            {statement.statement_no} · {statement.bank_account.bank_name}
                                        </CardTitle>
                                        <CardDescription>
                                            {shortDate(statement.from_date)} – {shortDate(statement.to_date)} · {statement.bank_account.account_mask}
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge className={statusTone(statement.status)}>{statement.status.replace('_', ' ')}</Badge>
                                        {permissions.manage && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    router.post(
                                                        `/accounting/bank-statements/${statement.id}/auto-match`,
                                                        {},
                                                        { preserveScroll: true },
                                                    )
                                                }
                                            >
                                                <RefreshCw /> Auto-match
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Reference</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                                <TableHead>Match</TableHead>
                                                <TableHead className="text-right">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {statement.lines.map((line) => (
                                                <TableRow key={line.id}>
                                                    <TableCell>{shortDate(line.transaction_date)}</TableCell>
                                                    <TableCell>{line.reference ?? '—'}</TableCell>
                                                    <TableCell>{line.description}</TableCell>
                                                    <TableCell
                                                        className={`text-right font-medium ${line.amount < 0 ? 'text-red-700' : 'text-emerald-700'}`}
                                                    >
                                                        {money(line.amount, currency)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {line.match_type ? (
                                                            <Badge className="bg-emerald-100 text-emerald-800">Matched</Badge>
                                                        ) : (
                                                            <Badge variant="outline">Unmatched</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {!line.match_type && permissions.post && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    setPostingLine(line);
                                                                    setPostingStatement(statement);
                                                                }}
                                                            >
                                                                <ArrowDownToLine /> Post
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        ))}
                        {!statements.length && (
                            <Card>
                                <CardContent className="text-muted-foreground flex h-40 items-center justify-center text-sm">
                                    No bank statements imported yet.
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>

            <Dialog
                open={invoiceOpen}
                onOpenChange={(open) => {
                    if (!invoiceForm.processing) setInvoiceOpen(open);
                }}
            >
                <DialogContent className="sm:max-w-3xl" onInteractOutside={(event) => event.preventDefault()}>
                    <form onSubmit={submitInvoice}>
                        <DialogHeader>
                            <DialogTitle>Create customer invoice</DialogTitle>
                            <DialogDescription>
                                The draft remains editable until posted. Posting updates receivables, tax, revenue and tracked stock.
                            </DialogDescription>
                        </DialogHeader>
                        <FieldGroup className="grid gap-4 py-5 md:grid-cols-2">
                            <SelectField
                                label="Branch"
                                value={invoiceForm.data.branch_id}
                                onChange={(value) => invoiceForm.setData('branch_id', value)}
                                options={branches}
                            />
                            <SelectField
                                label="Customer account"
                                value={invoiceForm.data.client_account_id}
                                onChange={(value) => invoiceForm.setData('client_account_id', value)}
                                options={accounts.filter((account) => !account.branch_id || String(account.branch_id) === invoiceForm.data.branch_id)}
                            />
                            <TextField
                                label="Invoice date"
                                type="date"
                                value={invoiceForm.data.invoice_date}
                                onChange={(value) => invoiceForm.setData('invoice_date', value)}
                            />
                            <TextField
                                label="Due date"
                                type="date"
                                value={invoiceForm.data.due_date}
                                onChange={(value) => invoiceForm.setData('due_date', value)}
                            />
                            <SelectField
                                label="Product or service"
                                value={invoiceForm.data.catalog_item_id}
                                onChange={(value) => {
                                    const item = catalogItems.find((record) => String(record.id) === value);
                                    invoiceForm.setData((data) => ({
                                        ...data,
                                        catalog_item_id: value,
                                        unit_price: String(item?.default_unit_price ?? 0),
                                    }));
                                }}
                                options={catalogItems.map((item) => ({
                                    value: String(item.id),
                                    label: `${item.code} · ${item.name}${item.track_inventory ? ` · ${item.stock_on_hand} in stock` : ''}`,
                                }))}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <TextField
                                    label="Quantity"
                                    type="number"
                                    value={invoiceForm.data.quantity}
                                    onChange={(value) => invoiceForm.setData('quantity', value)}
                                />
                                <TextField
                                    label="Unit price"
                                    type="number"
                                    value={invoiceForm.data.unit_price}
                                    onChange={(value) => invoiceForm.setData('unit_price', value)}
                                />
                            </div>
                            {selectedInvoiceItem && (
                                <div className="flex items-center justify-between gap-3 rounded-lg border bg-slate-50 p-3 text-sm md:col-span-2">
                                    <span>
                                        <strong>{selectedInvoiceItem.name}</strong> · {selectedInvoiceItem.tax_rate}% tax{' '}
                                        {selectedInvoiceItem.track_inventory && <span>· {selectedInvoiceItem.stock_on_hand} available</span>}
                                    </span>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            setInvoiceLines((lines) => [
                                                ...lines,
                                                {
                                                    catalog_item_id: invoiceForm.data.catalog_item_id,
                                                    quantity: invoiceForm.data.quantity,
                                                    unit_price: invoiceForm.data.unit_price,
                                                },
                                            ]);
                                            invoiceForm.setData((data) => ({ ...data, catalog_item_id: '', quantity: '1', unit_price: '0' }));
                                        }}
                                    >
                                        <Plus /> Add line
                                    </Button>
                                </div>
                            )}
                            {invoiceLines.length > 0 && (
                                <div className="space-y-2 rounded-lg border p-3 md:col-span-2">
                                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Invoice lines</p>
                                    {invoiceLines.map((line, index) => {
                                        const item = catalogItems.find((record) => String(record.id) === line.catalog_item_id);
                                        return (
                                            <div key={`${line.catalog_item_id}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                                                <span>
                                                    {item?.code} · {item?.name} <span className="text-muted-foreground">× {line.quantity}</span>
                                                </span>
                                                <span className="flex items-center gap-2">
                                                    <strong>{money(Number(line.quantity) * Number(line.unit_price), currency)}</strong>
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() =>
                                                            setInvoiceLines((lines) => lines.filter((_, lineIndex) => lineIndex !== index))
                                                        }
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <Field className="md:col-span-2">
                                <FieldLabel>Description</FieldLabel>
                                <Textarea
                                    value={invoiceForm.data.description}
                                    onChange={(event) => invoiceForm.setData('description', event.target.value)}
                                />
                            </Field>
                            <FieldError className="md:col-span-2" errors={Object.values(invoiceForm.errors).map((message) => ({ message }))} />
                        </FieldGroup>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setInvoiceOpen(false)}>
                                Cancel
                            </Button>
                            <Button disabled={invoiceForm.processing || pendingInvoiceLines.length === 0}>Save draft invoice</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={orderOpen}
                onOpenChange={(open) => {
                    if (!orderForm.processing) setOrderOpen(open);
                }}
            >
                <DialogContent className="sm:max-w-3xl" onInteractOutside={(event) => event.preventDefault()}>
                    <form onSubmit={submitOrder}>
                        <DialogHeader>
                            <DialogTitle>Create purchase order</DialogTitle>
                            <DialogDescription>
                                Capture the purchasing commitment now, receive the goods later, and generate the supplier bill from the approved
                                order.
                            </DialogDescription>
                        </DialogHeader>
                        <FieldGroup className="grid gap-4 py-5 md:grid-cols-2">
                            <SelectField
                                label="Branch"
                                value={orderForm.data.branch_id}
                                onChange={(value) => orderForm.setData('branch_id', value)}
                                options={branches}
                            />
                            <SelectField
                                label="Supplier"
                                value={orderForm.data.supplier_id}
                                onChange={(value) => orderForm.setData('supplier_id', value)}
                                options={suppliers.map((supplier) => ({
                                    value: String(supplier.id),
                                    label: `${supplier.supplier_no} · ${supplier.name}`,
                                }))}
                            />
                            <TextField
                                label="Order date"
                                type="date"
                                value={orderForm.data.order_date}
                                onChange={(value) => orderForm.setData('order_date', value)}
                            />
                            <TextField
                                label="Expected date"
                                type="date"
                                value={orderForm.data.expected_date}
                                onChange={(value) => orderForm.setData('expected_date', value)}
                            />
                            <SelectField
                                label="Product or service"
                                value={orderForm.data.catalog_item_id}
                                onChange={(value) => {
                                    const item = catalogItems.find((record) => String(record.id) === value);
                                    orderForm.setData((data) => ({
                                        ...data,
                                        catalog_item_id: value,
                                        unit_price: String(item?.default_cost || item?.default_unit_price || 0),
                                    }));
                                }}
                                options={catalogItems.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.name}` }))}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <TextField
                                    label="Quantity"
                                    type="number"
                                    value={orderForm.data.ordered_quantity}
                                    onChange={(value) => orderForm.setData('ordered_quantity', value)}
                                />
                                <TextField
                                    label="Unit cost"
                                    type="number"
                                    value={orderForm.data.unit_price}
                                    onChange={(value) => orderForm.setData('unit_price', value)}
                                />
                            </div>
                            {selectedOrderItem && (
                                <div className="flex items-center justify-between gap-3 rounded-lg border bg-amber-50 p-3 text-sm md:col-span-2">
                                    <span>
                                        <strong>{selectedOrderItem.name}</strong> ·{' '}
                                        {selectedOrderItem.track_inventory ? 'Receipt will increase stock.' : 'Service will post to expenses.'}
                                    </span>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            setOrderLines((lines) => [
                                                ...lines,
                                                {
                                                    catalog_item_id: orderForm.data.catalog_item_id,
                                                    ordered_quantity: orderForm.data.ordered_quantity,
                                                    unit_price: orderForm.data.unit_price,
                                                },
                                            ]);
                                            orderForm.setData((data) => ({ ...data, catalog_item_id: '', ordered_quantity: '1', unit_price: '0' }));
                                        }}
                                    >
                                        <Plus /> Add line
                                    </Button>
                                </div>
                            )}
                            {orderLines.length > 0 && (
                                <div className="space-y-2 rounded-lg border p-3 md:col-span-2">
                                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Purchase order lines</p>
                                    {orderLines.map((line, index) => {
                                        const item = catalogItems.find((record) => String(record.id) === line.catalog_item_id);
                                        return (
                                            <div key={`${line.catalog_item_id}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                                                <span>
                                                    {item?.code} · {item?.name}{' '}
                                                    <span className="text-muted-foreground">× {line.ordered_quantity}</span>
                                                </span>
                                                <span className="flex items-center gap-2">
                                                    <strong>{money(Number(line.ordered_quantity) * Number(line.unit_price), currency)}</strong>
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => setOrderLines((lines) => lines.filter((_, lineIndex) => lineIndex !== index))}
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <Field className="md:col-span-2">
                                <FieldLabel>Notes</FieldLabel>
                                <Textarea value={orderForm.data.notes} onChange={(event) => orderForm.setData('notes', event.target.value)} />
                            </Field>
                            <FieldError className="md:col-span-2" errors={Object.values(orderForm.errors).map((message) => ({ message }))} />
                        </FieldGroup>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOrderOpen(false)}>
                                Cancel
                            </Button>
                            <Button disabled={orderForm.processing || pendingOrderLines.length === 0}>Save purchase order</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={statementOpen}
                onOpenChange={(open) => {
                    if (!statementForm.processing) setStatementOpen(open);
                }}
            >
                <DialogContent className="sm:max-w-2xl" onInteractOutside={(event) => event.preventDefault()}>
                    <form onSubmit={submitStatement}>
                        <DialogHeader>
                            <DialogTitle>Import bank statement</DialogTitle>
                            <DialogDescription>
                                Upload a CSV with date, description and amount headers. Reference and balance are optional. Positive amounts are
                                receipts; negative amounts are payments.
                            </DialogDescription>
                        </DialogHeader>
                        <FieldGroup className="grid gap-4 py-5 md:grid-cols-2">
                            <SelectField
                                label="Bank account"
                                value={statementForm.data.bank_account_id}
                                onChange={(value) => statementForm.setData('bank_account_id', value)}
                                options={bankAccounts}
                            />
                            <TextField
                                label="Statement number"
                                value={statementForm.data.statement_no}
                                onChange={(value) => statementForm.setData('statement_no', value)}
                            />
                            <TextField
                                label="From"
                                type="date"
                                value={statementForm.data.from_date}
                                onChange={(value) => statementForm.setData('from_date', value)}
                            />
                            <TextField
                                label="To"
                                type="date"
                                value={statementForm.data.to_date}
                                onChange={(value) => statementForm.setData('to_date', value)}
                            />
                            <Field className="md:col-span-2">
                                <FieldLabel>CSV statement</FieldLabel>
                                <Input
                                    type="file"
                                    accept=".csv,text/csv"
                                    onChange={(event) => statementForm.setData('statement', event.target.files?.[0] ?? null)}
                                />
                            </Field>
                            <FieldError className="md:col-span-2" errors={Object.values(statementForm.errors).map((message) => ({ message }))} />
                        </FieldGroup>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setStatementOpen(false)}>
                                Cancel
                            </Button>
                            <Button disabled={statementForm.processing}>
                                <Upload /> Import transactions
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={Boolean(postingLine)}
                onOpenChange={(open) => {
                    if (!open && !postForm.processing) setPostingLine(null);
                }}
            >
                <DialogContent onInteractOutside={(event) => event.preventDefault()}>
                    <form onSubmit={submitBankLine}>
                        <DialogHeader>
                            <DialogTitle>Post unmatched bank transaction</DialogTitle>
                            <DialogDescription>
                                This creates a balanced journal between the bank control account and your selected counter-account.
                            </DialogDescription>
                        </DialogHeader>
                        {postingLine && (
                            <div className="my-5 rounded-lg border bg-slate-50 p-4">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">{postingLine.description}</span>
                                    <strong className={postingLine.amount < 0 ? 'text-red-700' : 'text-emerald-700'}>
                                        {money(postingLine.amount, currency)}
                                    </strong>
                                </div>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {postingStatement?.statement_no} · {shortDate(postingLine.transaction_date)}
                                </p>
                            </div>
                        )}
                        <SelectField
                            label="Counter-account"
                            value={postForm.data.counter_account_id}
                            onChange={(value) => postForm.setData('counter_account_id', value)}
                            options={ledgerAccounts.filter((account) => !account.label.startsWith('1000'))}
                        />
                        <FieldError className="mt-3" errors={Object.values(postForm.errors).map((message) => ({ message }))} />
                        <DialogFooter className="mt-5">
                            <Button type="button" variant="outline" onClick={() => setPostingLine(null)}>
                                Cancel
                            </Button>
                            <Button disabled={postForm.processing}>
                                <ArrowDownToLine /> Post journal
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Option[] }) {
    return (
        <Field>
            <FieldLabel>{label}</FieldLabel>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger>
                    <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </Field>
    );
}
function TextField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
    return (
        <Field>
            <FieldLabel>{label}</FieldLabel>
            <Input
                type={type}
                value={value}
                step={type === 'number' ? '0.0001' : undefined}
                min={type === 'number' ? '0' : undefined}
                onChange={(event) => onChange(event.target.value)}
            />
        </Field>
    );
}
