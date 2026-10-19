import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, BellRing, CalendarPlus, CircleDollarSign, Clock3, FileDown, ReceiptText, Sheet, UserRound } from 'lucide-react';
import { FormEvent, useState } from 'react';

type Allocation = {
    id: number;
    client_id: number;
    client_no: string;
    client: string;
    phone: string | null;
    stand_id: number | null;
    stand_no: string | null;
    development: string | null;
    branch: string;
    branch_code: string;
    category: string;
    allocated_at: string | null;
    price: number;
    charged: number;
    paid: number;
    balance: number;
    currency: string;
    status: string;
    account_no: string | null;
    next_due_date: string | null;
    next_due_amount: number;
    overdue_installments: number;
    installment_count: number;
};
type Installment = {
    id: number;
    sequence_no: number;
    due_date: string;
    amount_due: number;
    amount_paid: number;
    balance: number;
    currency: string;
    effective_status: string;
    paid_at: string | null;
    notes: string | null;
    reminder_count: number;
};
type Payment = {
    id: number;
    amount: number;
    currency: string;
    method: string;
    reference: string | null;
    received_at: string;
    status: string;
    receipt_no: string | null;
    notes: string | null;
    installment_numbers: number[];
};
type Reminder = {
    id: number;
    installment_id: number;
    installment_no: number;
    channel: string;
    remind_at: string;
    status: string;
    sent_at: string | null;
    notes: string | null;
    created_by: string;
};
type TimelineEvent = { type: string; title: string; description: string; occurred_at: string };
type Props = {
    allocation: Allocation;
    account: { id: number; account_no: string; currency: string; status: string } | null;
    installments: Installment[];
    payments: Payment[];
    reminders: Reminder[];
    timeline: TimelineEvent[];
    paymentMethods: Array<{ id: string; name: string; requires_reference: boolean; cash_equivalent: boolean }>;
    cashSessions: Array<{ id: string; label: string }>;
    canManage: boolean;
};

const money = (amount: number, currency: string) => `${currency} ${new Intl.NumberFormat('en-ZW', { minimumFractionDigits: 2 }).format(amount)}`;
const date = (value: string | null, withTime = false) =>
    value
        ? new Intl.DateTimeFormat('en-ZW', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(new Date(value))
        : '—';
const badgeVariant = (status: string) => (status === 'paid' || status === 'sent' ? 'default' : status === 'overdue' ? 'destructive' : 'secondary');

export default function AllocationShow({ allocation, installments, payments, reminders, timeline, paymentMethods, cashSessions, canManage }: Props) {
    const { flash } = usePage<SharedData>().props;
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [paymentInstallment, setPaymentInstallment] = useState<Installment | null>(null);
    const [reminderInstallment, setReminderInstallment] = useState<Installment | null>(null);
    const schedule = useForm({ first_due_date: '', installment_count: '12', frequency_months: '1', notes: '' });
    const payment = useForm({ amount: '', method_id: '', cash_session_id: '', external_reference: '', received_at: '', notes: '' });
    const reminder = useForm({ channel: 'in_app', remind_at: '', notes: '' });
    const baseUrl = `/administration/stand-allocations/${allocation.id}`;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Stand allocations', href: '/administration/stand-allocations' },
        { title: `${allocation.client} · ${allocation.stand_no ?? 'Unassigned'}`, href: baseUrl },
    ];

    const submitSchedule = (event: FormEvent) => {
        event.preventDefault();
        schedule.post(`${baseUrl}/installments`, { preserveScroll: true, onSuccess: () => setScheduleOpen(false) });
    };
    const openPayment = (installment: Installment) => {
        payment.reset();
        payment.clearErrors();
        payment.setData('amount', installment.balance.toFixed(2));
        setPaymentInstallment(installment);
    };
    const submitPayment = (event: FormEvent) => {
        event.preventDefault();
        if (!paymentInstallment) return;
        payment.post(`${baseUrl}/installments/${paymentInstallment.id}/payments`, {
            preserveScroll: true,
            onSuccess: () => setPaymentInstallment(null),
        });
    };
    const openReminder = (installment: Installment) => {
        reminder.reset();
        reminder.clearErrors();
        reminder.setData('channel', 'in_app');
        setReminderInstallment(installment);
    };
    const submitReminder = (event: FormEvent) => {
        event.preventDefault();
        if (!reminderInstallment) return;
        reminder.post(`${baseUrl}/installments/${reminderInstallment.id}/reminders`, {
            preserveScroll: true,
            onSuccess: () => setReminderInstallment(null),
        });
    };
    const markSent = (item: Reminder) =>
        router.patch(`${baseUrl}/installments/${item.installment_id}/reminders/${item.id}/sent`, {}, { preserveScroll: true });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${allocation.client} · Stand ${allocation.stand_no ?? 'allocation'}`} />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
                    <div>
                        <Button variant="ghost" size="sm" className="mb-1 -ml-3" asChild>
                            <Link href="/administration/stand-allocations">
                                <ArrowLeft data-icon="inline-start" /> All allocations
                            </Link>
                        </Button>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-semibold tracking-tight">
                                {allocation.client} · Stand {allocation.stand_no ?? 'unassigned'}
                            </h1>
                            <Badge variant="secondary" className="capitalize">
                                {allocation.status}
                            </Badge>
                            {allocation.overdue_installments > 0 && <Badge variant="destructive">{allocation.overdue_installments} overdue</Badge>}
                        </div>
                        <p className="text-muted-foreground mt-1">
                            {allocation.development} · {allocation.branch} · {allocation.account_no ?? 'Account pending'}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="excel" asChild>
                            <a href={`${baseUrl}/export/excel`}>
                                <Sheet data-icon="inline-start" />
                                Export Excel
                            </a>
                        </Button>
                        <Button variant="pdf" asChild>
                            <a href={`${baseUrl}/export/pdf`}>
                                <FileDown data-icon="inline-start" />
                                Export PDF
                            </a>
                        </Button>

                        <Button variant="outline" asChild>
                            <Link href={`/administration/clients/${allocation.client_id}`}>
                                <UserRound data-icon="inline-start" /> Client
                            </Link>
                        </Button>
                        {allocation.stand_id && (
                            <Button variant="outline" asChild>
                                <Link href={`/administration/stands/${allocation.stand_id}`}>Stand details</Link>
                            </Button>
                        )}
                        {canManage && installments.length === 0 && allocation.balance > 0 && (
                            <Button onClick={() => setScheduleOpen(true)}>
                                <CalendarPlus data-icon="inline-start" /> Create installment plan
                            </Button>
                        )}
                    </div>
                </div>
                {flash?.success && (
                    <Alert>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <Card>
                        <CardHeader>
                            <CardDescription>Purchase price</CardDescription>
                            <CardTitle>{money(allocation.price, allocation.currency)}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Total paid</CardDescription>
                            <CardTitle>{money(allocation.paid, allocation.currency)}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Outstanding balance</CardDescription>
                            <CardTitle>{money(allocation.balance, allocation.currency)}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Next payment</CardDescription>
                            <CardTitle className="text-base">{date(allocation.next_due_date)}</CardTitle>
                            <CardDescription>
                                {allocation.next_due_date ? money(allocation.next_due_amount, allocation.currency) : 'No payment scheduled'}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Installment plan</CardDescription>
                            <CardTitle>{allocation.installment_count || 'Not set'}</CardTitle>
                            <CardDescription>{allocation.category} purchase</CardDescription>
                        </CardHeader>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <CardTitle>Installment schedule</CardTitle>
                                <CardDescription>Due dates, receipts, partial payments and reminder activity.</CardDescription>
                            </div>
                            {canManage && installments.length === 0 && allocation.balance > 0 && (
                                <Button size="sm" onClick={() => setScheduleOpen(true)}>
                                    <CalendarPlus data-icon="inline-start" /> Create plan
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>#</TableHead>
                                    <TableHead>Due date</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Paid</TableHead>
                                    <TableHead>Balance</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Reminders</TableHead>
                                    {canManage && <TableHead className="text-right">Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {installments.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={canManage ? 8 : 7} className="text-muted-foreground h-28 text-center">
                                            No installment schedule yet. Create a plan to start tracking due dates and reminders.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {installments.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.sequence_no}</TableCell>
                                        <TableCell>{date(item.due_date)}</TableCell>
                                        <TableCell>{money(item.amount_due, item.currency)}</TableCell>
                                        <TableCell>{money(item.amount_paid, item.currency)}</TableCell>
                                        <TableCell>{money(item.balance, item.currency)}</TableCell>
                                        <TableCell>
                                            <Badge variant={badgeVariant(item.effective_status)} className="capitalize">
                                                {item.effective_status.replaceAll('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{item.reminder_count}</TableCell>
                                        {canManage && (
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    {item.balance > 0 && (
                                                        <Button size="sm" onClick={() => openPayment(item)}>
                                                            <CircleDollarSign data-icon="inline-start" /> Record payment
                                                        </Button>
                                                    )}
                                                    <Button size="sm" variant="outline" onClick={() => openReminder(item)}>
                                                        <BellRing data-icon="inline-start" /> Remind
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Payment history</CardTitle>
                            <CardDescription>Approved payments and issued receipt references.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Received</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Reference</TableHead>
                                        <TableHead>Installment</TableHead>
                                        <TableHead>Receipt</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                                                No payments recorded.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {payments.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>{date(item.received_at, true)}</TableCell>
                                            <TableCell>{item.method}</TableCell>
                                            <TableCell>
                                                <p>{item.reference || '—'}</p>
                                                {item.notes && (
                                                    <p className="text-muted-foreground mt-1 max-w-xs text-xs whitespace-normal">{item.notes}</p>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {item.installment_numbers.length
                                                    ? item.installment_numbers.map((number) => `#${number}`).join(', ')
                                                    : '—'}
                                            </TableCell>
                                            <TableCell>
                                                {item.receipt_no ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <ReceiptText className="size-3.5" />
                                                        {item.receipt_no}
                                                    </span>
                                                ) : (
                                                    '—'
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{money(item.amount, item.currency)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Reminder register</CardTitle>
                            <CardDescription>Scheduled and completed follow-ups.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {reminders.length === 0 && <p className="text-muted-foreground text-sm">No reminders scheduled.</p>}
                            {reminders.map((item) => (
                                <div key={item.id} className="rounded-lg border p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-medium capitalize">
                                                {item.channel} · Installment #{item.installment_no}
                                            </p>
                                            <p className="text-muted-foreground text-xs">
                                                {date(item.remind_at, true)} · by {item.created_by}
                                            </p>
                                            {item.notes && <p className="mt-2 text-sm">{item.notes}</p>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={badgeVariant(item.status)} className="capitalize">
                                                {item.status}
                                            </Badge>
                                            {canManage && item.status === 'scheduled' && (
                                                <Button size="sm" variant="outline" onClick={() => markSent(item)}>
                                                    Mark sent
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Account timeline</CardTitle>
                        <CardDescription>Allocation, payment and reminder events in one audit-friendly view.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-0">
                            {timeline.map((event, index) => (
                                <div key={`${event.type}-${event.occurred_at}-${index}`} className="relative flex gap-4 pb-6 last:pb-0">
                                    <div className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" />
                                    {index < timeline.length - 1 && <div className="bg-border absolute top-4 bottom-0 left-[3px] w-px" />}
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-medium">{event.title}</p>
                                            <Badge variant="outline" className="capitalize">
                                                {event.type}
                                            </Badge>
                                        </div>
                                        <p className="text-muted-foreground text-sm">{event.description}</p>
                                        <p className="text-muted-foreground mt-1 text-xs">
                                            <Clock3 className="mr-1 inline size-3" />
                                            {date(event.occurred_at, true)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create installment plan</DialogTitle>
                        <DialogDescription>
                            The outstanding balance will be split evenly. A reminder is created seven days before every due date.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitSchedule} className="space-y-4">
                        <FieldGroup>
                            <Field data-invalid={Boolean(schedule.errors.first_due_date)}>
                                <FieldLabel htmlFor="first_due_date">First payment due</FieldLabel>
                                <Input
                                    id="first_due_date"
                                    type="date"
                                    value={schedule.data.first_due_date}
                                    onChange={(event) => schedule.setData('first_due_date', event.target.value)}
                                />
                                <FieldError>{schedule.errors.first_due_date}</FieldError>
                            </Field>
                            <div className="grid grid-cols-2 gap-4">
                                <Field data-invalid={Boolean(schedule.errors.installment_count)}>
                                    <FieldLabel htmlFor="installment_count">Number of payments</FieldLabel>
                                    <Input
                                        id="installment_count"
                                        type="number"
                                        min="1"
                                        max="120"
                                        value={schedule.data.installment_count}
                                        onChange={(event) => schedule.setData('installment_count', event.target.value)}
                                    />
                                    <FieldError>{schedule.errors.installment_count}</FieldError>
                                </Field>
                                <Field data-invalid={Boolean(schedule.errors.frequency_months)}>
                                    <FieldLabel htmlFor="frequency_months">Every (months)</FieldLabel>
                                    <Input
                                        id="frequency_months"
                                        type="number"
                                        min="1"
                                        max="12"
                                        value={schedule.data.frequency_months}
                                        onChange={(event) => schedule.setData('frequency_months', event.target.value)}
                                    />
                                    <FieldError>{schedule.errors.frequency_months}</FieldError>
                                </Field>
                            </div>
                            <Field>
                                <FieldLabel htmlFor="schedule_notes">Notes</FieldLabel>
                                <Textarea
                                    id="schedule_notes"
                                    value={schedule.data.notes}
                                    onChange={(event) => schedule.setData('notes', event.target.value)}
                                />
                            </Field>
                        </FieldGroup>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setScheduleOpen(false)}>
                                Cancel
                            </Button>
                            <Button disabled={schedule.processing}>Create schedule</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(paymentInstallment)} onOpenChange={(open) => !open && setPaymentInstallment(null)}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Record installment payment</DialogTitle>
                        <DialogDescription>
                            Installment #{paymentInstallment?.sequence_no} · balance{' '}
                            {paymentInstallment ? money(paymentInstallment.balance, paymentInstallment.currency) : ''}. Approval and receipt issuance
                            are recorded automatically.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitPayment} className="flex flex-col gap-4">
                        <FieldGroup className="grid gap-4 sm:grid-cols-2">
                            <Field data-invalid={Boolean(payment.errors.amount)}>
                                <FieldLabel htmlFor="payment_amount">Amount</FieldLabel>
                                <Input
                                    id="payment_amount"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={payment.data.amount}
                                    onChange={(event) => payment.setData('amount', event.target.value)}
                                />
                                <FieldError>{payment.errors.amount}</FieldError>
                            </Field>
                            <Field data-invalid={Boolean(payment.errors.method_id)}>
                                <FieldLabel>Payment method</FieldLabel>
                                <Select value={payment.data.method_id} onValueChange={(value) => payment.setData('method_id', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {paymentMethods.map((method) => (
                                                <SelectItem key={method.id} value={method.id}>
                                                    {method.name}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                <FieldError>{payment.errors.method_id}</FieldError>
                            </Field>
                            <Field data-invalid={Boolean(payment.errors.external_reference)}>
                                <FieldLabel htmlFor="external_reference">External reference</FieldLabel>
                                <Input
                                    id="external_reference"
                                    value={payment.data.external_reference}
                                    onChange={(event) => payment.setData('external_reference', event.target.value)}
                                    placeholder="Transaction or bank reference"
                                />
                                <FieldError>{payment.errors.external_reference}</FieldError>
                            </Field>
                            {cashSessions.length > 0 && (
                                <Field data-invalid={Boolean(payment.errors.cash_session_id)}>
                                    <FieldLabel>Cash session</FieldLabel>
                                    <Select
                                        value={payment.data.cash_session_id || 'none'}
                                        onValueChange={(value) => payment.setData('cash_session_id', value === 'none' ? '' : value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a cash session" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="none">Not applicable</SelectItem>
                                                {cashSessions.map((session) => (
                                                    <SelectItem key={session.id} value={session.id}>
                                                        {session.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    <FieldError>{payment.errors.cash_session_id}</FieldError>
                                </Field>
                            )}
                            <Field>
                                <FieldLabel htmlFor="received_at">Received at</FieldLabel>
                                <Input
                                    id="received_at"
                                    type="datetime-local"
                                    value={payment.data.received_at}
                                    onChange={(event) => payment.setData('received_at', event.target.value)}
                                />
                            </Field>
                            <Field className="sm:col-span-2" data-invalid={Boolean(payment.errors.notes)}>
                                <FieldLabel htmlFor="payment-notes">Additional notes</FieldLabel>
                                <Textarea
                                    id="payment-notes"
                                    rows={4}
                                    maxLength={4000}
                                    placeholder="Add payment details or other relevant information..."
                                    value={payment.data.notes}
                                    onChange={(event) => payment.setData('notes', event.target.value)}
                                />
                                <FieldError>{payment.errors.notes}</FieldError>
                            </Field>
                        </FieldGroup>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setPaymentInstallment(null)}>
                                Cancel
                            </Button>
                            <Button disabled={payment.processing}>
                                <ReceiptText data-icon="inline-start" /> Record and issue receipt
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(reminderInstallment)} onOpenChange={(open) => !open && setReminderInstallment(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Schedule payment reminder</DialogTitle>
                        <DialogDescription>Create a follow-up for installment #{reminderInstallment?.sequence_no}.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitReminder} className="space-y-4">
                        <FieldGroup>
                            <Field>
                                <FieldLabel>Channel</FieldLabel>
                                <Select value={reminder.data.channel} onValueChange={(value) => reminder.setData('channel', value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {['in_app', 'email', 'sms', 'phone', 'whatsapp'].map((channel) => (
                                                <SelectItem key={channel} value={channel} className="capitalize">
                                                    {channel.replace('_', ' ')}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field data-invalid={Boolean(reminder.errors.remind_at)}>
                                <FieldLabel htmlFor="remind_at">Reminder date and time</FieldLabel>
                                <Input
                                    id="remind_at"
                                    type="datetime-local"
                                    value={reminder.data.remind_at}
                                    onChange={(event) => reminder.setData('remind_at', event.target.value)}
                                />
                                <FieldError>{reminder.errors.remind_at}</FieldError>
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="reminder_notes">Notes</FieldLabel>
                                <Textarea
                                    id="reminder_notes"
                                    value={reminder.data.notes}
                                    onChange={(event) => reminder.setData('notes', event.target.value)}
                                />
                            </Field>
                        </FieldGroup>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setReminderInstallment(null)}>
                                Cancel
                            </Button>
                            <Button disabled={reminder.processing}>
                                <BellRing data-icon="inline-start" /> Schedule reminder
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
