import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarClock,
    Check,
    CircleDollarSign,
    ClipboardList,
    FileText,
    History,
    Mail,
    MapPin,
    MessageSquarePlus,
    Phone,
    Plus,
    ReceiptText,
    UserRound,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import { CallCentreTask, Option, formatDate, formatDateTime, humanize, money } from '../types';

type Props = {
    client: {
        id: number;
        clientNo: string;
        name: string;
        phone: string | null;
        branch: string | null;
        branchCode: string | null;
        status: string;
        contacts: Array<{ type: string; value: string; primary: boolean }>;
        outstanding: number;
        daysOverdue: number;
        agingBucket: string;
        currency: string;
    };
    allocations: Array<{
        id: number;
        standId: number;
        standNo: string;
        development: string;
        status: string;
        price: number;
        currency: string;
        accountId: number | null;
        accountNo: string | null;
    }>;
    charges: Array<{
        id: number;
        description: string;
        dueDate: string | null;
        amount: number;
        paid: number;
        outstanding: number;
        daysOverdue: number;
        currency: string;
        status: string;
    }>;
    installments: Array<{
        id: number;
        allocationId: number;
        sequence: number;
        dueDate: string | null;
        amountDue: number;
        amountPaid: number;
        currency: string;
        status: string;
        overdue: boolean;
    }>;
    payments: Array<{ id: number; amount: number; currency: string; method: string | null; receivedAt: string | null; reference: string | null }>;
    interactions: Array<{
        id: number;
        direction: string;
        channel: string;
        type: string;
        occurredAt: string | null;
        durationSeconds: number | null;
        summary: string;
        outcome: string;
        promiseDate: string | null;
        agent: string | null;
        campaign: string | null;
    }>;
    tasks: CallCentreTask[];
    promises: Array<{
        id: number;
        amount: number;
        currency: string;
        dueDate: string | null;
        status: string;
        fulfilledAt: string | null;
        notes: string | null;
        createdBy: string | null;
    }>;
    agents: Option[];
    campaigns: Option[];
    permissions: { createInteractions: boolean; manageTasks: boolean; assignTasks: boolean };
};

const dateTimeLocal = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
};

export function InteractionDialog({
    client,
    allocations,
    agents,
    campaigns,
}: {
    client: { id: number };
    allocations: Array<{ accountId: number | null; accountNo: string | null; standNo: string | null }>;
    agents: Option[];
    campaigns: Option[];
}) {
    const [open, setOpen] = useState(false);
    const form = useForm({
        campaign_id: '',
        direction: 'outbound',
        channel: 'phone',
        interaction_type: 'collection',
        occurred_at: dateTimeLocal(),
        duration_seconds: '',
        summary: '',
        outcome: 'client_contacted',
        follow_up_at: '',
        assigned_to: '',
        priority: 'normal',
        promise_amount: '',
        promise_date: '',
        promise_account_id: '',
        promise_notes: '',
    });
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(`/call-centre/clients/${client.id}/interactions`, {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setOpen(false);
            },
        });
    };
    const promise = form.data.outcome === 'promise_to_pay';

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <MessageSquarePlus data-icon="inline-start" /> Record interaction
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Record client interaction</DialogTitle>
                    <DialogDescription>Capture the conversation outcome, next action and any promise to pay.</DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="flex flex-col gap-5">
                    <FieldGroup className="grid gap-4 md:grid-cols-2">
                        <Field>
                            <FieldLabel>Direction</FieldLabel>
                            <Select value={form.data.direction} onValueChange={(value) => form.setData('direction', value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="outbound">Outbound</SelectItem>
                                        <SelectItem value="inbound">Inbound</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field>
                            <FieldLabel>Channel</FieldLabel>
                            <Select value={form.data.channel} onValueChange={(value) => form.setData('channel', value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {['phone', 'whatsapp', 'sms', 'email', 'walk_in'].map((value) => (
                                            <SelectItem key={value} value={value}>
                                                {humanize(value)}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field>
                            <FieldLabel>Interaction type</FieldLabel>
                            <Select value={form.data.interaction_type} onValueChange={(value) => form.setData('interaction_type', value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {['collection', 'payment_query', 'documentation', 'complaint', 'general_enquiry', 'sales_follow_up'].map(
                                            (value) => (
                                                <SelectItem key={value} value={value}>
                                                    {humanize(value)}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="occurred-at">Occurred at</FieldLabel>
                            <Input
                                id="occurred-at"
                                type="datetime-local"
                                value={form.data.occurred_at}
                                onChange={(event) => form.setData('occurred_at', event.target.value)}
                            />
                            <FieldError>{form.errors.occurred_at}</FieldError>
                        </Field>
                        <Field>
                            <FieldLabel>Outcome</FieldLabel>
                            <Select value={form.data.outcome} onValueChange={(value) => form.setData('outcome', value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {[
                                            'client_contacted',
                                            'promise_to_pay',
                                            'no_answer',
                                            'wrong_number',
                                            'payment_query',
                                            'documentation_required',
                                            'complaint',
                                            'escalated',
                                            'resolved',
                                        ].map((value) => (
                                            <SelectItem key={value} value={value}>
                                                {humanize(value)}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="duration">Duration (seconds)</FieldLabel>
                            <Input
                                id="duration"
                                type="number"
                                min="0"
                                value={form.data.duration_seconds}
                                onChange={(event) => form.setData('duration_seconds', event.target.value)}
                            />
                        </Field>
                        <Field className="md:col-span-2">
                            <FieldLabel htmlFor="interaction-summary">Summary</FieldLabel>
                            <Textarea
                                id="interaction-summary"
                                value={form.data.summary}
                                onChange={(event) => form.setData('summary', event.target.value)}
                                rows={4}
                            />
                            <FieldError>{form.errors.summary}</FieldError>
                        </Field>
                        <Field>
                            <FieldLabel>Campaign</FieldLabel>
                            <Select
                                value={form.data.campaign_id || 'none'}
                                onValueChange={(value) => form.setData('campaign_id', value === 'none' ? '' : value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="none">No campaign</SelectItem>
                                        {campaigns.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="follow-up">Follow up at</FieldLabel>
                            <Input
                                id="follow-up"
                                type="datetime-local"
                                value={form.data.follow_up_at}
                                onChange={(event) => form.setData('follow_up_at', event.target.value)}
                            />
                        </Field>
                        {form.data.follow_up_at && (
                            <>
                                <Field>
                                    <FieldLabel>Assign follow-up</FieldLabel>
                                    <Select
                                        value={form.data.assigned_to || 'self'}
                                        onValueChange={(value) => form.setData('assigned_to', value === 'self' ? '' : value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="self">Assign to me</SelectItem>
                                                {agents.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field>
                                    <FieldLabel>Priority</FieldLabel>
                                    <Select value={form.data.priority} onValueChange={(value) => form.setData('priority', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {['low', 'normal', 'high', 'urgent'].map((value) => (
                                                    <SelectItem key={value} value={value}>
                                                        {humanize(value)}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                            </>
                        )}
                        {promise && (
                            <>
                                <Field>
                                    <FieldLabel htmlFor="promise-amount">Promised amount</FieldLabel>
                                    <Input
                                        id="promise-amount"
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={form.data.promise_amount}
                                        onChange={(event) => form.setData('promise_amount', event.target.value)}
                                    />
                                    <FieldError>{form.errors.promise_amount}</FieldError>
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="promise-date">Promise date</FieldLabel>
                                    <Input
                                        id="promise-date"
                                        type="date"
                                        value={form.data.promise_date}
                                        onChange={(event) => form.setData('promise_date', event.target.value)}
                                    />
                                    <FieldError>{form.errors.promise_date}</FieldError>
                                </Field>
                                <Field>
                                    <FieldLabel>Client account</FieldLabel>
                                    <Select
                                        value={form.data.promise_account_id || 'none'}
                                        onValueChange={(value) => form.setData('promise_account_id', value === 'none' ? '' : value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="none">No linked account</SelectItem>
                                                {allocations
                                                    .filter((item) => item.accountId)
                                                    .map((item) => (
                                                        <SelectItem key={item.accountId} value={String(item.accountId)}>
                                                            {item.accountNo} · Stand {item.standNo}
                                                        </SelectItem>
                                                    ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="promise-notes">Promise notes</FieldLabel>
                                    <Input
                                        id="promise-notes"
                                        value={form.data.promise_notes}
                                        onChange={(event) => form.setData('promise_notes', event.target.value)}
                                    />
                                </Field>
                            </>
                        )}
                    </FieldGroup>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            Save interaction
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export function TaskDialog({ client, agents, canAssign }: { client: { id: number }; agents: Option[]; canAssign: boolean }) {
    const [open, setOpen] = useState(false);
    const form = useForm({ task_type: 'callback', assigned_to: '', due_at: '', priority: 'normal', notes: '' });
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(`/call-centre/clients/${client.id}/tasks`, {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setOpen(false);
            },
        });
    };
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Plus data-icon="inline-start" /> Add follow-up
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create follow-up task</DialogTitle>
                    <DialogDescription>Add a dated next action to the branch work queue.</DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="flex flex-col gap-5">
                    <FieldGroup className="gap-4">
                        <Field>
                            <FieldLabel>Task type</FieldLabel>
                            <Select value={form.data.task_type} onValueChange={(value) => form.setData('task_type', value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {['callback', 'payment_reminder', 'documentation', 'complaint', 'escalation', 'installment_reminder'].map(
                                            (value) => (
                                                <SelectItem key={value} value={value}>
                                                    {humanize(value)}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="task-due">Due at</FieldLabel>
                            <Input
                                id="task-due"
                                type="datetime-local"
                                value={form.data.due_at}
                                onChange={(event) => form.setData('due_at', event.target.value)}
                            />
                            <FieldError>{form.errors.due_at}</FieldError>
                        </Field>
                        <Field>
                            <FieldLabel>Priority</FieldLabel>
                            <Select value={form.data.priority} onValueChange={(value) => form.setData('priority', value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {['low', 'normal', 'high', 'urgent'].map((value) => (
                                            <SelectItem key={value} value={value}>
                                                {humanize(value)}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </Field>
                        {canAssign && (
                            <Field>
                                <FieldLabel>Assignee</FieldLabel>
                                <Select
                                    value={form.data.assigned_to || 'self'}
                                    onValueChange={(value) => form.setData('assigned_to', value === 'self' ? '' : value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="self">Assign to me</SelectItem>
                                            {agents.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>
                        )}
                        <Field>
                            <FieldLabel htmlFor="task-notes">Notes</FieldLabel>
                            <Textarea id="task-notes" value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} />
                        </Field>
                    </FieldGroup>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            Create task
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function CallCentreClient({
    client,
    allocations,
    charges,
    installments,
    payments,
    interactions,
    tasks,
    promises,
    agents,
    campaigns,
    permissions,
}: Props) {
    const { flash } = usePage<SharedData>().props;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Call centre', href: '/call-centre' },
        { title: client.name, href: `/call-centre/clients/${client.id}` },
    ];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${client.name} · Call centre`} />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <Button variant="ghost" size="sm" className="mb-1 -ml-3" asChild>
                            <Link href="/call-centre">
                                <ArrowLeft data-icon="inline-start" /> Call centre
                            </Link>
                        </Button>
                        <div className="flex items-center gap-2">
                            <UserRound className="size-5" />
                            <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
                            <Badge variant="outline">{client.clientNo}</Badge>
                        </div>
                        <p className="text-muted-foreground mt-1">
                            {client.branch} · {humanize(client.status)} · {client.phone || 'No primary phone'}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {client.phone && (
                            <Button variant="outline" asChild>
                                <a href={`tel:${client.phone}`}>
                                    <Phone data-icon="inline-start" /> Call client
                                </a>
                            </Button>
                        )}
                        {permissions.manageTasks && <TaskDialog client={client} agents={agents} canAssign={permissions.assignTasks} />}
                        {permissions.createInteractions && (
                            <InteractionDialog client={client} allocations={allocations} agents={agents} campaigns={campaigns} />
                        )}
                    </div>
                </div>
                {flash?.success && (
                    <Alert>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                            <CardDescription>Outstanding balance</CardDescription>
                            <CircleDollarSign className="text-muted-foreground size-4" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-semibold">{money(client.outstanding, client.currency)}</p>
                            <p className="text-muted-foreground mt-1 text-xs">Across all active charges</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                            <CardDescription>Oldest overdue</CardDescription>
                            <CalendarClock className="text-muted-foreground size-4" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-semibold">{client.daysOverdue} days</p>
                            <p className="text-muted-foreground mt-1 text-xs">{humanize(client.agingBucket)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                            <CardDescription>Active allocations</CardDescription>
                            <MapPin className="text-muted-foreground size-4" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-semibold">{allocations.filter((item) => item.status === 'active').length}</p>
                            <p className="text-muted-foreground mt-1 text-xs">{allocations.map((item) => item.standNo).join(', ') || 'No stands'}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                            <CardDescription>Open follow-ups</CardDescription>
                            <ClipboardList className="text-muted-foreground size-4" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-semibold">{tasks.filter((task) => ['open', 'in_progress'].includes(task.status)).length}</p>
                            <p className="text-muted-foreground mt-1 text-xs">
                                {promises.filter((promise) => promise.status === 'open').length} open promises
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.7fr)]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Installment schedule</CardTitle>
                            <CardDescription>Contract installments, amounts paid and the next due dates.</CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Stand</TableHead>
                                        <TableHead>Installment</TableHead>
                                        <TableHead>Due</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Paid</TableHead>
                                        <TableHead className="text-right">Balance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {installments.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                                                No installment plan is linked to this client.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {installments.map((item) => {
                                        const allocation = allocations.find((row) => row.id === item.allocationId);
                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell>{allocation?.standNo || '—'}</TableCell>
                                                <TableCell>#{item.sequence}</TableCell>
                                                <TableCell className={item.overdue ? 'text-destructive font-medium' : ''}>
                                                    {formatDate(item.dueDate)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={item.overdue ? 'destructive' : 'outline'}>{humanize(item.status)}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">{money(item.amountPaid, item.currency)}</TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {money(Math.max(0, item.amountDue - item.amountPaid), item.currency)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Contact details</CardTitle>
                            <CardDescription>Verified channels available for this client.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            {client.contacts.length === 0 && (
                                <p className="text-muted-foreground py-8 text-center">No additional contacts recorded.</p>
                            )}
                            {client.contacts.map((contact, index) => (
                                <div key={`${contact.type}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                                    <div className="flex items-center gap-3">
                                        {contact.type === 'email' ? (
                                            <Mail className="text-muted-foreground size-4" />
                                        ) : (
                                            <Phone className="text-muted-foreground size-4" />
                                        )}
                                        <div>
                                            <p className="font-medium">{contact.value}</p>
                                            <p className="text-muted-foreground text-xs">{humanize(contact.type)}</p>
                                        </div>
                                    </div>
                                    {contact.primary && <Badge variant="secondary">Primary</Badge>}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                    <Card>
                        <CardHeader className="flex flex-row items-start justify-between gap-3">
                            <div>
                                <CardTitle>Promises to pay</CardTitle>
                                <CardDescription>Commitments captured during collection conversations.</CardDescription>
                            </div>
                            <Check className="text-muted-foreground size-5" />
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            {promises.length === 0 && <p className="text-muted-foreground py-10 text-center">No payment promises recorded.</p>}
                            {promises.map((promise) => (
                                <div
                                    key={promise.id}
                                    className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div>
                                        <p className="font-medium">
                                            {money(promise.amount, promise.currency)} by {formatDate(promise.dueDate)}
                                        </p>
                                        <p className="text-muted-foreground text-xs">
                                            Recorded by {promise.createdBy || 'System'}
                                            {promise.notes ? ` · ${promise.notes}` : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant={
                                                promise.status === 'broken' ? 'destructive' : promise.status === 'fulfilled' ? 'default' : 'outline'
                                            }
                                        >
                                            {humanize(promise.status)}
                                        </Badge>
                                        {permissions.manageTasks && promise.status === 'open' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.patch(`/call-centre/promises/${promise.id}`, { status: 'fulfilled' })}
                                            >
                                                Mark fulfilled
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Open charges</CardTitle>
                            <CardDescription>Current debt and its allocation status.</CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Due</TableHead>
                                        <TableHead className="text-right">Charged</TableHead>
                                        <TableHead className="text-right">Outstanding</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {charges
                                        .filter((charge) => charge.outstanding > 0)
                                        .map((charge) => (
                                            <TableRow key={charge.id}>
                                                <TableCell>{charge.description}</TableCell>
                                                <TableCell>
                                                    {formatDate(charge.dueDate)}
                                                    {charge.daysOverdue > 0 && (
                                                        <p className="text-destructive text-xs">{charge.daysOverdue} days overdue</p>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">{money(charge.amount, charge.currency)}</TableCell>
                                                <TableCell className="text-right font-medium">{money(charge.outstanding, charge.currency)}</TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.75fr)]">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="size-4" /> Interaction timeline
                            </CardTitle>
                            <CardDescription>Chronological call, message and visit history.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            {interactions.length === 0 && <p className="text-muted-foreground py-12 text-center">No interactions recorded yet.</p>}
                            {interactions.map((item) => (
                                <div key={item.id} className="relative border-l pl-5">
                                    <span className="bg-primary border-background absolute top-1.5 -left-1.5 size-3 rounded-full border-2" />
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-medium">{humanize(item.outcome)}</p>
                                        <Badge variant="outline">{humanize(item.channel)}</Badge>
                                        <Badge variant="secondary">{humanize(item.direction)}</Badge>
                                    </div>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        {formatDateTime(item.occurredAt)} · {item.agent || 'System'}
                                        {item.campaign ? ` · ${item.campaign}` : ''}
                                    </p>
                                    <p className="mt-2">{item.summary}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                    <div className="flex flex-col gap-5">
                        <Card>
                            <CardHeader>
                                <CardTitle>Follow-up tasks</CardTitle>
                                <CardDescription>Next actions for this client.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3">
                                {tasks.length === 0 && <p className="text-muted-foreground py-8 text-center">No follow-ups recorded.</p>}
                                {tasks.map((task) => (
                                    <div key={task.id} className="rounded-lg border p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-medium">{humanize(task.taskType)}</p>
                                                <p className={`text-xs ${task.overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                                                    {formatDateTime(task.dueAt)} · {task.assignee || 'Unassigned'}
                                                </p>
                                            </div>
                                            <Badge variant={task.priority === 'urgent' ? 'destructive' : 'outline'}>{task.priority}</Badge>
                                        </div>
                                        {task.notes && <p className="text-muted-foreground mt-2 text-xs">{task.notes}</p>}
                                        {permissions.manageTasks && !['completed', 'cancelled'].includes(task.status) && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="mt-2"
                                                onClick={() => router.patch(`/call-centre/tasks/${task.id}`, { status: 'completed' })}
                                            >
                                                <Check data-icon="inline-start" /> Complete
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ReceiptText className="size-4" /> Payment timeline
                                </CardTitle>
                                <CardDescription>Latest approved receipts.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3">
                                {payments.length === 0 && <p className="text-muted-foreground py-8 text-center">No approved payments found.</p>}
                                {payments.map((payment) => (
                                    <div key={payment.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                                        <div>
                                            <p className="font-medium">{payment.method || 'Payment'}</p>
                                            <p className="text-muted-foreground text-xs">
                                                {formatDateTime(payment.receivedAt)} · {payment.reference || 'No reference'}
                                            </p>
                                        </div>
                                        <p className="font-semibold">{money(payment.amount, payment.currency)}</p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="size-4" /> Stands and accounts
                        </CardTitle>
                        <CardDescription>Allocated properties and linked receivable accounts.</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Stand</TableHead>
                                    <TableHead>Development</TableHead>
                                    <TableHead>Account</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Sale value</TableHead>
                                    <TableHead />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allocations.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.standNo}</TableCell>
                                        <TableCell>{item.development}</TableCell>
                                        <TableCell>{item.accountNo || '—'}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{humanize(item.status)}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">{money(item.price, item.currency)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/administration/stand-allocations/${item.id}`}>Allocation details</Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
