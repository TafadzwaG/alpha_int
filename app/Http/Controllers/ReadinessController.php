<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ReadinessController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'database' => fn () => DB::select('select 1'),
            'cache' => function (): void {
                $key = 'health:'.str()->uuid();
                Cache::put($key, 'ok', 10);
                throw_unless(Cache::pull($key) === 'ok', new \RuntimeException('Cache read/write failed.'));
            },
            'storage' => function (): void {
                $path = 'health/'.str()->uuid();
                Storage::disk('local')->put($path, 'ok');
                throw_unless(Storage::disk('local')->get($path) === 'ok', new \RuntimeException('Storage read/write failed.'));
                Storage::disk('local')->delete($path);
            },
        ];
        $results = [];
        foreach ($checks as $name => $check) {
            try {
                $check();
                $results[$name] = 'ok';
            } catch (Throwable $exception) {
                report($exception);
                $results[$name] = 'failed';
            }
        }
        $ready = ! in_array('failed', $results, true);

        return response()->json(['status' => $ready ? 'ready' : 'unavailable', 'checks' => $results], $ready ? 200 : 503);
    }
}
