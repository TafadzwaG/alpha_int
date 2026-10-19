<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $clientName }} - account statements</title>
    <style>
        @page { size: A4 portrait; margin: 13mm 12mm 14mm; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #111827; background: white; font-family: DejaVu Sans, sans-serif; font-size: 9px; line-height: 1.42; }
        .toolbar { display: none; }
        .statement { page-break-after: always; break-after: page; }
        .statement:last-child { page-break-after: avoid; break-after: avoid-page; }
        .page-accent { height: 2mm; margin-bottom: 5mm; background: #047857; }
        .header { display: table; width: 100%; padding-bottom: 5mm; border-bottom: 2px solid #111827; }
        .header > div { display: table-cell; width: 50%; vertical-align: top; }
        .right { text-align: right; }
        .brand-row { display: table; }
        .brand-logo, .brand-copy { display: table-cell; vertical-align: middle; }
        .brand-logo { width: 18mm; height: 18mm; object-fit: contain; }
        .brand-copy { padding-left: 3mm; }
        .brand { color: #047857; font-size: 16px; font-weight: 700; }
        .title { margin-top: 1mm; font-size: 20px; font-weight: 700; letter-spacing: 1px; }
        .document-kicker { color: #047857; font-size: 7px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; }
        .meta { margin-top: 1.5mm; color: #4b5563; }
        .summary { display: table; width: 100%; margin: 5mm 0; table-layout: fixed; }
        .summary > div { display: table-cell; padding: 3.5mm; border: 1px solid #d1d5db; }
        .summary .label { color: #6b7280; font-size: 7px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; }
        .summary .value { margin-top: 1mm; font-size: 13px; font-weight: 700; }
        table { width: 100%; border-collapse: collapse; }
        th { padding: 2.4mm 1.8mm; background: #ecfdf5; color: #065f46; text-align: left; font-size: 7px; letter-spacing: .35px; text-transform: uppercase; }
        td { padding: 2.2mm 1.8mm; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
        .num { text-align: right; white-space: nowrap; }
        .aging { margin-top: 6mm; page-break-inside: avoid; }
        .aging-title { margin-bottom: 2mm; font-size: 11px; font-weight: 700; }
        .aging td { padding: 2.6mm 1.5mm; border: 1px solid #d1d5db; text-align: center; }
        .aging .bucket { color: #6b7280; font-size: 7px; text-transform: uppercase; }
        .aging .amount { margin-top: 1mm; font-weight: 700; }
        .footer { margin-top: 7mm; padding-top: 3mm; border-top: 1px solid #d1d5db; color: #6b7280; font-size: 7px; text-align: center; }

        @media screen {
            html { min-height: 100%; background: #e7edf2; }
            body.is-preview { min-height: 100vh; padding: 24px; background: linear-gradient(145deg, #edf4f1 0%, #e7edf2 50%, #f2f5f7 100%); }
            .is-preview .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 24px; width: 210mm; margin: 0 auto 18px; padding: 16px 18px; border: 1px solid #cbd5e1; border-radius: 12px; background: rgba(255, 255, 255, .96); box-shadow: 0 10px 30px rgba(15, 23, 42, .08); font-family: Arial, sans-serif; font-size: 13px; }
            .is-preview .toolbar-copy { min-width: 0; }
            .is-preview .toolbar-kicker { margin-bottom: 4px; color: #047857; font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
            .is-preview .toolbar-title { margin: 0; color: #0f172a; font-size: 18px; line-height: 1.2; }
            .is-preview .toolbar-meta { margin-top: 4px; color: #64748b; }
            .is-preview .toolbar-actions { display: flex; flex: 0 0 auto; gap: 8px; }
            .is-preview .toolbar-action { display: inline-flex; align-items: center; justify-content: center; min-height: 40px; padding: 0 16px; border: 1px solid #cbd5e1; border-radius: 8px; background: white; color: #0f172a; font: inherit; font-weight: 700; text-decoration: none; cursor: pointer; }
            .is-preview .toolbar-action:hover { border-color: #94a3b8; background: #f8fafc; }
            .is-preview .toolbar-action.primary { border-color: #047857; background: #047857; color: white; }
            .is-preview .toolbar-action.primary:hover { background: #065f46; }
            .is-preview .statement { width: 210mm; min-height: 297mm; margin: 0 auto 24px; padding: 13mm 12mm 14mm; border: 1px solid #cbd5e1; border-radius: 3px; background: white; box-shadow: 0 20px 55px rgba(15, 23, 42, .16); }
        }

        @media screen and (max-width: 860px) {
            body.is-preview { padding: 12px; overflow-x: auto; }
            .is-preview .toolbar { width: 210mm; align-items: flex-start; flex-direction: column; }
            .is-preview .toolbar-actions { width: 100%; }
            .is-preview .toolbar-action { flex: 1; }
        }

        @media print {
            html, body { background: white; }
            body { padding: 0; }
            .toolbar { display: none !important; }
            .statement { width: auto; min-height: 0; margin: 0; padding: 0; border: 0; border-radius: 0; box-shadow: none; }
        }
    </style>
</head>
<body class="{{ $print ? 'is-preview' : 'is-pdf' }}">
@if($print)
    <div class="toolbar">
        <div class="toolbar-copy">
            <div class="toolbar-kicker">Print preview</div>
            <h1 class="toolbar-title">Client account statement{{ $statements->count() === 1 ? '' : 's' }}</h1>
            <div class="toolbar-meta">{{ $statements->count() }} account{{ $statements->count() === 1 ? '' : 's' }} for {{ $clientName }}. Each statement prints on its own A4 page.</div>
        </div>
        <div class="toolbar-actions">
            <a class="toolbar-action" href="{{ $clientUrl }}">Back to client</a>
            <a class="toolbar-action" href="{{ $downloadUrl }}">Download PDF</a>
            <button class="toolbar-action primary" type="button" onclick="window.print()">Print statement{{ $statements->count() === 1 ? '' : 's' }}</button>
        </div>
    </div>
@endif
@php
    $date = fn ($value) => $value ? \Illuminate\Support\Carbon::parse($value)->format('d M Y') : '-';
    $money = fn ($value) => number_format((float) $value, 2);
    $logo = base64_encode(file_get_contents(public_path('images/alpha-land-logo.png')));
@endphp
@foreach($statements as $statement)
    <section class="statement">
        <div class="page-accent"></div>
        <header class="header">
            <div>
                <div class="brand-row">
                    <img class="brand-logo" src="data:image/png;base64,{{ $logo }}" alt="Alpha Land logo">
                    <div class="brand-copy">
                        <div class="brand">{{ $statement['organization']['name'] }}</div>
                        <div class="meta">{{ $statement['organization']['branch'] }}</div>
                        <div class="meta">{{ $statement['organization']['address'] }}</div>
                        <div class="meta">{{ $statement['organization']['telephone'] }} {{ $statement['organization']['email'] ? ' | '.$statement['organization']['email'] : '' }}</div>
                    </div>
                </div>
            </div>
            <div class="right">
                <div class="document-kicker">Account {{ $loop->iteration }} of {{ $statements->count() }}</div>
                <div class="title">ACCOUNT STATEMENT</div>
                <div class="meta">Statement date: {{ $date($statement['statement_date']) }}</div>
                <div class="meta">Status: {{ $statement['status'] }}</div>
            </div>
        </header>
        <div class="summary">
            <div>
                <div class="label">Client</div>
                <div class="value">{{ $statement['customer']['name'] }}</div>
                <div class="meta">{{ $statement['customer']['client_no'] }} | {{ $statement['customer']['phone'] }}</div>
            </div>
            <div>
                <div class="label">Account</div>
                <div class="value">{{ $statement['customer']['account_no'] }}</div>
                <div class="meta">{{ $statement['customer']['address'] ?: 'No address recorded' }}</div>
            </div>
            <div class="right">
                <div class="label">Amount due</div>
                <div class="value">{{ $statement['currency'] }} {{ $money($statement['amount_due']) }}</div>
                <div class="meta">Last payment: {{ $date($statement['last_payment_at']) }}</div>
            </div>
        </div>
        <table>
            <thead>
                <tr>
                    <th style="width: 13%">Date</th>
                    <th style="width: 16%">Reference</th>
                    <th>Description</th>
                    <th style="width: 13%" class="num">Debit ({{ $statement['currency'] }})</th>
                    <th style="width: 13%" class="num">Credit ({{ $statement['currency'] }})</th>
                    <th style="width: 14%" class="num">Balance ({{ $statement['currency'] }})</th>
                </tr>
            </thead>
            <tbody>
                @forelse($statement['transactions'] as $transaction)
                    <tr>
                        <td>{{ $date($transaction['date']) }}</td>
                        <td>{{ $transaction['reference'] }}</td>
                        <td>{{ $transaction['description'] }}{{ $transaction['allocated_to'] ? ' - '.$transaction['allocated_to'] : '' }}</td>
                        <td class="num">{{ $transaction['debit'] ? $money($transaction['debit']) : '-' }}</td>
                        <td class="num">{{ $transaction['credit'] ? $money($transaction['credit']) : '-' }}</td>
                        <td class="num"><strong>{{ $money($transaction['balance']) }}</strong></td>
                    </tr>
                @empty
                    <tr><td colspan="6" style="padding: 8mm; text-align: center; color: #6b7280">No account transactions recorded.</td></tr>
                @endforelse
            </tbody>
        </table>
        <div class="aging">
            <div class="aging-title">Outstanding ageing <span class="meta">({{ $statement['currency'] }})</span></div>
            <table><tr>
                @foreach($statement['aging'] as $bucket)
                    <td>
                        <div class="bucket">{{ $bucket['label'] }}</div>
                        <div class="amount">{{ $money($bucket['total']) }}</div>
                    </td>
                @endforeach
            </tr></table>
        </div>
        <div class="footer">Generated from posted charges and approved receipts. Please quote the account number when making an enquiry.</div>
    </section>
@endforeach
</body>
</html>
