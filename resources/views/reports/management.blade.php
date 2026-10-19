<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Alpha Land Management Report</title>
    <style>
        @page { margin: 22px 28px 26px; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #171717; font-family: DejaVu Sans, sans-serif; font-size: 8px; line-height: 1.35; }
        h1, h2, h3, p { margin: 0; }
        .header { border-bottom: 2px solid #171717; margin-bottom: 14px; padding-bottom: 10px; }
        .header-table, .metric-table, .two-column { border-collapse: collapse; width: 100%; }
        .brand-cell { width: 54%; }
        .meta-cell { color: #525252; text-align: right; vertical-align: bottom; }
        .logo { height: 42px; margin-right: 10px; vertical-align: middle; }
        .brand { display: inline-block; vertical-align: middle; }
        .eyebrow { color: #171717; font-size: 7px; font-weight: bold; letter-spacing: 1.4px; text-transform: uppercase; }
        h1 { color: #171717; font-size: 19px; margin-top: 2px; }
        .subtitle { color: #525252; font-size: 8px; margin-top: 2px; }
        .section { margin-top: 12px; }
        .section-title { border-left: 3px solid #171717; color: #171717; font-size: 11px; margin-bottom: 7px; padding-left: 7px; }
        .metric-table { table-layout: fixed; }
        .metric-cell { padding-right: 7px; vertical-align: top; }
        .metric-cell:last-child { padding-right: 0; }
        .metric { background: #f1f1f1; border: 1px solid #dedede; border-radius: 4px; padding: 8px; }
        .metric-label { color: #525252; font-size: 6.5px; letter-spacing: .5px; text-transform: uppercase; }
        .metric-value { color: #171717; font-size: 13px; font-weight: bold; margin-top: 3px; }
        .metric-detail { color: #525252; font-size: 6.5px; margin-top: 2px; }
        table.data { border-collapse: collapse; width: 100%; }
        table.data th { background: #f1f1f1; color: #171717; font-size: 6.5px; font-weight: bold; padding: 5px 6px; text-align: left; text-transform: uppercase; }
        table.data td { border-bottom: 1px solid #dedede; padding: 4px 6px; vertical-align: top; }
        table.data tbody tr:nth-child(even) td { background: #f1f1f1; }
        table.data .number { text-align: right; white-space: nowrap; }
        table.data .center { text-align: center; }
        .two-column { table-layout: fixed; }
        .two-column > tbody > tr > td { vertical-align: top; width: 50%; }
        .two-column .left { padding-right: 7px; }
        .two-column .right { padding-left: 7px; }
        .status { background: #f1f1f1; border-radius: 8px; color: #171717; display: inline-block; font-size: 6px; font-weight: bold; padding: 2px 6px; }
        .page-break { page-break-before: always; }
        .avoid-break { page-break-inside: avoid; }
        .footer { bottom: -18px; color: #525252; font-size: 6.5px; left: 0; position: fixed; right: 0; text-align: center; }
        .muted { color: #525252; }
        .empty { color: #525252; font-style: italic; padding: 12px !important; text-align: center; }
    </style>
@include('reports.partials.document-style')
</head>
<body>
@php
    $money = fn ($value) => $currency.' '.number_format((float) $value, 2);
    $generated = \Illuminate\Support\Carbon::parse($generatedAt)->format('d M Y, H:i');
@endphp

<div class="footer">Confidential management information - generated from Alpha Land ERP on {{ $generated }}</div>

<header class="header">
    <table class="header-table">
        <tr>
            <td class="brand-cell">
                <img class="logo" src="data:image/png;base64,{{ base64_encode(file_get_contents(public_path('images/alpha-land-logo.png'))) }}" alt="Alpha Land">
                <div class="brand">
                    <div class="eyebrow">{{ $organization['code'] }} operations</div>
                    <h1>Management Report</h1>
                    <p class="subtitle">Financial performance, receivables, developments and branch cash control</p>
                </div>
            </td>
            <td class="meta-cell">
                <strong>{{ $organization['name'] }}</strong><br>
                Reporting period: last 12 months<br>
                Generated: {{ $generated }}
            </td>
        </tr>
    </table>
</header>

<section class="avoid-break">
    <h2 class="section-title">Executive overview</h2>
    <table class="metric-table">
        <tr>
            <td class="metric-cell"><div class="metric"><div class="metric-label">Billed</div><div class="metric-value">{{ $money($summary['billed']) }}</div><div class="metric-detail">Last 12 months</div></div></td>
            <td class="metric-cell"><div class="metric"><div class="metric-label">Collected</div><div class="metric-value">{{ $money($summary['collected']) }}</div><div class="metric-detail">{{ number_format($summary['collectionRate'], 1) }}% collection rate</div></div></td>
            <td class="metric-cell"><div class="metric"><div class="metric-label">Outstanding</div><div class="metric-value">{{ $money($summary['outstanding']) }}</div><div class="metric-detail">Open receivables</div></div></td>
            <td class="metric-cell"><div class="metric"><div class="metric-label">Expenses</div><div class="metric-value">{{ $money($summary['expenses']) }}</div><div class="metric-detail">Approved and paid</div></div></td>
            <td class="metric-cell"><div class="metric"><div class="metric-label">Net cash movement</div><div class="metric-value">{{ $money($summary['collected'] - $summary['expenses']) }}</div><div class="metric-detail">Collections less expenses</div></div></td>
        </tr>
    </table>
</section>

<section class="section avoid-break">
    <h2 class="section-title">Twelve-month performance</h2>
    <table class="data">
        <thead><tr><th>Month</th><th class="number">Billed</th><th class="number">Collected</th><th class="number">Expenses</th><th class="number">Net movement</th></tr></thead>
        <tbody>
        @foreach ($monthly as $row)
            <tr>
                <td>{{ $row['label'] }}</td>
                <td class="number">{{ $money($row['billed']) }}</td>
                <td class="number">{{ $money($row['collected']) }}</td>
                <td class="number">{{ $money($row['expenses']) }}</td>
                <td class="number">{{ $money($row['collected'] - $row['expenses']) }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
</section>

<table class="two-column section">
    <tbody><tr>
        <td class="left">
            <h2 class="section-title">Receivables aging</h2>
            <table class="data">
                <thead><tr><th>Aging bucket</th><th class="number">Outstanding</th></tr></thead>
                <tbody>
                @foreach ($receivablesAging as $row)
                    <tr><td>{{ $row['bucket'] }}</td><td class="number">{{ $money($row['total']) }}</td></tr>
                @endforeach
                </tbody>
            </table>
        </td>
        <td class="right">
            <h2 class="section-title">Payment channels</h2>
            <table class="data">
                <thead><tr><th>Method</th><th class="center">Transactions</th><th class="number">Collected</th></tr></thead>
                <tbody>
                @forelse ($paymentMethods as $row)
                    <tr><td>{{ $row['method'] }}</td><td class="center">{{ $row['payment_count'] }}</td><td class="number">{{ $money($row['total']) }}</td></tr>
                @empty
                    <tr><td colspan="3" class="empty">No approved payments in this period.</td></tr>
                @endforelse
                </tbody>
            </table>
        </td>
    </tr></tbody>
</table>

<div class="page-break"></div>

<header class="header">
    <table class="header-table"><tr><td><div class="eyebrow">Alpha Land ERP</div><h1>Operational performance</h1></td><td class="meta-cell">{{ $organization['name'] }}<br>{{ $generated }}</td></tr></table>
</header>

<section class="avoid-break">
    <h2 class="section-title">Development sales performance</h2>
    <table class="data">
        <thead><tr><th>Development</th><th>Location</th><th class="center">Total stands</th><th class="center">Allocated</th><th class="center">Sell-through</th><th class="number">Inventory value</th><th class="number">Allocated value</th></tr></thead>
        <tbody>
        @forelse ($developmentPerformance as $row)
            @php $sellThrough = $row['total_stands'] ? round(($row['allocated_stands'] / $row['total_stands']) * 100) : 0; @endphp
            <tr><td><strong>{{ $row['development'] }}</strong></td><td>{{ $row['location'] }}</td><td class="center">{{ $row['total_stands'] }}</td><td class="center">{{ $row['allocated_stands'] }}</td><td class="center"><span class="status">{{ $sellThrough }}%</span></td><td class="number">{{ $money($row['inventory_value']) }}</td><td class="number">{{ $money($row['allocated_value']) }}</td></tr>
        @empty
            <tr><td colspan="7" class="empty">No development data available.</td></tr>
        @endforelse
        </tbody>
    </table>
</section>

<section class="section avoid-break">
    <h2 class="section-title">Branch cash control</h2>
    <table class="data">
        <thead><tr><th>Branch</th><th class="number">Collected</th><th class="number">Expenses</th><th class="number">Banked</th><th class="number">Unresolved variance</th></tr></thead>
        <tbody>
        @forelse ($branchPerformance as $row)
            <tr><td><strong>{{ $row['branch'] }}</strong></td><td class="number">{{ $money($row['collections']) }}</td><td class="number">{{ $money($row['expenses']) }}</td><td class="number">{{ $money($row['banked']) }}</td><td class="number">{{ $money($row['unresolved_variance']) }}</td></tr>
        @empty
            <tr><td colspan="5" class="empty">No branch data available.</td></tr>
        @endforelse
        </tbody>
    </table>
</section>

<table class="two-column section">
    <tbody><tr>
        <td class="left">
            <h2 class="section-title">Expense analysis</h2>
            <table class="data">
                <thead><tr><th>Category</th><th class="center">Records</th><th class="number">Total</th></tr></thead>
                <tbody>
                @forelse ($expenseByCategory as $row)
                    <tr><td>{{ $row['category'] }}</td><td class="center">{{ $row['expense_count'] }}</td><td class="number">{{ $money($row['total']) }}</td></tr>
                @empty
                    <tr><td colspan="3" class="empty">No approved expenses in this period.</td></tr>
                @endforelse
                </tbody>
            </table>
        </td>
        <td class="right">
            <h2 class="section-title">Reporting data health</h2>
            <table class="data">
                <thead><tr><th>Dataset</th><th>Status</th><th class="center">Rows</th><th>Completed</th></tr></thead>
                <tbody>
                @forelse ($refreshLogs as $row)
                    <tr><td>{{ str_replace('_', ' ', $row['dataset']) }}</td><td><span class="status">{{ $row['status'] }}</span></td><td class="center">{{ number_format($row['row_count']) }}</td><td>{{ $row['completed_at'] ? \Illuminate\Support\Carbon::parse($row['completed_at'])->format('d M Y H:i') : 'Pending' }}</td></tr>
                @empty
                    <tr><td colspan="4" class="empty">No refresh activity recorded.</td></tr>
                @endforelse
                </tbody>
            </table>
        </td>
    </tr></tbody>
</table>
</body>
</html>
