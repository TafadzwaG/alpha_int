export type Option = { value: string; label: string; code?: string };

export type CallCentreTask = {
    id: number;
    clientId: number;
    clientNo: string;
    client: string;
    phone: string | null;
    taskType: string;
    dueAt: string | null;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    status: 'open' | 'in_progress' | 'completed' | 'cancelled';
    assigneeId: number | null;
    assignee: string | null;
    notes: string | null;
    overdue: boolean;
    escalated: boolean;
    outstanding?: number;
    daysOverdue?: number;
    agingBucket?: string;
    currency?: string;
};

export type ClientSearchResult = {
    id: number;
    clientNo: string;
    name: string;
    phone: string | null;
    status: string;
    branch: string | null;
    standNumbers: string[];
    outstanding: number;
    daysOverdue: number;
    agingBucket: string;
    currency: string;
};

export type Pagination<T> = {
    data: T[];
    current_page: number;
    from: number | null;
    to: number | null;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
};

export const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export const formatDateTime = (value: string | null) =>
    value ? new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

export const formatDate = (value: string | null) => (value ? new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium' }).format(new Date(value)) : '—');

export const money = (value: number, currency = 'USD') =>
    new Intl.NumberFormat('en-ZW', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
