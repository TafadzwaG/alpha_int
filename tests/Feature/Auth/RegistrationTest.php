<?php

namespace Tests\Feature\Auth;

use App\Models\Organization;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered()
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_new_users_can_register()
    {
        $this->seed(DatabaseSeeder::class);

        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'new.user@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
        $this->assertDatabaseHas('users', [
            'email' => 'new.user@example.com',
            'organization_id' => Organization::where('code', 'ALPHA')->value('id'),
        ]);

        $admin = User::where('email', 'test@example.com')->firstOrFail();

        $this->actingAs($admin)
            ->get('/administration/users')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('records.total', 4)
                ->where('records.data.0.email', 'new.user@example.com'));
    }
}
