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
import {
    Building2,
    CalendarClock,
    CircleDollarSign,
    Download,
    Eye,
    FilePlus2,
    HandCoins,
    LoaderCircle,
    PackageSearch,
    Search,
    Send,
    Users,
    X,
} from 'lucide-react';
import { FormEvent, useState } from 'react';

type Option = { value: string; label: string };
type Supplier = {
    id: number;
    supplier_no: string;
    name: string;
    tax_number: string | null;
    email: string | null;
    phone: string | null;
    currency_code: string;
    payment_terms_days: number;
    status: string;
    outstanding: number;
};
type CatalogItem = {
    id: number;
    code: string;
    name: string;
    type: 'product' | 'service';
    unit_of_measure: string;
    default_unit_price: number;
    currency_code: string;
    expense_account_id: number | null;
    tax_code: string | null;
};
type BillLine = {
    id: number;
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    account: { code: string; name: string };
};
type Bill = {
    id: number;
    bill_no: string;
    supplier_reference: string | null;
    bill_date: string;
    due_date: string;
    currency_code: string;
    total_amount: number;
    paid_amount: number;
    status: string;
    description: string | null;
    supplier: { name: string; supplier_no: string };
    branch: { name: string };
    lines: BillLine[];
    outstanding: number;
    days_outstanding: number;
    ageing_bucket: string;
};
type Props = {
    suppliers: Supplier[];
    bills: { data: Bill[]; links: Array<{ url: string | null; label: string; active: boolean }> };
    expenseAccounts: Option[];
    taxCodes: Array<{ code: string; name: string; rate: number }>;
    branches: Option[];
    bankAccounts: Option[];
    dimensions: Option[];
    currency: string;
    permissions: { manage: boolean; post: boolean };
    summary: { outstanding: number; overdue: number; drafts: number; suppliers: number };
    ageing: Array<{ key: string; label: string; total: number; bills: number }>;
    filters: { search: string; bucket: string };
    catalogItems: CatalogItem[];
};
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '/accounting' },
    { title: 'Suppliers & payables', href: '/accounting/payables' },
];
const money = (value: number, currency: string) => new Intl.NumberFormat('en-ZW', { style: 'currency', currency }).format(value);

type SupplierFormData = {
    name: string;
    tax_number: string;
    email: string;
    phone: string;
    address: string;
    currency_code: string;
    payment_terms_days: string;
};
type SupplierField = keyof SupplierFormData;
type SupplierErrors = Partial<Record<SupplierField, string>>;

const supplierFields: SupplierField[] = ['name', 'tax_number', 'email', 'phone', 'currency_code', 'payment_terms_days', 'address'];

const validateSupplier = (data: SupplierFormData): SupplierErrors => {
    const errors: SupplierErrors = {};
    const name = data.name.trim();
    const taxNumber = data.tax_number.trim();
    const email = data.email.trim();
    const phone = data.phone.trim();
    const address = data.address.trim();
    const terms = Number(data.payment_terms_days);

    if (!name) errors.name = 'Supplier name is required.';
    else if (name.length < 2) errors.name = 'Supplier name must contain at least 2 characters.';
    else if (name.length > 150) errors.name = 'Supplier name cannot exceed 150 characters.';

    if (taxNumber.length > 60) errors.tax_number = 'Tax number cannot exceed 60 characters.';
    else if (taxNumber && !/^[A-Za-z0-9][A-Za-z0-9 ./-]*$/.test(taxNumber)) {
        errors.tax_number = 'Use letters, numbers, spaces, slashes, full stops or hyphens only.';
    }

    if (email.length > 255) errors.email = 'Email cannot exceed 255 characters.';
    else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';

    if (phone && !/^\+?[0-9()\-\s]{7,40}$/.test(phone)) {
        errors.phone = 'Enter a valid phone number using 7 to 40 digits and phone symbols.';
    }

    if (!/^[A-Z]{3}$/.test(data.currency_code.trim().toUpperCase())) errors.currency_code = 'Enter a valid 3-letter currency code.';

    if (!data.payment_terms_days.trim()) errors.payment_terms_days = 'Payment terms are required.';
    else if (!Number.isInteger(terms) || terms < 0 || terms > 365) {
        errors.payment_terms_days = 'Payment terms must be a whole number from 0 to 365 days.';
    }

    if (address.length > 1000) errors.address = 'Address cannot exceed 1,000 characters.';

    return errors;
};

export default function Payables({
    suppliers,
    bills,
    expenseAccounts,
    taxCodes,
    branches,
    bankAccounts,
    dimensions,
    currency,
    permissions,
    summary,
    ageing,
    filters,
    catalogItems,
}: Props) {
    const activeSuppliers = suppliers.filter((supplier) => supplier.status === 'active');
    const [supplierOpen, setSupplierOpen] = useState(false);
    const [billOpen, setBillOpen] = useState(false);
    const [selected, setSelected] = useState<Bill | null>(null);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [search, setSearch] = useState(filters.search);
    const [bucket, setBucket] = useState(filters.bucket);
    const [supplierTouched, setSupplierTouched] = useState<Partial<Record<SupplierField, boolean>>>({});
    const [supplierSubmitAttempted, setSupplierSubmitAttempted] = useState(false);
    const supplierForm = useForm<SupplierFormData>({
        name: '',
        tax_number: '',
        email: '',
        phone: '',
        address: '',
        currency_code: currency,
        payment_terms_days: '30',
    });
    const billForm = useForm({
        supplier_id: '',
        accounting_dimension_id: '',
        branch_id: branches[0]?.value ?? '',
        supplier_reference: '',
        bill_date: new Date().toISOString().slice(0, 10),
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        currency_code: currency,
        description: '',
        lines: [
            {
                catalog_item_id: 'manual',
                gl_account_id: expenseAccounts[0]?.value ?? '',
                description: '',
                quantity: '1',
                unit_price: '',
                tax_code: 'ZERO',
            },
        ],
    });
    const paymentForm = useForm({
        amount: '',
        payment_date: new Date().toISOString().slice(0, 10),
        reference: '',
        bank_account_id: bankAccounts[0]?.value ?? '',
    });
    const saveSupplier = (event: FormEvent) => {
        event.preventDefault();
        const clientErrors = validateSupplier(supplierForm.data);
        setSupplierSubmitAttempted(true);
        setSupplierTouched(Object.fromEntries(supplierFields.map((field) => [field, true])));
        if (Object.keys(clientErrors).length > 0) return;

        supplierForm.transform((data) => ({
            ...data,
            name: data.name.trim(),
            tax_number: data.tax_number.trim(),
            email: data.email.trim(),
            phone: data.phone.trim(),
            address: data.address.trim(),
            currency_code: data.currency_code.trim().toUpperCase(),
        }));
        supplierForm.post('/accounting/suppliers', {
            onSuccess: () => {
                setSupplierOpen(false);
                supplierForm.reset();
                supplierForm.clearErrors();
                setSupplierTouched({});
                setSupplierSubmitAttempted(false);
            },
        });
    };
    const supplierClientErrors = validateSupplier(supplierForm.data);
    const supplierError = (field: SupplierField) =>
        supplierForm.errors[field] || (supplierTouched[field] || supplierSubmitAttempted ? supplierClientErrors[field] : undefined);
    const updateSupplier = (field: SupplierField, value: string) => {
        supplierForm.setData(field, value);
        supplierForm.clearErrors(field);
    };
    const touchSupplier = (field: SupplierField) => setSupplierTouched((current) => ({ ...current, [field]: true }));
    const handleSupplierOpenChange = (open: boolean) => {
        if (supplierForm.processing) return;
        setSupplierOpen(open);
        if (!open) {
            supplierForm.reset();
            supplierForm.clearErrors();
            setSupplierTouched({});
            setSupplierSubmitAttempted(false);
        }
    };
    const saveBill = (event: FormEvent) => {
        event.preventDefault();
        billForm.transform((data) => ({
            ...data,
            lines: data.lines.map((line) => ({ ...line, catalog_item_id: line.catalog_item_id === 'manual' ? null : line.catalog_item_id })),
        }));
        billForm.post('/accounting/supplier-bills', {
            onSuccess: () => {
                setBillOpen(false);
                billForm.reset();
            },
        });
    };
    const pay = (event: FormEvent) => {
        event.preventDefault();
        if (!selected) return;
        paymentForm.post(`/accounting/supplier-bills/${selected.id}/payments`, {
            onSuccess: () => {
                setPaymentOpen(false);
                setSelected(null);
                paymentForm.reset();
            },
        });
    };
    const billTotal = billForm.data.lines.reduce((total, line) => {
        const subtotal = Number(line.quantity || 0) * Number(line.unit_price || 0);
        const rate = Number(taxCodes.find((tax) => tax.code === line.tax_code)?.rate ?? 0);
        return total + subtotal + (subtotal * rate) / 100;
    }, 0);
    const updateLine = (index: number, field: string, value: string) =>
        billForm.setData(
            'lines',
            billForm.data.lines.map((line, position) => (position === index ? { ...line, [field]: value } : line)),
        );
    const applyCatalogItem = (index: number, value: string) => {
        if (value === 'manual') {
            updateLine(index, 'catalog_item_id', value);
            return;
        }
        const item = catalogItems.find((candidate) => String(candidate.id) === value);
        if (!item) return;
        billForm.setData(
            'lines',
            billForm.data.lines.map((line, position) =>
                position === index
                    ? {
                          ...line,
                          catalog_item_id: value,
                          gl_account_id: item.expense_account_id ? String(item.expense_account_id) : line.gl_account_id,
                          description: item.name,
                          unit_price: String(item.default_unit_price),
                          tax_code: item.tax_code ?? line.tax_code,
                      }
                    : line,
            ),
        );
    };
    const applyFilters = (event: FormEvent) => {
        event.preventDefault();
        router.get('/accounting/payables', { search: search || undefined, bucket: bucket === 'all' ? undefined : bucket }, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Suppliers and payables" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
                    <div>
                        <Badge variant="secondary" className="mb-2">
                            Purchase ledger
                        </Badge>
                        <h1 className="text-2xl font-semibold tracking-tight">Suppliers & payables</h1>
                        <p className="text-muted-foreground mt-1">
                            Capture supplier invoices, post liabilities, monitor due dates and record controlled payments.
                        </p>
                    </div>
                    {permissions.manage && (
                        <div className="flex flex-wrap gap-2">
                            <Button asChild variant="outline">
                                <Link href="/accounting/master-data">
                                    <PackageSearch data-icon="inline-start" />
                                    Products & services
                                </Link>
                            </Button>
                            <Button variant="outline" onClick={() => setSupplierOpen(true)}>
                                <Building2 data-icon="inline-start" />
                                New supplier
                            </Button>
                            <Button onClick={() => setBillOpen(true)} disabled={!activeSuppliers.length}>
                                <FilePlus2 data-icon="inline-start" />
                                New supplier bill
                            </Button>
                        </div>
                    )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        { label: 'Outstanding payables', value: money(summary.outstanding, currency), icon: CircleDollarSign },
                        { label: 'Overdue payables', value: money(summary.overdue, currency), icon: CalendarClock },
                        { label: 'Draft bills', value: summary.drafts, icon: FilePlus2 },
                        { label: 'Active suppliers', value: summary.suppliers, icon: Users },
                    ].map(({ label, value, icon: Icon }) => (
                        <Card key={label}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardDescription>{label}</CardDescription>
                                <Icon className="text-muted-foreground size-4" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-xl font-semibold">{value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="flex flex-col gap-3">
                    <div>
                        <h2 className="font-medium">Creditors ageing</h2>
                        <p className="text-muted-foreground text-sm">Outstanding supplier balances grouped by the number of days past due.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
                        {ageing.map((item) => (
                            <Link key={item.key} href={`/accounting/payables?bucket=${item.key}`} preserveState>
                                <Card className={filters.bucket === item.key ? 'ring-primary ring-2' : ''}>
                                    <CardHeader className="pb-2">
                                        <CardDescription>{item.label}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-lg font-semibold">{money(item.total, currency)}</p>
                                        <p className="text-muted-foreground mt-1 text-xs">
                                            {item.bills} open bill{item.bills === 1 ? '' : 's'}
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Supplier bill register</CardTitle>
                        <CardDescription>Draft, posted, partially paid and settled purchase documents.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={applyFilters} className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-end">
                            <Field>
                                <FieldLabel>Search bills or suppliers</FieldLabel>
                                <Input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Bill number, supplier or branch"
                                />
                            </Field>
                            <Field>
                                <FieldLabel>Ageing bucket</FieldLabel>
                                <Select value={bucket} onValueChange={setBucket}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="all">All ageing buckets</SelectItem>
                                            {ageing.map((item) => (
                                                <SelectItem key={item.key} value={item.key}>
                                                    {item.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Button type="submit">
                                <Search data-icon="inline-start" /> Search
                            </Button>
                        </form>
                        <div className="overflow-hidden rounded-md border">
                            <Table pagination={false}>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Bill</TableHead>
                                        <TableHead>Supplier</TableHead>
                                        <TableHead>Branch</TableHead>
                                        <TableHead>Due date</TableHead>
                                        <TableHead>Age</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Outstanding</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bills.data.map((bill) => {
                                        const balance = Number(bill.outstanding);
                                        return (
                                            <TableRow key={bill.id}>
                                                <TableCell>
                                                    <p className="font-medium">{bill.bill_no}</p>
                                                    <p className="text-muted-foreground text-xs">{bill.supplier_reference ?? bill.bill_date}</p>
                                                </TableCell>
                                                <TableCell>{bill.supplier.name}</TableCell>
                                                <TableCell>{bill.branch.name}</TableCell>
                                                <TableCell>{bill.due_date}</TableCell>
                                                <TableCell>
                                                    {balance > 0 && bill.status !== 'draft' ? (
                                                        <Badge variant={bill.days_outstanding >= 90 ? 'destructive' : 'outline'}>
                                                            {bill.days_outstanding} days
                                                        </Badge>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            bill.status === 'paid'
                                                                ? 'default'
                                                                : bill.status === 'draft'
                                                                  ? 'secondary'
                                                                  : new Date(bill.due_date) < new Date()
                                                                    ? 'destructive'
                                                                    : 'outline'
                                                        }
                                                    >
                                                        {bill.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">{money(balance, bill.currency_code)}</TableCell>
                                                <TableCell>
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="outline" size="sm" onClick={() => setSelected(bill)}>
                                                            <Eye data-icon="inline-start" />
                                                            View
                                                        </Button>
                                                        {permissions.post && bill.status === 'draft' && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => router.post(`/accounting/supplier-bills/${bill.id}/post`)}
                                                            >
                                                                <Send data-icon="inline-start" />
                                                                Post
                                                            </Button>
                                                        )}
                                                        {permissions.post &&
                                                            ['posted', 'partially_paid', 'overdue'].includes(bill.status) &&
                                                            balance > 0 && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setSelected(bill);
                                                                        paymentForm.setData('amount', String(balance));
                                                                        setPaymentOpen(true);
                                                                    }}
                                                                >
                                                                    <HandCoins data-icon="inline-start" />
                                                                    Pay
                                                                </Button>
                                                            )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {bills.data.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-muted-foreground h-28 text-center">
                                                No supplier bills match the selected filters.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        {bills.links.length > 3 && (
                            <div className="mt-4 flex justify-end gap-1">
                                {bills.links.map((link, index) => (
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
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div>
                            <CardTitle>Supplier master file</CardTitle>
                            <CardDescription>Payment terms, tax identity and open balance by supplier.</CardDescription>
                        </div>
                        <Button asChild size="sm" variant="outline">
                            <a href="/accounting/suppliers/export">
                                <Download data-icon="inline-start" /> Export
                            </a>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-hidden rounded-md border">
                            <Table pagination={false}>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Supplier</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead>Tax number</TableHead>
                                        <TableHead>Terms</TableHead>
                                        <TableHead className="text-right">Outstanding</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {suppliers.map((supplier) => (
                                        <TableRow key={supplier.id}>
                                            <TableCell>
                                                <p className="font-medium">{supplier.name}</p>
                                                <p className="text-muted-foreground text-xs">{supplier.supplier_no}</p>
                                            </TableCell>
                                            <TableCell>{supplier.email ?? supplier.phone ?? '—'}</TableCell>
                                            <TableCell>{supplier.tax_number ?? '—'}</TableCell>
                                            <TableCell>{supplier.payment_terms_days} days</TableCell>
                                            <TableCell className="text-right font-medium">
                                                {money(Number(supplier.outstanding ?? 0), supplier.currency_code)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={supplier.status === 'active' ? 'default' : 'outline'}>{supplier.status}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-end">
                                                    <Button asChild size="sm" variant="outline">
                                                        <Link href={`/accounting/suppliers/${supplier.id}`}>
                                                            <Eye data-icon="inline-start" /> View
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={supplierOpen} onOpenChange={handleSupplierOpenChange}>
                <DialogContent
                    className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl"
                    onInteractOutside={(event) => event.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>Create supplier</DialogTitle>
                        <DialogDescription>Add a supplier to the purchase ledger master file.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={saveSupplier} className="flex flex-col gap-5" noValidate>
                        <FieldGroup className="grid gap-5 sm:grid-cols-2">
                            <Field data-invalid={Boolean(supplierError('name')) || undefined}>
                                <FieldLabel htmlFor="supplier-name">Name *</FieldLabel>
                                <Input
                                    id="supplier-name"
                                    autoComplete="organization"
                                    value={supplierForm.data.name}
                                    onChange={(event) => updateSupplier('name', event.target.value)}
                                    onBlur={() => touchSupplier('name')}
                                    aria-invalid={Boolean(supplierError('name')) || undefined}
                                    maxLength={150}
                                />
                                <FieldError>{supplierError('name')}</FieldError>
                            </Field>
                            <Field data-invalid={Boolean(supplierError('tax_number')) || undefined}>
                                <FieldLabel htmlFor="supplier-tax-number">Tax number</FieldLabel>
                                <Input
                                    id="supplier-tax-number"
                                    value={supplierForm.data.tax_number}
                                    onChange={(event) => updateSupplier('tax_number', event.target.value)}
                                    onBlur={() => touchSupplier('tax_number')}
                                    aria-invalid={Boolean(supplierError('tax_number')) || undefined}
                                    maxLength={60}
                                />
                                <FieldError>{supplierError('tax_number')}</FieldError>
                            </Field>
                            <Field data-invalid={Boolean(supplierError('email')) || undefined}>
                                <FieldLabel htmlFor="supplier-email">Email</FieldLabel>
                                <Input
                                    id="supplier-email"
                                    type="email"
                                    autoComplete="email"
                                    value={supplierForm.data.email}
                                    onChange={(event) => updateSupplier('email', event.target.value)}
                                    onBlur={() => touchSupplier('email')}
                                    aria-invalid={Boolean(supplierError('email')) || undefined}
                                    maxLength={255}
                                />
                                <FieldError>{supplierError('email')}</FieldError>
                            </Field>
                            <Field data-invalid={Boolean(supplierError('phone')) || undefined}>
                                <FieldLabel htmlFor="supplier-phone">Phone</FieldLabel>
                                <Input
                                    id="supplier-phone"
                                    type="tel"
                                    autoComplete="tel"
                                    value={supplierForm.data.phone}
                                    onChange={(event) => updateSupplier('phone', event.target.value)}
                                    onBlur={() => touchSupplier('phone')}
                                    aria-invalid={Boolean(supplierError('phone')) || undefined}
                                    maxLength={40}
                                />
                                <FieldError>{supplierError('phone')}</FieldError>
                            </Field>
                            <Field data-invalid={Boolean(supplierError('currency_code')) || undefined}>
                                <FieldLabel htmlFor="supplier-currency">Currency *</FieldLabel>
                                <Input
                                    id="supplier-currency"
                                    value={supplierForm.data.currency_code}
                                    onChange={(event) => updateSupplier('currency_code', event.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                                    onBlur={() => touchSupplier('currency_code')}
                                    aria-invalid={Boolean(supplierError('currency_code')) || undefined}
                                    maxLength={3}
                                />
                                <FieldError>{supplierError('currency_code')}</FieldError>
                            </Field>
                            <Field data-invalid={Boolean(supplierError('payment_terms_days')) || undefined}>
                                <FieldLabel htmlFor="supplier-payment-terms">Payment terms (days) *</FieldLabel>
                                <Input
                                    id="supplier-payment-terms"
                                    type="number"
                                    min="0"
                                    max="365"
                                    step="1"
                                    value={supplierForm.data.payment_terms_days}
                                    onChange={(event) => updateSupplier('payment_terms_days', event.target.value)}
                                    onBlur={() => touchSupplier('payment_terms_days')}
                                    aria-invalid={Boolean(supplierError('payment_terms_days')) || undefined}
                                />
                                <FieldError>{supplierError('payment_terms_days')}</FieldError>
                            </Field>
                            <Field className="sm:col-span-2" data-invalid={Boolean(supplierError('address')) || undefined}>
                                <FieldLabel htmlFor="supplier-address">Address</FieldLabel>
                                <Textarea
                                    id="supplier-address"
                                    autoComplete="street-address"
                                    className="min-h-24"
                                    value={supplierForm.data.address}
                                    onChange={(event) => updateSupplier('address', event.target.value)}
                                    onBlur={() => touchSupplier('address')}
                                    aria-invalid={Boolean(supplierError('address')) || undefined}
                                    maxLength={1000}
                                />
                                <div className="flex items-start justify-between gap-3">
                                    <FieldError>{supplierError('address')}</FieldError>
                                    <p className="text-muted-foreground ml-auto text-xs">{supplierForm.data.address.length}/1,000</p>
                                </div>
                            </Field>
                        </FieldGroup>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleSupplierOpenChange(false)}
                                disabled={supplierForm.processing}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={supplierForm.processing || Object.keys(supplierClientErrors).length > 0}>
                                {supplierForm.processing && <LoaderCircle className="animate-spin" data-icon="inline-start" />}
                                {supplierForm.processing ? 'Saving supplier…' : 'Save supplier'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={billOpen} onOpenChange={(open) => !billForm.processing && setBillOpen(open)}>
                <DialogContent
                    className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-4xl"
                    onInteractOutside={(event) => event.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>Create supplier bill</DialogTitle>
                        <DialogDescription>The draft will post to expenses, input tax and trade payables after review.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={saveBill} className="flex flex-col gap-5">
                        <FieldGroup className="grid gap-4 md:grid-cols-3">
                            <Field>
                                <FieldLabel>Supplier</FieldLabel>
                                <Select value={billForm.data.supplier_id} onValueChange={(value) => billForm.setData('supplier_id', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select supplier" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {activeSuppliers.map((supplier) => (
                                                <SelectItem key={supplier.id} value={String(supplier.id)}>
                                                    {supplier.supplier_no} · {supplier.name}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                <FieldError>{billForm.errors.supplier_id}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel>Branch</FieldLabel>
                                <Select value={billForm.data.branch_id} onValueChange={(value) => billForm.setData('branch_id', value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {branches.map((item) => (
                                                <SelectItem key={item.value} value={item.value}>
                                                    {item.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field>
                                <FieldLabel>Supplier reference</FieldLabel>
                                <Input
                                    value={billForm.data.supplier_reference}
                                    onChange={(event) => billForm.setData('supplier_reference', event.target.value)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel>Department / cost centre / project</FieldLabel>
                                <Select
                                    value={billForm.data.accounting_dimension_id || 'none'}
                                    onValueChange={(value) => billForm.setData('accounting_dimension_id', value === 'none' ? '' : value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="No accounting dimension" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No accounting dimension</SelectItem>
                                        {dimensions.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field>
                                <FieldLabel>Bill date</FieldLabel>
                                <Input
                                    type="date"
                                    value={billForm.data.bill_date}
                                    onChange={(event) => billForm.setData('bill_date', event.target.value)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel>Due date</FieldLabel>
                                <Input
                                    type="date"
                                    value={billForm.data.due_date}
                                    onChange={(event) => billForm.setData('due_date', event.target.value)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel>Currency</FieldLabel>
                                <Input
                                    value={billForm.data.currency_code}
                                    onChange={(event) => billForm.setData('currency_code', event.target.value.toUpperCase())}
                                />
                            </Field>
                            <Field className="md:col-span-3">
                                <FieldLabel>Description</FieldLabel>
                                <Textarea
                                    value={billForm.data.description}
                                    onChange={(event) => billForm.setData('description', event.target.value)}
                                />
                            </Field>
                        </FieldGroup>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-medium">Bill lines</h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        billForm.setData('lines', [
                                            ...billForm.data.lines,
                                            {
                                                catalog_item_id: 'manual',
                                                gl_account_id: expenseAccounts[0]?.value ?? '',
                                                description: '',
                                                quantity: '1',
                                                unit_price: '',
                                                tax_code: 'ZERO',
                                            },
                                        ])
                                    }
                                >
                                    Add line
                                </Button>
                            </div>
                            {billForm.data.lines.map((line, index) => (
                                <div key={index} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1.2fr_1.2fr_1fr_90px_120px_120px_auto]">
                                    <Select value={line.catalog_item_id} onValueChange={(value) => applyCatalogItem(index, value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Catalogue item" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="manual">Manual line</SelectItem>
                                            <SelectGroup>
                                                {catalogItems.map((item) => (
                                                    <SelectItem key={item.id} value={String(item.id)}>
                                                        {item.code} · {item.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    <Select value={line.gl_account_id} onValueChange={(value) => updateLine(index, 'gl_account_id', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Expense account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {expenseAccounts.map((item) => (
                                                    <SelectItem key={item.value} value={item.value}>
                                                        {item.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        placeholder="Description"
                                        value={line.description}
                                        onChange={(event) => updateLine(index, 'description', event.target.value)}
                                    />
                                    <Input
                                        type="number"
                                        min="0.0001"
                                        step="0.01"
                                        value={line.quantity}
                                        onChange={(event) => updateLine(index, 'quantity', event.target.value)}
                                    />
                                    <Input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        placeholder="Unit price"
                                        value={line.unit_price}
                                        onChange={(event) => updateLine(index, 'unit_price', event.target.value)}
                                    />
                                    <Select value={line.tax_code} onValueChange={(value) => updateLine(index, 'tax_code', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {taxCodes.map((tax) => (
                                                    <SelectItem key={tax.code} value={tax.code}>
                                                        {tax.code} · {Number(tax.rate)}%
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled={billForm.data.lines.length === 1}
                                        onClick={() =>
                                            billForm.setData(
                                                'lines',
                                                billForm.data.lines.filter((_, position) => position !== index),
                                            )
                                        }
                                    >
                                        <X />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4 text-right">
                            <p className="text-muted-foreground text-xs">Estimated bill total</p>
                            <p className="text-xl font-semibold">{money(billTotal, billForm.data.currency_code || currency)}</p>
                        </div>
                        <FieldError>{billForm.errors.lines}</FieldError>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setBillOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={billForm.processing || !billForm.data.supplier_id || billTotal <= 0}>
                                Save draft bill
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(selected) && !paymentOpen} onOpenChange={(open) => !open && setSelected(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{selected?.bill_no}</DialogTitle>
                        <DialogDescription>
                            {selected?.supplier.name} · {selected?.description ?? 'Supplier bill'}
                        </DialogDescription>
                    </DialogHeader>
                    {selected && (
                        <div className="overflow-hidden rounded-md border">
                            <Table pagination={false}>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Account</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selected.lines.map((line) => (
                                        <TableRow key={line.id}>
                                            <TableCell>
                                                {line.account.code} · {line.account.name}
                                            </TableCell>
                                            <TableCell>{line.description}</TableCell>
                                            <TableCell className="text-right">{money(Number(line.line_total), selected.currency_code)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelected(null)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={paymentOpen} onOpenChange={(open) => !paymentForm.processing && setPaymentOpen(open)}>
                <DialogContent onInteractOutside={(event) => event.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>Pay {selected?.bill_no}</DialogTitle>
                        <DialogDescription>Record the supplier payment and post it to trade payables and bank.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={pay} className="flex flex-col gap-4">
                        <Field>
                            <FieldLabel>Amount</FieldLabel>
                            <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={paymentForm.data.amount}
                                onChange={(event) => paymentForm.setData('amount', event.target.value)}
                            />
                            <FieldError>{paymentForm.errors.amount}</FieldError>
                        </Field>
                        <Field>
                            <FieldLabel>Payment date</FieldLabel>
                            <Input
                                type="date"
                                value={paymentForm.data.payment_date}
                                onChange={(event) => paymentForm.setData('payment_date', event.target.value)}
                            />
                        </Field>
                        <Field>
                            <FieldLabel>Bank account</FieldLabel>
                            <Select value={paymentForm.data.bank_account_id} onValueChange={(value) => paymentForm.setData('bank_account_id', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select bank account" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {bankAccounts.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field>
                            <FieldLabel>Payment reference</FieldLabel>
                            <Input value={paymentForm.data.reference} onChange={(event) => paymentForm.setData('reference', event.target.value)} />
                            <FieldError>{paymentForm.errors.reference}</FieldError>
                        </Field>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setPaymentOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={paymentForm.processing || !paymentForm.data.reference.trim()}>
                                Post supplier payment
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
