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
import { Check, Clock3, ReceiptText, X } from 'lucide-react';
import { FormEvent, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Approval queue', href: '/approvals' }];

type Approval = {
    id: number;
    status: string;
    submitted_at: string | null;
    completed_at: string | null;
    branch: string | null;
    maker: string | null;
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
    last_action: { action: string; actor: string | null; note: string | null; acted_at: string | null } | null;
};

type Props = {
    approvals: Approval[];
    summary: { pending: number; pendingValue: number; approved: number; rejected: number };
};

const money = (value: number, currency = 'USD') => new Intl.NumberFormat('en-ZW', { style: 'currency', currency }).format(value);
const date = (value: string | null) =>
    value ? new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

export default function ApprovalQueue({ approvals, summary }: Props) {
    const [selected, setSelected] = useState<Approval | null>(null);
    const form = useForm<{ action: 'approve' | 'reject'; note: string }>({ action: 'approve', note: '' });
    const pending = approvals.filter((approval) => approval.status === 'pending');
    const completed = approvals.filter((approval) => approval.status !== 'pending');

    const openDecision = (approval: Approval, action: 'approve' | 'reject') => {
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
            <Head title="Expense approval queue" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
                    <div>
                        <Badge variant="secondary" className="mb-2">
                            Maker-checker control
                        </Badge>
                        <h1 className="text-2xl font-semibold tracking-tight">Expense approval queue</h1>
                        <p className="text-muted-foreground mt-1 max-w-2xl">
                            Review submitted expenditure before it can be paid or posted to petty cash.
                        </p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href="/administration/expenses">View expense register</Link>
                    </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        ['Pending requests', summary.pending.toLocaleString(), Clock3],
                        ['Pending value', money(summary.pendingValue), ReceiptText],
                        ['Approved', summary.approved.toLocaleString(), Check],
                        ['Rejected', summary.rejected.toLocaleString(), X],
                    ].map(([label, value, Icon]) => (
                        <Card key={String(label)}>
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
                                    <TableHead>Expense</TableHead>
                                    <TableHead>Submitted by</TableHead>
                                    <TableHead>Purpose</TableHead>
                                    <TableHead>Submitted</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pending.map((approval) => (
                                    <TableRow key={approval.id}>
                                        <TableCell>
                                            <p className="font-medium">{approval.expense?.expense_no}</p>
                                            <p className="text-muted-foreground text-xs">
                                                {approval.expense?.payee} · {approval.branch}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            <p>{approval.maker}</p>
                                            <p className="text-muted-foreground text-xs">{approval.required_role ?? 'Authorized approver'}</p>
                                        </TableCell>
                                        <TableCell className="max-w-xs">
                                            <p className="truncate">{approval.expense?.purpose}</p>
                                        </TableCell>
                                        <TableCell>{date(approval.submitted_at)}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            {approval.expense ? money(approval.expense.amount, approval.expense.currency_code) : '—'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" variant="outline" onClick={() => openDecision(approval, 'reject')}>
                                                    <X data-icon="inline-start" />
                                                    Reject
                                                </Button>
                                                <Button size="sm" onClick={() => openDecision(approval, 'approve')}>
                                                    <Check data-icon="inline-start" />
                                                    Approve
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {pending.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                                            No expense approvals are waiting.
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
                                    <TableHead>Expense</TableHead>
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
                                            <p className="font-medium">{approval.expense?.expense_no}</p>
                                            <p className="text-muted-foreground text-xs">{approval.expense?.payee}</p>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={approval.status === 'approved' ? 'default' : 'destructive'}>{approval.status}</Badge>
                                        </TableCell>
                                        <TableCell>{approval.last_action?.actor ?? '—'}</TableCell>
                                        <TableCell className="max-w-xs">
                                            <p className="truncate">{approval.last_action?.note ?? '—'}</p>
                                        </TableCell>
                                        <TableCell>{date(approval.completed_at)}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            {approval.expense ? money(approval.expense.amount, approval.expense.currency_code) : '—'}
                                        </TableCell>
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

            <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{form.data.action === 'approve' ? 'Approve expense' : 'Reject expense'}</DialogTitle>
                        <DialogDescription>
                            {selected?.expense?.expense_no} for{' '}
                            {selected?.expense ? money(selected.expense.amount, selected.expense.currency_code) : '—'} will be marked as{' '}
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
                            <Button type="button" variant="outline" onClick={() => setSelected(null)}>
                                Cancel
                            </Button>
                            <Button type="submit" variant={form.data.action === 'reject' ? 'destructive' : 'default'} disabled={form.processing}>
                                {form.data.action === 'approve' ? 'Approve expense' : 'Reject expense'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
