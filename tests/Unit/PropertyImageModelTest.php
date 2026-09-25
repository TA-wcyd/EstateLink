<?php

namespace Tests\Unit;

use App\Models\PropertyImage;
use Tests\TestCase;

class PropertyImageModelTest extends TestCase
{
    /* -----------------------------------------------------------------
     *  URL Accessor Tests
     * ----------------------------------------------------------------- */

    public function test_url_returns_default_when_image_path_is_empty(): void
    {
        $image = new PropertyImage(['image_path' => '']);
        $this->assertEquals('/images/hero_building.jpg', $image->url);
    }

    public function test_url_returns_default_when_image_path_is_null(): void
    {
        $image = new PropertyImage(['image_path' => null]);
        $this->assertEquals('/images/hero_building.jpg', $image->url);
    }

    public function test_url_returns_http_url_as_is(): void
    {
        $url = 'http://example.com/photo.jpg';
        $image = new PropertyImage(['image_path' => $url]);
        $this->assertEquals($url, $image->url);
    }

    public function test_url_returns_https_url_as_is(): void
    {
        $url = 'https://images.unsplash.com/photo.jpg';
        $image = new PropertyImage(['image_path' => $url]);
        $this->assertEquals($url, $image->url);
    }

    public function test_url_prepends_storage_for_relative_path(): void
    {
        $image = new PropertyImage(['image_path' => 'properties/images/abc.jpg']);
        $this->assertEquals('/storage/properties/images/abc.jpg', $image->url);
    }

    public function test_url_strips_leading_slash_from_relative_path(): void
    {
        $image = new PropertyImage(['image_path' => '/properties/images/abc.jpg']);
        $this->assertEquals('/storage/properties/images/abc.jpg', $image->url);
    }

    /* -----------------------------------------------------------------
     *  Appends / Cast Tests
     * ----------------------------------------------------------------- */

    public function test_url_is_in_appends(): void
    {
        $image = new PropertyImage();
        // The 'url' accessor should be appended to serialization
        $this->assertContains('url', $image->getAppends());
    }

    public function test_is_primary_is_cast_to_boolean(): void
    {
        $image = new PropertyImage(['is_primary' => 1]);
        $this->assertIsBool($image->is_primary);
        $this->assertTrue($image->is_primary);
    }

    public function test_sort_order_is_cast_to_integer(): void
    {
        $image = new PropertyImage(['sort_order' => '5']);
        $this->assertIsInt($image->sort_order);
        $this->assertEquals(5, $image->sort_order);
    }
}
