<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'phone' => fake()->numerify('01#########'),
            'email' => fake()->unique()->safeEmail(),
            'national_id' => fake()->unique()->numerify('##########'),
            'password' => static::$password ??= Hash::make('Password1'),
            'facebook_url' => null,
            'company_name' => null,
            'role' => 'user',
            'verification_status' => 'pending',
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Create an admin user.
     */
    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'admin',
            'verification_status' => 'verified',
        ]);
    }

    /**
     * Create a verified user.
     */
    public function verified(): static
    {
        return $this->state(fn (array $attributes) => [
            'verification_status' => 'verified',
        ]);
    }
}
