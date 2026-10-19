<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $clientName }} - POS receipts</title>
    <style>
        @page { size: 80mm 210mm; margin: 0; }
        * { box-sizing: border-box; }
        html { min-height: 100%; background: #eef2f7; }
        body { margin: 0; color: #111; font-family: DejaVu Sans Mono, monospace; font-size: 9px; line-height: 1.42; }
        body.print-preview { min-height: 100vh; padding: 24px 12px 48px; background: #eef2f7; }
        body.pdf-document { width: 80mm; background: #fff; }
        .toolbar { width: 80mm; margin: 0 auto 18px; padding: 14px 16px; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; box-shadow: 0 8px 24px rgba(15, 23, 42, .08); font-family: DejaVu Sans, sans-serif; font-size: 11px; line-height: 1.45; }
        .toolbar strong { display: block; margin-bottom: 1mm; }
        .toolbar span { display: block; color: #475569; }
        .toolbar-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
        .toolbar a { display: flex; align-items: center; justify-content: center; min-height: 34px; padding: 7px 8px; border: 1px solid #cbd5e1; border-radius: 7px; color: #0f172a; background: #f8fafc; font-weight: 700; text-align: center; text-decoration: none; }
        .toolbar a:hover { border-color: #94a3b8; background: #f1f5f9; }
        .toolbar button { width: 100%; margin-top: 8px; padding: 9px 12px; border: 0; border-radius: 7px; background: #047857; color: white; font-weight: 700; cursor: pointer; }
        .toolbar button:hover { background: #065f46; }
        .receipt { width: 80mm; margin: 0 auto 18px; padding: 4mm 5mm 6mm; overflow: hidden; background: #fff; border: 1px solid #d8dee8; border-radius: 3mm; box-shadow: 0 12px 36px rgba(15, 23, 42, .12); page-break-after: always; break-after: page; }
        .pdf-document .receipt { width: 70mm; margin: 0; border: 0; border-radius: 0; box-shadow: none; }
        .receipt:last-child { page-break-after: avoid; break-after: avoid-page; }
        .center { text-align: center; }
        .right { text-align: right; }
        .logo { display: block; width: 16mm; height: 16mm; margin: 0 auto; object-fit: contain; }
        .trade { margin-top: 1.5mm; font-size: 12px; font-weight: bold; letter-spacing: .3px; }
        .legal { max-width: 64mm; margin: 1mm auto 0; color: #444; font-size: 7px; line-height: 1.35; }
        .branch { margin-top: 1.5mm; font-size: 7.5px; font-weight: bold; }
        .title { margin-top: 3mm; font-size: 11px; font-weight: bold; letter-spacing: 1px; }
        .number { margin-top: .8mm; font-size: 8.5px; font-weight: bold; }
        .rule { margin: 3mm 0; border-top: .5px dashed #333; }
        .double-rule { margin: 2.5mm 0; border-top: 1.5px double #111; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        td { padding: .7mm 0; vertical-align: top; overflow-wrap: anywhere; }
        .label { width: 31%; color: #444; text-transform: uppercase; }
        .value { width: 69%; padding-left: 2mm; text-align: right; font-weight: bold; }
        .item { margin-bottom: 2mm; page-break-inside: avoid; }
        .item-name { padding-right: 1mm; }
        .item-amount { margin-top: .4mm; text-align: right; font-weight: bold; }
        .total { font-size: 10px; font-weight: bold; }
        .qr { display: block; width: 22mm; height: 22mm; margin: 2mm auto 1mm; }
        .footer { margin-top: 3mm; color: #444; font-size: 7px; }
        .strong { color: #111; font-weight: bold; }
        .notes { white-space: pre-wrap; }
        @media print {
            .toolbar { display: none !important; }
            html, body, body.print-preview { width: 80mm; min-height: 0; padding: 0; background: #fff; }
            .receipt { width: 80mm; margin: 0; border: 0; border-radius: 0; box-shadow: none; }
        }
    </style>
</head>
<body class="{{ $print ? 'print-preview' : 'pdf-document' }}">
@if($print)
    <div class="toolbar">
        <strong>{{ $documents->count() }} receipt{{ $documents->count() === 1 ? '' : 's' }} for {{ $clientName }}</strong>
        <span>Select an 80 mm thermal/POS paper size, use 100% scale, and turn browser headers and footers off.</span>
        <div class="toolbar-actions">
            @foreach($toolbarLinks ?? [] as $link)
                <a href="{{ $link['url'] }}">{{ $loop->first ? '← ' : '' }}{{ $link['label'] }}</a>
            @endforeach
        </div>
        <button type="button" onclick="window.print()">Print POS receipt{{ $documents->count() === 1 ? '' : 's' }}</button>
    </div>
@endif
@php
    $date = fn ($value) => $value ? \Illuminate\Support\Carbon::parse($value)->timezone('Africa/Harare')->format('d M Y H:i') : '-';
@endphp
@foreach($documents as $document)
    <section class="receipt">
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
            <div style="margin-top: 2mm">*** POS RECEIPT - KEEP FOR YOUR RECORDS ***</div>
        </div>
    </section>
@endforeach
@if($print)
    <script>window.addEventListener('load', () => window.setTimeout(() => window.print(), 150));</script>
@endif
</body>
</html>
