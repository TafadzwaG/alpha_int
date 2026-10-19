<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 5mm 5mm 6mm; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #111; font-family: DejaVu Sans Mono, monospace; font-size: 8.2px; line-height: 1.38; }
        .center { text-align: center; }
        .right { text-align: right; }
        .logo { width: 15mm; height: 15mm; object-fit: contain; }
        .trade { margin-top: 2mm; font-size: 12px; font-weight: bold; letter-spacing: .4px; }
        .legal { margin-top: 1mm; color: #444; font-size: 6.7px; line-height: 1.3; }
        .branch { margin-top: 1.5mm; font-size: 7px; }
        .title { margin-top: 3mm; font-size: 11px; font-weight: bold; letter-spacing: 1.1px; }
        .number { margin-top: .8mm; font-weight: bold; }
        .rule { margin: 3mm 0; border-top: .5px dashed #333; }
        .double-rule { margin: 2.5mm 0; border-top: 1.5px double #111; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        td { padding: .55mm 0; vertical-align: top; overflow-wrap: anywhere; }
        .label { width: 35%; text-transform: uppercase; }
        .value { width: 65%; text-align: right; font-weight: bold; }
        .item { margin-bottom: 2mm; page-break-inside: avoid; }
        .item-name { padding-right: 1mm; }
        .item-amount { margin-top: .4mm; text-align: right; font-weight: bold; }
        .total { font-size: 10px; font-weight: bold; }
        .qr { width: 22mm; height: 22mm; margin-top: 2mm; }
        .footer { color: #444; font-size: 6.8px; }
        .strong { color: #111; font-weight: bold; }
        .notes { white-space: pre-wrap; }
    </style>
</head>
<body>
@php
    $date = fn ($value) => $value ? \Illuminate\Support\Carbon::parse($value)->timezone('Africa/Harare')->format('d M Y H:i') : '-';
@endphp
<div class="center">
    <img src="data:image/png;base64,{{ base64_encode(file_get_contents(public_path('images/alpha-land-logo.png'))) }}" class="logo" alt="Alpha Land">
    <div class="trade">{{ $document['trading_name'] }}</div>
    <div class="legal">{{ $document['company'] }}</div>
    <div class="branch">{{ $document['branch'] }}</div>
    <div class="title">PAYMENT RECEIPT</div>
    <div class="number">{{ $document['number'] }}</div>
</div>

<div class="rule"></div>
<table>
    <tr><td class="label">Date</td><td class="value">{{ $date($document['received_at']) }}</td></tr>
    <tr><td class="label">Client</td><td class="value">{{ $document['client'] }}</td></tr>
    <tr><td class="label">Client No</td><td class="value">{{ $document['client_no'] }}</td></tr>
    <tr><td class="label">Account</td><td class="value">{{ $document['account'] }}</td></tr>
    <tr><td class="label">Method</td><td class="value">{{ $document['method'] }}</td></tr>
    <tr><td class="label">Reference</td><td class="value">{{ $document['reference'] ?: '-' }}</td></tr>
</table>

<div class="rule"></div>
<table><tr><td class="strong">DESCRIPTION</td><td class="right strong">AMOUNT</td></tr></table>
@foreach($document['lines'] as $line)
    <div class="item">
        <div class="item-name">{{ $line['description'] }}{{ $line['installment'] ? ' / INST #'.$line['installment'] : '' }}</div>
        <div class="item-amount">{{ $document['currency'] }} {{ number_format($line['amount'], 2) }}</div>
    </div>
@endforeach

<div class="double-rule"></div>
<table class="total"><tr><td>TOTAL</td><td class="right">{{ $document['currency'] }} {{ number_format($document['amount'], 2) }}</td></tr></table>
<div class="double-rule"></div>

@if($document['notes'])
    <div class="strong">NOTE</div>
    <div class="notes">{{ $document['notes'] }}</div>
    <div class="rule"></div>
@endif

<div class="center footer">
    <div class="strong">THANK YOU FOR YOUR PAYMENT</div>
    <div style="margin-top: 1.5mm">Cashier: {{ $document['issued_by'] }}</div>
    <div>Issued: {{ $date($document['issued_at']) }}</div>
    <img src="{{ $document['qr'] }}" class="qr" alt="Receipt verification QR">
    <div>Scan to verify this receipt</div>
    <div style="margin-top: 2mm">*** POS RECEIPT · KEEP FOR YOUR RECORDS ***</div>
</div>
</body>
</html>
