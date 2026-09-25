<?php

namespace Database\Factories;

use App\Models\Property;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Property>
 */
class PropertyFactory extends Factory
{
    protected $model = Property::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => fake()->sentence(4),
            'property_type' => fake()->randomElement(['apartment', 'house', 'land', 'commercial', 'villa', 'duplex', 'studio', 'other']),
            'description' => fake()->paragraph(2),
            'price' => fake()->randomFloat(2, 100000, 50000000),
            'size' => fake()->randomFloat(2, 500, 10000),
            'bedrooms' => fake()->numberBetween(1, 6),
            'bathrooms' => fake()->numberBetween(1, 4),
            'location' => fake()->city(),
            'address' => fake()->address(),
            'phone' => fake()->numerify('01#########'),
            'verification_status' => 'pending',
            'transaction_status' => 'available',
            'submitted_at' => now(),
        ];
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'verification_status' => 'approved',
            'reviewed_at' => now(),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'verification_status' => 'rejected',
            'rejection_reason' => 'Test rejection reason for verification.',
            'reviewed_at' => now(),
        ]);
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'verification_status' => 'pending',
        ]);
    }
}
