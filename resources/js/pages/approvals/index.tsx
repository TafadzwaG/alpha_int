import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Check, Clock3, ExternalLink, Eye, LoaderCircle, ReceiptText, ShieldCheck, WalletCards, X } from 'lucide-react';
import { FormEvent, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Approval queue', href: '/approvals' }];

type Approval = {
    id: number;
    workflow_type: string;
    status: string;
    submitted_at: string | null;
    completed_at: string | null;
    branch: string | null;
    maker: string | null;
    is_maker: boolean;
    required_role: string | null;
    expense: {
        id: number;
        expense_no: string;
        payee: string;
        purpose: string;
        amount: number;
        currency_code: string;
        incurred_at: string | null;
    } | null;
    payment: {
        id: number;
        reference: string;
        client: string;
        account: string | null;
        amount: number;
        currency_code: string;
        method: string | null;
        received_at: string | null;
        notes: string | null;
        status: string;
        allocations: { id: number; charge: string; amount: number }[];
        allocated_amount: number;
        unallocated_amount: number;
    } | null;
    payment_reversal: {
        payment_id: number;
        reference: string;
        amount: number;
        currency_code: string;
        reason: string;
    } | null;
    last_action: { action: string; actor: string | null; note: string | null; acted_at: string | null } | null;
};

type Props = {
    approvals: Approval[];
    canApproveExpenses: boolean;
    canApprovePayments: boolean;
    summary: { pending: number; pendingValue: number; approved: number; rejected: number };
};

const money = (value: number, currency = 'USD') => new Intl.NumberFormat('en-ZW', { style: 'currency', currency }).format(value);
const date = (value: string | null) =>
    value ? new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

export default function ApprovalQueue({ approvals, canApproveExpenses, canApprovePayments, summary }: Props) {
    const [selected, setSelected] = useState<Approval | null>(null);
    const [reviewing, setReviewing] = useState<Approval | null>(null);
    const form = useForm<{ action: 'approve' | 'reject'; note: string }>({ action: 'approve', note: '' });
    const pending = approvals.filter((approval) => approval.status === 'pending');
    const completed = approvals.filter((approval) => approval.status !== 'pending');
    const reference = (approval: Approval) =>
        approval.expense?.expense_no ?? approval.payment?.reference ?? approval.payment_reversal?.reference ?? 'Request';
    const subject = (approval: Approval) =>
        approval.expense?.payee ?? approval.payment?.client ?? (approval.payment_reversal ? 'Payment reversal' : '—');
    const purpose = (approval: Approval) =>
        approval.expense?.purpose ??
        (approval.payment
            ? `${approval.payment.method ?? 'Payment'} received for ${approval.payment.account ?? 'client account'}`
            : (approval.payment_reversal?.reason ?? '—'));
    const value = (approval: Approval) => {
        const item = approval.expense ?? approval.payment ?? approval.payment_reversal;
        return item ? money(item.amount, item.currency_code) : '—';
    };
    const canDecide = (approval: Approval) => {
        const paymentWorkflow = ['payment_approval', 'payment_reversal'].includes(approval.workflow_type);
        return paymentWorkflow ? !approval.is_maker && canApprovePayments : canApproveExpenses;
    };

    const openDecision = (approval: Approval, action: 'approve' | 'reject') => {
        setReviewing(null);
        setSelected(approval);
        form.setData({ action, note: '' });
        form.clearErrors();
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!selected) return;
        form.post(`/approvals/${selected.id}/decision`, { onSuccess: () => setSelected(null) });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Approval queue" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
                    <div>
                        <Badge variant="secondary" className="mb-2">
                            Maker-checker control
                        </Badge>
                        <h1 className="text-2xl font-semibold tracking-tight">Approval queue</h1>
                        <p className="text-muted-foreground mt-1 max-w-2xl">
                            Review submitted expenditure, client receipts and sensitive payment reversals before they affect balances or the ledger.
                        </p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href="/administration/expenses">View expense register</Link>
                    </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        { label: 'Pending requests', value: summary.pending.toLocaleString(), Icon: Clock3 },
                        { label: 'Pending value', value: money(summary.pendingValue), Icon: ReceiptText },
                        { label: 'Approved', value: summary.approved.toLocaleString(), Icon: Check },
                        { label: 'Rejected', value: summary.rejected.toLocaleString(), Icon: X },
                    ].map(({ label, value, Icon }) => (
                        <Card key={label}>
                            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                                <CardDescription>{label}</CardDescription>
                                <Icon className="text-muted-foreground size-4" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-xl font-semibold">{String(value)}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Awaiting decision</CardTitle>
                        <CardDescription>Requests are ordered by submission date, newest first.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Request</TableHead>
                                    <TableHead>Submitted by</TableHead>
                                    <TableHead>Purpose</TableHead>
                                    <TableHead>Submitted</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pending.map((approval) => (
                                    <TableRow
                                        key={approval.id}
                                        className={approval.payment ? 'border-l-4 border-l-amber-400 bg-amber-50/60 dark:bg-amber-950/15' : ''}
                                    >
                                        <TableCell>
                                            <p className="font-medium">{reference(approval)}</p>
                                            <p className="text-muted-foreground text-xs">
                                                {subject(approval)} · {approval.branch}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            <p>{approval.maker}</p>
                                            <p className="text-muted-foreground text-xs">{approval.required_role ?? 'Authorized approver'}</p>
                                        </TableCell>
                                        <TableCell className="max-w-xs">
                                            <p className="truncate">{purpose(approval)}</p>
                                        </TableCell>
                                        <TableCell>{date(approval.submitted_at)}</TableCell>
                                        <TableCell className="text-right font-medium">{value(approval)}</TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-2">
                                                {approval.payment && (
                                                    <Button size="sm" variant="outline" onClick={() => setReviewing(approval)}>
                                                        <Eye data-icon="inline-start" />
                                                        Review
                                                    </Button>
                                                )}
                                                {canDecide(approval) ? (
                                                    <>
                                                        <Button size="sm" variant="outline" onClick={() => openDecision(approval, 'reject')}>
                                                            <X data-icon="inline-start" />
                                                            Reject
                                                        </Button>
                                                        <Button size="sm" onClick={() => openDecision(approval, 'approve')}>
                                                            <Check data-icon="inline-start" />
                                                            Approve
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">View only</span>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {pending.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                                            No approval requests are waiting.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Decision history</CardTitle>
                        <CardDescription>Recently completed approval requests and recorded reviewer notes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Request</TableHead>
                                    <TableHead>Decision</TableHead>
                                    <TableHead>Reviewer</TableHead>
                                    <TableHead>Note</TableHead>
                                    <TableHead>Completed</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {completed.slice(0, 10).map((approval) => (
                                    <TableRow key={approval.id}>
                                        <TableCell>
                                            <p className="font-medium">{reference(approval)}</p>
                                            <p className="text-muted-foreground text-xs">{subject(approval)}</p>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={approval.status === 'approved' ? 'default' : 'destructive'}>{approval.status}</Badge>
                                        </TableCell>
                                        <TableCell>{approval.last_action?.actor ?? '—'}</TableCell>
                                        <TableCell className="max-w-xs">
                                            <p className="truncate">{approval.last_action?.note ?? '—'}</p>
                                        </TableCell>
                                        <TableCell>{date(approval.completed_at)}</TableCell>
                                        <TableCell className="text-right font-medium">{value(approval)}</TableCell>
                                    </TableRow>
                                ))}
                                {completed.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                                            No decisions recorded yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={Boolean(reviewing)} onOpenChange={(open) => !open && setReviewing(null)}>
                <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="size-5 text-amber-600" aria-hidden="true" />
                            Payment approval review
                        </DialogTitle>
                        <DialogDescription>Confirm the payer, amount, allocation and supporting details before making a decision.</DialogDescription>
                    </DialogHeader>
                    {reviewing?.payment && (
                        <div className="space-y-5">
                            <section className="grid gap-3 rounded-xl border border-amber-300 bg-amber-50/70 p-4 sm:grid-cols-3 dark:border-amber-900 dark:bg-amber-950/20">
                                <div>
                                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Client</p>
                                    <p className="mt-1 font-semibold">{reviewing.payment.client}</p>
                                    <p className="text-muted-foreground text-xs">{reviewing.payment.account}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Payment received</p>
                                    <p className="mt-1 text-xl font-semibold tabular-nums">
                                        {money(reviewing.payment.amount, reviewing.payment.currency_code)}
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                        {reviewing.payment.method ?? 'Method not recorded'} · {date(reviewing.payment.received_at)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Control</p>
                                    <p className="mt-1 font-semibold">Independent approval required</p>
                                    <p className="text-muted-foreground text-xs">Recorded by {reviewing.maker ?? 'Unknown user'}</p>
                                </div>
                            </section>

                            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.8fr)]">
                                <section className="overflow-hidden rounded-xl border">
                                    <div className="border-b px-4 py-3">
                                        <h3 className="flex items-center gap-2 font-semibold">
                                            <ReceiptText className="size-4 text-blue-600" aria-hidden="true" />
                                            Proposed allocation
                                        </h3>
                                    </div>
                                    <div className="divide-y">
                                        {reviewing.payment.allocations.map((allocation) => (
                                            <div key={allocation.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                                                <span>{allocation.charge}</span>
                                                <strong className="tabular-nums">{money(allocation.amount, reviewing.payment!.currency_code)}</strong>
                                            </div>
                                        ))}
                                        {reviewing.payment.allocations.length === 0 && (
                                            <p className="text-muted-foreground px-4 py-6 text-center text-sm">No charge allocation was proposed.</p>
                                        )}
                                    </div>
                                </section>
                                <section className="rounded-xl border p-4">
                                    <h3 className="flex items-center gap-2 font-semibold">
                                        <WalletCards className="size-4 text-emerald-600" aria-hidden="true" />
                                        Payment split
                                    </h3>
                                    <dl className="mt-4 space-y-3 text-sm">
                                        <div className="flex justify-between gap-4">
                                            <dt className="text-muted-foreground">Applied to charges</dt>
                                            <dd className="font-semibold tabular-nums">
                                                {money(reviewing.payment.allocated_amount, reviewing.payment.currency_code)}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between gap-4 border-t pt-3">
                                            <dt className="text-muted-foreground">Left on account</dt>
                                            <dd className="font-semibold tabular-nums">
                                                {money(reviewing.payment.unallocated_amount, reviewing.payment.currency_code)}
                                            </dd>
                                        </div>
                                    </dl>
                                    {reviewing.payment.notes && (
                                        <div className="mt-4 border-t pt-4">
                                            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Cashier note</p>
                                            <p className="mt-2 text-sm whitespace-pre-wrap">{reviewing.payment.notes}</p>
                                        </div>
                                    )}
                                </section>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="mt-1 flex-wrap sm:justify-between">
                        <Button type="button" variant="outline" onClick={() => setReviewing(null)}>
                            Close
                        </Button>
                        <div className="flex flex-wrap justify-end gap-2">
                            {reviewing?.payment && (
                                <Button variant="outline" asChild>
                                    <Link href={`/administration/payments/${reviewing.payment.id}`}>
                                        <ExternalLink className="size-4" />
                                        Open full payment
                                    </Link>
                                </Button>
                            )}
                            {reviewing && canDecide(reviewing) && (
                                <>
                                    <Button variant="destructive" onClick={() => openDecision(reviewing, 'reject')}>
                                        <X className="size-4" />
                                        Reject
                                    </Button>
                                    <Button onClick={() => openDecision(reviewing, 'approve')}>
                                        <Check className="size-4" />
                                        Approve
                                    </Button>
                                </>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && !form.processing && setSelected(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {form.data.action === 'approve' ? 'Approve' : 'Reject'}{' '}
                            {selected?.payment_reversal ? 'payment reversal' : selected?.payment ? 'client payment' : 'expense'}
                        </DialogTitle>
                        <DialogDescription>
                            {selected ? reference(selected) : 'Request'} for {selected ? value(selected) : '—'} will be marked as{' '}
                            {form.data.action === 'approve' ? 'approved' : 'rejected'}.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="flex flex-col gap-4">
                        <FieldGroup>
                            <Field data-invalid={Boolean(form.errors.note)}>
                                <FieldLabel htmlFor="note">Decision note</FieldLabel>
                                <Textarea
                                    id="note"
                                    value={form.data.note}
                                    onChange={(event) => form.setData('note', event.target.value)}
                                    aria-invalid={Boolean(form.errors.note)}
                                    placeholder="Add context for the audit trail."
                                />
                                <FieldError>{form.errors.note}</FieldError>
                            </Field>
                        </FieldGroup>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setSelected(null)} disabled={form.processing}>
                                Cancel
                            </Button>
                            <Button type="submit" variant={form.data.action === 'reject' ? 'destructive' : 'default'} disabled={form.processing}>
                                {form.processing && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                                {form.data.action === 'approve' ? 'Approve request' : 'Reject request'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
