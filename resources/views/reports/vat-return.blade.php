<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>VAT return {{ $from }} to {{ $to }}</title>
    <style>
        @page { margin: 22px; }
        body { color: #0f172a; font-family: DejaVu Sans, sans-serif; font-size: 9px; }
        h1 { margin: 0 0 4px; font-size: 20px; }
        .muted { color: #64748b; }
        .meta, .summary { margin: 14px 0; width: 100%; border-collapse: collapse; }
        .summary td { width: 20%; border: 1px solid #cbd5e1; padding: 8px; }
        .value { margin-top: 4px; font-size: 14px; font-weight: 700; }
        table.detail { width: 100%; border-collapse: collapse; }
        .detail th { background: #0f172a; color: #fff; padding: 6px; text-align: left; }
        .detail td { border-bottom: 1px solid #e2e8f0; padding: 5px 6px; vertical-align: top; }
        .amount { text-align: right; white-space: nowrap; }
        .status { display: inline-block; padding: 3px 8px; border-radius: 99px; background: #dcfce7; color: #166534; font-weight: 700; }
        .footer { margin-top: 14px; border-top: 1px solid #cbd5e1; padding-top: 8px; }
    </style>
</head>
<body>
    <h1>{{ $organization }} — VAT return audit pack</h1>
    <div class="muted">Tax period {{ $from }} to {{ $to }} · Version {{ $return->version }} · <span class="status">{{ strtoupper($return->status) }}</span></div>

    <table class="summary">
        <tr>
            <td><span class="muted">Taxable sales</span><div class="value">{{ number_format($report['summary']['taxable_sales'], 2) }}</div></td>
            <td><span class="muted">Output VAT</span><div class="value">{{ number_format($report['summary']['output_tax'], 2) }}</div></td>
            <td><span class="muted">Taxable purchases</span><div class="value">{{ number_format($report['summary']['taxable_purchases'], 2) }}</div></td>
            <td><span class="muted">Input VAT</span><div class="value">{{ number_format($report['summary']['input_tax'], 2) }}</div></td>
            <td><span class="muted">Net payable / (refund)</span><div class="value">{{ number_format($report['summary']['net_tax'], 2) }}</div></td>
        </tr>
    </table>

    <table class="detail">
        <thead><tr><th>Date</th><th>Source</th><th>Document</th><th>Counterparty</th><th>Branch</th><th>Tax code</th><th>Description</th><th class="amount">Taxable</th><th class="amount">Input VAT</th><th class="amount">Output VAT</th></tr></thead>
        <tbody>
        @forelse ($report['rows'] as $row)
            <tr>
                <td>{{ $row['date'] }}</td><td>{{ $row['source'] }}</td><td>{{ $row['document_no'] }}</td><td>{{ $row['counterparty'] }}</td><td>{{ $row['branch'] }}</td><td>{{ $row['tax_code'] }}</td><td>{{ $row['description'] }}</td>
                <td class="amount">{{ number_format($row['taxable_amount'], 2) }}</td><td class="amount">{{ number_format($row['input_tax'], 2) }}</td><td class="amount">{{ number_format($row['output_tax'], 2) }}</td>
            </tr>
        @empty
            <tr><td colspan="10">No posted taxable transactions in this period.</td></tr>
        @endforelse
        </tbody>
    </table>

    <div class="footer muted">
        Control reconciliation — VAT output: {{ number_format($report['summary']['control_output'] ?? 0, 2) }};
        VAT input: {{ number_format($report['summary']['control_input'] ?? 0, 2) }};
        output variance: {{ number_format($report['summary']['output_variance'] ?? 0, 2) }};
        input variance: {{ number_format($report['summary']['input_variance'] ?? 0, 2) }}.
        @if($return->amendment_reason) Amendment reason: {{ $return->amendment_reason }}. @endif
    </div>
</body>
</html>
