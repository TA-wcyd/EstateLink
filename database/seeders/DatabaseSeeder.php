<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            AdminUserSeeder::class,
        ]);

        \App\Models\User::firstOrCreate(
            ['email' => 'seller_test@estatelink.com'],
            [
                'name'                => 'Demo Seller',
                'phone'               => '01711223344',
                'national_id'         => 'NID-99887766',
                'password'            => \Illuminate\Support\Facades\Hash::make('password123'),
                'facebook_url'        => 'https://facebook.com/demoseller',
                'company_name'        => 'Prime Real Estate Ltd.',
                'role'                => 'user',
                'verification_status' => 'verified',
            ]
        );

        $this->call([
            PropertySeeder::class,
        ]);
    }
}
