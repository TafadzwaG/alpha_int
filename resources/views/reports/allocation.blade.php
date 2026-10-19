<!doctype html><html><head><meta charset="utf-8"><title>Allocation report</title><style>
body{font-family:DejaVu Sans,sans-serif;font-size:9px;color:#171717}h1{font-size:22px}h2{font-size:14px;margin-top:22px;color:#171717}table{width:100%;border-collapse:collapse;table-layout:fixed}th{background:#f1f1f1;color:#171717;text-align:left}td,th{padding:7px;border-bottom:1px solid #171717;word-wrap:break-word}thead{display:table-header-group}tr{page-break-inside:avoid}.muted{color:#525252}
</style>@include('reports.partials.document-style')
</head><body>
@include('reports.partials.document-footer')
@include('reports.partials.brand-header')
<p class="muted">ALPHA LAND | ALLOCATION REPORT | {{ now()->format('d M Y H:i') }}</p>
<h1>{{ $allocation['client'] }} | Stand {{ $allocation['stand_no'] ?? 'Unassigned' }}</h1>
<p>{{ $allocation['development'] }} | {{ $allocation['branch'] }} | {{ $allocation['account_no'] ?? 'Account pending' }} | {{ ucfirst($allocation['status']) }}</p>
<table><tr><th>Purchase price</th><th>Paid</th><th>Balance</th><th>Next due</th><th>Overdue installments</th></tr><tr><td>{{ $allocation['currency'] }} {{ number_format($allocation['price'],2) }}</td><td>{{ $allocation['currency'] }} {{ number_format($allocation['paid'],2) }}</td><td>{{ $allocation['currency'] }} {{ number_format($allocation['balance'],2) }}</td><td>{{ $allocation['next_due_date'] ?? 'Not scheduled' }}</td><td>{{ $allocation['overdue_installments'] }}</td></tr></table>
@foreach($sections as $title => $section)<h2>{{ $title }}</h2><table><thead><tr>@foreach($section['headers'] as $label)<th>{{ $label }}</th>@endforeach</tr></thead><tbody>@forelse($section['rows'] as $row)<tr>@foreach($row as $value)<td>{{ is_float($value) ? number_format($value,2) : ($value ?? '-') }}</td>@endforeach</tr>@empty<tr><td colspan="{{ count($section['headers']) }}">No records.</td></tr>@endforelse</tbody></table>@endforeach
</body></html>