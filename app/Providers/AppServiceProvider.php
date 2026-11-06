<?php

namespace App\Providers;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Times are stored in UTC; people read them in Philippine time.
        Carbon::macro('ph', fn () => $this->copy()->setTimezone(config('app.display_timezone')));

        // A site served over HTTPS (Render terminates TLS at its proxy) links and
        // redirects with https://, so pages never load mixed content.
        if (str_starts_with((string) config('app.url'), 'https://')) {
            URL::forceScheme('https');
        }
    }
}
