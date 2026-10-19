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
import { Archive, Box, Download, Layers3, PackageOpen, Pencil, Plus, RotateCcw, Search, Wrench } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

type Option = { value: string; label: string };
type TaxCode = { id: number; code: string; name: string; rate: number };
type Supplier = { id: number; supplier_no: string; name: string };
type CatalogItem = {
    id: number;
    code: string;
    name: string;
    description: string | null;
    type: 'product' | 'service';
    track_inventory: boolean;
    unit_of_measure: string;
    default_unit_price: number;
    default_cost: number;
    reorder_level: number;
    stock_on_hand: number | null;
    currency_code: string;
    status: 'active' | 'inactive';
    default_supplier_id: number | null;
    expense_account_id: number | null;
    revenue_account_id: number | null;
    inventory_account_id: number | null;
    cogs_account_id: number | null;
    tax_code_id: number | null;
    supplier: Supplier | null;
    expense_account: { id: number; code: string; name: string } | null;
    tax_code: TaxCode | null;
};
type Props = {
    items: {
        data: CatalogItem[];
        from: number | null;
        to: number | null;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    summary: { total: number; products: number; services: number; inactive: number };
    filters: { search: string; type: string; status: string };
    suppliers: Supplier[];
    expenseAccounts: Option[];
    revenueAccounts: Option[];
    assetAccounts: Option[];
    taxCodes: TaxCode[];
    currency: string;
    permissions: { manage: boolean };
};
type ItemForm = {
    code: string;
    name: string;
    description: string;
    type: 'product' | 'service';
    track_inventory: boolean;
    unit_of_measure: string;
    default_unit_price: string;
    default_cost: string;
    reorder_level: string;
    currency_code: string;
    default_supplier_id: string;
    expense_account_id: string;
    revenue_account_id: string;
    inventory_account_id: string;
    cogs_account_id: string;
    tax_code_id: string;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '/accounting' },
    { title: 'Products & services', href: '/accounting/master-data' },
];

const money = (value: number, currency: string) =>
    new Intl.NumberFormat('en-ZW', { style: 'currency', currency, minimumFractionDigits: 2 }).format(value);

const blankForm = (currency: string): ItemForm => ({
    code: '',
    name: '',
    description: '',
    type: 'service',
    track_inventory: false,
    unit_of_measure: 'each',
    default_unit_price: '0',
    default_cost: '0',
    reorder_level: '0',
    currency_code: currency,
    default_supplier_id: 'none',
    expense_account_id: 'none',
    revenue_account_id: 'none',
    inventory_account_id: 'none',
    cogs_account_id: 'none',
    tax_code_id: 'none',
});

export default function MasterData({
    items,
    summary,
    filters,
    suppliers,
    expenseAccounts,
    revenueAccounts,
    assetAccounts,
    taxCodes,
    currency,
    permissions,
}: Props) {
    const [search, setSearch] = useState(filters.search);
    const [type, setType] = useState(filters.type);
    const [status, setStatus] = useState(filters.status);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<CatalogItem | null>(null);
    const form = useForm<ItemForm>(blankForm(currency));

    const submitFilters = () =>
        router.get('/accounting/master-data', { search: search || undefined, type, status }, { preserveState: true, replace: true });

    const beginCreate = () => {
        setEditing(null);
        form.setData(blankForm(currency));
        form.clearErrors();
        setOpen(true);
    };

    const beginEdit = (item: CatalogItem) => {
        setEditing(item);
        form.setData({
            code: item.code,
            name: item.name,
            description: item.description ?? '',
            type: item.type,
            track_inventory: item.track_inventory,
            unit_of_measure: item.unit_of_measure,
            default_unit_price: String(item.default_unit_price),
            default_cost: String(item.default_cost),
            reorder_level: String(item.reorder_level),
            currency_code: item.currency_code,
            default_supplier_id: item.default_supplier_id ? String(item.default_supplier_id) : 'none',
            expense_account_id: item.expense_account_id ? String(item.expense_account_id) : 'none',
            revenue_account_id: item.revenue_account_id ? String(item.revenue_account_id) : 'none',
            inventory_account_id: item.inventory_account_id ? String(item.inventory_account_id) : 'none',
            cogs_account_id: item.cogs_account_id ? String(item.cogs_account_id) : 'none',
            tax_code_id: item.tax_code_id ? String(item.tax_code_id) : 'none',
        });
        form.clearErrors();
        setOpen(true);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            code: data.code.trim().toUpperCase(),
            name: data.name.trim(),
            description: data.description.trim() || null,
            currency_code: data.currency_code.trim().toUpperCase(),
            default_supplier_id: data.default_supplier_id === 'none' ? null : data.default_supplier_id,
            expense_account_id: data.expense_account_id === 'none' ? null : data.expense_account_id,
            revenue_account_id: data.revenue_account_id === 'none' ? null : data.revenue_account_id,
            inventory_account_id: data.inventory_account_id === 'none' ? null : data.inventory_account_id,
            cogs_account_id: data.cogs_account_id === 'none' ? null : data.cogs_account_id,
            tax_code_id: data.tax_code_id === 'none' ? null : data.tax_code_id,
        }));
        const options = { onSuccess: () => setOpen(false), preserveScroll: true };
        if (editing) form.put(`/accounting/catalog-items/${editing.id}`, options);
        else form.post('/accounting/catalog-items', options);
    };

    const statusAction = (item: CatalogItem) => {
        const nextStatus = item.status === 'active' ? 'inactive' : 'active';
        router.patch(`/accounting/catalog-items/${item.id}/status`, { status: nextStatus }, { preserveScroll: true });
    };

    const subtitle = useMemo(() => {
        if (!items.total) return 'No catalogue items match the current filters.';
        return `Showing ${items.from ?? 0}–${items.to ?? 0} of ${items.total} catalogue records`;
    }, [items]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Products & services master file" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <section className="overflow-hidden rounded-xl border bg-slate-950 text-white shadow-sm">
                    <div className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-end">
                        <div>
                            <Badge className="mb-3 border-white/15 bg-white/10 text-white hover:bg-white/10">Accounting master files</Badge>
                            <h1 className="text-2xl font-semibold tracking-tight">Products & services catalogue</h1>
                            <p className="mt-2 max-w-2xl text-sm text-slate-300">
                                Maintain reusable purchasing descriptions, rates, tax treatment and ledger mappings in one controlled register.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button asChild variant="secondary">
                                <a href="/accounting/catalog-items/export">
                                    <Download data-icon="inline-start" /> Export catalogue
                                </a>
                            </Button>
                            {permissions.manage && (
                                <Button onClick={beginCreate} className="bg-emerald-600 text-white hover:bg-emerald-500">
                                    <Plus data-icon="inline-start" /> New item
                                </Button>
                            )}
                        </div>
                    </div>
                </section>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        { label: 'Catalogue records', value: summary.total, icon: Layers3, tone: 'text-slate-700 bg-slate-100' },
                        { label: 'Active products', value: summary.products, icon: Box, tone: 'text-blue-700 bg-blue-50' },
                        { label: 'Active services', value: summary.services, icon: Wrench, tone: 'text-emerald-700 bg-emerald-50' },
                        { label: 'Archived', value: summary.inactive, icon: Archive, tone: 'text-amber-700 bg-amber-50' },
                    ].map(({ label, value, icon: Icon, tone }) => (
                        <Card key={label}>
                            <CardContent className="flex items-center justify-between p-5">
                                <div>
                                    <p className="text-muted-foreground text-xs tracking-wide uppercase">{label}</p>
                                    <p className="mt-1 text-2xl font-semibold">{value}</p>
                                </div>
                                <span className={`rounded-lg p-2.5 ${tone}`}>
                                    <Icon className="size-5" />
                                </span>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Master register</CardTitle>
                        <CardDescription>{subtitle}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                submitFilters();
                            }}
                            className="mb-4 grid gap-3 md:grid-cols-[minmax(260px,1fr)_180px_180px_auto]"
                        >
                            <div className="relative">
                                <Search className="text-muted-foreground absolute top-3 left-3 size-4" />
                                <Input
                                    className="pl-9"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Code, name or description"
                                />
                            </div>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All types</SelectItem>
                                    <SelectItem value="product">Products</SelectItem>
                                    <SelectItem value="service">Services</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Archived</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button type="submit">
                                <Search data-icon="inline-start" /> Search
                            </Button>
                        </form>

                        <div className="overflow-hidden rounded-lg border">
                            <Table pagination={false}>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Code & item</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Unit</TableHead>
                                        <TableHead>Ledger & tax</TableHead>
                                        <TableHead>Default supplier</TableHead>
                                        <TableHead className="text-right">Rate</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.data.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <p className="font-medium">{item.name}</p>
                                                <p className="text-muted-foreground text-xs">
                                                    {item.code}
                                                    {item.description ? ` · ${item.description}` : ''}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        item.type === 'service'
                                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                            : 'border-blue-200 bg-blue-50 text-blue-700'
                                                    }
                                                >
                                                    {item.type === 'service' ? <Wrench className="mr-1 size-3" /> : <Box className="mr-1 size-3" />}
                                                    {item.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {item.unit_of_measure}
                                                {item.track_inventory && (
                                                    <span className="text-muted-foreground block text-xs">
                                                        {Number(item.stock_on_hand ?? 0)} on hand · reorder {Number(item.reorder_level)}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-sm">
                                                    {item.expense_account
                                                        ? `${item.expense_account.code} · ${item.expense_account.name}`
                                                        : 'Not mapped'}
                                                </p>
                                                <p className="text-muted-foreground text-xs">
                                                    {item.tax_code ? `${item.tax_code.code} · ${Number(item.tax_code.rate)}%` : 'No default tax'}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                {item.supplier ? (
                                                    <>
                                                        <p>{item.supplier.name}</p>
                                                        <p className="text-muted-foreground text-xs">{item.supplier.supplier_no}</p>
                                                    </>
                                                ) : (
                                                    '—'
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {money(Number(item.default_unit_price), item.currency_code)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>{item.status}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-2">
                                                    {permissions.manage && (
                                                        <>
                                                            <Button size="sm" variant="outline" onClick={() => beginEdit(item)}>
                                                                <Pencil data-icon="inline-start" /> Edit
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant={item.status === 'active' ? 'destructive' : 'default'}
                                                                onClick={() => statusAction(item)}
                                                            >
                                                                {item.status === 'active' ? (
                                                                    <Archive data-icon="inline-start" />
                                                                ) : (
                                                                    <RotateCcw data-icon="inline-start" />
                                                                )}
                                                                {item.status === 'active' ? 'Archive' : 'Restore'}
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {!items.data.length && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-muted-foreground h-32 text-center">
                                                <PackageOpen className="mx-auto mb-2 size-7" />
                                                No products or services match these filters.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        {items.links.length > 3 && (
                            <div className="mt-4 flex justify-end gap-1">
                                {items.links.map((link, index) => (
                                    <Button
                                        key={index}
                                        size="sm"
                                        variant={link.active ? 'default' : 'outline'}
                                        disabled={!link.url}
                                        asChild={Boolean(link.url)}
                                    >
                                        {link.url ? (
                                            <Link href={link.url} preserveState preserveScroll dangerouslySetInnerHTML={{ __html: link.label }} />
                                        ) : (
                                            <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                        )}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={open} onOpenChange={(next) => !form.processing && setOpen(next)}>
                <DialogContent
                    className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-3xl"
                    onInteractOutside={(event) => event.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>{editing ? `Edit ${editing.code}` : 'Create catalogue item'}</DialogTitle>
                        <DialogDescription>
                            Set reusable defaults for future supplier bill lines. Users can still adjust a line during bill capture.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="flex flex-col gap-5">
                        <FieldGroup className="grid gap-4 md:grid-cols-2">
                            <Field>
                                <FieldLabel>Code *</FieldLabel>
                                <Input
                                    value={form.data.code}
                                    onChange={(event) => form.setData('code', event.target.value.toUpperCase().replace(/[^A-Z0-9._-]/g, ''))}
                                    maxLength={40}
                                    placeholder="SRV-SURVEY"
                                />
                                <FieldError>{form.errors.code}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel>Name *</FieldLabel>
                                <Input
                                    value={form.data.name}
                                    onChange={(event) => form.setData('name', event.target.value)}
                                    maxLength={150}
                                    placeholder="Topographical survey"
                                />
                                <FieldError>{form.errors.name}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel>Type *</FieldLabel>
                                <Select
                                    value={form.data.type}
                                    onValueChange={(value: 'product' | 'service') =>
                                        form.setData((data) => ({
                                            ...data,
                                            type: value,
                                            track_inventory: value === 'product' ? data.track_inventory : false,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="product">Product</SelectItem>
                                        <SelectItem value="service">Service</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FieldError>{form.errors.type}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel>Unit of measure *</FieldLabel>
                                <Input
                                    value={form.data.unit_of_measure}
                                    onChange={(event) => form.setData('unit_of_measure', event.target.value)}
                                    maxLength={30}
                                    placeholder="each, hour, month, m²"
                                />
                                <FieldError>{form.errors.unit_of_measure}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel>Inventory tracking *</FieldLabel>
                                <Select
                                    value={form.data.track_inventory ? 'yes' : 'no'}
                                    onValueChange={(value) => form.setData('track_inventory', value === 'yes')}
                                    disabled={form.data.type === 'service'}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="no">Do not track stock</SelectItem>
                                        <SelectItem value="yes">Track quantity on hand</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FieldError>{form.errors.track_inventory}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel>Default unit price *</FieldLabel>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.data.default_unit_price}
                                    onChange={(event) => form.setData('default_unit_price', event.target.value)}
                                />
                                <FieldError>{form.errors.default_unit_price}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel>Currency *</FieldLabel>
                                <Input
                                    value={form.data.currency_code}
                                    onChange={(event) =>
                                        form.setData(
                                            'currency_code',
                                            event.target.value
                                                .toUpperCase()
                                                .replace(/[^A-Z]/g, '')
                                                .slice(0, 3),
                                        )
                                    }
                                    maxLength={3}
                                />
                                <FieldError>{form.errors.currency_code}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel>Default cost *</FieldLabel>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.data.default_cost}
                                    onChange={(event) => form.setData('default_cost', event.target.value)}
                                />
                                <FieldError>{form.errors.default_cost}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel>Reorder level *</FieldLabel>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.0001"
                                    value={form.data.reorder_level}
                                    onChange={(event) => form.setData('reorder_level', event.target.value)}
                                    disabled={!form.data.track_inventory}
                                />
                                <FieldError>{form.errors.reorder_level}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel>Expense account</FieldLabel>
                                <Select value={form.data.expense_account_id} onValueChange={(value) => form.setData('expense_account_id', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select expense account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No default</SelectItem>
                                        <SelectGroup>
                                            {expenseAccounts.map((account) => (
                                                <SelectItem key={account.value} value={account.value}>
                                                    {account.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                <FieldError>{form.errors.expense_account_id}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel>Tax code</FieldLabel>
                                <Select value={form.data.tax_code_id} onValueChange={(value) => form.setData('tax_code_id', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select tax code" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No default</SelectItem>
                                        {taxCodes.map((tax) => (
                                            <SelectItem key={tax.id} value={String(tax.id)}>
                                                {tax.code} · {Number(tax.rate)}%
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldError>{form.errors.tax_code_id}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel>Sales revenue account</FieldLabel>
                                <Select value={form.data.revenue_account_id} onValueChange={(value) => form.setData('revenue_account_id', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select revenue account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Use sales control account</SelectItem>
                                        {revenueAccounts.map((account) => (
                                            <SelectItem key={account.value} value={account.value}>
                                                {account.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldError>{form.errors.revenue_account_id}</FieldError>
                            </Field>
                            {form.data.track_inventory && (
                                <>
                                    <Field>
                                        <FieldLabel>Inventory asset account</FieldLabel>
                                        <Select
                                            value={form.data.inventory_account_id}
                                            onValueChange={(value) => form.setData('inventory_account_id', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select inventory account" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Use inventory control account</SelectItem>
                                                {assetAccounts.map((account) => (
                                                    <SelectItem key={account.value} value={account.value}>
                                                        {account.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FieldError>{form.errors.inventory_account_id}</FieldError>
                                    </Field>
                                    <Field>
                                        <FieldLabel>Cost of sales account</FieldLabel>
                                        <Select value={form.data.cogs_account_id} onValueChange={(value) => form.setData('cogs_account_id', value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select cost account" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Use cost of sales control account</SelectItem>
                                                {expenseAccounts.map((account) => (
                                                    <SelectItem key={account.value} value={account.value}>
                                                        {account.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FieldError>{form.errors.cogs_account_id}</FieldError>
                                    </Field>
                                </>
                            )}
                            <Field className="md:col-span-2">
                                <FieldLabel>Default supplier</FieldLabel>
                                <Select value={form.data.default_supplier_id} onValueChange={(value) => form.setData('default_supplier_id', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select supplier" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No default supplier</SelectItem>
                                        {suppliers.map((supplier) => (
                                            <SelectItem key={supplier.id} value={String(supplier.id)}>
                                                {supplier.supplier_no} · {supplier.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldError>{form.errors.default_supplier_id}</FieldError>
                            </Field>
                            <Field className="md:col-span-2">
                                <FieldLabel>Description</FieldLabel>
                                <Textarea
                                    className="min-h-24"
                                    value={form.data.description}
                                    onChange={(event) => form.setData('description', event.target.value)}
                                    maxLength={2000}
                                />
                                <FieldError>{form.errors.description}</FieldError>
                            </Field>
                        </FieldGroup>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={form.processing}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing || !form.data.code.trim() || !form.data.name.trim()}>
                                {form.processing ? 'Saving…' : editing ? 'Save changes' : 'Create item'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
