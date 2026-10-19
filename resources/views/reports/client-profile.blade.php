<!doctype html>
<html><head><meta charset="utf-8"><title>Client profile</title>
<style>body{font-family:DejaVu Sans,sans-serif;font-size:10px;color:#171717}h1{font-size:24px;margin-bottom:4px}h2{font-size:15px;margin-top:24px;color:#171717}p{line-height:1.6}table{width:100%;border-collapse:collapse;table-layout:fixed}th{background:#f1f1f1;color:#171717;text-align:left}td,th{padding:8px;border-bottom:1px solid #171717;word-wrap:break-word}tr{page-break-inside:avoid}thead{display:table-header-group}.muted{color:#525252}</style>@include('reports.partials.document-style')
</head><body>
@include('reports.partials.document-footer')
@include('reports.partials.brand-header')

<p class="muted">ALPHA LAND · CLIENT PROFILE · {{ now()->format('d M Y H:i') }}</p>
<div style="float:right;width:170px;text-align:center;margin-left:20px">
<img src="{{ $verificationQr }}" alt="Profile verification QR code" style="width:120px;height:120px">
<p style="font-weight:bold;margin:0">Scan to verify client reference</p>
<p class="muted" style="font-size:8px">Authorized sign-in required.<br>Compare this document with the current client record.</p>
</div>
<h1>{{ $client['name'] }}</h1><p>{{ $client['client_no'] }} · {{ $client['branch'] }} · {{ ucfirst($client['status']) }}<br>Phone: {{ $client['phone'] ?? 'Not recorded' }}</p>
<div style="clear:both"></div>
<p class="muted" style="font-size:8px">Verification reference: {{ $client['public_id'] }}. This code verifies the profile link; it does not certify that the PDF has not been altered.</p>
<h2>Financial overview</h2><table><tr>@foreach($summary as $key => $value)<th>{{ str($key)->headline() }}</th>@endforeach</tr><tr>@foreach($summary as $value)<td>{{ number_format($value, 2) }}</td>@endforeach</tr></table>
<p class="muted">Purchase amounts are shown with their currency below.</p>
<h2>Client files</h2><table><thead><tr><th>File number</th><th>Branch</th><th>Opened</th><th>Status</th></tr></thead><tbody>@forelse($client['files'] as $file)<tr><td>{{ $file['file_no'] }}</td><td>{{ $file['branch'] }}</td><td>{{ $file['opened_at'] }}</td><td>{{ $file['status'] }}</td></tr>@empty<tr><td colspan="4">No client files recorded.</td></tr>@endforelse</tbody></table>
<h2>Stand purchases</h2><table><thead><tr><th>Stand / development</th><th>Branch</th><th>Price</th><th>Paid</th><th>Balance</th><th>Next due</th></tr></thead><tbody>@forelse($allocations as $item)<tr><td>{{ $item['stand_no'] }} · {{ $item['development'] }}</td><td>{{ $item['branch'] }}</td><td>{{ $item['currency'] }} {{ number_format($item['price'],2) }}</td><td>{{ number_format($item['paid'],2) }}</td><td>{{ number_format($item['balance'],2) }}</td><td>{{ $item['next_due_date'] ?? '—' }}</td></tr>@empty<tr><td colspan="6">No stand purchases recorded.</td></tr>@endforelse</tbody></table>
<h2>Call history</h2><table><thead><tr><th>Date / agent</th><th>Branch</th><th>Direction / duration</th><th>Outcome</th><th style="width:30%">Notes</th></tr></thead><tbody>@forelse($callHistory as $call)<tr><td>{{ $call['occurred_at'] }}<br>{{ $call['agent'] }}</td><td>{{ $call['branch'] }}</td><td>{{ $call['direction'] }}<br>{{ $call['duration_seconds'] ?? '—' }} seconds</td><td>{{ $call['outcome'] }}</td><td>{{ $call['summary'] }}</td></tr>@empty<tr><td colspan="5">No calls recorded.</td></tr>@endforelse</tbody></table>
</body></html>