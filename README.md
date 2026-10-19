# Alpha Land Operations Portal

Laravel 12, Inertia and React ERP for property inventory, allocations, client accounts, collections, call-centre work, bulk SMS, audit trails and double-entry accounting.

## Local setup

1. Copy `.env.example` to `.env` and configure the database.
2. Run `composer install` and `npm ci`.
3. Run `php artisan key:generate` and `php artisan migrate --seed`.
4. Start the application, queue worker and scheduler:
   - `php artisan serve`
   - `php artisan queue:work --tries=3 --backoff=10`
   - `php artisan schedule:work`
5. Run `npm run dev` for frontend development.

Public registration is intentionally disabled. Administrators invite users from **Administration → Users & access**.

## Required production services

- MySQL with encrypted, tested daily backups and point-in-time recovery.
- A persistent queue worker supervised by systemd, Supervisor, a container orchestrator or the hosting platform.
- Laravel scheduler invoked every minute. It runs call-centre automation and daily audit-chain verification.
- A real mail transport for invitations, password resets and MFA codes.
- HTTPS, a correct `APP_URL`, `APP_ENV=production`, `APP_DEBUG=false`, `SESSION_ENCRYPT=true`, and `APP_TIMEZONE=Africa/Harare`.
- Twilio credentials plus public HTTPS status and inbound webhook URLs when SMS is enabled.
- Optional independent audit-anchor endpoint and secret.
- `php artisan storage:link`, followed by `php artisan config:cache`, `route:cache`, `event:cache` and `view:cache` during deployment.

Never enable Twilio until consent, sender identity and webhook configuration have been verified in the production environment.

## Release checks

```text
composer validate --no-check-publish
composer audit --locked
vendor/bin/pint --test
npm ci
npm audit --omit=dev
npm run format:check
npm run lint
npm run typecheck
npm run build
php artisan test
php artisan audit:verify
```

## Recovery

Before every release, take a database backup and retain the previous application artifact. A rollback restores the previous artifact first; a database rollback is only performed from a tested backup when the release introduced a non-backward-compatible migration. Queue workers must be restarted after every deployment.
