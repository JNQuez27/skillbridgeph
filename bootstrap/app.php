<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Behind a host's TLS proxy (Render): take the scheme, host and port from the
        // proxy so redirects stay on https://. X-Forwarded-For is deliberately NOT
        // trusted: it is client-controlled, and the login and /verify throttles key
        // on the IP. Those headers only change how this request's own links are built.
        // ponytail: throttles see the proxy's IP, not the visitor's; trust the host's
        // published proxy IPs for X-Forwarded-For if per-visitor limits matter.
        $middleware->trustProxies(at: '*', headers: \Illuminate\Http\Request::HEADER_X_FORWARDED_PROTO
            | \Illuminate\Http\Request::HEADER_X_FORWARDED_HOST
            | \Illuminate\Http\Request::HEADER_X_FORWARDED_PORT);
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
