import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ExternalLink, MapPin } from 'lucide-react';

type Allocation = {
    id: number;
    client_id: number;
    client: string;
    branch: string;
    allocated_at: string | null;
    price: number;
    paid: number;
    balance: number;
    currency: string;
    status: string;
    next_due_date: string | null;
};

type Props = {
    stand: {
        id: number;
        stand_no: string;
        development: string;
        development_code: string;
        phase: string;
        location: string;
        type: string;
        area_sqm: number;
        list_price: number;
        currency: string;
        status: string;
        survey_reference: string | null;
    };
    allocations: Allocation[];
};

const money = (amount: number, currency: string) => `${currency} ${new Intl.NumberFormat('en-ZW', { minimumFractionDigits: 2 }).format(amount)}`;
const date = (value: string | null) => (value ? new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium' }).format(new Date(value)) : '—');

export default function StandShow({ stand, allocations }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Stands', href: '/administration/stands' },
        { title: `Stand ${stand.stand_no}`, href: `/administration/stands/${stand.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Stand ${stand.stand_no}`} />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
                    <div>
                        <Button variant="ghost" size="sm" className="mb-1 -ml-3" asChild>
                            <Link href="/administration/stands">
                                <ArrowLeft data-icon="inline-start" /> All stands
                            </Link>
                        </Button>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-semibold tracking-tight">Stand {stand.stand_no}</h1>
                            <Badge className="capitalize" variant="secondary">
                                {stand.status}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="size-4" /> {stand.development} · {stand.phase} · {stand.location}
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={`/administration/stand-allocations?search=${encodeURIComponent(stand.stand_no)}`}>
                            Find allocations <ExternalLink data-icon="inline-end" />
                        </Link>
                    </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Card>
                        <CardHeader>
                            <CardDescription>List price</CardDescription>
                            <CardTitle>{money(stand.list_price, stand.currency)}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Stand type</CardDescription>
                            <CardTitle>{stand.type}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Area</CardDescription>
                            <CardTitle>{new Intl.NumberFormat('en-ZW').format(stand.area_sqm)} m²</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Survey reference</CardDescription>
                            <CardTitle className="text-base">{stand.survey_reference || 'Not recorded'}</CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Allocation history</CardTitle>
                        <CardDescription>Purchasers, payment position and next due date for this stand.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Branch</TableHead>
                                    <TableHead>Allocated</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Paid</TableHead>
                                    <TableHead>Balance</TableHead>
                                    <TableHead>Next due</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allocations.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-muted-foreground h-28 text-center">
                                            No allocation has been recorded for this stand.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {allocations.map((allocation) => (
                                    <TableRow key={allocation.id}>
                                        <TableCell className="font-medium">
                                            <Link className="hover:underline" href={`/administration/clients/${allocation.client_id}`}>
                                                {allocation.client}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{allocation.branch}</TableCell>
                                        <TableCell>{date(allocation.allocated_at)}</TableCell>
                                        <TableCell>{money(allocation.price, allocation.currency)}</TableCell>
                                        <TableCell>{money(allocation.paid, allocation.currency)}</TableCell>
                                        <TableCell>{money(allocation.balance, allocation.currency)}</TableCell>
                                        <TableCell>{date(allocation.next_due_date)}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {allocation.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/administration/stand-allocations/${allocation.id}`}>View</Link>
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
