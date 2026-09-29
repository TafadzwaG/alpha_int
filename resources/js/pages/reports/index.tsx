import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Banknote, ChartNoAxesCombined, CircleDollarSign, FileDown, FileSpreadsheet, ReceiptText, TrendingUp } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Reports', href: '/reports' }];

type Props = {
    organization: { code: string; name: string };
    generatedAt: string;
    summary: { billed: number; collected: number; expenses: number; outstanding: number; collectionRate: number };
    monthly: Array<{ month: string; label: string; billed: number; collected: number; expenses: number }>;
    receivablesAging: Array<{ bucket: string; total: number }>;
    expenseByCategory: Array<{ category: string; expense_count: number; total: number }>;
    paymentMethods: Array<{ method: string; payment_count: number; total: number }>;
    developmentPerformance: Array<{
        development: string;
        location: string;
        total_stands: number;
        allocated_stands: number;
        inventory_value: number;
        allocated_value: number;
    }>;
    branchPerformance: Array<{ branch: string; collections: number; expenses: number; banked: number; unresolved_variance: number }>;
    refreshLogs: Array<{ dataset: string; status: string; row_count: number; completed_at: string | null }>;
    currency: string;
};

const money = (value: number, currency = 'USD') =>
    new Intl.NumberFormat('en-ZW', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
const date = (value: string | null) =>
    value ? new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

export default function Reports({
    summary,
    monthly,
    receivablesAging,
    expenseByCategory,
    paymentMethods,
    developmentPerformance,
    branchPerformance,
    refreshLogs,
    currency,
}: Props) {
    const monthlyMaximum = Math.max(...monthly.flatMap((item) => [item.billed, item.collected, item.expenses]), 1);
    const agingMaximum = Math.max(...receivablesAging.map((item) => item.total), 1);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reporting & dashboards" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
                    <div>
                        <Badge variant="secondary" className="mb-2">
                            Management information
                        </Badge>
                        <h1 className="text-2xl font-semibold tracking-tight">Reporting & dashboards</h1>
                        <p className="text-muted-foreground mt-1 max-w-2xl">
                            Twelve-month financial performance, receivables exposure, property sales, expenses and branch cash controls.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" asChild>
                            <a href="/reports/export/pdf">
                                <FileDown data-icon="inline-start" />
                                Export PDF
                            </a>
                        </Button>
                        <Button variant="outline" asChild>
                            <a href="/reports/export/excel">
                                <FileSpreadsheet data-icon="inline-start" />
                                Export Excel
                            </a>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="/dashboard">
                                <ArrowLeft data-icon="inline-start" />
                                Back to dashboard
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                        { label: 'Billed', value: money(summary.billed, currency), detail: 'Last 12 months', icon: CircleDollarSign },
                        {
                            label: 'Collected',
                            value: money(summary.collected, currency),
                            detail: `${summary.collectionRate}% collection rate`,
                            icon: Banknote,
                        },
                        { label: 'Outstanding', value: money(summary.outstanding, currency), detail: 'Open receivables', icon: TrendingUp },
                        { label: 'Expenses', value: money(summary.expenses, currency), detail: 'Approved and paid', icon: ReceiptText },
                        {
                            label: 'Net cash movement',
                            value: money(summary.collected - summary.expenses, currency),
                            detail: 'Collections less expenses',
                            icon: ChartNoAxesCombined,
                        },
                    ].map((metric) => (
                        <Card key={metric.label}>
                            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                                <CardDescription>{metric.label}</CardDescription>
                                <metric.icon className="text-muted-foreground size-4" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-xl font-semibold">{metric.value}</p>
                                <p className="text-muted-foreground mt-1 text-xs">{metric.detail}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Twelve-month performance</CardTitle>
                        <CardDescription>Monthly billing, approved collections and approved expenses.</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <div className="mb-4 flex items-center gap-4 text-xs">
                            <span className="flex items-center gap-2">
                                <span className="bg-primary size-2 rounded-full" />
                                Billed
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="bg-foreground size-2 rounded-full" />
                                Collected
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="bg-muted-foreground size-2 rounded-full" />
                                Expenses
                            </span>
                        </div>
                        <div className="grid min-h-64 min-w-[720px] grid-cols-12 items-end gap-3">
                            {monthly.map((item) => (
                                <div key={item.label} className="flex h-full flex-col justify-end gap-2" title={item.label}>
                                    <div className="flex flex-1 items-end justify-center gap-1">
                                        <div
                                            className="bg-primary w-full rounded-t-sm"
                                            style={{ height: `${Math.max((item.billed / monthlyMaximum) * 100, item.billed ? 3 : 0)}%` }}
                                        />
                                        <div
                                            className="bg-foreground w-full rounded-t-sm"
                                            style={{ height: `${Math.max((item.collected / monthlyMaximum) * 100, item.collected ? 3 : 0)}%` }}
                                        />
                                        <div
                                            className="bg-muted-foreground w-full rounded-t-sm"
                                            style={{ height: `${Math.max((item.expenses / monthlyMaximum) * 100, item.expenses ? 3 : 0)}%` }}
                                        />
                                    </div>
                                    <p className="text-muted-foreground text-center text-xs">{item.month}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-5 xl:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Receivables aging</CardTitle>
                            <CardDescription>Outstanding client charges grouped by days past due.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            {receivablesAging.map((item) => (
                                <div key={item.bucket} className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <span>{item.bucket}</span>
                                        <span className="font-medium">{money(item.total, currency)}</span>
                                    </div>
                                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                                        <div className="bg-primary h-full rounded-full" style={{ width: `${(item.total / agingMaximum) * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Payment channels</CardTitle>
                            <CardDescription>Approved collections by payment method.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Transactions</TableHead>
                                        <TableHead className="text-right">Collected</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paymentMethods.map((row) => (
                                        <TableRow key={row.method}>
                                            <TableCell className="font-medium">{row.method}</TableCell>
                                            <TableCell>{row.payment_count}</TableCell>
                                            <TableCell className="text-right">{money(row.total, currency)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {paymentMethods.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-muted-foreground py-8 text-center">
                                                No approved payments in this period.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Development sales performance</CardTitle>
                        <CardDescription>Inventory and allocation value by development.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Development</TableHead>
                                    <TableHead>Total stands</TableHead>
                                    <TableHead>Allocated</TableHead>
                                    <TableHead>Sell-through</TableHead>
                                    <TableHead className="text-right">Inventory value</TableHead>
                                    <TableHead className="text-right">Allocated value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {developmentPerformance.map((row) => {
                                    const sellThrough = row.total_stands ? Math.round((row.allocated_stands / row.total_stands) * 100) : 0;
                                    return (
                                        <TableRow key={row.development}>
                                            <TableCell>
                                                <p className="font-medium">{row.development}</p>
                                                <p className="text-muted-foreground text-xs">{row.location}</p>
                                            </TableCell>
                                            <TableCell>{row.total_stands}</TableCell>
                                            <TableCell>{row.allocated_stands}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{sellThrough}%</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">{money(row.inventory_value, currency)}</TableCell>
                                            <TableCell className="text-right">{money(row.allocated_value, currency)}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="grid gap-5 xl:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Expense analysis</CardTitle>
                            <CardDescription>Approved expenditure grouped by policy category.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Records</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {expenseByCategory.map((row) => (
                                        <TableRow key={row.category}>
                                            <TableCell className="font-medium">{row.category}</TableCell>
                                            <TableCell>{row.expense_count}</TableCell>
                                            <TableCell className="text-right">{money(row.total, currency)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Branch cash control</CardTitle>
                            <CardDescription>Collections, approved expenses, deposits and unresolved reconciliation variance.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Branch</TableHead>
                                        <TableHead className="text-right">Collected</TableHead>
                                        <TableHead className="text-right">Expenses</TableHead>
                                        <TableHead className="text-right">Banked</TableHead>
                                        <TableHead className="text-right">Variance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {branchPerformance.map((row) => (
                                        <TableRow key={row.branch}>
                                            <TableCell className="font-medium">{row.branch}</TableCell>
                                            <TableCell className="text-right">{money(row.collections, currency)}</TableCell>
                                            <TableCell className="text-right">{money(row.expenses, currency)}</TableCell>
                                            <TableCell className="text-right">{money(row.banked, currency)}</TableCell>
                                            <TableCell className="text-right">{money(row.unresolved_variance, currency)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Reporting data health</CardTitle>
                        <CardDescription>Latest dataset refresh activity supporting these management reports.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Dataset</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Rows processed</TableHead>
                                    <TableHead>Completed</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {refreshLogs.map((log) => (
                                    <TableRow key={`${log.dataset}-${log.completed_at}`}>
                                        <TableCell className="font-medium">{log.dataset.replaceAll('_', ' ')}</TableCell>
                                        <TableCell>
                                            <Badge variant={log.status === 'completed' ? 'default' : 'secondary'}>{log.status}</Badge>
                                        </TableCell>
                                        <TableCell>{log.row_count.toLocaleString()}</TableCell>
                                        <TableCell>{date(log.completed_at)}</TableCell>
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
