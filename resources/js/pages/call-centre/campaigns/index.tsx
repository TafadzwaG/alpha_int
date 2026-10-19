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
import { ArrowRight, ListRestart, Megaphone, Pause, Play, Plus, Users } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Option, Pagination, formatDate, formatDateTime, humanize, money } from '../types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Call centre', href: '/call-centre' },
    { title: 'Campaigns', href: '/call-centre/campaigns' },
];

type Campaign = {
    id: number;
    name: string;
    type: string;
    agingBucket: string | null;
    status: string;
    startsOn: string | null;
    endsOn: string | null;
    members: number;
    contacted: number;
    completed: number;
};
type Member = {
    id: number;
    clientId: number;
    clientNo: string;
    client: string;
    phone: string | null;
    assignee: string | null;
    status: string;
    priority: string;
    lastOutcome: string | null;
    lastContactAt: string | null;
    outstanding: number;
    daysOverdue: number;
    agingBucket: string;
    currency: string;
};
type Props = {
    branch: { id: number; name: string; code: string };
    branches: Option[];
    campaigns: Campaign[];
    selectedCampaignId: number | null;
    members: Pagination<Member> | null;
    agents: Option[];
    canManage: boolean;
};

function CampaignDialog({ branch }: { branch: Props['branch'] }) {
    const [open, setOpen] = useState(false);
    const form = useForm({
        branch_id: branch.id,
        name: '',
        campaign_type: 'overdue',
        aging_bucket: 'all',
        description: '',
        starts_on: '',
        ends_on: '',
    });
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/call-centre/campaigns', {
            onSuccess: () => {
                form.reset();
                setOpen(false);
            },
        });
    };
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus data-icon="inline-start" /> New campaign
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create collection campaign</DialogTitle>
                    <DialogDescription>
                        Define a branch-scoped audience. The generated call list is assigned round-robin to eligible agents.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="flex flex-col gap-5">
                    <FieldGroup className="gap-4">
                        <Field>
                            <FieldLabel htmlFor="campaign-name">Campaign name</FieldLabel>
                            <Input id="campaign-name" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} />
                            <FieldError>{form.errors.name}</FieldError>
                        </Field>
                        <Field>
                            <FieldLabel>Audience rule</FieldLabel>
                            <Select value={form.data.campaign_type} onValueChange={(value) => form.setData('campaign_type', value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="overdue">Overdue debtors</SelectItem>
                                        <SelectItem value="due_soon">Due in the next 7 days</SelectItem>
                                        <SelectItem value="broken_promises">Broken promises</SelectItem>
                                        <SelectItem value="dormant_clients">Clients not contacted for 30 days</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </Field>
                        {form.data.campaign_type === 'overdue' && (
                            <Field>
                                <FieldLabel>Ageing bucket</FieldLabel>
                                <Select value={form.data.aging_bucket} onValueChange={(value) => form.setData('aging_bucket', value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="all">All overdue debtors</SelectItem>
                                            <SelectItem value="1_30">1–30 days</SelectItem>
                                            <SelectItem value="31_60">31–60 days</SelectItem>
                                            <SelectItem value="61_90">61–90 days</SelectItem>
                                            <SelectItem value="90_plus">90+ days</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>
                        )}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field>
                                <FieldLabel htmlFor="starts-on">Starts on</FieldLabel>
                                <Input
                                    id="starts-on"
                                    type="date"
                                    value={form.data.starts_on}
                                    onChange={(event) => form.setData('starts_on', event.target.value)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="ends-on">Ends on</FieldLabel>
                                <Input
                                    id="ends-on"
                                    type="date"
                                    value={form.data.ends_on}
                                    onChange={(event) => form.setData('ends_on', event.target.value)}
                                />
                                <FieldError>{form.errors.ends_on}</FieldError>
                            </Field>
                        </div>
                        <Field>
                            <FieldLabel htmlFor="campaign-description">Description</FieldLabel>
                            <Textarea
                                id="campaign-description"
                                value={form.data.description}
                                onChange={(event) => form.setData('description', event.target.value)}
                            />
                        </Field>
                    </FieldGroup>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            Create campaign
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function CampaignsIndex({ branch, branches, campaigns, selectedCampaignId, members, canManage }: Props) {
    const { flash } = usePage<SharedData>().props;
    const selected = campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null;
    const openCampaign = (id: number) => router.get('/call-centre/campaigns', { campaign: id }, { preserveState: true, replace: true });
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Collection campaigns" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <Badge variant="secondary" className="mb-2">
                            {branch.code} · Managed outreach
                        </Badge>
                        <div className="flex items-center gap-2">
                            <Megaphone className="size-5" />
                            <h1 className="text-2xl font-semibold tracking-tight">Collection campaigns</h1>
                        </div>
                        <p className="text-muted-foreground mt-1">Generate, assign and monitor targeted call lists for {branch.name}.</p>
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                        <Field className="w-64 gap-1.5">
                            <FieldLabel>Working branch</FieldLabel>
                            <Select
                                value={String(branch.id)}
                                onValueChange={(value) =>
                                    router.post('/select-branch', { branch_id: Number(value), redirect_to: '/call-centre/campaigns' })
                                }
                            >
                                <SelectTrigger>
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
                        {canManage && <CampaignDialog branch={branch} />}
                    </div>
                </div>
                {flash?.success && (
                    <Alert>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {campaigns.length === 0 && (
                        <Card className="sm:col-span-2 xl:col-span-4">
                            <CardContent className="text-muted-foreground flex min-h-36 items-center justify-center">
                                No campaigns exist for this branch. Create one to generate your first call list.
                            </CardContent>
                        </Card>
                    )}
                    {campaigns.map((campaign) => {
                        const progress = campaign.members ? Math.round((campaign.contacted / campaign.members) * 100) : 0;
                        return (
                            <Card key={campaign.id} className={campaign.id === selectedCampaignId ? 'ring-primary ring-2' : ''}>
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <CardTitle>{campaign.name}</CardTitle>
                                            <CardDescription>
                                                {humanize(campaign.type)}
                                                {campaign.agingBucket ? ` · ${humanize(campaign.agingBucket)}` : ''}
                                            </CardDescription>
                                        </div>
                                        <Badge variant={campaign.status === 'active' ? 'default' : 'outline'}>{humanize(campaign.status)}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-4">
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div>
                                            <p className="text-lg font-semibold">{campaign.members}</p>
                                            <p className="text-muted-foreground text-xs">Members</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-semibold">{campaign.contacted}</p>
                                            <p className="text-muted-foreground text-xs">Contacted</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-semibold">{campaign.completed}</p>
                                            <p className="text-muted-foreground text-xs">Completed</p>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="mb-1 flex justify-between text-xs">
                                            <span>Progress</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <div className="bg-muted h-2 rounded-full">
                                            <div className="bg-primary h-2 rounded-full" style={{ width: `${progress}%` }} />
                                        </div>
                                    </div>
                                    <p className="text-muted-foreground text-xs">
                                        {formatDate(campaign.startsOn)} – {formatDate(campaign.endsOn)}
                                    </p>
                                    <Button
                                        variant={campaign.id === selectedCampaignId ? 'secondary' : 'outline'}
                                        className="w-full"
                                        onClick={() => openCampaign(campaign.id)}
                                    >
                                        View call list
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
                {selected && (
                    <Card>
                        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <CardTitle>{selected.name} call list</CardTitle>
                                <CardDescription>{members?.total ?? 0} clients ordered by collection priority.</CardDescription>
                            </div>
                            {canManage && (
                                <div className="flex flex-wrap gap-2">
                                    <Button variant="outline" onClick={() => router.post(`/call-centre/campaigns/${selected.id}/generate`)}>
                                        <ListRestart data-icon="inline-start" /> Generate / refresh
                                    </Button>
                                    {selected.status === 'active' ? (
                                        <Button
                                            variant="outline"
                                            onClick={() => router.patch(`/call-centre/campaigns/${selected.id}/status`, { status: 'paused' })}
                                        >
                                            <Pause data-icon="inline-start" /> Pause
                                        </Button>
                                    ) : (
                                        <Button onClick={() => router.patch(`/call-centre/campaigns/${selected.id}/status`, { status: 'active' })}>
                                            <Play data-icon="inline-start" /> Activate
                                        </Button>
                                    )}
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <Table pagination={false}>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Client</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Assignee</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Last contact</TableHead>
                                        <TableHead>Ageing</TableHead>
                                        <TableHead className="text-right">Outstanding</TableHead>
                                        <TableHead />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(!members || members.data.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-muted-foreground h-32 text-center">
                                                Generate this campaign to populate its call list.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {members?.data.map((member) => (
                                        <TableRow key={member.id}>
                                            <TableCell>
                                                <p className="font-medium">{member.client}</p>
                                                <p className="text-muted-foreground text-xs">{member.clientNo}</p>
                                            </TableCell>
                                            <TableCell>{member.phone || '—'}</TableCell>
                                            <TableCell>{member.assignee || 'Unassigned'}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{humanize(member.status)}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <p>{member.lastOutcome ? humanize(member.lastOutcome) : 'Not contacted'}</p>
                                                <p className="text-muted-foreground text-xs">{formatDateTime(member.lastContactAt)}</p>
                                            </TableCell>
                                            <TableCell>{member.daysOverdue ? `${member.daysOverdue} days` : 'Current'}</TableCell>
                                            <TableCell className="text-right font-medium">{money(member.outstanding, member.currency)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" asChild>
                                                    <Link href={`/call-centre/clients/${member.clientId}`}>
                                                        Contact <ArrowRight data-icon="inline-end" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                        {members && members.links.length > 3 && (
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
                                <p className="text-muted-foreground text-xs">
                                    Showing {members.from ?? 0}–{members.to ?? 0} of {members.total}
                                </p>
                                <div className="flex gap-1">
                                    {members.links.map((link, index) => (
                                        <Button
                                            key={`${link.label}-${index}`}
                                            variant={link.active ? 'default' : 'outline'}
                                            size="sm"
                                            disabled={!link.url}
                                            asChild={Boolean(link.url)}
                                        >
                                            {link.url ? (
                                                <Link href={link.url} preserveScroll dangerouslySetInnerHTML={{ __html: link.label }} />
                                            ) : (
                                                <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                            )}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>
                )}
                {campaigns.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="size-4" /> Campaign operating model
                            </CardTitle>
                            <CardDescription>
                                Call lists are branch-scoped, assigned only to eligible branch agents and linked to every recorded outcome.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
