import { DashboardQuickActions } from '@/components/dashboard-quick-actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BellRing,
    CalendarClock,
    CheckCheck,
    CircleDollarSign,
    ContactRound,
    Headphones,
    Megaphone,
    PhoneCall,
    Search,
    Eye as TableViewIcon,
    TriangleAlert,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import { CallCentreTask, ClientSearchResult, Option, formatDateTime, humanize, money } from './types';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Call centre', href: '/call-centre' }];
const chartConfig = {
    calls: { label: 'Interactions', color: 'var(--chart-1)' },
    contacts: { label: 'Successful contacts', color: 'var(--chart-2)' },
} satisfies ChartConfig;

type Props = {
    branch: { id: number; name: string; code: string };
    branches: Option[];
    filters: { search: string };
    stats: {
        callsToday: number;
        contactedToday: number;
        contactRate: number;
        openTasks: number;
        overdueTasks: number;
        openPromises: number;
        brokenPromises: number;
        collectionsToday: number;
        activeCampaigns: number;
    };
    daily: Array<{ date: string; label: string; calls: number; contacts: number }>;
    outcomes: Array<{ outcome: string; count: number }>;
    tasks: CallCentreTask[];
    clients: ClientSearchResult[];
    notifications: Array<{ id: string; title: string; message: string; url: string; createdAt: string | null }>;
    permissions: {
        createInteractions: boolean;
        manageTasks: boolean;
        assignTasks: boolean;
        manageCampaigns: boolean;
        viewReports: boolean;
        supervise: boolean;
    };
    currency: string;
};

function priorityVariant(priority: string): 'default' | 'secondary' | 'outline' | 'destructive' {
    if (priority === 'urgent') return 'destructive';
    if (priority === 'high') return 'default';
    return priority === 'normal' ? 'secondary' : 'outline';
}

export default function CallCentreDashboard({
    branch,
    branches,
    filters,
    stats,
    daily,
    outcomes,
    tasks,
    clients,
    notifications,
    permissions,
    currency,
}: Props) {
    const { flash } = usePage<SharedData>().props;
    const [search, setSearch] = useState(filters.search);

    const submitSearch = (event: FormEvent) => {
        event.preventDefault();
        router.get('/call-centre', { search: search || undefined }, { preserveState: true, replace: true });
    };

    const switchBranch = (branchId: string) => {
        router.post('/select-branch', { branch_id: Number(branchId), redirect_to: '/call-centre' });
    };

    const metrics = [
        { label: 'Interactions today', value: stats.callsToday, detail: `${stats.contactedToday} successful contacts`, icon: PhoneCall },
        { label: 'Contact rate', value: `${stats.contactRate.toFixed(1)}%`, detail: 'Today’s connect rate', icon: ContactRound },
        { label: 'Open follow-ups', value: stats.openTasks, detail: `${stats.overdueTasks} overdue`, icon: CalendarClock },
        { label: 'Open promises', value: stats.openPromises, detail: `${stats.brokenPromises} broken`, icon: CheckCheck },
        { label: 'Collections today', value: money(stats.collectionsToday, currency), detail: 'Approved payments', icon: CircleDollarSign },
        { label: 'Active campaigns', value: stats.activeCampaigns, detail: 'Current branch', icon: Megaphone },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Call centre" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <Badge variant="secondary" className="mb-2">
                            Collections & client care
                        </Badge>
                        <div className="flex items-center gap-2">
                            <Headphones className="size-5" />
                            <h1 className="text-2xl font-semibold tracking-tight">Call centre dashboard</h1>
                        </div>
                        <p className="text-muted-foreground mt-1">Manage contacts, promises, follow-ups and collection activity for {branch.name}.</p>
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                        <Field className="w-64 gap-1.5">
                            <FieldLabel htmlFor="call-centre-branch">Working branch</FieldLabel>
                            <Select value={String(branch.id)} onValueChange={switchBranch}>
                                <SelectTrigger id="call-centre-branch">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {branches.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Button variant="outline" asChild>
                            <Link href="/call-centre/queue">
                                Open queue <ArrowRight data-icon="inline-end" />
                            </Link>
                        </Button>
                        {permissions.viewReports && (
                            <Button asChild>
                                <Link href="/call-centre/reports">Performance reports</Link>
                            </Button>
                        )}
                    </div>
                </div>

                {flash?.success && (
                    <Alert>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                    {metrics.map((metric) => (
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

                <DashboardQuickActions workspace="calls" />

                <Card>
                    <CardHeader>
                        <CardTitle>Find a client or stand</CardTitle>
                        <CardDescription>
                            Search by client number, name, phone number or stand number before placing or receiving a call.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <form onSubmit={submitSearch}>
                            <FieldGroup className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                                <Field>
                                    <FieldLabel htmlFor="client-search">Client or stand</FieldLabel>
                                    <div className="relative">
                                        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                        <Input
                                            id="client-search"
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            className="pl-9"
                                            placeholder="Search client, phone or stand…"
                                        />
                                    </div>
                                </Field>
                                <Button type="submit">
                                    <Search data-icon="inline-start" /> Search
                                </Button>
                            </FieldGroup>
                        </form>
                        {filters.search && (
                            <div className="overflow-x-auto rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Client</TableHead>
                                            <TableHead>Stand(s)</TableHead>
                                            <TableHead>Phone</TableHead>
                                            <TableHead>Ageing</TableHead>
                                            <TableHead className="text-right">Outstanding</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {clients.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                                                    No clients match “{filters.search}”.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {clients.map((client) => (
                                            <TableRow key={client.id}>
                                                <TableCell>
                                                    <p className="font-medium">{client.name}</p>
                                                    <p className="text-muted-foreground text-xs">
                                                        {client.clientNo} · {client.branch}
                                                    </p>
                                                </TableCell>
                                                <TableCell>{client.standNumbers.join(', ') || '—'}</TableCell>
                                                <TableCell>{client.phone || '—'}</TableCell>
                                                <TableCell>
                                                    <Badge variant={client.daysOverdue > 90 ? 'destructive' : 'outline'}>
                                                        {humanize(client.agingBucket)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">{money(client.outstanding, client.currency)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={`/call-centre/clients/${client.id}`}>Open workspace</Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.7fr)]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Contact activity</CardTitle>
                            <CardDescription>Interactions and successful contacts over the last seven days.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={chartConfig} className="h-64 w-full">
                                <BarChart data={daily} accessibilityLayer>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="calls" fill="var(--color-calls)" radius={3} />
                                    <Bar dataKey="contacts" fill="var(--color-contacts)" radius={3} />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>30-day outcomes</CardTitle>
                            <CardDescription>What happened after each interaction.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            {outcomes.length === 0 && <p className="text-muted-foreground py-12 text-center">No interaction outcomes yet.</p>}
                            {outcomes.map((outcome) => (
                                <div key={outcome.outcome} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                                    <span>{humanize(outcome.outcome)}</span>
                                    <Badge variant="secondary">{outcome.count}</Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.7fr)]">
                    <Card>
                        <CardHeader className="flex flex-row items-start justify-between gap-3">
                            <div>
                                <CardTitle>Priority follow-ups</CardTitle>
                                <CardDescription>Next actions ordered by urgency and due date.</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/call-centre/queue">
                                    View all <ArrowRight data-icon="inline-end" />
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Client</TableHead>
                                        <TableHead>Task</TableHead>
                                        <TableHead>Due</TableHead>
                                        <TableHead>Assignee</TableHead>
                                        <TableHead>Priority</TableHead>
                                        <TableHead />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tasks.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                                                The queue is clear.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {tasks.map((task) => (
                                        <TableRow key={task.id}>
                                            <TableCell>
                                                <p className="font-medium">{task.client}</p>
                                                <p className="text-muted-foreground text-xs">{task.clientNo}</p>
                                            </TableCell>
                                            <TableCell>{humanize(task.taskType)}</TableCell>
                                            <TableCell className={task.overdue ? 'text-destructive font-medium' : ''}>
                                                {formatDateTime(task.dueAt)}
                                            </TableCell>
                                            <TableCell>{task.assignee || 'Unassigned'}</TableCell>
                                            <TableCell>
                                                <Badge variant={priorityVariant(task.priority)}>{task.priority}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="view" size="sm" asChild>
                                                    <Link href={`/call-centre/clients/${task.clientId}`}>
                                                        <TableViewIcon data-icon="inline-start" />
                                                        Open
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BellRing className="size-4" /> Alerts
                            </CardTitle>
                            <CardDescription>Reminders, escalations and broken promises.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            {notifications.length === 0 && <p className="text-muted-foreground py-12 text-center">No unread alerts.</p>}
                            {notifications.map((notification) => (
                                <div key={notification.id} className="rounded-lg border p-3">
                                    <Link href={notification.url} className="font-medium hover:underline">
                                        {notification.title}
                                    </Link>
                                    <p className="text-muted-foreground mt-1 text-xs">{notification.message}</p>
                                    <div className="mt-3 flex items-center justify-between gap-2">
                                        <span className="text-muted-foreground text-xs">{formatDateTime(notification.createdAt)}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => router.patch(`/call-centre/notifications/${notification.id}/read`)}
                                        >
                                            Mark read
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {stats.overdueTasks > 0 && (
                    <Alert variant="destructive">
                        <TriangleAlert className="size-4" />
                        <AlertDescription>
                            {stats.overdueTasks} follow-up task{stats.overdueTasks === 1 ? ' is' : 's are'} overdue. Open the work queue to resolve or
                            reassign them.
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </AppLayout>
    );
}
