<?php

namespace Tests\Unit;

use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PropertyModelTest extends TestCase
{
    use RefreshDatabase;

    /* -----------------------------------------------------------------
     *  Scope Tests
     * ----------------------------------------------------------------- */

    public function test_scope_approved_filters_only_approved(): void
    {
        $user = User::factory()->create();
        Property::factory()->approved()->create(['user_id' => $user->id]);
        Property::factory()->pending()->create(['user_id' => $user->id]);
        Property::factory()->rejected()->create(['user_id' => $user->id]);

        $approved = Property::approved()->get();
        $this->assertCount(1, $approved);
        $this->assertEquals('approved', $approved->first()->verification_status);
    }

    public function test_scope_pending_filters_only_pending(): void
    {
        $user = User::factory()->create();
        Property::factory()->approved()->create(['user_id' => $user->id]);
        Property::factory()->pending()->create(['user_id' => $user->id]);

        $pending = Property::pending()->get();
        $this->assertCount(1, $pending);
        $this->assertEquals('pending', $pending->first()->verification_status);
    }

    /* -----------------------------------------------------------------
     *  Status Helper Tests
     * ----------------------------------------------------------------- */

    public function test_is_approved_returns_true_for_approved(): void
    {
        $property = Property::factory()->approved()->make();
        $this->assertTrue($property->isApproved());
    }

    public function test_is_approved_returns_false_for_pending(): void
    {
        $property = Property::factory()->pending()->make();
        $this->assertFalse($property->isApproved());
    }

    public function test_is_rejected_returns_true_for_rejected(): void
    {
        $property = Property::factory()->rejected()->make();
        $this->assertTrue($property->isRejected());
    }

    public function test_is_rejected_returns_false_for_approved(): void
    {
        $property = Property::factory()->approved()->make();
        $this->assertFalse($property->isRejected());
    }

    public function test_is_pending_returns_true_for_pending(): void
    {
        $property = Property::factory()->pending()->make();
        $this->assertTrue($property->isPending());
    }

    public function test_is_pending_returns_false_for_approved(): void
    {
        $property = Property::factory()->approved()->make();
        $this->assertFalse($property->isPending());
    }

    /* -----------------------------------------------------------------
     *  Cast Tests
     * ----------------------------------------------------------------- */

    public function test_price_is_cast_to_float(): void
    {
        $user = User::factory()->create();
        $property = Property::factory()->create(['user_id' => $user->id, 'price' => '12345.67']);
        $this->assertIsFloat($property->fresh()->price);
    }

    public function test_size_is_cast_to_float(): void
    {
        $user = User::factory()->create();
        $property = Property::factory()->create(['user_id' => $user->id, 'size' => '2500.50']);
        $this->assertIsFloat($property->fresh()->size);
    }

    public function test_bedrooms_is_cast_to_integer(): void
    {
        $user = User::factory()->create();
        $property = Property::factory()->create(['user_id' => $user->id, 'bedrooms' => '3']);
        $this->assertIsInt($property->fresh()->bedrooms);
    }

    public function test_bathrooms_is_cast_to_integer(): void
    {
        $user = User::factory()->create();
        $property = Property::factory()->create(['user_id' => $user->id, 'bathrooms' => '2']);
        $this->assertIsInt($property->fresh()->bathrooms);
    }

    /* -----------------------------------------------------------------
     *  Relationship Tests
     * ----------------------------------------------------------------- */

    public function test_property_belongs_to_user(): void
    {
        $user = User::factory()->create();
        $property = Property::factory()->create(['user_id' => $user->id]);

        $this->assertInstanceOf(User::class, $property->user);
        $this->assertEquals($user->id, $property->user->id);
    }

    public function test_property_has_reviewer_relationship(): void
    {
        $property = new Property();
        $this->assertInstanceOf(\Illuminate\Database\Eloquent\Relations\BelongsTo::class, $property->reviewer());
    }

    public function test_property_has_images_relationship(): void
    {
        $property = new Property();
        $this->assertInstanceOf(\Illuminate\Database\Eloquent\Relations\HasMany::class, $property->images());
    }

    public function test_property_has_documents_relationship(): void
    {
        $property = new Property();
        $this->assertInstanceOf(\Illuminate\Database\Eloquent\Relations\HasMany::class, $property->documents());
    }

    /* -----------------------------------------------------------------
     *  Fillable Tests
     * ----------------------------------------------------------------- */

    public function test_fillable_includes_expected_fields(): void
    {
        $property = new Property();
        $expected = ['user_id', 'title', 'property_type', 'description', 'price', 'size',
                     'bedrooms', 'bathrooms', 'location', 'address', 'phone',
                     'verification_status', 'rejection_reason', 'transaction_status'];

        foreach ($expected as $field) {
            $this->assertContains($field, $property->getFillable(), "Field '{$field}' should be fillable.");
        }
    }
}
