<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserReport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PublicProfileAndUserReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_view_public_user_profile(): void
    {
        $user = User::factory()->create([
            'name'                => 'John Doe',
            'role'                => 'user',
            'verification_status' => 'verified',
        ]);

        $response = $this->getJson('/api/users/' . $user->id . '/public-profile');

        $response->assertStatus(200)
            ->assertJson([
                'user' => [
                    'id'   => $user->id,
                    'name' => 'John Doe',
                ],
                'is_own_profile' => false,
            ]);
    }

    public function test_authenticated_user_can_submit_report_with_proof(): void
    {
        Storage::fake('public');

        $reporter = User::factory()->create();
        $targetUser = User::factory()->create();

        $proofFile = UploadedFile::fake()->create('evidence.png', 500, 'image/png');

        $response = $this->actingAs($reporter)->postJson('/api/user-reports', [
            'reported_user_id' => $targetUser->id,
            'reason'           => 'Fraud/Scam',
            'description'      => 'User engaged in suspicious financial transactions.',
            'proof'            => $proofFile,
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'message' => 'Your report has been submitted successfully and sent to administrators for review.',
            ]);

        $this->assertDatabaseHas('user_reports', [
            'reporter_id'      => $reporter->id,
            'reported_user_id' => $targetUser->id,
            'reason'           => 'Fraud/Scam',
            'status'           => 'pending',
        ]);
    }

    public function test_admin_can_review_and_permanently_ban_user_from_report(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $reporter = User::factory()->create();
        $targetUser = User::factory()->create();

        $report = UserReport::create([
            'reporter_id'      => $reporter->id,
            'reported_user_id' => $targetUser->id,
            'reason'           => 'Fake Listing',
            'description'      => 'Listing photos were copied without authorization.',
            'status'           => 'pending',
        ]);

        $response = $this->actingAs($admin)->postJson('/api/admin/reports/' . $report->id . '/ban', [
            'admin_notes' => 'Confirmed fake listing with reverse image search.',
        ]);

        $response->assertStatus(200);

        $targetUser->refresh();
        $this->assertTrue($targetUser->is_banned);
        $this->assertNotNull($targetUser->banned_at);

        $report->refresh();
        $this->assertEquals('resolved_banned', $report->status);
    }

    public function test_banned_user_cannot_login(): void
    {
        $user = User::factory()->create([
            'email'     => 'banned@example.com',
            'password'  => 'Password123!',
            'is_banned' => true,
        ]);

        $response = $this->postJson('/api/login', [
            'email'    => 'banned@example.com',
            'password' => 'Password123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }
}
