<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'zimrate' => [
        'base_url' => env('ZIMRATE_BASE_URL', 'https://zimrate.com'),
        'cache_ttl' => (int) env('ZIMRATE_CACHE_TTL', 1800),
        'timeout' => (int) env('ZIMRATE_TIMEOUT', 6),
    ],

    'twilio' => [
        'enabled' => filter_var(env('TWILIO_SMS_ENABLED', false), FILTER_VALIDATE_BOOL),
        'account_sid' => env('TWILIO_ACCOUNT_SID'),
        'auth_token' => env('TWILIO_AUTH_TOKEN'),
        'from' => env('TWILIO_FROM'),
        'timeout' => (int) env('TWILIO_TIMEOUT', 10),
        'webhook_base_url' => env('TWILIO_WEBHOOK_BASE_URL'),
    ],

    'audit' => [
        'anchor_url' => env('AUDIT_ANCHOR_WEBHOOK_URL'),
        'anchor_secret' => env('AUDIT_ANCHOR_SECRET'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
