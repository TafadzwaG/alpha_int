import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Archive, ArrowLeft, Building2, CircleDollarSign, Clock3, FileText, Mail, MapPin, Pencil, Phone, RotateCcw, WalletCards } from 'lucide-react';
import { FormEvent, useState } from 'react';

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
    branch: { id: number; name: string };
    payments: Array<{ id: number; payment_date: string; amount: number; reference: string }>;
};
type Supplier = {
    id: number;
    supplier_no: string;
    name: string;
    tax_number: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    currency_code: string;
    payment_terms_days: number;
    status: 'active' | 'inactive';
    created_at: string;
    summary: { lifetime_billed: number; lifetime_paid: number; outstanding: number; open_bills: number };
};
type Props = {
    supplier: Supplier;
    bills: { data: Bill[]; links: Array<{ url: string | null; label: string; active: boolean }> };
    permissions: { manage: boolean };
};
type SupplierForm = {
    name: string;
    tax_number: string;
    email: string;
    phone: string;
    address: string;
    currency_code: string;
    payment_terms_days: string;
};

const money = (value: number, currency: string) => new Intl.NumberFormat('en-ZW', { style: 'currency', currency }).format(value);
const date = (value: string) => new Intl.DateTimeFormat('en-ZW', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));

export default function SupplierShow({ supplier, bills, permissions }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Accounting', href: '/accounting' },
        { title: 'Suppliers & payables', href: '/accounting/payables' },
        { title: supplier.supplier_no, href: `/accounting/suppliers/${supplier.id}` },
    ];
    const [editOpen, setEditOpen] = useState(false);
    const [statusOpen, setStatusOpen] = useState(false);
    const form = useForm<SupplierForm>({
        name: supplier.name,
        tax_number: supplier.tax_number ?? '',
        email: supplier.email ?? '',
        phone: supplier.phone ?? '',
        address: supplier.address ?? '',
        currency_code: supplier.currency_code,
        payment_terms_days: String(supplier.payment_terms_days),
    });

    const save = (event: FormEvent) => {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            name: data.name.trim(),
            tax_number: data.tax_number.trim() || null,
            email: data.email.trim() || null,
            phone: data.phone.trim() || null,
            address: data.address.trim() || null,
            currency_code: data.currency_code.toUpperCase(),
        }));
        form.put(`/accounting/suppliers/${supplier.id}`, { preserveScroll: true, onSuccess: () => setEditOpen(false) });
    };

    const changeStatus = () => {
        router.patch(
            `/accounting/suppliers/${supplier.id}/status`,
            { status: supplier.status === 'active' ? 'inactive' : 'active' },
            { preserveScroll: true, onSuccess: () => setStatusOpen(false) },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${supplier.name} · Supplier`} />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <section className="bg-card rounded-xl border p-5 shadow-sm">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex gap-4">
                            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                <Building2 className="size-6" />
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-2xl font-semibold tracking-tight">{supplier.name}</h1>
                                    <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'}>{supplier.status}</Badge>
                                </div>
                                <p className="text-muted-foreground mt-1 text-sm">
                                    {supplier.supplier_no} · Supplier since {date(supplier.created_at)}
                                </p>
                                <div className="text-muted-foreground mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                                    <span className="inline-flex items-center gap-1.5">
                                        <Mail className="size-4" />
                                        {supplier.email ?? 'No email'}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <Phone className="size-4" />
                                        {supplier.phone ?? 'No phone'}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <MapPin className="size-4" />
                                        {supplier.address ?? 'No address'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button asChild variant="outline">
                                <Link href="/accounting/payables">
                                    <ArrowLeft data-icon="inline-start" /> Back to payables
                                </Link>
                            </Button>
                            {permissions.manage && (
                                <>
                                    <Button variant="outline" onClick={() => setEditOpen(true)}>
                                        <Pencil data-icon="inline-start" /> Edit profile
                                    </Button>
                                    <Button variant={supplier.status === 'active' ? 'destructive' : 'default'} onClick={() => setStatusOpen(true)}>
                                        {supplier.status === 'active' ? <Archive data-icon="inline-start" /> : <RotateCcw data-icon="inline-start" />}
                                        {supplier.status === 'active' ? 'Archive' : 'Reactivate'}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        { label: 'Lifetime billed', value: money(supplier.summary.lifetime_billed, supplier.currency_code), icon: FileText },
                        { label: 'Lifetime paid', value: money(supplier.summary.lifetime_paid, supplier.currency_code), icon: WalletCards },
                        { label: 'Outstanding', value: money(supplier.summary.outstanding, supplier.currency_code), icon: CircleDollarSign },
                        { label: 'Open bills', value: supplier.summary.open_bills, icon: Clock3 },
                    ].map(({ label, value, icon: Icon }) => (
                        <Card key={label}>
                            <CardContent className="flex items-center justify-between p-5">
                                <div>
                                    <p className="text-muted-foreground text-xs tracking-wide uppercase">{label}</p>
                                    <p className="mt-1 text-xl font-semibold">{value}</p>
                                </div>
                                <span className="rounded-lg bg-slate-100 p-2.5 text-slate-700">
                                    <Icon className="size-5" />
                                </span>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Purchase history</CardTitle>
                            <CardDescription>Supplier bills and settlement activity.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-hidden rounded-lg border">
                                <Table pagination={false}>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Bill</TableHead>
                                            <TableHead>Branch</TableHead>
                                            <TableHead>Due date</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead className="text-right">Outstanding</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bills.data.map((bill) => {
                                            const outstanding = Number(bill.total_amount) - Number(bill.paid_amount);
                                            return (
                                                <TableRow key={bill.id}>
                                                    <TableCell>
                                                        <p className="font-medium">{bill.bill_no}</p>
                                                        <p className="text-muted-foreground text-xs">
                                                            {bill.supplier_reference ?? bill.description ?? date(bill.bill_date)}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell>{bill.branch.name}</TableCell>
                                                    <TableCell>{date(bill.due_date)}</TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={
                                                                bill.status === 'paid' ? 'default' : bill.status === 'draft' ? 'secondary' : 'outline'
                                                            }
                                                        >
                                                            {bill.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {money(Number(bill.total_amount), bill.currency_code)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">{money(outstanding, bill.currency_code)}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {!bills.data.length && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-muted-foreground h-28 text-center">
                                                    No supplier bills have been recorded.
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
                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle>Commercial terms</CardTitle>
                            <CardDescription>Defaults applied to new purchase documents.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="flex justify-between gap-4 border-b pb-3">
                                <span className="text-muted-foreground">Supplier number</span>
                                <span className="font-medium">{supplier.supplier_no}</span>
                            </div>
                            <div className="flex justify-between gap-4 border-b pb-3">
                                <span className="text-muted-foreground">Tax number</span>
                                <span className="font-medium">{supplier.tax_number ?? 'Not supplied'}</span>
                            </div>
                            <div className="flex justify-between gap-4 border-b pb-3">
                                <span className="text-muted-foreground">Currency</span>
                                <span className="font-medium">{supplier.currency_code}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">Payment terms</span>
                                <span className="font-medium">{supplier.payment_terms_days} days</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={editOpen} onOpenChange={(open) => !form.processing && setEditOpen(open)}>
                <DialogContent
                    className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-3xl"
                    onInteractOutside={(event) => event.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>Edit supplier profile</DialogTitle>
                        <DialogDescription>{supplier.supplier_no} is permanent; contact and commercial details can be updated.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={save} className="flex flex-col gap-5">
                        <FieldGroup className="grid gap-4 sm:grid-cols-2">
                            <Field>
                                <FieldLabel>Name *</FieldLabel>
                                <Input value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} maxLength={150} />
                                <FieldError>{form.errors.name}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel>Tax number</FieldLabel>
                                <Input
                                    value={form.data.tax_number}
                                    onChange={(event) => form.setData('tax_number', event.target.value)}
                                    maxLength={60}
                                />
                                <FieldError>{form.errors.tax_number}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel>Email</FieldLabel>
                                <Input type="email" value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} />
                                <FieldError>{form.errors.email}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel>Phone</FieldLabel>
                                <Input value={form.data.phone} onChange={(event) => form.setData('phone', event.target.value)} />
                                <FieldError>{form.errors.phone}</FieldError>
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
                                <FieldLabel>Payment terms (days) *</FieldLabel>
                                <Input
                                    type="number"
                                    min="0"
                                    max="365"
                                    value={form.data.payment_terms_days}
                                    onChange={(event) => form.setData('payment_terms_days', event.target.value)}
                                />
                                <FieldError>{form.errors.payment_terms_days}</FieldError>
                            </Field>
                            <Field className="sm:col-span-2">
                                <FieldLabel>Address</FieldLabel>
                                <Textarea
                                    className="min-h-24"
                                    value={form.data.address}
                                    onChange={(event) => form.setData('address', event.target.value)}
                                    maxLength={1000}
                                />
                                <FieldError>{form.errors.address}</FieldError>
                            </Field>
                        </FieldGroup>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={form.processing}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing || !form.data.name.trim()}>
                                {form.processing ? 'Saving…' : 'Save profile'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={statusOpen} onOpenChange={setStatusOpen}>
                <AlertDialogContent>
                    <AlertDialogTitle>{supplier.status === 'active' ? 'Archive this supplier?' : 'Reactivate this supplier?'}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {supplier.status === 'active'
                            ? 'The profile and transaction history will be retained, but the supplier will no longer be available for new bills. Draft bills must be resolved first.'
                            : 'The supplier will be available for new bills and catalogue defaults again.'}
                    </AlertDialogDescription>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel asChild>
                            <Button variant="outline">Cancel</Button>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button variant={supplier.status === 'active' ? 'destructive' : 'default'} onClick={changeStatus}>
                                {supplier.status === 'active' ? 'Archive supplier' : 'Reactivate supplier'}
                            </Button>
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
