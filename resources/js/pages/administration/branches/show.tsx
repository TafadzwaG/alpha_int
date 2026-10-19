import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Building2, CircleDollarSign, ExternalLink, Mail, MapPin, Phone, Eye as TableViewIcon, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';

type Branch = {
    id: number;
    code: string;
    name: string;
    timezone: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    status: string;
};

type Summary = {
    users: number;
    activeUsers: number;
    stands: number;
    clients: number;
    portfolioValue: number;
    collections: number;
    currency: string;
};

type ChartDatum = { status: string; label: string; count: number; color?: string };

type BranchUser = {
    id: number;
    name: string;
    email: string;
    roles: string[];
    accessLevel: string;
    isHomeBranch: boolean;
    status: string;
};

type BranchStand = {
    allocationId: number;
    standId: number | null;
    standNo: string | null;
    development: string | null;
    standType: string | null;
    physicalStatus: string | null;
    clientId: number | null;
    clientNo: string | null;
    client: string;
    allocatedAt: string | null;
    price: number;
    currency: string;
    allocationStatus: string;
};

type Props = {
    branch: Branch;
    summary: Summary;
    allocationChart: ChartDatum[];
    standChart: ChartDatum[];
    users: BranchUser[];
    stands: BranchStand[];
};

const allocationConfig = {
    count: { label: 'Allocations', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const standConfig = {
    count: { label: 'Stands' },
} satisfies ChartConfig;

const formatMoney = (amount: number, currency: string) =>
    `${currency} ${new Intl.NumberFormat('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
const formatDate = (value: string | null) => (value ? new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium' }).format(new Date(value)) : '—');
const titleCase = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function BranchShow({ branch, summary, allocationChart, standChart, users, stands }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Administration', href: '/administration' },
        { title: 'Branches', href: '/administration/branches' },
        { title: branch.name, href: `/administration/branches/${branch.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={branch.name} />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                    <div>
                        <Button variant="ghost" size="sm" className="mb-1 -ml-3" asChild>
                            <Link href="/administration/branches">
                                <ArrowLeft data-icon="inline-start" /> All branches
                            </Link>
                        </Button>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-semibold tracking-tight">{branch.name}</h1>
                            <Badge variant="outline">{branch.code}</Badge>
                            <Badge variant={branch.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                                {branch.status}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1">Branch performance, assigned people and stand portfolio.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" asChild>
                            <Link href={`/administration/users?branch=${branch.id}`}>
                                <Users data-icon="inline-start" /> Branch users
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href={`/administration/stand-allocations?branch=${branch.id}`}>
                                View allocations <ExternalLink data-icon="inline-end" />
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                    <MetricCard label="Associated users" value={summary.users.toLocaleString()} note={`${summary.activeUsers} active`} icon={Users} />
                    <MetricCard label="Associated stands" value={summary.stands.toLocaleString()} note="Current allocations" icon={MapPin} />
                    <MetricCard label="Active clients" value={summary.clients.toLocaleString()} note="With branch allocations" icon={Building2} />
                    <MetricCard
                        label="Portfolio value"
                        value={formatMoney(summary.portfolioValue, summary.currency)}
                        note="Current allocation value"
                        icon={CircleDollarSign}
                        className="sm:col-span-2 xl:col-span-2"
                    />
                    <MetricCard
                        label="Approved collections"
                        value={formatMoney(summary.collections, summary.currency)}
                        note="All recorded time"
                        icon={CircleDollarSign}
                    />
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Allocation pipeline</CardTitle>
                            <CardDescription>Every stand allocation recorded through {branch.name}, grouped by workflow status.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={allocationConfig} className="h-[260px] w-full">
                                <BarChart data={allocationChart} accessibilityLayer margin={{ left: -12, right: 8, top: 8 }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
                                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                    <Bar dataKey="count" fill="var(--color-count)" radius={[5, 5, 0, 0]} />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Stand portfolio mix</CardTitle>
                            <CardDescription>Physical status of stands currently associated with this branch.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_150px] xl:grid-cols-1">
                            <ChartContainer config={standConfig} className="mx-auto h-[210px] w-full max-w-[320px]">
                                <PieChart accessibilityLayer>
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="label" />} />
                                    <Pie data={standChart} dataKey="count" nameKey="label" innerRadius={52} outerRadius={82} strokeWidth={2}>
                                        {standChart.map((item) => (
                                            <Cell key={item.status} fill={item.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ChartContainer>
                            <div className="grid content-center gap-2">
                                {standChart.map((item) => (
                                    <div key={item.status} className="flex items-center justify-between gap-3 text-sm">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                                            {item.label}
                                        </span>
                                        <span className="font-medium tabular-nums">{item.count}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
                    <Card>
                        <CardHeader className="flex flex-row items-start justify-between gap-4">
                            <div>
                                <CardTitle>Branch users</CardTitle>
                                <CardDescription>Home-branch users and active access assignments for this location.</CardDescription>
                            </div>
                            <Badge variant="secondary">{users.length} users</Badge>
                        </CardHeader>
                        <CardContent className="overflow-x-auto p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Roles</TableHead>
                                        <TableHead>Access</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-muted-foreground h-28 text-center">
                                                No users are associated with this branch.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <p className="font-medium">{user.name}</p>
                                                <p className="text-muted-foreground text-xs">{user.email}</p>
                                            </TableCell>
                                            <TableCell>{user.roles.length ? user.roles.join(', ') : 'No role'}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    <Badge variant="outline">{titleCase(user.accessLevel)}</Badge>
                                                    {user.isHomeBranch && <Badge variant="secondary">Home</Badge>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={user.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                                                    {user.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="view" size="sm" asChild>
                                                    <Link href={`/administration/users/${user.id}`}>
                                                        <TableViewIcon data-icon="inline-start" />
                                                        View
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
                            <CardTitle>Branch profile</CardTitle>
                            <CardDescription>Contact and operating details.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <ProfileRow icon={MapPin} label="Address" value={branch.address || 'Not recorded'} />
                            <ProfileRow icon={Phone} label="Phone" value={branch.phone || 'Not recorded'} />
                            <ProfileRow icon={Mail} label="Email" value={branch.email || 'Not recorded'} />
                            <ProfileRow icon={Building2} label="Timezone" value={branch.timezone} />
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div>
                            <CardTitle>Associated stands</CardTitle>
                            <CardDescription>Current stand allocations handled by {branch.name}.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/administration/stand-allocations?branch=${branch.id}`}>View all</Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="overflow-x-auto p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Stand</TableHead>
                                    <TableHead>Development</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Allocated</TableHead>
                                    <TableHead>Value</TableHead>
                                    <TableHead>Stand status</TableHead>
                                    <TableHead>Allocation</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stands.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-muted-foreground h-28 text-center">
                                            No stands are currently associated with this branch.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {stands.map((stand) => (
                                    <TableRow key={stand.allocationId}>
                                        <TableCell>
                                            {stand.standId ? (
                                                <Link className="font-medium hover:underline" href={`/administration/stands/${stand.standId}`}>
                                                    Stand {stand.standNo}
                                                </Link>
                                            ) : (
                                                'Unassigned'
                                            )}
                                            <p className="text-muted-foreground text-xs">{stand.standType || 'No type'}</p>
                                        </TableCell>
                                        <TableCell>{stand.development || '—'}</TableCell>
                                        <TableCell>
                                            {stand.clientId ? (
                                                <Link className="font-medium hover:underline" href={`/administration/clients/${stand.clientId}`}>
                                                    {stand.client}
                                                </Link>
                                            ) : (
                                                stand.client || '—'
                                            )}
                                            <p className="text-muted-foreground text-xs">{stand.clientNo}</p>
                                        </TableCell>
                                        <TableCell>{formatDate(stand.allocatedAt)}</TableCell>
                                        <TableCell>{formatMoney(stand.price, stand.currency)}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {stand.physicalStatus || 'unknown'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="capitalize">
                                                {stand.allocationStatus}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="view" size="sm" asChild>
                                                <Link href={`/administration/stand-allocations/${stand.allocationId}`}>
                                                    <TableViewIcon data-icon="inline-start" />
                                                    Details
                                                </Link>
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

function MetricCard({
    label,
    value,
    note,
    icon: Icon,
    className = '',
}: {
    label: string;
    value: string;
    note: string;
    icon: typeof Users;
    className?: string;
}) {
    return (
        <Card className={className}>
            <CardHeader className="gap-3">
                <div className="flex items-start justify-between gap-4">
                    <CardDescription>{label}</CardDescription>
                    <Icon className="text-muted-foreground size-4" />
                </div>
                <CardTitle className="text-xl">{value}</CardTitle>
                <p className="text-muted-foreground text-xs">{note}</p>
            </CardHeader>
        </Card>
    );
}

function ProfileRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3 border-b pb-4 last:border-0 last:pb-0">
            <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md">
                <Icon className="text-muted-foreground size-4" />
            </div>
            <div className="min-w-0">
                <p className="text-muted-foreground text-xs">{label}</p>
                <p className="mt-1 font-medium break-words">{value}</p>
            </div>
        </div>
    );
}
