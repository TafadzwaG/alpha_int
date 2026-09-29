import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    CircleDollarSign,
    ClipboardCheck,
    ExternalLink,
    HandCoins,
    Landmark,
    ReceiptText,
    Users,
    WalletCards,
} from 'lucide-react';

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
    exchangeRates: Array<{
        base: string;
        quote: string;
        quote_label: string;
        buy_rate: number;
        sell_rate: number | null;
        source: string;
        source_type: string;
        updated_at: string;
        is_fallback: boolean;
    }>;
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
    branchFilter: {
        selected: string;
        label: string;
        canViewAll: boolean;
        options: Array<{ id: string; code: string; name: string }>;
        inventoryIsOrganizationWide: boolean;
    };
    canViewReports: boolean;
    canViewExpenses: boolean;
    currency: string;
};

const formatMoney = (value: number, currency = 'USD') =>
    new Intl.NumberFormat('en-ZW', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);

const formatDate = (value: string | null) => (value ? new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium' }).format(new Date(value)) : '—');
const formatRate = (value: number) => new Intl.NumberFormat('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(value);

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
    exchangeRates,
    recentPayments,
    approvalQueue,
    branchFilter,
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
            detail: `${inventoryTotal} organization-wide stands`,
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
        {
            label: 'Available inventory',
            value: metrics.availableStands.toLocaleString(),
            detail: 'Organization-wide inventory',
            icon: Landmark,
        },
        { label: 'Petty cash balance', value: formatMoney(metrics.pettyCashBalance, currency), detail: 'Current ledger position', icon: HandCoins },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Operations dashboard" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
                    <div>
                        <div className="mb-2 flex items-center gap-2">
                            <Badge variant="secondary">Executive overview</Badge>
                            <Badge variant="outline">{branchFilter.label}</Badge>
                        </div>
                        <h1 className="text-2xl font-semibold tracking-tight">Operations dashboard</h1>
                        <p className="text-muted-foreground mt-1 max-w-2xl">
                            A live view of the property portfolio, collections, expenditure, approvals and cash controls.
                        </p>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        {(branchFilter.canViewAll || branchFilter.options.length > 1) && (
                            <Select
                                value={branchFilter.selected}
                                onValueChange={(branch) =>
                                    router.get('/dashboard', { branch }, { preserveScroll: true, preserveState: true, replace: true })
                                }
                            >
                                <SelectTrigger className="w-full sm:w-56" aria-label="Filter dashboard by branch">
                                    <SelectValue placeholder="Select branch" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="all">{branchFilter.canViewAll ? 'All branches' : 'All assigned branches'}</SelectItem>
                                        {branchFilter.options.map((branch) => (
                                            <SelectItem key={branch.id} value={branch.id}>
                                                {branch.name} ({branch.code})
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        )}
                        {canViewReports && (
                            <Button variant="outline" asChild>
                                <Link href="/reports">
                                    Open reports <ArrowRight data-icon="inline-end" />
                                </Link>
                            </Button>
                        )}
                    </div>
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
                                    <span className="bg-chart-1 size-2 rounded-full" />
                                    Charges
                                </span>
                                <span className="flex items-center gap-2">
                                    <span className="bg-chart-2 size-2 rounded-full" />
                                    Collections
                                </span>
                                <span className="flex items-center gap-2">
                                    <span className="bg-chart-3 size-2 rounded-full" />
                                    Expenses
                                </span>
                            </div>
                            <div className="grid min-h-64 grid-cols-6 items-end gap-3">
                                {financialTrend.map((item) => (
                                    <div key={item.label} className="flex h-full flex-col justify-end gap-2" title={item.label}>
                                        <div className="flex flex-1 items-end justify-center gap-1">
                                            <div
                                                className="bg-chart-1 w-full rounded-t-sm"
                                                style={{ height: `${Math.max((item.charges / trendMaximum) * 100, item.charges ? 4 : 0)}%` }}
                                            />
                                            <div
                                                className="bg-chart-2 w-full rounded-t-sm"
                                                style={{ height: `${Math.max((item.collections / trendMaximum) * 100, item.collections ? 4 : 0)}%` }}
                                            />
                                            <div
                                                className="bg-chart-3 w-full rounded-t-sm"
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
                            <CardDescription>
                                Current organization-wide portfolio position by physical status; stands do not yet have branch ownership.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            {inventory.map((item) => (
                                <Link
                                    key={item.status}
                                    href={`/administration/stands?status=${encodeURIComponent(item.status)}`}
                                    className="focus-visible:ring-ring group hover:bg-muted -m-2 flex flex-col gap-2 rounded-md p-2 transition-colors outline-none focus-visible:ring-2"
                                    aria-label={`View ${item.total} ${item.status.replaceAll('_', ' ')} stands`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="capitalize group-hover:underline">{item.status.replaceAll('_', ' ')}</span>
                                        <span className="flex items-center gap-1 font-medium">
                                            {item.total}
                                            <ArrowRight className="size-3.5" aria-hidden="true" />
                                        </span>
                                    </div>
                                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                                        <div
                                            className="bg-primary h-full rounded-full"
                                            style={{ width: `${inventoryTotal ? (item.total / inventoryTotal) * 100 : 0}%` }}
                                        />
                                    </div>
                                </Link>
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

                    <div className="flex flex-col gap-5">
                        <Card>
                            <CardHeader>
                                <CardTitle>Exchange rates</CardTitle>
                                <CardDescription>Live USD rates for ZiG and the South African rand.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Pair</TableHead>
                                            <TableHead className="text-right">Buy</TableHead>
                                            <TableHead className="text-right">Sell</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {exchangeRates.map((rate) => (
                                            <TableRow key={`${rate.base}-${rate.quote}`}>
                                                <TableCell>
                                                    <p className="flex items-center gap-2 font-medium">
                                                        <span>
                                                            {rate.base} / {rate.quote_label}
                                                        </span>
                                                        <Badge variant="outline">{rate.quote}</Badge>
                                                    </p>
                                                    <p className="text-muted-foreground text-xs">
                                                        {rate.source} · {formatDate(rate.updated_at)}
                                                    </p>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">{formatRate(rate.buy_rate)}</TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {rate.sell_rate === null ? '—' : formatRate(rate.sell_rate)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {exchangeRates.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-muted-foreground py-8 text-center">
                                                    Exchange rates are temporarily unavailable.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                            <CardFooter className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                                <p className="text-muted-foreground text-xs">Indicative rates cached for 30 minutes.</p>
                                <Button variant="link" size="sm" asChild>
                                    <a href="https://zimrate.com" target="_blank" rel="noreferrer">
                                        Rates by ZimRate <ExternalLink data-icon="inline-end" />
                                    </a>
                                </Button>
                            </CardFooter>
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
            </div>
        </AppLayout>
    );
}
