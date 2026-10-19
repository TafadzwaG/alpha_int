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
import type { RequestPayload } from '@inertiajs/core';
import { Head, router, useForm } from '@inertiajs/react';
import {
    ArchiveRestore,
    BadgeCheck,
    Boxes,
    Calculator,
    CheckCheck,
    ClipboardCheck,
    FileChartColumnIncreasing,
    FilePlus2,
    Landmark,
    Layers3,
    Paperclip,
    Play,
    ReceiptText,
    RefreshCw,
    Scale,
    Send,
    ShieldCheck,
    Upload,
    type LucideIcon,
} from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

type Option = { value: string; label: string; currency?: string };
type Account = { id: number; code: string; name: string; type: string; system_key?: string | null };
type Dimension = { id: number; kind: string; code: string; name: string; active: boolean };
type SalesDocument = {
    id: number;
    document_no: string;
    document_type: string;
    document_date: string;
    total_amount: number;
    currency_code: string;
    status: string;
    created_by: number;
    account?: { client_file?: { client?: { first_name: string; last_name: string; client_no: string } } };
};
type Reconciliation = {
    id: number;
    reference: string;
    from_date: string;
    to_date: string;
    difference: number;
    status: string;
    items: Array<{
        id: number;
        status: string;
        resolution_note?: string | null;
        statement_line?: { transaction_date: string; reference?: string; description: string; amount: number; balance?: number };
        journal?: { journal_no: string; reference?: string };
    }>;
    bank_account?: { bank_name: string; account_mask: string };
};
type InventoryControl = {
    id: number;
    control_no: string;
    control_type: string;
    control_date: string;
    status: string;
    reason: string;
    branch?: { name: string };
    lines: Array<{ item?: { code: string; name: string }; quantity_delta: number; value_delta: number }>;
};
type VatReturn = {
    id: number;
    from_date: string;
    to_date: string;
    version: number;
    output_tax: number;
    input_tax: number;
    net_tax: number;
    variance: number;
    currency_code: string;
    status: string;
};
type CloseTask = { id: number; task_key: string; label: string; status: string; evidence?: string | null };
type CloseRun = {
    id: number;
    close_type: string;
    reference: string;
    status: string;
    period?: { name: string };
    fiscal_year?: { name: string };
    tasks: CloseTask[];
};
type Budget = {
    id: number;
    period_number: number;
    amount: number;
    warning_threshold: number;
    require_approval: boolean;
    account?: Account;
    dimension?: Dimension;
    fiscal_year?: { id: number; name: string };
};
type InventoryItem = Option & {
    stock_on_hand: number;
    committed_quantity: number;
    available_quantity: number;
    on_order_quantity: number;
    average_cost: number;
    reorder_level: number;
    valuation: number;
};
type Props = {
    summary: Record<string, number>;
    salesDocuments: SalesDocument[];
    bankReconciliations: Reconciliation[];
    bankRules: Array<{ id: number; name: string; pattern: string; match_operator: string; active: boolean; counter_account?: Account }>;
    inventoryControls: InventoryControl[];
    vatReturns: VatReturn[];
    closes: CloseRun[];
    dimensions: Dimension[];
    budgets: Budget[];
    approvalLimits: Array<{
        id: number;
        role_name?: string;
        transaction_type: string;
        minimum_amount: number;
        maximum_amount?: number;
        active: boolean;
    }>;
    options: {
        branches: Option[];
        accounts: Account[];
        clientAccounts: Option[];
        catalogItems: Array<{ id: number; code: string; name: string; default_unit_price: number; average_cost: number }>;
        inventoryItems: InventoryItem[];
        banks: Option[];
        statements: Array<Option & { bank_account_id: string }>;
        fiscalYears: Array<{ id: number; name: string; status: string }>;
        periods: Array<{ id: number; name: string; status: string; fiscal_year?: { name: string } }>;
        dimensions: Dimension[];
        currency: string;
    };
    permissions: { manage: boolean; post: boolean };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '/accounting' },
    { title: 'Control centre', href: '/accounting/control-centre' },
];
const sections = [
    ['sales', 'Sales lifecycle', ReceiptText],
    ['bank', 'Bank reconciliation', Landmark],
    ['inventory', 'Inventory controls', Boxes],
    ['vat', 'VAT returns', Calculator],
    ['close', 'Period close', ClipboardCheck],
    ['reports', 'Financial reporting', FileChartColumnIncreasing],
    ['budget', 'Budgets & dimensions', Layers3],
    ['governance', 'Governance', ShieldCheck],
] as const;
const money = (value: number, currency = 'USD') => new Intl.NumberFormat('en-ZW', { style: 'currency', currency }).format(Number(value || 0));
const label = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
const badgeClass = (status: string) =>
    status === 'posted' || status === 'submitted' || status === 'signed_off' || status === 'closed'
        ? 'bg-emerald-100 text-emerald-800'
        : status === 'approved' || status === 'reviewed'
          ? 'bg-blue-100 text-blue-800'
          : status === 'reopened' || status === 'exception'
            ? 'bg-rose-100 text-rose-800'
            : 'bg-amber-100 text-amber-800';

export default function AccountingControlCentre(props: Props) {
    const { options, permissions } = props;
    const [section, setSection] = useState<(typeof sections)[number][0]>('sales');
    const [evidenceTask, setEvidenceTask] = useState<{ close: CloseRun; task: CloseTask } | null>(null);
    const [attachmentTarget, setAttachmentTarget] = useState<{ type: string; id: number; label: string } | null>(null);
    const sales = useForm({
        branch_id: options.branches[0]?.value ?? '',
        client_account_id: options.clientAccounts[0]?.value ?? '',
        accounting_dimension_id: '',
        document_type: 'quotation',
        document_date: new Date().toISOString().slice(0, 10),
        due_date: '',
        currency_code: options.currency,
        document_discount_rate: '0',
        description: '',
        is_recurring: false,
        recurrence_pattern: 'monthly',
        next_run_on: '',
        lines: [
            {
                catalog_item_id: options.catalogItems[0]?.id ? String(options.catalogItems[0].id) : '',
                description: '',
                quantity: '1',
                unit_price: options.catalogItems[0]?.default_unit_price ? String(options.catalogItems[0].default_unit_price) : '0',
                discount_rate: '0',
            },
        ],
    });
    const reconciliation = useForm({
        bank_account_id: options.banks[0]?.value ?? '',
        bank_statement_import_id: '',
        reference: '',
        from_date: '',
        to_date: '',
        opening_statement_balance: '0',
        closing_statement_balance: '0',
    });
    const bankRule = useForm({
        bank_account_id: '',
        name: '',
        match_operator: 'contains',
        pattern: '',
        counter_account_id: '',
        accounting_dimension_id: '',
        priority: '100',
        active: true,
    });
    const stock = useForm({
        branch_id: options.branches[0]?.value ?? '',
        control_type: 'stock_count',
        control_date: new Date().toISOString().slice(0, 10),
        reason: '',
        lines: [
            {
                catalog_item_id: options.inventoryItems[0]?.value ?? '',
                counted_quantity: String(options.inventoryItems[0]?.stock_on_hand ?? 0),
                unit_cost: String(options.inventoryItems[0]?.average_cost ?? 0),
                counter_account_id: options.accounts.find((account) => account.system_key === 'cost_of_sales')?.id
                    ? String(options.accounts.find((account) => account.system_key === 'cost_of_sales')?.id)
                    : '',
                note: '',
            },
        ],
    });
    const vat = useForm({
        from_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
        to_date: new Date().toISOString().slice(0, 10),
        currency_code: options.currency,
        amendment_reason: '',
    });
    const close = useForm({ close_type: 'month', reference: '', accounting_period_id: '', fiscal_year_id: '' });
    const dimension = useForm({ kind: 'department', code: '', name: '', active: true });
    const budget = useForm({
        fiscal_year_id: options.fiscalYears[0]?.id ? String(options.fiscalYears[0].id) : '',
        accounting_dimension_id: '',
        gl_account_id: '',
        period_number: '1',
        amount: '0',
        warning_threshold: '100',
        require_approval: false,
    });
    const approval = useForm({ role_name: 'Accounts Officer', transaction_type: 'invoice', minimum_amount: '0', maximum_amount: '', active: true });
    const evidence = useForm({ task_key: '', evidence: '' });
    const attachment = useForm<{ subject_type: string; subject_id: string; file: File | null }>({ subject_type: '', subject_id: '', file: null });
    const reportLinks = [
        ['Cash flow statement', 'cash-flow'],
        ['Comparative income statement', 'comparative-income'],
        ['Monthly performance', 'monthly-performance'],
        ['Budget versus actual', 'budget-variance'],
        ['Control account reconciliation', 'control-reconciliation'],
    ];
    const selectedStockItem = useMemo(
        () => options.inventoryItems.find((item) => item.value === stock.data.lines[0].catalog_item_id),
        [options.inventoryItems, stock.data.lines],
    );
    const post = (url: string, data: RequestPayload = {}) => router.post(url, data, { preserveScroll: true });
    const patch = (url: string, data: RequestPayload) => router.patch(url, data, { preserveScroll: true });
    const submit = (
        event: FormEvent,
        form: {
            post: (url: string, options: { preserveScroll: boolean; onSuccess: () => void }) => void;
            reset: () => void;
        },
        url: string,
    ) => {
        event.preventDefault();
        form.post(url, { preserveScroll: true, onSuccess: () => form.reset() });
    };
    const addSalesLine = () =>
        sales.setData('lines', [
            ...sales.data.lines,
            {
                catalog_item_id: options.catalogItems[0]?.id ? String(options.catalogItems[0].id) : '',
                description: '',
                quantity: '1',
                unit_price: '0',
                discount_rate: '0',
            },
        ]);
    const setSalesItem = (index: number, value: string) => {
        const item = options.catalogItems.find((candidate) => String(candidate.id) === value);
        sales.setData(
            'lines',
            sales.data.lines.map((line, lineIndex) =>
                lineIndex === index
                    ? { ...line, catalog_item_id: value, unit_price: String(item?.default_unit_price ?? 0), description: item?.name ?? '' }
                    : line,
            ),
        );
    };
    const openEvidence = (run: CloseRun, task: CloseTask) => {
        evidence.setData({ task_key: task.task_key, evidence: '' });
        setEvidenceTask({ close: run, task });
    };
    const openAttachment = (type: string, id: number, targetLabel: string) => {
        attachment.setData({ subject_type: type, subject_id: String(id), file: null });
        setAttachmentTarget({ type, id, label: targetLabel });
    };
    const summaryCards: Array<[string, number, LucideIcon]> = [
        ['Draft documents', props.summary.draft_documents, FilePlus2],
        ['Awaiting approval', props.summary.documents_awaiting_approval, BadgeCheck],
        ['Open bank recs', props.summary.open_reconciliations, Landmark],
        ['Reorder alerts', props.summary.stock_exceptions, Boxes],
        ['Draft VAT returns', props.summary.draft_vat_returns, Calculator],
        ['Open closes', props.summary.open_closes, ClipboardCheck],
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Accounting control centre" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <div>
                    <Badge variant="secondary" className="mb-2">
                        <ShieldCheck className="mr-1 size-3" /> Controlled accounting
                    </Badge>
                    <h1 className="text-2xl font-semibold tracking-tight">Accounting control centre</h1>
                    <p className="text-muted-foreground mt-1">
                        Pastel-style source documents, reconciliations, stock controls, statutory returns, close workflows and governance.
                    </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                    {summaryCards.map(([title, value, Icon]) => (
                        <Card key={String(title)}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardDescription>{String(title)}</CardDescription>
                                <Icon className="text-muted-foreground size-4" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-semibold">{Number(value)}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="bg-muted/30 flex max-w-full gap-2 overflow-x-auto rounded-lg border p-2">
                    {sections.map(([value, title, Icon]) => (
                        <Button key={value} size="sm" variant={section === value ? 'default' : 'ghost'} onClick={() => setSection(value)}>
                            <Icon data-icon="inline-start" />
                            {title}
                        </Button>
                    ))}
                </div>

                {section === 'sales' && (
                    <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
                        <Card>
                            <CardHeader>
                                <CardTitle>Create sales document</CardTitle>
                                <CardDescription>Start with a quotation or create any controlled sales document directly.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={(event) => submit(event, sales, '/accounting/sales-documents')} className="space-y-4">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <SelectField
                                            label="Document type"
                                            value={sales.data.document_type}
                                            onChange={(value) => sales.setData('document_type', value)}
                                            options={[
                                                'quotation',
                                                'sales_order',
                                                'delivery_note',
                                                'invoice',
                                                'credit_note',
                                                'debit_note',
                                                'sales_return',
                                                'refund',
                                            ].map((value) => ({ value, label: label(value) }))}
                                        />
                                        <SelectField
                                            label="Branch"
                                            value={sales.data.branch_id}
                                            onChange={(value) => sales.setData('branch_id', value)}
                                            options={options.branches}
                                        />
                                    </div>
                                    <SelectField
                                        label="Customer account"
                                        value={sales.data.client_account_id}
                                        onChange={(value) => sales.setData('client_account_id', value)}
                                        options={options.clientAccounts}
                                    />
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <InputField
                                            label="Document date"
                                            type="date"
                                            value={sales.data.document_date}
                                            onChange={(value) => sales.setData('document_date', value)}
                                        />
                                        <InputField
                                            label="Due date"
                                            type="date"
                                            value={sales.data.due_date}
                                            onChange={(value) => sales.setData('due_date', value)}
                                        />
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <SelectField
                                            label="Dimension"
                                            value={sales.data.accounting_dimension_id || 'none'}
                                            onChange={(value) => sales.setData('accounting_dimension_id', value === 'none' ? '' : value)}
                                            options={[
                                                { value: 'none', label: 'No dimension' },
                                                ...options.dimensions.map((item) => ({
                                                    value: String(item.id),
                                                    label: `${label(item.kind)} · ${item.code}`,
                                                })),
                                            ]}
                                        />
                                        <InputField
                                            label="Document discount %"
                                            type="number"
                                            value={sales.data.document_discount_rate}
                                            onChange={(value) => sales.setData('document_discount_rate', value)}
                                        />
                                    </div>
                                    <div className="space-y-3 rounded-lg border p-3">
                                        <div className="flex items-center justify-between">
                                            <p className="font-medium">Lines</p>
                                            <Button type="button" size="sm" variant="outline" onClick={addSalesLine}>
                                                Add line
                                            </Button>
                                        </div>
                                        {sales.data.lines.map((line, index) => (
                                            <div key={index} className="bg-muted/40 grid gap-2 rounded-md p-2 sm:grid-cols-2">
                                                <SelectField
                                                    label="Item"
                                                    value={line.catalog_item_id}
                                                    onChange={(value) => setSalesItem(index, value)}
                                                    options={options.catalogItems.map((item) => ({
                                                        value: String(item.id),
                                                        label: `${item.code} · ${item.name}`,
                                                    }))}
                                                />
                                                <InputField
                                                    label="Quantity"
                                                    type="number"
                                                    value={line.quantity}
                                                    onChange={(value) =>
                                                        sales.setData(
                                                            'lines',
                                                            sales.data.lines.map((item, itemIndex) =>
                                                                itemIndex === index ? { ...item, quantity: value } : item,
                                                            ),
                                                        )
                                                    }
                                                />
                                                <InputField
                                                    label="Unit price"
                                                    type="number"
                                                    value={line.unit_price}
                                                    onChange={(value) =>
                                                        sales.setData(
                                                            'lines',
                                                            sales.data.lines.map((item, itemIndex) =>
                                                                itemIndex === index ? { ...item, unit_price: value } : item,
                                                            ),
                                                        )
                                                    }
                                                />
                                                <InputField
                                                    label="Line discount %"
                                                    type="number"
                                                    value={line.discount_rate}
                                                    onChange={(value) =>
                                                        sales.setData(
                                                            'lines',
                                                            sales.data.lines.map((item, itemIndex) =>
                                                                itemIndex === index ? { ...item, discount_rate: value } : item,
                                                            ),
                                                        )
                                                    }
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <Field>
                                        <FieldLabel>Description</FieldLabel>
                                        <Textarea
                                            value={sales.data.description}
                                            onChange={(event) => sales.setData('description', event.target.value)}
                                        />
                                    </Field>
                                    <Button className="w-full" disabled={!permissions.manage || sales.processing}>
                                        <FilePlus2 data-icon="inline-start" />
                                        Save controlled draft
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                        <RegisterCard
                            title="Sales document register"
                            description="Every document follows draft, independent approval and immutable posting."
                        >
                            <Table pagination={false}>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Document</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Total</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {props.salesDocuments.map((document) => (
                                        <TableRow key={document.id}>
                                            <TableCell>
                                                <p className="font-medium">{document.document_no}</p>
                                                <p className="text-muted-foreground text-xs">
                                                    {label(document.document_type)} · {document.document_date}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                {document.account?.client_file?.client
                                                    ? `${document.account.client_file.client.first_name} ${document.account.client_file.client.last_name}`
                                                    : '—'}
                                            </TableCell>
                                            <TableCell>{money(document.total_amount, document.currency_code)}</TableCell>
                                            <TableCell>
                                                <Badge className={badgeClass(document.status)}>{label(document.status)}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-1">
                                                    {document.status === 'draft' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => post(`/accounting/sales-documents/${document.id}/submit`)}
                                                        >
                                                            <Send />
                                                            Submit
                                                        </Button>
                                                    )}
                                                    {document.status === 'submitted' && (
                                                        <Button size="sm" onClick={() => post(`/accounting/sales-documents/${document.id}/approve`)}>
                                                            <BadgeCheck />
                                                            Approve
                                                        </Button>
                                                    )}
                                                    {document.status === 'approved' && (
                                                        <Button
                                                            size="sm"
                                                            variant="default"
                                                            onClick={() => post(`/accounting/sales-documents/${document.id}/post`)}
                                                        >
                                                            <Play />
                                                            Post
                                                        </Button>
                                                    )}
                                                    {['approved', 'posted'].includes(document.status) && document.document_type === 'quotation' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                post(`/accounting/sales-documents/${document.id}/convert`, {
                                                                    target_type: 'sales_order',
                                                                })
                                                            }
                                                        >
                                                            To order
                                                        </Button>
                                                    )}
                                                    {['approved', 'posted'].includes(document.status) &&
                                                        ['sales_order', 'delivery_note'].includes(document.document_type) && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() =>
                                                                    post(`/accounting/sales-documents/${document.id}/convert`, {
                                                                        target_type:
                                                                            document.document_type === 'sales_order' ? 'delivery_note' : 'invoice',
                                                                    })
                                                                }
                                                            >
                                                                Convert
                                                            </Button>
                                                        )}
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => openAttachment('sales-document', document.id, document.document_no)}
                                                    >
                                                        <Paperclip />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </RegisterCard>
                    </div>
                )}

                {section === 'bank' && (
                    <div className="grid gap-5 xl:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Open reconciliation</CardTitle>
                                <CardDescription>Bring statement and ledger balances to zero difference before sign-off.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form
                                    onSubmit={(event) => submit(event, reconciliation, '/accounting/bank-reconciliations')}
                                    className="grid gap-3 sm:grid-cols-2"
                                >
                                    <SelectField
                                        label="Bank account"
                                        value={reconciliation.data.bank_account_id}
                                        onChange={(value) => reconciliation.setData('bank_account_id', value)}
                                        options={options.banks}
                                    />
                                    <SelectField
                                        label="Imported statement"
                                        value={reconciliation.data.bank_statement_import_id || 'none'}
                                        onChange={(value) => reconciliation.setData('bank_statement_import_id', value === 'none' ? '' : value)}
                                        options={[
                                            { value: 'none', label: 'No import selected' },
                                            ...options.statements.filter(
                                                (item) =>
                                                    !reconciliation.data.bank_account_id ||
                                                    item.bank_account_id === reconciliation.data.bank_account_id,
                                            ),
                                        ]}
                                    />
                                    <InputField
                                        label="Reference"
                                        value={reconciliation.data.reference}
                                        onChange={(value) => reconciliation.setData('reference', value)}
                                    />
                                    <InputField
                                        label="From"
                                        type="date"
                                        value={reconciliation.data.from_date}
                                        onChange={(value) => reconciliation.setData('from_date', value)}
                                    />
                                    <InputField
                                        label="To"
                                        type="date"
                                        value={reconciliation.data.to_date}
                                        onChange={(value) => reconciliation.setData('to_date', value)}
                                    />
                                    <InputField
                                        label="Opening statement balance"
                                        type="number"
                                        value={reconciliation.data.opening_statement_balance}
                                        onChange={(value) => reconciliation.setData('opening_statement_balance', value)}
                                    />
                                    <InputField
                                        label="Closing statement balance"
                                        type="number"
                                        value={reconciliation.data.closing_statement_balance}
                                        onChange={(value) => reconciliation.setData('closing_statement_balance', value)}
                                    />
                                    <Button className="sm:col-span-2" disabled={reconciliation.processing}>
                                        <Landmark data-icon="inline-start" />
                                        Open reconciliation
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Reusable bank rule</CardTitle>
                                <CardDescription>Automatically code recurring statement descriptions.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={(event) => submit(event, bankRule, '/accounting/bank-rules')} className="grid gap-3 sm:grid-cols-2">
                                    <InputField label="Rule name" value={bankRule.data.name} onChange={(value) => bankRule.setData('name', value)} />
                                    <InputField
                                        label="Statement pattern"
                                        value={bankRule.data.pattern}
                                        onChange={(value) => bankRule.setData('pattern', value)}
                                    />
                                    <SelectField
                                        label="Match"
                                        value={bankRule.data.match_operator}
                                        onChange={(value) => bankRule.setData('match_operator', value)}
                                        options={['contains', 'equals', 'starts_with', 'ends_with'].map((value) => ({ value, label: label(value) }))}
                                    />
                                    <SelectField
                                        label="Counter account"
                                        value={bankRule.data.counter_account_id}
                                        onChange={(value) => bankRule.setData('counter_account_id', value)}
                                        options={options.accounts.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.name}` }))}
                                    />
                                    <Button className="sm:col-span-2" disabled={bankRule.processing}>
                                        <RefreshCw data-icon="inline-start" />
                                        Save bank rule
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                        <div className="xl:col-span-2">
                            <RegisterCard title="Bank reconciliation register" description="Signed-off reconciliations are read-only audit evidence.">
                                <Table pagination={false}>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Reference</TableHead>
                                            <TableHead>Bank</TableHead>
                                            <TableHead>Lines</TableHead>
                                            <TableHead>Difference</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {props.bankReconciliations.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <p className="font-medium">{item.reference}</p>
                                                    <p className="text-muted-foreground text-xs">
                                                        {item.from_date} – {item.to_date}
                                                    </p>
                                                </TableCell>
                                                <TableCell>
                                                    {item.bank_account?.bank_name} · {item.bank_account?.account_mask}
                                                </TableCell>
                                                <TableCell>
                                                    {item.items.filter((line) => line.status !== 'unmatched').length}/{item.items.length} resolved
                                                </TableCell>
                                                <TableCell
                                                    className={
                                                        Math.abs(Number(item.difference)) > 0.01
                                                            ? 'font-semibold text-rose-600'
                                                            : 'font-semibold text-emerald-700'
                                                    }
                                                >
                                                    {money(item.difference, options.currency)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={badgeClass(item.status)}>{label(item.status)}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex justify-end gap-1">
                                                        {!['reviewed', 'signed_off'].includes(item.status) && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => post(`/accounting/bank-reconciliations/${item.id}/rules`)}
                                                            >
                                                                <RefreshCw />
                                                                Rules
                                                            </Button>
                                                        )}
                                                        {item.status === 'draft' && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => post(`/accounting/bank-reconciliations/${item.id}/review`)}
                                                            >
                                                                <CheckCheck />
                                                                Review
                                                            </Button>
                                                        )}
                                                        {item.status === 'reviewed' && (
                                                            <Button
                                                                size="sm"
                                                                variant="default"
                                                                onClick={() => post(`/accounting/bank-reconciliations/${item.id}/approve`)}
                                                            >
                                                                <BadgeCheck />
                                                                Sign off
                                                            </Button>
                                                        )}
                                                        <Button size="sm" variant="outline" asChild>
                                                            <a href={`/accounting/bank-reconciliations/${item.id}/export/pdf`}>PDF</a>
                                                        </Button>
                                                        <Button size="sm" variant="outline" asChild>
                                                            <a href={`/accounting/bank-reconciliations/${item.id}/export/excel`}>Excel</a>
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => openAttachment('bank-reconciliation', item.id, item.reference)}
                                                        >
                                                            <Paperclip />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </RegisterCard>
                            <div className="mt-4 space-y-4">
                                {props.bankReconciliations
                                    .filter((reconciliationItem) => reconciliationItem.items.length > 0)
                                    .map((reconciliationItem) => (
                                        <Card key={`workspace-${reconciliationItem.id}`}>
                                            <CardHeader>
                                                <CardTitle className="text-base">{reconciliationItem.reference} matching workspace</CardTitle>
                                                <CardDescription>
                                                    Review imported statement lines, keep genuine exceptions, or link them to a ledger journal.
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="overflow-x-auto rounded-md border">
                                                    <Table pagination={false}>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Date</TableHead>
                                                                <TableHead>Description</TableHead>
                                                                <TableHead className="text-right">Amount</TableHead>
                                                                <TableHead>Ledger match</TableHead>
                                                                <TableHead>Status</TableHead>
                                                                <TableHead className="text-right">Resolve</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {reconciliationItem.items.map((line) => (
                                                                <TableRow key={line.id}>
                                                                    <TableCell>{line.statement_line?.transaction_date ?? '—'}</TableCell>
                                                                    <TableCell>
                                                                        <p className="font-medium">
                                                                            {line.statement_line?.description ?? 'Statement line'}
                                                                        </p>
                                                                        <p className="text-muted-foreground text-xs">
                                                                            {line.statement_line?.reference ?? line.resolution_note ?? '—'}
                                                                        </p>
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        {money(line.statement_line?.amount ?? 0, options.currency)}
                                                                    </TableCell>
                                                                    <TableCell>{line.journal?.journal_no ?? 'Not linked'}</TableCell>
                                                                    <TableCell>
                                                                        <Badge className={badgeClass(line.status)}>{label(line.status)}</Badge>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {line.status === 'unmatched' &&
                                                                        !['reviewed', 'signed_off'].includes(reconciliationItem.status) ? (
                                                                            <div className="flex justify-end gap-1">
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    onClick={() => {
                                                                                        const journalId =
                                                                                            window.prompt('Optional ledger journal ID to link');
                                                                                        const note = window.prompt('Matching evidence / note');
                                                                                        if (note)
                                                                                            patch(
                                                                                                `/accounting/bank-reconciliation-items/${line.id}`,
                                                                                                {
                                                                                                    status: 'matched',
                                                                                                    journal_entry_id: journalId || null,
                                                                                                    resolution_note: note,
                                                                                                },
                                                                                            );
                                                                                    }}
                                                                                >
                                                                                    Match
                                                                                </Button>
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="destructive"
                                                                                    onClick={() => {
                                                                                        const note = window.prompt(
                                                                                            'Explain why this is a valid exception',
                                                                                        );
                                                                                        if (note)
                                                                                            patch(
                                                                                                `/accounting/bank-reconciliation-items/${line.id}`,
                                                                                                { status: 'exception', resolution_note: note },
                                                                                            );
                                                                                    }}
                                                                                >
                                                                                    Exception
                                                                                </Button>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-muted-foreground text-xs">
                                                                                {line.resolution_note ?? 'Resolved'}
                                                                            </span>
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                            </div>
                        </div>
                    </div>
                )}

                {section === 'inventory' && (
                    <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
                        <div className="xl:col-span-2">
                            <RegisterCard
                                title="Inventory position and valuation"
                                description="Live stock-on-hand, commitments, availability, purchase orders, reorder exposure and weighted-average valuation."
                            >
                                <Table pagination={false}>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead className="text-right">On hand</TableHead>
                                            <TableHead className="text-right">Committed</TableHead>
                                            <TableHead className="text-right">Available</TableHead>
                                            <TableHead className="text-right">On order</TableHead>
                                            <TableHead className="text-right">Average cost</TableHead>
                                            <TableHead className="text-right">Valuation</TableHead>
                                            <TableHead>Reorder</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {options.inventoryItems.map((item) => (
                                            <TableRow key={item.value}>
                                                <TableCell className="font-medium">{item.label}</TableCell>
                                                <TableCell className="text-right">{item.stock_on_hand.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">{item.committed_quantity.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">{item.available_quantity.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">{item.on_order_quantity.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">{money(item.average_cost, options.currency)}</TableCell>
                                                <TableCell className="text-right font-medium">{money(item.valuation, options.currency)}</TableCell>
                                                <TableCell>
                                                    {item.available_quantity <= item.reorder_level ? (
                                                        <Badge className="bg-rose-100 text-rose-800">Reorder · {item.reorder_level}</Badge>
                                                    ) : (
                                                        <Badge className="bg-emerald-100 text-emerald-800">Healthy</Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </RegisterCard>
                        </div>
                        <Card>
                            <CardHeader>
                                <CardTitle>Stock control run</CardTitle>
                                <CardDescription>Count, adjust or return stock using weighted-average cost.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={(event) => submit(event, stock, '/accounting/inventory-controls')} className="space-y-3">
                                    <SelectField
                                        label="Branch"
                                        value={stock.data.branch_id}
                                        onChange={(value) => stock.setData('branch_id', value)}
                                        options={options.branches}
                                    />
                                    <SelectField
                                        label="Control type"
                                        value={stock.data.control_type}
                                        onChange={(value) => stock.setData('control_type', value)}
                                        options={['stock_count', 'adjustment', 'purchase_return', 'sales_return'].map((value) => ({
                                            value,
                                            label: label(value),
                                        }))}
                                    />
                                    <SelectField
                                        label="Inventory item"
                                        value={stock.data.lines[0].catalog_item_id}
                                        onChange={(value) => {
                                            const item = options.inventoryItems.find((candidate) => candidate.value === value);
                                            stock.setData('lines', [
                                                {
                                                    ...stock.data.lines[0],
                                                    catalog_item_id: value,
                                                    counted_quantity: String(item?.stock_on_hand ?? 0),
                                                    unit_cost: String(item?.average_cost ?? 0),
                                                },
                                            ]);
                                        }}
                                        options={options.inventoryItems}
                                    />
                                    <p className="text-muted-foreground text-xs">
                                        System quantity {selectedStockItem?.stock_on_hand ?? 0}; reorder level {selectedStockItem?.reorder_level ?? 0}
                                        .
                                    </p>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <InputField
                                            label="Counted / resulting quantity"
                                            type="number"
                                            value={stock.data.lines[0].counted_quantity}
                                            onChange={(value) => stock.setData('lines', [{ ...stock.data.lines[0], counted_quantity: value }])}
                                        />
                                        <InputField
                                            label="Unit cost"
                                            type="number"
                                            value={stock.data.lines[0].unit_cost}
                                            onChange={(value) => stock.setData('lines', [{ ...stock.data.lines[0], unit_cost: value }])}
                                        />
                                    </div>
                                    <SelectField
                                        label="Variance account"
                                        value={stock.data.lines[0].counter_account_id}
                                        onChange={(value) => stock.setData('lines', [{ ...stock.data.lines[0], counter_account_id: value }])}
                                        options={options.accounts
                                            .filter((item) => item.type === 'expense')
                                            .map((item) => ({ value: String(item.id), label: `${item.code} · ${item.name}` }))}
                                    />
                                    <Field>
                                        <FieldLabel>Reason</FieldLabel>
                                        <Textarea value={stock.data.reason} onChange={(event) => stock.setData('reason', event.target.value)} />
                                    </Field>
                                    <Button className="w-full" disabled={stock.processing}>
                                        <Boxes data-icon="inline-start" />
                                        Save stock control
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                        <RegisterCard
                            title="Inventory control register"
                            description="Stock and general ledger movements post together after independent approval."
                        >
                            <Table pagination={false}>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Control</TableHead>
                                        <TableHead>Branch</TableHead>
                                        <TableHead>Variance</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {props.inventoryControls.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <p className="font-medium">{item.control_no}</p>
                                                <p className="text-muted-foreground text-xs">
                                                    {label(item.control_type)} · {item.control_date}
                                                </p>
                                            </TableCell>
                                            <TableCell>{item.branch?.name}</TableCell>
                                            <TableCell>
                                                {item.lines.map((line) => `${line.item?.code}: ${Number(line.quantity_delta).toFixed(2)}`).join(', ')}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={badgeClass(item.status)}>{label(item.status)}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-1">
                                                    {item.status === 'draft' && (
                                                        <Button size="sm" onClick={() => post(`/accounting/inventory-controls/${item.id}/approve`)}>
                                                            Approve
                                                        </Button>
                                                    )}
                                                    {item.status === 'approved' && (
                                                        <Button
                                                            size="sm"
                                                            variant="default"
                                                            onClick={() => post(`/accounting/inventory-controls/${item.id}/post`)}
                                                        >
                                                            Post
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => openAttachment('inventory-control', item.id, item.control_no)}
                                                    >
                                                        <Paperclip />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </RegisterCard>
                    </div>
                )}

                {section === 'vat' && (
                    <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
                        <Card>
                            <CardHeader>
                                <CardTitle>Prepare VAT return</CardTitle>
                                <CardDescription>Create a versioned return from posted sales, credits and purchases.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={(event) => submit(event, vat, '/accounting/vat-returns')} className="space-y-3">
                                    <InputField
                                        label="From"
                                        type="date"
                                        value={vat.data.from_date}
                                        onChange={(value) => vat.setData('from_date', value)}
                                    />
                                    <InputField label="To" type="date" value={vat.data.to_date} onChange={(value) => vat.setData('to_date', value)} />
                                    <Field>
                                        <FieldLabel>Amendment reason</FieldLabel>
                                        <Textarea
                                            value={vat.data.amendment_reason}
                                            onChange={(event) => vat.setData('amendment_reason', event.target.value)}
                                            placeholder="Required when preparing a revised return"
                                        />
                                    </Field>
                                    <Button className="w-full" disabled={vat.processing}>
                                        <Calculator data-icon="inline-start" />
                                        Prepare return
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                        <RegisterCard title="VAT return register" description="Draft → reviewed → approved → submitted, with versioned amendments.">
                            <Table pagination={false}>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Period</TableHead>
                                        <TableHead>Output / input</TableHead>
                                        <TableHead>Net tax</TableHead>
                                        <TableHead>Variance</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {props.vatReturns.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <p className="font-medium">
                                                    {item.from_date} – {item.to_date}
                                                </p>
                                                <p className="text-muted-foreground text-xs">Version {item.version}</p>
                                            </TableCell>
                                            <TableCell>
                                                {money(item.output_tax, item.currency_code)} / {money(item.input_tax, item.currency_code)}
                                            </TableCell>
                                            <TableCell>{money(item.net_tax, item.currency_code)}</TableCell>
                                            <TableCell className={Math.abs(Number(item.variance)) > 0.01 ? 'text-rose-600' : 'text-emerald-700'}>
                                                {money(item.variance, item.currency_code)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={badgeClass(item.status)}>{label(item.status)}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-1">
                                                    {item.status === 'draft' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => patch(`/accounting/vat-returns/${item.id}/status`, { status: 'reviewed' })}
                                                        >
                                                            Review
                                                        </Button>
                                                    )}
                                                    {item.status === 'reviewed' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => patch(`/accounting/vat-returns/${item.id}/status`, { status: 'approved' })}
                                                        >
                                                            Approve
                                                        </Button>
                                                    )}
                                                    {item.status === 'approved' && (
                                                        <Button
                                                            size="sm"
                                                            variant="default"
                                                            onClick={() =>
                                                                patch(`/accounting/vat-returns/${item.id}/status`, { status: 'submitted' })
                                                            }
                                                        >
                                                            Submit
                                                        </Button>
                                                    )}
                                                    <Button size="sm" variant="outline" asChild>
                                                        <a href={`/accounting/vat-returns/${item.id}/export/pdf`}>PDF</a>
                                                    </Button>
                                                    <Button size="sm" variant="outline" asChild>
                                                        <a href={`/accounting/vat-returns/${item.id}/export/excel`}>Excel</a>
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => openAttachment('vat-return', item.id, `VAT return ${item.id}`)}
                                                    >
                                                        <Paperclip />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </RegisterCard>
                    </div>
                )}

                {section === 'close' && (
                    <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
                        <Card>
                            <CardHeader>
                                <CardTitle>Open close checklist</CardTitle>
                                <CardDescription>Month and year end cannot close until every control has evidence.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={(event) => submit(event, close, '/accounting/closes')} className="space-y-3">
                                    <SelectField
                                        label="Close type"
                                        value={close.data.close_type}
                                        onChange={(value) => close.setData('close_type', value)}
                                        options={[
                                            { value: 'month', label: 'Month end' },
                                            { value: 'year', label: 'Year end' },
                                        ]}
                                    />
                                    <InputField
                                        label="Reference"
                                        value={close.data.reference}
                                        onChange={(value) => close.setData('reference', value)}
                                        placeholder="CLOSE-2026-10"
                                    />
                                    {close.data.close_type === 'month' ? (
                                        <SelectField
                                            label="Accounting period"
                                            value={close.data.accounting_period_id}
                                            onChange={(value) => close.setData('accounting_period_id', value)}
                                            options={options.periods.map((item) => ({
                                                value: String(item.id),
                                                label: `${item.name} · ${label(item.status)}`,
                                            }))}
                                        />
                                    ) : (
                                        <SelectField
                                            label="Fiscal year"
                                            value={close.data.fiscal_year_id}
                                            onChange={(value) => close.setData('fiscal_year_id', value)}
                                            options={options.fiscalYears.map((item) => ({
                                                value: String(item.id),
                                                label: `${item.name} · ${label(item.status)}`,
                                            }))}
                                        />
                                    )}
                                    <Button className="w-full">
                                        <ClipboardCheck data-icon="inline-start" />
                                        Create checklist
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                        <div className="space-y-4">
                            {props.closes.map((run) => (
                                <Card key={run.id}>
                                    <CardHeader className="flex flex-row items-start justify-between">
                                        <div>
                                            <CardTitle>{run.reference}</CardTitle>
                                            <CardDescription>
                                                {label(run.close_type)} · {run.period?.name ?? run.fiscal_year?.name}
                                            </CardDescription>
                                        </div>
                                        <Badge className={badgeClass(run.status)}>{label(run.status)}</Badge>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {run.tasks.map((task) => (
                                            <div key={task.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                                                <div>
                                                    <p className="text-sm font-medium">{task.label}</p>
                                                    <p className="text-muted-foreground text-xs">{task.evidence ?? 'No evidence recorded'}</p>
                                                </div>
                                                {task.status === 'complete' ? (
                                                    <Badge className="bg-emerald-100 text-emerald-800">Complete</Badge>
                                                ) : (
                                                    <Button size="sm" variant="outline" onClick={() => openEvidence(run, task)}>
                                                        Add evidence
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                        <div className="flex justify-end gap-2">
                                            {run.status === 'draft' && (
                                                <Button size="sm" onClick={() => post(`/accounting/closes/${run.id}/review`)}>
                                                    Review
                                                </Button>
                                            )}
                                            {run.status === 'reviewed' && (
                                                <Button size="sm" variant="default" onClick={() => post(`/accounting/closes/${run.id}/approve`)}>
                                                    <BadgeCheck />
                                                    Close period
                                                </Button>
                                            )}
                                            {run.status === 'closed' && (
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => {
                                                        const reason = window.prompt('Enter the mandatory reopening reason');
                                                        if (reason) post(`/accounting/closes/${run.id}/reopen`, { reason });
                                                    }}
                                                >
                                                    <ArchiveRestore />
                                                    Request reopen
                                                </Button>
                                            )}
                                            {run.status === 'reopen_requested' && (
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    onClick={() => post(`/accounting/closes/${run.id}/approve-reopen`)}
                                                >
                                                    <BadgeCheck />
                                                    Approve reopen
                                                </Button>
                                            )}
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => openAttachment('accounting-close', run.id, run.reference)}
                                            >
                                                <Paperclip />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {section === 'reports' && (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {reportLinks.map(([title, report]) => (
                            <Card key={report}>
                                <CardHeader>
                                    <CardTitle className="text-base">{title}</CardTitle>
                                    <CardDescription>Posted ledger data with branch and period filtering, PDF and Excel exports.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button className="w-full" asChild>
                                        <a href={`/accounting/financial-reports?report=${report}`}>
                                            <FileChartColumnIncreasing data-icon="inline-start" />
                                            Open report
                                        </a>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {section === 'budget' && (
                    <div className="grid gap-5 xl:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Accounting dimension</CardTitle>
                                <CardDescription>Create departments, cost centres and projects used on transactions.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={(event) => submit(event, dimension, '/accounting/dimensions')} className="grid gap-3 sm:grid-cols-3">
                                    <SelectField
                                        label="Type"
                                        value={dimension.data.kind}
                                        onChange={(value) => dimension.setData('kind', value)}
                                        options={['department', 'cost_centre', 'project'].map((value) => ({ value, label: label(value) }))}
                                    />
                                    <InputField label="Code" value={dimension.data.code} onChange={(value) => dimension.setData('code', value)} />
                                    <InputField label="Name" value={dimension.data.name} onChange={(value) => dimension.setData('name', value)} />
                                    <Button className="sm:col-span-3">
                                        <Layers3 data-icon="inline-start" />
                                        Save dimension
                                    </Button>
                                </form>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {props.dimensions.map((item) => (
                                        <Badge key={item.id} variant="outline">
                                            {label(item.kind)} · {item.code} · {item.name}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Monthly budget line</CardTitle>
                                <CardDescription>Set account budgets with optional dimension and approval threshold.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={(event) => submit(event, budget, '/accounting/budgets')} className="grid gap-3 sm:grid-cols-2">
                                    <SelectField
                                        label="Fiscal year"
                                        value={budget.data.fiscal_year_id}
                                        onChange={(value) => budget.setData('fiscal_year_id', value)}
                                        options={options.fiscalYears.map((item) => ({ value: String(item.id), label: item.name }))}
                                    />
                                    <SelectField
                                        label="Period"
                                        value={budget.data.period_number}
                                        onChange={(value) => budget.setData('period_number', value)}
                                        options={Array.from({ length: 12 }, (_, index) => ({
                                            value: String(index + 1),
                                            label: new Date(2026, index, 1).toLocaleString('en', { month: 'long' }),
                                        }))}
                                    />
                                    <SelectField
                                        label="Account"
                                        value={budget.data.gl_account_id}
                                        onChange={(value) => budget.setData('gl_account_id', value)}
                                        options={options.accounts.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.name}` }))}
                                    />
                                    <SelectField
                                        label="Dimension"
                                        value={budget.data.accounting_dimension_id || 'none'}
                                        onChange={(value) => budget.setData('accounting_dimension_id', value === 'none' ? '' : value)}
                                        options={[
                                            { value: 'none', label: 'Organization-wide' },
                                            ...props.dimensions.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.name}` })),
                                        ]}
                                    />
                                    <InputField
                                        label="Budget amount"
                                        type="number"
                                        value={budget.data.amount}
                                        onChange={(value) => budget.setData('amount', value)}
                                    />
                                    <InputField
                                        label="Warning threshold %"
                                        type="number"
                                        value={budget.data.warning_threshold}
                                        onChange={(value) => budget.setData('warning_threshold', value)}
                                    />
                                    <Button className="sm:col-span-2">
                                        <Scale data-icon="inline-start" />
                                        Save budget
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                        <div className="xl:col-span-2">
                            <RegisterCard title="Budget register" description="Budget-versus-actual reporting uses posted journal lines.">
                                <Table pagination={false}>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Year / month</TableHead>
                                            <TableHead>Account</TableHead>
                                            <TableHead>Dimension</TableHead>
                                            <TableHead className="text-right">Budget</TableHead>
                                            <TableHead>Control</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {props.budgets.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    {item.fiscal_year?.name} · {item.period_number}
                                                </TableCell>
                                                <TableCell>
                                                    {item.account?.code} · {item.account?.name}
                                                </TableCell>
                                                <TableCell>
                                                    {item.dimension ? `${item.dimension.code} · ${item.dimension.name}` : 'Organization-wide'}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">{money(item.amount, options.currency)}</TableCell>
                                                <TableCell>
                                                    {item.warning_threshold}%{item.require_approval ? ' · approval required' : ''}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </RegisterCard>
                        </div>
                    </div>
                )}

                {section === 'governance' && (
                    <div className="grid gap-5 xl:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Approval authority</CardTitle>
                                <CardDescription>Limit approval by role, document type and transaction amount.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form
                                    onSubmit={(event) => submit(event, approval, '/accounting/approval-limits')}
                                    className="grid gap-3 sm:grid-cols-2"
                                >
                                    <InputField
                                        label="Role"
                                        value={approval.data.role_name}
                                        onChange={(value) => approval.setData('role_name', value)}
                                    />
                                    <SelectField
                                        label="Transaction"
                                        value={approval.data.transaction_type}
                                        onChange={(value) => approval.setData('transaction_type', value)}
                                        options={[
                                            'invoice',
                                            'credit_note',
                                            'debit_note',
                                            'refund',
                                            'inventory_adjustment',
                                            'journal',
                                            'supplier_payment',
                                        ].map((value) => ({ value, label: label(value) }))}
                                    />
                                    <InputField
                                        label="Minimum"
                                        type="number"
                                        value={approval.data.minimum_amount}
                                        onChange={(value) => approval.setData('minimum_amount', value)}
                                    />
                                    <InputField
                                        label="Maximum (blank = unlimited)"
                                        type="number"
                                        value={approval.data.maximum_amount}
                                        onChange={(value) => approval.setData('maximum_amount', value)}
                                    />
                                    <Button className="sm:col-span-2">
                                        <ShieldCheck data-icon="inline-start" />
                                        Save authority
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Governance guarantees</CardTitle>
                                <CardDescription>Controls applied throughout the advanced accounting workflows.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {[
                                    'Makers cannot approve their own sales documents or stock adjustments.',
                                    'Bank reconciliations require independent review and third-user sign-off.',
                                    'Posted documents are immutable; corrections use credit notes or reversals.',
                                    'Every workflow transition and attachment is written to the tamper-evident audit trail.',
                                    'Approval limits restrict document types and transaction values.',
                                ].map((text) => (
                                    <div key={text} className="flex gap-2 rounded-md border p-3 text-sm">
                                        <ShieldCheck className="mt-0.5 size-4 text-emerald-700" />
                                        {text}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                        <div className="xl:col-span-2">
                            <RegisterCard title="Approval limit register" description="Active transaction authority by role.">
                                <Table pagination={false}>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Transaction</TableHead>
                                            <TableHead>Range</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {props.approvalLimits.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.role_name ?? 'Named user'}</TableCell>
                                                <TableCell>{label(item.transaction_type)}</TableCell>
                                                <TableCell>
                                                    {money(item.minimum_amount, options.currency)} –{' '}
                                                    {item.maximum_amount ? money(item.maximum_amount, options.currency) : 'Unlimited'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        className={item.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}
                                                    >
                                                        {item.active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </RegisterCard>
                        </div>
                    </div>
                )}
            </div>

            <Dialog open={Boolean(evidenceTask)} onOpenChange={(open) => !open && setEvidenceTask(null)}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Complete close task</DialogTitle>
                        <DialogDescription>{evidenceTask?.task.label}. Record evidence that can be reviewed later.</DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (!evidenceTask) return;
                            evidence.patch(`/accounting/closes/${evidenceTask.close.id}/tasks`, {
                                preserveScroll: true,
                                onSuccess: () => setEvidenceTask(null),
                            });
                        }}
                        className="space-y-4"
                    >
                        <Field>
                            <FieldLabel>Evidence / reconciliation reference</FieldLabel>
                            <Textarea value={evidence.data.evidence} onChange={(event) => evidence.setData('evidence', event.target.value)} />
                            <FieldError>{evidence.errors.evidence}</FieldError>
                        </Field>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEvidenceTask(null)}>
                                Cancel
                            </Button>
                            <Button>
                                <CheckCheck data-icon="inline-start" />
                                Complete task
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={Boolean(attachmentTarget)} onOpenChange={(open) => !open && setAttachmentTarget(null)}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Attach accounting evidence</DialogTitle>
                        <DialogDescription>
                            Add supporting evidence to {attachmentTarget?.label}. Files remain linked to the immutable audit record.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            attachment.post('/accounting/attachments', {
                                forceFormData: true,
                                preserveScroll: true,
                                onSuccess: () => setAttachmentTarget(null),
                            });
                        }}
                        className="space-y-4"
                    >
                        <Field>
                            <FieldLabel>Supporting file</FieldLabel>
                            <Input
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv,.doc,.docx"
                                onChange={(event) => attachment.setData('file', event.target.files?.[0] ?? null)}
                            />
                            <FieldError>{attachment.errors.file}</FieldError>
                        </Field>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setAttachmentTarget(null)}>
                                Cancel
                            </Button>
                            <Button>
                                <Upload data-icon="inline-start" />
                                Upload evidence
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

function RegisterCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
    return (
        <Card className="min-w-0">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto rounded-md border">{children}</div>
            </CardContent>
        </Card>
    );
}
function SelectField({
    label: title,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Option[];
}) {
    return (
        <Field>
            <FieldLabel>{title}</FieldLabel>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger>
                    <SelectValue placeholder={`Select ${title.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                            {item.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </Field>
    );
}
function InputField({
    label: title,
    value,
    onChange,
    type = 'text',
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
}) {
    return (
        <Field>
            <FieldLabel>{title}</FieldLabel>
            <Input
                type={type}
                value={value}
                placeholder={placeholder}
                step={type === 'number' ? '0.01' : undefined}
                onChange={(event) => onChange(event.target.value)}
            />
        </Field>
    );
}
