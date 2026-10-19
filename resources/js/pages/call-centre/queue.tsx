import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowRight, Check, Filter, ListTodo, Search, Eye as TableViewIcon, UserRoundCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { CallCentreTask, Option, Pagination, formatDateTime, humanize, money } from './types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Call centre', href: '/call-centre' },
    { title: 'Work queue', href: '/call-centre/queue' },
];

type Props = {
    tasks: Pagination<CallCentreTask>;
    filters: { search: string; status: string; priority: string; agent: string; aging: string; due_from: string; due_to: string };
    branch: { id: number; name: string; code: string };
    branches: Option[];
    agents: Option[];
    canAssign: boolean;
    canManage: boolean;
};

const priorityVariant = (priority: string): 'default' | 'secondary' | 'outline' | 'destructive' =>
    priority === 'urgent' ? 'destructive' : priority === 'high' ? 'default' : priority === 'normal' ? 'secondary' : 'outline';

export default function CallCentreQueue({ tasks, filters, branch, branches, agents, canAssign, canManage }: Props) {
    const { flash } = usePage<SharedData>().props;
    const [values, setValues] = useState(filters);
    const [selected, setSelected] = useState<number[]>([]);
    const [assignee, setAssignee] = useState('');

    const applyFilters = (event: FormEvent) => {
        event.preventDefault();
        router.get('/call-centre/queue', Object.fromEntries(Object.entries(values).filter(([, value]) => value && value !== 'all')), {
            preserveState: true,
            replace: true,
        });
    };

    const toggleAll = (checked: boolean) => setSelected(checked ? tasks.data.map((task) => task.id) : []);
    const toggleTask = (taskId: number, checked: boolean) =>
        setSelected((current) => (checked ? [...new Set([...current, taskId])] : current.filter((id) => id !== taskId)));
    const bulkAssign = () => {
        if (!assignee || selected.length === 0) return;
        router.post('/call-centre/tasks/bulk-assign', { task_ids: selected, assigned_to: Number(assignee) }, { onSuccess: () => setSelected([]) });
    };
    const updateStatus = (task: CallCentreTask, status: CallCentreTask['status']) => router.patch(`/call-centre/tasks/${task.id}`, { status });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Agent work queue" />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <Badge variant="secondary" className="mb-2">
                            {branch.code} · {canAssign ? 'Supervisor queue' : 'My queue'}
                        </Badge>
                        <div className="flex items-center gap-2">
                            <ListTodo className="size-5" />
                            <h1 className="text-2xl font-semibold tracking-tight">Agent work queue</h1>
                        </div>
                        <p className="text-muted-foreground mt-1">
                            Prioritise callbacks, payment reminders, documents and escalations for {branch.name}.
                        </p>
                    </div>
                    <Field className="w-64 gap-1.5">
                        <FieldLabel htmlFor="queue-branch">Working branch</FieldLabel>
                        <Select
                            value={String(branch.id)}
                            onValueChange={(value) => router.post('/select-branch', { branch_id: Number(value), redirect_to: '/call-centre/queue' })}
                        >
                            <SelectTrigger id="queue-branch">
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
                </div>

                {flash?.success && (
                    <Alert>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Queue filters</CardTitle>
                        <CardDescription>Combine client, ageing, agent, urgency and due-date filters to focus the next contact run.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={applyFilters}>
                            <FieldGroup className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8 2xl:items-end">
                                <Field className="2xl:col-span-2">
                                    <FieldLabel htmlFor="queue-search">Client search</FieldLabel>
                                    <div className="relative">
                                        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                        <Input
                                            id="queue-search"
                                            value={values.search}
                                            onChange={(event) => setValues({ ...values, search: event.target.value })}
                                            className="pl-9"
                                            placeholder="Name, number or phone"
                                        />
                                    </div>
                                </Field>
                                <Field>
                                    <FieldLabel>Status</FieldLabel>
                                    <Select value={values.status} onValueChange={(status) => setValues({ ...values, status })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {['all', 'open', 'in_progress', 'overdue', 'completed', 'cancelled'].map((value) => (
                                                    <SelectItem key={value} value={value}>
                                                        {humanize(value)}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field>
                                    <FieldLabel>Priority</FieldLabel>
                                    <Select value={values.priority} onValueChange={(priority) => setValues({ ...values, priority })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {['all', 'urgent', 'high', 'normal', 'low'].map((value) => (
                                                    <SelectItem key={value} value={value}>
                                                        {humanize(value)}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field>
                                    <FieldLabel>Ageing</FieldLabel>
                                    <Select value={values.aging} onValueChange={(aging) => setValues({ ...values, aging })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="all">All ageing</SelectItem>
                                                <SelectItem value="current">Current</SelectItem>
                                                <SelectItem value="1_30">1–30 days</SelectItem>
                                                <SelectItem value="31_60">31–60 days</SelectItem>
                                                <SelectItem value="61_90">61–90 days</SelectItem>
                                                <SelectItem value="90_plus">90+ days</SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                {canAssign && (
                                    <Field>
                                        <FieldLabel>Agent</FieldLabel>
                                        <Select value={values.agent} onValueChange={(agent) => setValues({ ...values, agent })}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectItem value="all">All agents</SelectItem>
                                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                                    {agents.map((option) => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                )}
                                <Field>
                                    <FieldLabel htmlFor="due-from">Due from</FieldLabel>
                                    <Input
                                        id="due-from"
                                        type="date"
                                        value={values.due_from}
                                        onChange={(event) => setValues({ ...values, due_from: event.target.value })}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="due-to">Due to</FieldLabel>
                                    <Input
                                        id="due-to"
                                        type="date"
                                        value={values.due_to}
                                        onChange={(event) => setValues({ ...values, due_to: event.target.value })}
                                    />
                                </Field>
                                <Button type="submit">
                                    <Filter data-icon="inline-start" /> Apply
                                </Button>
                            </FieldGroup>
                        </form>
                    </CardContent>
                </Card>

                {canAssign && selected.length > 0 && (
                    <Card>
                        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="font-medium">
                                    {selected.length} task{selected.length === 1 ? '' : 's'} selected
                                </p>
                                <p className="text-muted-foreground text-xs">Assign selected tasks to a branch-enabled agent.</p>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Select value={assignee} onValueChange={setAssignee}>
                                    <SelectTrigger className="w-64">
                                        <SelectValue placeholder="Choose agent" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {agents.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                <Button onClick={bulkAssign} disabled={!assignee}>
                                    <UserRoundCheck data-icon="inline-start" /> Assign tasks
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-3">
                        <div>
                            <CardTitle>Follow-up tasks</CardTitle>
                            <CardDescription>
                                {tasks.total} task{tasks.total === 1 ? '' : 's'} match the current filters.
                            </CardDescription>
                        </div>
                        <Button variant="outline" asChild>
                            <Link href="/call-centre">
                                Find client <ArrowRight data-icon="inline-end" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <Table pagination={false}>
                            <TableHeader>
                                <TableRow>
                                    {canAssign && (
                                        <TableHead className="w-10">
                                            <Checkbox
                                                checked={tasks.data.length > 0 && selected.length === tasks.data.length}
                                                onCheckedChange={(checked) => toggleAll(checked === true)}
                                                aria-label="Select all tasks"
                                            />
                                        </TableHead>
                                    )}
                                    <TableHead>Client</TableHead>
                                    <TableHead>Task</TableHead>
                                    <TableHead>Due</TableHead>
                                    <TableHead>Ageing</TableHead>
                                    <TableHead>Assignee</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tasks.data.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={canAssign ? 8 : 7} className="text-muted-foreground h-32 text-center">
                                            No tasks match these filters.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {tasks.data.map((task) => (
                                    <TableRow key={task.id}>
                                        {canAssign && (
                                            <TableCell>
                                                <Checkbox
                                                    checked={selected.includes(task.id)}
                                                    onCheckedChange={(checked) => toggleTask(task.id, checked === true)}
                                                    aria-label={`Select ${task.client}`}
                                                />
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            <p className="font-medium">{task.client}</p>
                                            <p className="text-muted-foreground text-xs">
                                                {task.clientNo} · {task.phone || 'No phone'}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            <p>{humanize(task.taskType)}</p>
                                            {task.escalated && (
                                                <Badge variant="destructive" className="mt-1">
                                                    Escalated
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className={task.overdue ? 'text-destructive font-medium' : ''}>
                                            {formatDateTime(task.dueAt)}
                                        </TableCell>
                                        <TableCell>
                                            <p>{task.daysOverdue ? `${task.daysOverdue} days` : 'Current'}</p>
                                            <p className="text-muted-foreground text-xs">{money(task.outstanding ?? 0, task.currency)}</p>
                                        </TableCell>
                                        <TableCell>{task.assignee || 'Unassigned'}</TableCell>
                                        <TableCell>
                                            <Badge variant={priorityVariant(task.priority)}>{task.priority}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-2">
                                                {canManage && task.status !== 'completed' && (
                                                    <Button variant="outline" size="sm" onClick={() => updateStatus(task, 'completed')}>
                                                        <Check data-icon="inline-start" /> Complete
                                                    </Button>
                                                )}
                                                <Button variant="view" size="sm" asChild>
                                                    <Link href={`/call-centre/clients/${task.clientId}`}>
                                                        <TableViewIcon data-icon="inline-start" />
                                                        Open
                                                    </Link>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                    {tasks.links.length > 3 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
                            <p className="text-muted-foreground text-xs">
                                Showing {tasks.from ?? 0}–{tasks.to ?? 0} of {tasks.total}
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {tasks.links.map((link, index) => (
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
            </div>
        </AppLayout>
    );
}
