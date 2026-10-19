<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Alpha Land Call Centre Report</title>
    <style>
        @page { margin: 22px 28px; }
        * { box-sizing: border-box; }
        body { color: #171717; font-family: DejaVu Sans, sans-serif; font-size: 8px; line-height: 1.35; margin: 0; }
        h1, h2, p { margin: 0; }
        .header { border-bottom: 2px solid #171717; margin-bottom: 14px; padding-bottom: 10px; }
        .header-table, .metrics, .columns { border-collapse: collapse; table-layout: fixed; width: 100%; }
        .logo { height: 40px; margin-right: 10px; vertical-align: middle; }
        .brand { display: inline-block; vertical-align: middle; }
        .eyebrow { color: #171717; font-size: 7px; font-weight: bold; letter-spacing: 1.2px; text-transform: uppercase; }
        h1 { color: #171717; font-size: 18px; }
        h2 { border-left: 3px solid #171717; color: #171717; font-size: 11px; margin-bottom: 7px; padding-left: 7px; }
        .meta { color: #525252; text-align: right; vertical-align: bottom; }
        .metric-cell { padding-right: 7px; vertical-align: top; }
        .metric-cell:last-child { padding-right: 0; }
        .metric { background: #f1f1f1; border: 1px solid #dedede; border-radius: 4px; padding: 8px; }
        .metric-label { color: #525252; font-size: 6px; text-transform: uppercase; }
        .metric-value { color: #171717; font-size: 12px; font-weight: bold; margin-top: 3px; }
        .section { margin-top: 13px; page-break-inside: avoid; }
        table.data { border-collapse: collapse; width: 100%; }
        table.data th { background: #f1f1f1; color: #171717; font-size: 6.5px; padding: 5px 6px; text-align: left; text-transform: uppercase; }
        table.data td { border-bottom: 1px solid #dedede; padding: 5px 6px; }
        table.data tr:nth-child(even) td { background: #f1f1f1; }
        .number { text-align: right; }
        .columns td { vertical-align: top; width: 50%; }
        .columns .left { padding-right: 7px; }
        .columns .right { padding-left: 7px; }
        .footer { bottom: -14px; color: #525252; font-size: 6px; left: 0; position: fixed; right: 0; text-align: center; }
    </style>
@include('reports.partials.document-style')
</head>
<body>
@php
    $money = fn ($value) => $currency.' '.number_format((float) $value, 2);
    $generated = \Illuminate\Support\Carbon::parse($generatedAt)->format('d M Y, H:i');
@endphp
<div class="footer">Confidential call centre information · Generated {{ $generated }}</div>
<header class="header">
    <table class="header-table"><tr>
        <td>
            <img class="logo" src="data:image/png;base64,{{ base64_encode(file_get_contents(public_path('images/alpha-land-logo.png'))) }}" alt="Alpha Land">
            <div class="brand"><div class="eyebrow">Alpha Land Operations Portal</div><h1>Call Centre Performance Report</h1></div>
        </td>
        <td class="meta"><strong>{{ $organization['name'] }}</strong><br>{{ $period['from'] }} to {{ $period['to'] }}<br>Generated {{ $generated }}</td>
    </tr></table>
</header>
<table class="metrics"><tr>
    <td class="metric-cell"><div class="metric"><div class="metric-label">Interactions</div><div class="metric-value">{{ number_format($summary['interactions']) }}</div></div></td>
    <td class="metric-cell"><div class="metric"><div class="metric-label">Contact rate</div><div class="metric-value">{{ number_format($summary['contactRate'], 1) }}%</div></div></td>
    <td class="metric-cell"><div class="metric"><div class="metric-label">Promises</div><div class="metric-value">{{ $money($summary['promiseValue']) }}</div></div></td>
    <td class="metric-cell"><div class="metric"><div class="metric-label">Completed tasks</div><div class="metric-value">{{ number_format($summary['completedTasks']) }}</div></div></td>
    <td class="metric-cell"><div class="metric"><div class="metric-label">Collections</div><div class="metric-value">{{ $money($summary['collections']) }}</div></div></td>
</tr></table>

<table class="columns section"><tr>
    <td class="left">
        <h2>Agent performance</h2>
        <table class="data"><thead><tr><th>Agent</th><th class="number">Calls</th><th class="number">Contacts</th><th class="number">Rate</th><th class="number">Tasks</th></tr></thead><tbody>
        @forelse($agentPerformance as $row)
            <tr><td>{{ $row['agent'] }}</td><td class="number">{{ $row['interactions'] }}</td><td class="number">{{ $row['contacts'] }}</td><td class="number">{{ number_format($row['contactRate'], 1) }}%</td><td class="number">{{ $row['completedTasks'] }}</td></tr>
        @empty
            <tr><td colspan="5">No agent activity in this period.</td></tr>
        @endforelse
        </tbody></table>
    </td>
    <td class="right">
        <h2>Branch performance</h2>
        <table class="data"><thead><tr><th>Branch</th><th class="number">Calls</th><th class="number">Contacts</th><th class="number">Open</th><th class="number">Collections</th></tr></thead><tbody>
        @foreach($branchPerformance as $row)
            <tr><td>{{ $row['branch'] }}</td><td class="number">{{ $row['calls'] }}</td><td class="number">{{ $row['contacts'] }}</td><td class="number">{{ $row['openTasks'] }}</td><td class="number">{{ $money($row['collections']) }}</td></tr>
        @endforeach
        </tbody></table>
    </td>
</tr></table>

<section class="section">
    <h2>Daily activity</h2>
    <table class="data"><thead><tr><th>Date</th><th class="number">Interactions</th><th class="number">Contacts</th></tr></thead><tbody>
    @foreach($daily as $row)
        <tr><td>{{ $row['label'] }}</td><td class="number">{{ $row['calls'] }}</td><td class="number">{{ $row['contacts'] }}</td></tr>
    @endforeach
    </tbody></table>
</section>
</body>
</html>
