export type AgingBucket = {
    key: string;
    label: string;
    total: number;
    accounts: number;
};

export type Debtor = {
    account_id: number;
    account_no: string;
    client_no: string | null;
    client: string;
    phone: string | null;
    branch: string | null;
    file_no: string | null;
    currency: string;
    outstanding: number;
    aging: Record<string, number>;
    days_overdue: number;
    oldest_due_date: string | null;
    last_payment_at: string | null;
    open_charges: number;
};

export type DebtorStatement = {
    organization: {
        name: string;
        branch: string | null;
        address: string | null;
        telephone: string | null;
        email: string | null;
    };
    customer: {
        account_no: string;
        client_no: string | null;
        name: string;
        address: string | null;
        phone: string | null;
    };
    statement_date: string;
    status: 'Current' | 'Overdue';
    amount_due: number;
    last_payment_at: string | null;
    transactions: Array<{
        date: string;
        reference: string;
        description: string;
        allocated_to: string | null;
        debit: number;
        credit: number;
        balance: number;
    }>;
    aging: Array<AgingBucket>;
};

export type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

export type Paginated<T> = {
    data: T[];
    current_page: number;
    from: number | null;
    last_page: number;
    links: PaginationLink[];
    per_page: number;
    to: number | null;
    total: number;
};
