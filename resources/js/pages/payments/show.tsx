import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Banknote,
    CalendarDays,
    CheckCircle2,
    ClipboardList,
    Clock3,
    CreditCard,
    FileDown,
    FileText,
    Hash,
    Landmark,
    LoaderCircle,
    MapPin,
    Phone,
    Printer,
    ReceiptText,
    ShieldCheck,
    Undo2,
    UserCheck,
    UserRound,
    Wallet,
    XCircle,
    type LucideIcon,
} from 'lucide-react';
import { FormEvent, useState } from 'react';

type Payment = {
    id: number;
    client_id: number;
    client: string;
    client_no: string;
    branch: string;
    account: string;
    amount: number;
    currency: string;
    method: string;
    reference: string | null;
    received_at: string;
    status: string;
    notes: string | null;
    recorded_by: string | null;
    approved_by: string | null;
    approved_at: string | null;
    receipt_no: string | null;
    receipt_available: boolean;
    can_request_reversal: boolean;
    approval_request_id: number | null;
    approval_required_role: string | null;
    can_approve: boolean;
    is_maker: boolean;
    reversal: {
        status: string;
        reason: string;
        requested_by: string | null;
        reversed_by: string | null;
        reversed_at: string | null;
        receipt_no: string | null;
    } | null;
};
type ReceiptDocument = {
    company: string;
    trading_name: string;
    number: string;
    issued_at: string | null;
    received_at: string | null;
    client: string;
    client_no: string;
    account: string;
    branch: string;
    method: string;
    reference: string | null;
    currency: string;
    amount: number;
    lines: { description: string; installment: number | null; amount: number }[];
    issued_by: string;
    notes: string | null;
    qr: string;
};
type Props = {
    payment: Payment;
    paymentContext: {
        phone: string | null;
        client_status: string;
        stand: string | null;
        development: string | null;
        allocation_status: string | null;
    };
    receiptDocument: ReceiptDocument | null;
    allocations: { id: number; charge: string; installment: number | null; amount: number }[];
    verified?: boolean;
};
const date = (value: string | null) =>
    value ? new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium', timeZone: 'Africa/Harare' }).format(new Date(value)) : '—';
const amount = (value: number, currency: string) =>
    `${currency} ${new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
const actionStyle = 'bg-neutral-800 text-white hover:bg-neutral-700 focus-visible:ring-neutral-500';

const detailIcons: Record<string, LucideIcon> = {
    'Client number': Hash,
    Phone,
    Branch: MapPin,
    Account: Wallet,
    'Payment method': CreditCard,
    'Date received': CalendarDays,
    Reference: Hash,
    'Receipt number': ReceiptText,
    'Payment status': ShieldCheck,
    'Recorded by': UserRound,
    'Approved by': UserCheck,
};
function DetailLabel({ label }: { label: string | null }) {
    const Icon = detailIcons[label ?? ''] ?? FileText;
    return (
        <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Icon aria-hidden="true" className="size-3.5 shrink-0" />
            {label}
        </dt>
    );
}

export default function PaymentShow({ payment, paymentContext, receiptDocument: doc, allocations, verified }: Props) {
    const [reversalOpen, setReversalOpen] = useState(false);
    const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
    const reversalForm = useForm({ reason: '' });
    const decisionForm = useForm<{ action: 'approve' | 'reject'; note: string }>({ action: 'approve', note: '' });
    const submitReversal = (event: FormEvent) => {
        event.preventDefault();
        reversalForm.post(`/administration/payments/${payment.id}/reversals`, {
            preserveScroll: true,
            onSuccess: () => {
                setReversalOpen(false);
                reversalForm.reset();
            },
        });
    };
    const openDecision = (action: 'approve' | 'reject') => {
        setDecision(action);
        decisionForm.setData({ action, note: '' });
        decisionForm.clearErrors();
    };
    const submitDecision = (event: FormEvent) => {
        event.preventDefault();
        if (!payment.approval_request_id) return;
        decisionForm.post(`/approvals/${payment.approval_request_id}/decision`, {
            preserveScroll: true,
            onSuccess: () => setDecision(null),
        });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Payments', href: '/administration/payments' },
                { title: doc?.number ?? payment.reference ?? `Payment #${payment.id}`, href: `/administration/payments/${payment.id}` },
            ]}
        >
            <Head title={doc ? `Receipt ${doc.number}` : `Payment #${payment.id}`} />
            <div className="flex min-w-0 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button className={actionStyle} asChild>
                        <Link href="/administration/payments">
                            <ArrowLeft className="size-4" />
                            All payments
                        </Link>
                    </Button>
                    <div className="flex flex-wrap gap-2">
                        {payment.can_approve && (
                            <>
                                <Button variant="destructive" onClick={() => openDecision('reject')}>
                                    <XCircle className="size-4" />
                                    Reject payment
                                </Button>
                                <Button onClick={() => openDecision('approve')}>
                                    <CheckCircle2 className="size-4" />
                                    Approve payment
                                </Button>
                            </>
                        )}
                        <Button className={actionStyle} asChild>
                            <Link href={`/administration/clients/${payment.client_id}`}>
                                <UserRound className="size-4" />
                                Client profile
                            </Link>
                        </Button>
                        {payment.receipt_available && (
                            <>
                                <Button className={actionStyle} asChild>
                                    <a href={`/administration/payments/${payment.id}/receipt/print`} target="_blank" rel="noreferrer">
                                        <Printer className="size-4" />
                                        Print POS receipt
                                    </a>
                                </Button>
                                <Button className={actionStyle} asChild>
                                    <a href={`/administration/payments/${payment.id}/receipt`}>
                                        <FileDown className="size-4" />
                                        Download receipt PDF
                                    </a>
                                </Button>
                            </>
                        )}
                        {payment.can_request_reversal && (
                            <Button variant="destructive" onClick={() => setReversalOpen(true)}>
                                <Undo2 className="size-4" />
                                Request reversal
                            </Button>
                        )}
                    </div>
                </div>
                {verified && (
                    <div role="status" className="flex items-start gap-2 rounded-lg border p-4 text-sm">
                        <ShieldCheck className="size-5 shrink-0" />
                        Receipt reference verified. Current payment status: {payment.status}.
                    </div>
                )}
                {payment.status === 'pending' && (
                    <div
                        role="status"
                        className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
                    >
                        <div className="flex items-start gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-200/70 dark:bg-amber-900">
                                <Clock3 className="size-4" aria-hidden="true" />
                            </span>
                            <div>
                                <p className="font-semibold">Payment awaiting independent approval</p>
                                <p className="mt-1 text-sm opacity-80">
                                    {payment.is_maker
                                        ? `You recorded this payment. A different ${payment.approval_required_role ?? 'authorized approver'} must review it.`
                                        : `${payment.approval_required_role ?? 'An authorized approver'} must review it before balances and the ledger change.`}
                                </p>
                            </div>
                        </div>
                        {payment.can_approve && (
                            <Button className="shrink-0" onClick={() => openDecision('approve')}>
                                <CheckCircle2 className="size-4" />
                                Review and approve
                            </Button>
                        )}
                    </div>
                )}
                {!payment.receipt_available && (
                    <div role="status" className={`rounded-lg border p-4 text-sm ${payment.status === 'pending' ? 'sr-only' : ''}`}>
                        Current payment status: <strong className="capitalize">{payment.status}</strong>. A receipt can be downloaded when the payment
                        is approved and a receipt has been issued.
                    </div>
                )}
                <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.4fr)]">
                    <div className="flex min-w-0 flex-col gap-5">
                        <section className="rounded-lg border p-5 sm:p-6">
                            <h1 className="text-xl font-semibold">Payment #{payment.id}</h1>
                            <p className="text-muted-foreground mt-1 text-sm">Client and payment information</p>
                            <div className="mt-5 border-t pt-5">
                                <h2 className="flex items-center gap-2 text-sm font-semibold">
                                    <UserRound aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
                                    Client information
                                </h2>
                                <Link
                                    href={`/administration/clients/${payment.client_id}`}
                                    className="mt-3 block text-lg font-semibold hover:underline"
                                >
                                    {payment.client}
                                </Link>
                                <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
                                    {[
                                        ['Client number', payment.client_no],
                                        ['Phone', paymentContext.phone],
                                        ['Branch', payment.branch],
                                        ['Account', payment.account],
                                    ].map(([label, value]) => (
                                        <div key={label} className="min-w-0">
                                            <DetailLabel label={label} />
                                            <dd className="mt-1 break-words">{value || 'Not recorded'}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        </section>
                        <section className="rounded-lg border p-5 sm:p-6">
                            <h2 className="flex items-center gap-2 text-sm font-semibold">
                                <Banknote aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
                                Payment received
                            </h2>
                            <p className="mt-3 text-3xl font-semibold tabular-nums">{amount(payment.amount, payment.currency)}</p>
                            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                                {[
                                    ['Payment method', payment.method],
                                    ['Date received', date(payment.received_at)],
                                    ['Reference', payment.reference],
                                    ['Receipt number', payment.receipt_no],
                                ].map(([label, value]) => (
                                    <div key={label} className="min-w-0">
                                        <DetailLabel label={label} />
                                        <dd className="mt-1 break-words">{value || '—'}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                        <section className="rounded-lg border p-5 sm:p-6">
                            <h2 className="flex items-center gap-2 text-sm font-semibold">
                                <ClipboardList aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
                                What this payment covered
                            </h2>
                            {paymentContext.stand && (
                                <div className="bg-muted/40 mt-4 rounded-md p-3">
                                    <p className="flex items-center gap-2 font-medium">
                                        <Landmark aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
                                        Stand {paymentContext.stand}
                                    </p>
                                    <p className="text-muted-foreground mt-1 text-sm">{paymentContext.development}</p>
                                </div>
                            )}
                            <div className="mt-3 divide-y">
                                {allocations.map((line) => (
                                    <div key={line.id} className="flex items-start justify-between gap-4 py-4 text-sm">
                                        <div className="min-w-0">
                                            <p className="font-medium">{line.charge}</p>
                                            <p className="text-muted-foreground mt-1 text-xs">
                                                {line.installment ? `Installment #${line.installment}` : 'Account charge'}
                                            </p>
                                        </div>
                                        <strong className="shrink-0 tabular-nums">{amount(line.amount, payment.currency)}</strong>
                                    </div>
                                ))}
                                {!allocations.length && (
                                    <p className="text-muted-foreground py-3 text-sm">This payment has not been allocated to a charge yet.</p>
                                )}
                            </div>
                            {payment.amount - allocations.reduce((sum, line) => sum + line.amount, 0) > 0.005 && (
                                <div className="mt-3 flex justify-between gap-4 border-t pt-4 text-sm">
                                    <span className="text-muted-foreground">Unallocated on account</span>
                                    <strong>
                                        {amount(payment.amount - allocations.reduce((sum, line) => sum + line.amount, 0), payment.currency)}
                                    </strong>
                                </div>
                            )}
                        </section>
                        <section className="w-full rounded-lg border p-5">
                            <h2 className="flex items-center gap-2 text-sm font-semibold">
                                <ShieldCheck aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
                                Internal payment record
                            </h2>
                            <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-3">
                                {[
                                    ['Payment status', payment.status],
                                    ['Recorded by', payment.recorded_by],
                                    ['Approved by', payment.approved_by],
                                ].map(([label, value]) => (
                                    <div key={label}>
                                        <DetailLabel label={label} />
                                        <dd className="mt-1 capitalize">{value || '—'}</dd>
                                    </div>
                                ))}
                            </dl>
                            {payment.notes && (
                                <div className="mt-4 border-t pt-4">
                                    <h3 className="text-xs font-semibold">Internal notes</h3>
                                    <p className="mt-2 text-sm whitespace-pre-wrap">{payment.notes}</p>
                                </div>
                            )}
                            {payment.reversal && (
                                <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                                    <p className="text-sm font-semibold capitalize">Reversal {payment.reversal.status}</p>
                                    <p className="mt-2 text-sm whitespace-pre-wrap">{payment.reversal.reason}</p>
                                    <p className="mt-2 text-xs opacity-80">
                                        Requested by {payment.reversal.requested_by ?? 'Unknown'}
                                        {payment.reversal.reversed_by ? ` · Approved by ${payment.reversal.reversed_by}` : ''}
                                    </p>
                                </div>
                            )}
                        </section>
                    </div>
                    <div className="min-w-0">
                        <h2 className="mb-3 text-sm font-semibold">Receipt preview</h2>
                        {doc ? (
                            <article
                                aria-label="Payment receipt"
                                className="mx-auto w-full max-w-[340px] rounded-sm border border-neutral-300 bg-white px-5 py-6 font-mono text-[12px] leading-5 text-neutral-950 shadow-sm"
                            >
                                <header className="border-b border-dashed border-neutral-500 pb-4 text-center">
                                    <img src="/images/alpha-land-logo.png" alt="Alpha Land" className="mx-auto h-14 w-14 object-contain" />
                                    <p className="mt-2 text-base font-bold tracking-wide">{doc.trading_name}</p>
                                    <p className="mt-1 text-[10px] leading-4 text-neutral-600">{doc.company}</p>
                                    <p className="mt-2 text-[10px] text-neutral-600">{doc.branch}</p>
                                    <h1 className="mt-4 text-lg font-bold tracking-[0.18em]">PAYMENT RECEIPT</h1>
                                    <p className="mt-1 font-bold">{doc.number}</p>
                                </header>
                                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-dashed border-neutral-500 py-4">
                                    <dt>DATE</dt>
                                    <dd className="text-right">{date(doc.received_at)}</dd>
                                    <dt>CLIENT</dt>
                                    <dd className="text-right break-words">{doc.client}</dd>
                                    <dt>CLIENT NO</dt>
                                    <dd className="text-right">{doc.client_no}</dd>
                                    <dt>ACCOUNT</dt>
                                    <dd className="text-right">{doc.account}</dd>
                                    <dt>METHOD</dt>
                                    <dd className="text-right">{doc.method}</dd>
                                    <dt>REFERENCE</dt>
                                    <dd className="text-right break-all">{doc.reference || '—'}</dd>
                                </dl>
                                <div className="border-b border-dashed border-neutral-500 py-4">
                                    <div className="mb-2 flex justify-between font-bold">
                                        <span>DESCRIPTION</span>
                                        <span>AMOUNT</span>
                                    </div>
                                    {doc.lines.map((line, index) => (
                                        <div key={index} className="mb-2">
                                            <p>
                                                {line.description}
                                                {line.installment ? ` / INST #${line.installment}` : ''}
                                            </p>
                                            <p className="text-right tabular-nums">
                                                {doc.currency}{' '}
                                                {new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
                                                    line.amount,
                                                )}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between gap-4 border-b border-double border-neutral-900 py-4 text-sm font-bold">
                                    <span>TOTAL</span>
                                    <strong className="whitespace-nowrap tabular-nums">{amount(doc.amount, doc.currency)}</strong>
                                </div>
                                {doc.notes && (
                                    <section className="border-b border-dashed border-neutral-500 py-4">
                                        <h2 className="font-bold">NOTE</h2>
                                        <p className="mt-1 whitespace-pre-wrap text-neutral-600">{doc.notes}</p>
                                    </section>
                                )}
                                <footer className="pt-4 text-center text-[10px] leading-4 text-neutral-600">
                                    <p className="font-bold text-neutral-900">THANK YOU FOR YOUR PAYMENT</p>
                                    <p className="mt-2">Cashier: {doc.issued_by}</p>
                                    <p>Issued: {date(doc.issued_at)}</p>
                                    <img src={doc.qr} alt="Receipt verification QR code" className="mx-auto mt-3 size-20" />
                                    <p className="mt-2">Scan to verify this receipt</p>
                                    <p className="mt-3">*** POS RECEIPT · KEEP FOR YOUR RECORDS ***</p>
                                </footer>
                            </article>
                        ) : (
                            <section className="rounded-lg border p-6">
                                <h1 className="text-2xl font-semibold">Payment #{payment.id}</h1>
                                <p className="mt-2">
                                    {payment.client} · {payment.account}
                                </p>
                                <p className="mt-4 text-2xl font-semibold">{amount(payment.amount, payment.currency)}</p>
                                <p className="text-muted-foreground mt-2 text-sm">
                                    {payment.method} · {date(payment.received_at)} · {payment.reference || 'No reference'}
                                </p>
                                {allocations.map((line) => (
                                    <div key={line.id} className="mt-4 flex justify-between gap-4 border-t pt-3 text-sm">
                                        <span>{line.charge}</span>
                                        <span>{amount(line.amount, payment.currency)}</span>
                                    </div>
                                ))}
                            </section>
                        )}
                    </div>
                </div>
            </div>
            <Dialog open={decision !== null} onOpenChange={(open) => !open && !decisionForm.processing && setDecision(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{decision === 'approve' ? 'Approve client payment' : 'Reject client payment'}</DialogTitle>
                        <DialogDescription>
                            {decision === 'approve'
                                ? `Approval will post ${amount(payment.amount, payment.currency)} to the client account, ledger and receiving till.`
                                : 'Rejection will return this payment without changing the client balance or ledger.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitDecision} className="space-y-4">
                        <Field data-invalid={Boolean(decisionForm.errors.note)}>
                            <FieldLabel htmlFor="decision-note">Decision note</FieldLabel>
                            <Textarea
                                id="decision-note"
                                value={decisionForm.data.note}
                                onChange={(event) => decisionForm.setData('note', event.target.value)}
                                placeholder="Record what you checked for the audit trail."
                                rows={4}
                            />
                            <FieldError>{decisionForm.errors.note}</FieldError>
                        </Field>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDecision(null)} disabled={decisionForm.processing}>
                                Cancel
                            </Button>
                            <Button type="submit" variant={decision === 'reject' ? 'destructive' : 'default'} disabled={decisionForm.processing}>
                                {decisionForm.processing && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                                {decision === 'approve' ? 'Approve payment' : 'Reject payment'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={reversalOpen} onOpenChange={setReversalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Request payment reversal</DialogTitle>
                        <DialogDescription>
                            This submits {amount(payment.amount, payment.currency)} for independent approval. The ledger is unchanged until another
                            authorized user approves it.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitReversal} className="space-y-4">
                        <Field data-invalid={Boolean(reversalForm.errors.reason)}>
                            <FieldLabel htmlFor="reversal-reason">Reason</FieldLabel>
                            <Textarea
                                id="reversal-reason"
                                value={reversalForm.data.reason}
                                onChange={(event) => reversalForm.setData('reason', event.target.value)}
                                placeholder="Explain why this approved payment must be reversed."
                                rows={5}
                                required
                            />
                            <FieldError>{reversalForm.errors.reason}</FieldError>
                        </Field>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setReversalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="destructive" disabled={reversalForm.processing}>
                                Submit for approval
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
