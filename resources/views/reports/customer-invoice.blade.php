<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 24px 28px 26px; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: DejaVu Sans, sans-serif; color: #111827; font-size: 9px; line-height: 1.28; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        td, th { vertical-align: top; overflow-wrap: break-word; }
        .panel { border: 1px solid #111827; }
        .panel-title { background: #f3f4f6; border-bottom: 1px solid #111827; padding: 5px 8px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; }
        .seller { width: 52%; padding: 9px 10px; }
        .document { width: 46%; }
        .gap { width: 2%; }
        .logo { width: 58px; height: 58px; float: left; margin-right: 10px; }
        .brand { font-size: 15px; font-weight: 700; margin-top: 3px; }
        .legal { font-size: 11px; font-weight: 700; margin-top: 5px; }
        .muted { color: #4b5563; }
        .document-title { font-size: 16px; text-align: center; font-weight: 700; padding: 8px; letter-spacing: .7px; }
        .doc-row { border-top: 1px solid #111827; }
        .doc-row td { padding: 8px; vertical-align: middle; }
        .doc-label { width: 42%; color: #374151; }
        .doc-value { text-align: right; font-weight: 700; }
        .spacer { height: 9px; }
        .party { height: 142px; padding: 8px 10px; }
        .party-heading { font-size: 10px; font-weight: 700; text-transform: uppercase; margin-bottom: 6px; }
        .party-name { font-size: 11px; font-weight: 700; margin-bottom: 5px; }
        .field-line { margin: 2px 0; }
        .field-label { display: inline-block; width: 94px; color: #374151; text-transform: uppercase; font-size: 8px; }
        .meta th { background: #f3f4f6; border: 1px solid #111827; padding: 5px 7px; text-align: left; font-size: 8px; }
        .meta td { border: 1px solid #111827; padding: 6px 7px; }
        .items { margin-top: 8px; }
        .items thead { display: table-header-group; }
        .items th { background: #111827; color: #fff; padding: 7px 6px; text-align: left; font-size: 8px; }
        .items th.right, .items td.right { text-align: right; }
        .items td { padding: 7px 6px; border-left: 1px solid #d1d5db; border-right: 1px solid #d1d5db; border-bottom: 1px solid #e5e7eb; }
        .items tr { page-break-inside: avoid; }
        .items .code { width: 12%; }
        .items .description { width: 29%; }
        .items .quantity { width: 9%; }
        .items .unit { width: 8%; }
        .items .price { width: 13%; }
        .items .discount { width: 8%; }
        .items .tax { width: 8%; }
        .items .net { width: 13%; }
        .item-space { height: 162px; border: 1px solid #111827; border-top: 0; }
        .bottom { margin-top: 9px; }
        .bank { height: 116px; padding: 8px 10px; }
        .bank-title { font-size: 10px; font-weight: 700; margin-bottom: 7px; }
        .totals { border: 1px solid #111827; }
        .totals td { padding: 5px 7px; border-bottom: 1px solid #d1d5db; vertical-align: middle; }
        .totals tr:last-child td { border-bottom: 0; }
        .totals .label { width: 56%; }
        .totals .amount { border-left: 1px solid #111827; text-align: right; font-weight: 700; white-space: nowrap; }
        .grand td { background: #111827; color: #fff; font-size: 11px; font-weight: 700; }
        .status { text-transform: uppercase; font-size: 8px; letter-spacing: .5px; }
        .footer { margin-top: 7px; padding-top: 5px; border-top: 1px solid #9ca3af; color: #4b5563; font-size: 7.5px; }
    </style>
</head>
<body>
@php
    $date = fn ($value) => $value ? \Illuminate\Support\Carbon::parse($value)->format('d/m/Y') : '-';
    $money = fn ($value) => $invoice['currency'].' '.number_format((float) $value, 2);
    $logo = base64_encode(file_get_contents(public_path('images/alpha-land-logo.png')));
@endphp

<table>
    <tr>
        <td class="panel seller">
            <img class="logo" src="data:image/png;base64,{{ $logo }}" alt="Alpha Land">
            <div class="brand">{{ $seller['trading_name'] }}</div>
            <div class="muted">{{ $seller['branch'] }}</div>
            <div style="clear: both"></div>
            <div class="legal">SELLER: {{ $seller['legal_name'] }}</div>
            <div>{{ $seller['address'] ?: 'Address not configured' }}</div>
            <div>Tel: {{ $seller['phone'] ?: '-' }}</div>
            <div>Email: {{ $seller['email'] ?: '-' }}</div>
            <div>Company registration: {{ $seller['registration_no'] ?: '-' }}</div>
            <div>Tax / VAT number: Not configured</div>
        </td>
        <td class="gap"></td>
        <td class="panel document">
            <div class="document-title">FISCAL TAX INVOICE</div>
            <table>
                <tr class="doc-row"><td class="doc-label">Invoice date</td><td class="doc-value">{{ $date($invoice['date']) }}</td></tr>
                <tr class="doc-row"><td class="doc-label">Due date</td><td class="doc-value">{{ $date($invoice['due_date']) }}</td></tr>
                <tr class="doc-row"><td class="doc-label">Page</td><td class="doc-value">1</td></tr>
                <tr class="doc-row"><td class="doc-label">Document No.</td><td class="doc-value">{{ $invoice['number'] }}</td></tr>
            </table>
        </td>
    </tr>
</table>

<div class="spacer"></div>

<table>
    <tr>
        <td class="panel party" style="width:52%">
            <div class="party-heading">Buyer</div>
            <div class="party-name">{{ $buyer['name'] }}</div>
            <div class="field-line"><span class="field-label">Customer no.</span>{{ $buyer['client_no'] }}</div>
            <div class="field-line"><span class="field-label">Account</span>{{ $buyer['account_no'] }}</div>
            <div class="field-line"><span class="field-label">Address</span>{{ $buyer['address'] ?: 'Not captured' }}</div>
            <div class="field-line"><span class="field-label">Phone</span>{{ $buyer['phone'] ?: '-' }}</div>
            <div class="field-line"><span class="field-label">Email</span>{{ $buyer['email'] ?: '-' }}</div>
        </td>
        <td class="gap"></td>
        <td class="panel party" style="width:46%">
            <div class="party-heading">Deliver to / Property reference</div>
            <div class="party-name">{{ $buyer['name'] }}</div>
            <div>{{ $buyer['delivery'] }}</div>
            @if($buyer['stand'])<div style="margin-top:5px">Stand number: {{ $buyer['stand'] }}</div>@endif
            <div style="margin-top:14px" class="status">Status: {{ str_replace('_', ' ', $invoice['status']) }}</div>
        </td>
    </tr>
</table>

<div class="spacer"></div>

<table class="meta">
    <thead><tr><th style="width:18%">Account</th><th style="width:31%">Your reference</th><th style="width:14%">Tax exempt</th><th style="width:19%">Tax reference</th><th>Sales code</th></tr></thead>
    <tbody><tr><td>{{ $buyer['account_no'] }}</td><td>{{ $buyer['client_no'] }}</td><td>{{ $tax['exempt'] }}</td><td>{{ $tax['reference'] }}</td><td>{{ strtoupper($invoice['status']) }}</td></tr></tbody>
</table>

<table class="items">
    <thead><tr><th class="code">Code</th><th class="description">Description</th><th class="quantity right">Quantity</th><th class="unit">Unit</th><th class="price right">Unit Price</th><th class="discount right">Disc%</th><th class="tax right">Tax</th><th class="net right">Nett Price</th></tr></thead>
    <tbody>
    @foreach($lines as $line)
        <tr>
            <td>{{ $line['code'] }}</td>
            <td>{{ $line['description'] }}</td>
            <td class="right">{{ rtrim(rtrim(number_format($line['quantity'], 4), '0'), '.') }}</td>
            <td>{{ $line['unit'] }}</td>
            <td class="right">{{ number_format($line['unit_price'], 2) }}</td>
            <td class="right">{{ number_format($line['discount_rate'], 2) }}%</td>
            <td class="right">{{ number_format($line['tax_rate'], 2) }}%</td>
            <td class="right">{{ $money($line['net_price']) }}</td>
        </tr>
    @endforeach
    </tbody>
</table>
@if(count($lines) < 8)<div class="item-space"></div>@endif

<table class="bottom">
    <tr>
        <td class="panel bank" style="width:62%">
            <div class="bank-title">BANK DETAILS</div>
            @if($bank)
                <div>{{ $bank['account_name'] }}</div>
                <div>Bank: {{ $bank['name'] }}</div>
                <div>Branch: {{ $bank['branch'] ?: $seller['branch'] }}</div>
                <div>{{ $bank['currency'] }} account: {{ $bank['account_number'] }}</div>
            @else
                <div class="muted">No active {{ $invoice['currency'] }} bank account is configured.</div>
            @endif
            @if($invoice['description'])<div style="margin-top:8px"><strong>Reference / notes:</strong> {{ $invoice['description'] }}</div>@endif
        </td>
        <td style="width:2%"></td>
        <td style="width:36%">
            <table class="totals">
                <tr><td class="label">Sub total</td><td class="amount">{{ $money($invoice['subtotal']) }}</td></tr>
                <tr><td class="label">Discount</td><td class="amount">{{ $money($invoice['discount']) }}</td></tr>
                <tr><td class="label">Amount excl. VAT</td><td class="amount">{{ $money($invoice['subtotal'] - $invoice['discount']) }}</td></tr>
                <tr><td class="label">VAT total</td><td class="amount">{{ $money($invoice['tax']) }}</td></tr>
                <tr class="grand"><td class="label">Invoice total</td><td class="amount">{{ $money($invoice['total']) }}</td></tr>
                <tr><td class="label">Paid</td><td class="amount">{{ $money($invoice['paid']) }}</td></tr>
                <tr><td class="label"><strong>Balance due</strong></td><td class="amount"><strong>{{ $money($invoice['balance']) }}</strong></td></tr>
            </table>
        </td>
    </tr>
</table>

<div class="footer">Electronically generated by {{ $seller['trading_name'] }}. Please use document number {{ $invoice['number'] }} as the payment reference.</div>
</body>
</html>
