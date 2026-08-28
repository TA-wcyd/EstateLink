<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Create the initial EstateLink admin account.
     *
     * The password is NEVER stored as plaintext.
     * Hash::make() uses bcrypt by default (Laravel's default driver).
     *
     * Run with: php artisan db:seed --class=AdminUserSeeder
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'tamjid@gmail.com'], // match condition — prevents duplicate on re-seed
            [
                'name'                => 'Tamjid Ahmed',
                'phone'               => '01000000000',   // placeholder — update as needed
                'national_id'         => 'ADMIN-001',      // placeholder — update as needed
                'password'            => Hash::make('tamjid123'),
                'facebook_url'        => null,
                'company_name'        => 'EstateLink Admin',
                'role'                => 'admin',
                'verification_status' => 'verified',       // admin is pre-verified
            ]
        );

        $this->command->info('Admin account created: tamjid@gmail.com');
    }
}
