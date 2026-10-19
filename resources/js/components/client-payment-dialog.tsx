import RecordPaymentDialog, { type RecordPaymentOptions } from '@/components/record-payment-dialog';

export type ClientPaymentOptions = RecordPaymentOptions;

export default function ClientPaymentDialog({ options }: { options: ClientPaymentOptions }) {
    return (
        <RecordPaymentDialog
            {...options}
            initialAccountId={options.accounts.length === 1 ? options.accounts[0].id : undefined}
        />
    );
}
