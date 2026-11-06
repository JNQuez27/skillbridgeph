<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $user = $request->user();

        return array_merge(parent::share($request), [
            'app' => [
                'name' => config('app.name'),
            ],
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'firstName' => $user->first_name,
                    'surname' => $user->surname,
                    'email' => $user->email,
                    'role' => $user->role,
                ] : null,
            ],
            // Fig. 7, step 760: in-app notifications for the signed-in user.
            'notifications' => $user ? [
                'unread' => $user->unreadNotifications()->count(),
                'items' => $user->notifications()->latest()->take(8)->get()->map(fn ($n) => [
                    'id' => $n->id,
                    'text' => $n->data['text'] ?? '',
                    'url' => $n->data['url'] ?? null,
                    'at' => $n->created_at->diffForHumans(),
                    'read' => $n->read_at !== null,
                ])->values(),
            ] : null,
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }
}
