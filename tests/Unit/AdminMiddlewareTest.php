<?php

namespace Tests\Unit;

use App\Http\Middleware\AdminMiddleware;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Tests\TestCase;

class AdminMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    private function runMiddleware(?User $user = null)
    {
        $request = Request::create('/api/admin/dashboard', 'GET');

        if ($user) {
            $request->setUserResolver(fn() => $user);
        }

        $middleware = new AdminMiddleware();

        return $middleware->handle($request, function ($req) {
            return response()->json(['message' => 'Passed through middleware'], 200);
        });
    }

    public function test_admin_user_passes_through(): void
    {
        $admin = User::factory()->admin()->create();
        $response = $this->runMiddleware($admin);

        $this->assertEquals(200, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertEquals('Passed through middleware', $data['message']);
    }

    public function test_normal_user_gets_403(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $response = $this->runMiddleware($user);

        $this->assertEquals(403, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertStringContainsString('Forbidden', $data['message']);
    }

    public function test_unauthenticated_request_gets_403(): void
    {
        $response = $this->runMiddleware(null);

        $this->assertEquals(403, $response->getStatusCode());
    }
}
