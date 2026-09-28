import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Building2, CircleDollarSign, ClipboardCheck, HandCoins, Landmark, ReceiptText, Users, WalletCards } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/dashboard' }];

type Props = {
    metrics: {
        portfolioValue: number;
        activeClients: number;
        allocatedStands: number;
        availableStands: number;
        totalCharges: number;
        collections: number;
        outstanding: number;
        approvedExpenses: number;
        pettyCashBalance: number;
        pendingApprovals: number;
    };
    financialTrend: Array<{ month: string; label: string; charges: number; collections: number; expenses: number }>;
    inventory: Array<{ status: string; total: number }>;
    recentPayments: Array<{
        id: number;
        client: string;
        method: string | null;
        branch: string | null;
        amount: number;
        currency: string;
        status: string;
        received_at: string | null;
    }>;
    approvalQueue: Array<{
        id: number;
        expense_no: string;
        payee: string;
        amount: number;
        currency: string;
        branch: string | null;
        submitted_at: string | null;
    }>;
    canViewReports: boolean;
    canViewExpenses: boolean;
    currency: string;
};

const formatMoney = (value: number, currency = 'USD') =>
    new Intl.NumberFormat('en-ZW', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);

const formatDate = (value: string | null) => (value ? new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium' }).format(new Date(value)) : '—');

const statusVariant = (status: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
    if (['approved', 'paid', 'allocated'].includes(status)) return 'default';
    if (['rejected', 'reversed', 'cancelled'].includes(status)) return 'destructive';
    if (['pending', 'submitted'].includes(status)) return 'secondary';
    return 'outline';
};

export default function Dashboard({
    metrics,
    financialTrend,
    inventory,
    recentPayments,
    approvalQueue,
    canViewReports,
    canViewExpenses,
    currency,
}: Props) {
    const trendMaximum = Math.max(...financialTrend.flatMap((item) => [item.charges, item.collections, item.expenses]), 1);
    const inventoryTotal = inventory.reduce((total, item) => total + item.total, 0);
    const metricCards = [
        {
            label: 'Portfolio value',
            value: formatMoney(metrics.portfolioValue, currency),
            detail: `${inventoryTotal} stands tracked`,
            icon: Building2,
        },
        {
            label: 'Active clients',
            value: metrics.activeClients.toLocaleString(),
            detail: `${metrics.allocatedStands} allocated stands`,
            icon: Users,
        },
        {
            label: 'Collections',
            value: formatMoney(metrics.collections, currency),
            detail: `${formatMoney(metrics.outstanding, currency)} outstanding`,
            icon: WalletCards,
        },
        {
            label: 'Approved expenses',
            value: formatMoney(metrics.approvedExpenses, currency),
            detail: `${metrics.pendingApprovals} awaiting approval`,
            icon: ReceiptText,
        },
        { label: 'Available inventory', value: metrics.availableStands.toLocaleString(), detail: 'Ready for allocation', icon: Landmark },
        { label: 'Petty cash balance', value: formatMoney(metrics.pettyCashBalance, currency), detail: 'Current ledger position', icon: HandCoins },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Operations dashboard" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
                    <div>
                        <Badge variant="secondary" className="mb-2">
                            Executive overview
                        </Badge>
                        <h1 className="text-2xl font-semibold tracking-tight">Operations dashboard</h1>
                        <p className="text-muted-foreground mt-1 max-w-2xl">
                            A live view of the property portfolio, collections, expenditure, approvals and cash controls.
                        </p>
                    </div>
                    {canViewReports && (
                        <Button variant="outline" asChild>
                            <Link href="/reports">
                                Open reports <ArrowRight data-icon="inline-end" />
                            </Link>
                        </Button>
                    )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                    {metricCards.map((metric) => (
                        <Card key={metric.label}>
                            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                                <CardDescription>{metric.label}</CardDescription>
                                <metric.icon className="text-muted-foreground size-4" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-xl font-semibold tracking-tight">{metric.value}</p>
                                <p className="text-muted-foreground mt-1 text-xs">{metric.detail}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Financial movement</CardTitle>
                            <CardDescription>Charges, approved collections and approved expenses over the last six months.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <div className="flex items-center gap-4 text-xs">
                                <span className="flex items-center gap-2">
                                    <span className="bg-primary size-2 rounded-full" />
                                    Charges
                                </span>
                                <span className="flex items-center gap-2">
                                    <span className="bg-foreground size-2 rounded-full" />
                                    Collections
                                </span>
                                <span className="flex items-center gap-2">
                                    <span className="bg-muted-foreground size-2 rounded-full" />
                                    Expenses
                                </span>
                            </div>
                            <div className="grid min-h-64 grid-cols-6 items-end gap-3">
                                {financialTrend.map((item) => (
                                    <div key={item.label} className="flex h-full flex-col justify-end gap-2" title={item.label}>
                                        <div className="flex flex-1 items-end justify-center gap-1">
                                            <div
                                                className="bg-primary w-full rounded-t-sm"
                                                style={{ height: `${Math.max((item.charges / trendMaximum) * 100, item.charges ? 4 : 0)}%` }}
                                            />
                                            <div
                                                className="bg-foreground w-full rounded-t-sm"
                                                style={{ height: `${Math.max((item.collections / trendMaximum) * 100, item.collections ? 4 : 0)}%` }}
                                            />
                                            <div
                                                className="bg-muted-foreground w-full rounded-t-sm"
                                                style={{ height: `${Math.max((item.expenses / trendMaximum) * 100, item.expenses ? 4 : 0)}%` }}
                                            />
                                        </div>
                                        <p className="text-muted-foreground text-center text-xs">{item.month}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Stand inventory</CardTitle>
                            <CardDescription>Current portfolio position by physical status.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            {inventory.map((item) => (
                                <div key={item.status} className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="capitalize">{item.status.replaceAll('_', ' ')}</span>
                                        <span className="font-medium">{item.total}</span>
                                    </div>
                                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                                        <div
                                            className="bg-primary h-full rounded-full"
                                            style={{ width: `${inventoryTotal ? (item.total / inventoryTotal) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
                    <Card>
                        <CardHeader className="flex flex-row items-start justify-between gap-4">
                            <div>
                                <CardTitle>Recent collections</CardTitle>
                                <CardDescription>Latest payments recorded across active branches.</CardDescription>
                            </div>
                            <CircleDollarSign className="text-muted-foreground size-5" />
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Client</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentPayments.map((payment) => (
                                        <TableRow key={payment.id}>
                                            <TableCell>
                                                <p className="font-medium">{payment.client || 'Unassigned'}</p>
                                                <p className="text-muted-foreground text-xs">{payment.branch}</p>
                                            </TableCell>
                                            <TableCell>{payment.method ?? '—'}</TableCell>
                                            <TableCell>{formatDate(payment.received_at)}</TableCell>
                                            <TableCell>
                                                <Badge variant={statusVariant(payment.status)}>{payment.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{formatMoney(payment.amount, payment.currency)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {recentPayments.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                                                No collections recorded yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {canViewExpenses && (
                        <Card>
                            <CardHeader className="flex flex-row items-start justify-between gap-4">
                                <div>
                                    <CardTitle>Approval queue</CardTitle>
                                    <CardDescription>Expense submissions requiring a decision.</CardDescription>
                                </div>
                                <ClipboardCheck className="text-muted-foreground size-5" />
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3">
                                {approvalQueue.map((approval) => (
                                    <Link
                                        key={approval.id}
                                        href="/approvals"
                                        className="hover:bg-accent flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">{approval.payee}</p>
                                            <p className="text-muted-foreground truncate text-xs">
                                                {approval.expense_no} · {approval.branch} · {formatDate(approval.submitted_at)}
                                            </p>
                                        </div>
                                        <p className="shrink-0 font-medium">{formatMoney(approval.amount, approval.currency)}</p>
                                    </Link>
                                ))}
                                {approvalQueue.length === 0 && (
                                    <p className="text-muted-foreground py-8 text-center text-sm">The approval queue is clear.</p>
                                )}
                                <Button variant="outline" asChild>
                                    <Link href="/approvals">
                                        Review all approvals <ArrowRight data-icon="inline-end" />
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
