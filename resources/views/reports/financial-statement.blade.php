<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #172033; font-size: 10px; }
        h1 { margin: 0 0 4px; font-size: 19px; color: #087443; }
        .meta { color: #64748b; margin-bottom: 18px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #172033; color: white; padding: 8px; text-align: left; }
        td { padding: 7px 8px; border-bottom: 1px solid #e2e8f0; }
        .number { text-align: right; }
        .footer { margin-top: 18px; color: #64748b; font-size: 8px; }
    </style>
</head>
<body>
<h1>{{ $title }}</h1>
<div class="meta">{{ $organization }} · {{ $from }} to {{ $to }} · Generated {{ now()->format('d M Y H:i') }}</div>
<table>
    @if($report['type'] === 'general-ledger')
        <thead><tr><th>Date</th><th>Journal</th><th>Account</th><th>Description</th><th class="number">Debit</th><th class="number">Credit</th></tr></thead>
        <tbody>@foreach($report['rows'] as $row)<tr><td>{{ $row->entry_date }}</td><td>{{ $row->journal_no }}</td><td>{{ $row->code }} · {{ $row->name }}</td><td>{{ $row->description ?: $row->journal_description }}</td><td class="number">{{ number_format((float) $row->debit, 2) }}</td><td class="number">{{ number_format((float) $row->credit, 2) }}</td></tr>@endforeach</tbody>
    @else
        @php($valueHeadings = match($report['type']) { 'budget-variance' => ['Budget','Actual','Variance'], 'comparative-income' => ['Current','Prior','Movement'], 'monthly-performance' => ['Revenue','Expenses','Profit'], 'cash-flow' => ['Cash in','Cash out','Net movement'], 'control-reconciliation' => ['GL balance','Subledger','Difference'], default => ['Debit','Credit','Balance'] })
        <thead><tr><th>Code</th><th>Account</th><th>Class</th><th class="number">{{ $valueHeadings[0] }}</th><th class="number">{{ $valueHeadings[1] }}</th><th class="number">{{ $valueHeadings[2] }}</th></tr></thead>
        <tbody>@foreach($report['rows'] as $row)<tr><td>{{ $row['code'] }}</td><td>{{ $row['name'] }}</td><td>{{ ucfirst($row['type']) }}</td><td class="number">{{ number_format($row['debit'], 2) }}</td><td class="number">{{ number_format($row['credit'], 2) }}</td><td class="number">{{ number_format($row['balance'], 2) }}</td></tr>@endforeach</tbody>
    @endif
</table>
<div class="footer">Generated from posted Alpha Land ERP journals. Draft and reversed journals are excluded.</div>
</body>
</html>
