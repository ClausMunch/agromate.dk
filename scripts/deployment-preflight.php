<?php

// Reads framework configuration only. It never connects to the database or prints secret values.
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$checks = [
    'APP_ENV' => $app->environment('production'),
    'APP_DEBUG' => config('app.debug') === false,
    'APP_URL HTTPS' => parse_url(config('app.url'), PHP_URL_SCHEME) === 'https'
        && (bool) parse_url(config('app.url'), PHP_URL_HOST),
    'DB_CONNECTION' => config('database.default') === 'mysql',
    'SESSION_DRIVER' => config('session.driver') === 'database',
    'CACHE_STORE' => config('cache.default') === 'database',
    'SESSION_SECURE_COOKIE' => config('session.secure') === true,
    'SESSION_HTTP_ONLY' => config('session.http_only') === true,
    'SESSION_SAME_SITE' => config('session.same_site') === 'lax',
    'SESSION_ENCRYPT' => config('session.encrypt') === true,
];
$key = config('app.key', '');
if (is_string($key) && str_starts_with($key, 'base64:')) {
    $key = base64_decode(substr($key, 7), true);
}
$checks['APP_KEY'] = is_string($key) && Illuminate\Encryption\Encrypter::supported($key, config('app.cipher'));
$failed = array_keys(array_filter($checks, fn ($valid) => !$valid));
if ($failed) {
    fwrite(STDERR, 'Preflight rejected configuration: '.implode(', ', $failed).". No migrations were run.\n");
    exit(1);
}
fwrite(STDOUT, "Preflight passed. No database connection was made.\n");
