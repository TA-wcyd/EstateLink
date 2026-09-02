<?php

namespace Tests\Feature;

use App\Models\Property;
use App\Models\PropertyDocument;
use App\Models\PropertyImage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PhotoUploadAndDocumentDownloadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::fake('local');
    }

    public function test_seller_can_upload_real_photos_and_verification_documents(): void
    {
        $seller = User::create([
            'name' => 'Test Seller',
            'email' => 'seller_upload_test@example.com',
            'phone' => '01711223344',
            'national_id' => 'NID-99887766',
            'password' => bcrypt('Seller@12345'),
            'role' => 'user',
            'verification_status' => 'verified',
        ]);

        $imageFile1 = UploadedFile::fake()->create('living_room.jpg', 500, 'image/jpeg');
        $imageFile2 = UploadedFile::fake()->create('bedroom.png', 500, 'image/png');
        $nidDoc = UploadedFile::fake()->create('seller_nid_scan.pdf', 150, 'application/pdf');
        $deedDoc = UploadedFile::fake()->create('property_deed_mutation.pdf', 200, 'application/pdf');

        $response = $this->actingAs($seller, 'sanctum')->post('/api/properties', [
            'title' => 'Stunning Banani Penthouse with Lake View',
            'property_type' => 'apartment',
            'price' => 35000000,
            'size' => 3200,
            'bedrooms' => 4,
            'bathrooms' => 4,
            'location' => 'Banani, Dhaka',
            'address' => 'Road 11, Block C, Banani',
            'phone' => '01711223344',
            'description' => 'A spacious luxury penthouse with prime finishings.',
            'images' => [$imageFile1, $imageFile2],
            'nid_document' => $nidDoc,
            'property_document' => $deedDoc,
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'message',
            'property' => [
                'id',
                'title',
                'main_image',
                'images',
                'documents',
            ],
        ]);

        $propertyId = $response->json('property.id');
        $this->assertDatabaseHas('properties', [
            'id' => $propertyId,
            'user_id' => $seller->id,
            'verification_status' => 'pending',
        ]);

        $this->assertDatabaseCount('property_images', 2);
        $this->assertDatabaseCount('property_documents', 2);

        $savedImages = PropertyImage::where('property_id', $propertyId)->get();
        $this->assertTrue(Storage::disk('public')->exists($savedImages[0]->image_path));
        $this->assertTrue(Storage::disk('public')->exists($savedImages[1]->image_path));

        $savedDocs = PropertyDocument::where('property_id', $propertyId)->get();
        $this->assertTrue(Storage::disk('local')->exists($savedDocs[0]->document_path));
        $this->assertTrue(Storage::disk('local')->exists($savedDocs[1]->document_path));
    }

    public function test_public_storage_fallback_route_serves_uploaded_images(): void
    {
        Storage::disk('public')->put('properties/images/sample_pic.jpg', 'fake-image-bytes');

        $response = $this->get('/storage/properties/images/sample_pic.jpg');
        $response->assertStatus(200);
        $this->assertEquals('fake-image-bytes', $response->streamedContent());
    }

    public function test_admin_can_download_and_view_verification_documents_with_bearer_and_query_token(): void
    {
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin_test@estatelink.com',
            'phone' => '01888888888',
            'national_id' => 'NID-ADMIN-001',
            'password' => bcrypt('Admin@12345'),
            'role' => 'admin',
            'verification_status' => 'verified',
        ]);

        $seller = User::create([
            'name' => 'Seller Dossier',
            'email' => 'seller_dossier@example.com',
            'phone' => '01999999999',
            'national_id' => 'NID-SELLER-002',
            'password' => bcrypt('Seller@12345'),
            'role' => 'user',
            'verification_status' => 'verified',
        ]);

        $property = Property::create([
            'user_id' => $seller->id,
            'title' => 'Gulshan Exclusive Villa',
            'property_type' => 'villa',
            'price' => 50000000,
            'size' => 4500,
            'location' => 'Gulshan 1, Dhaka',
            'address' => 'Road 25, Gulshan 1',
            'description' => 'Architectural masterpiece villa with lawn.',
            'verification_status' => 'pending',
        ]);

        $docPath = 'private/documents/nid/test_nid.pdf';
        Storage::disk('local')->put($docPath, 'sample-pdf-content');

        $doc = PropertyDocument::create([
            'property_id' => $property->id,
            'document_type' => 'nid',
            'document_path' => $docPath,
            'original_name' => 'national_id_card.pdf',
        ]);

        // 1. Admin dossier verification endpoint
        $adminToken = $admin->createToken('admin_test_token')->plainTextToken;
        $dossierResponse = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->getJson("/api/admin/properties/{$property->id}/verification");

        $dossierResponse->assertStatus(200);
        $dossierResponse->assertJsonStructure([
            'property',
            'documents' => [
                ['id', 'document_type', 'original_name', 'download_url']
            ]
        ]);

        // 2. Download with Bearer Token in Header
        $downloadResponse = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->get("/api/admin/properties/{$property->id}/documents/{$doc->id}/download");

        $downloadResponse->assertStatus(200);
        $this->assertEquals('sample-pdf-content', $downloadResponse->streamedContent());

        // 3. View inline with Bearer Token in Header
        $viewResponse = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
            ->get("/api/admin/properties/{$property->id}/documents/{$doc->id}/download?view=1");

        $viewResponse->assertStatus(200);
        $this->assertEquals('sample-pdf-content', $viewResponse->streamedContent());

        // 4. Download with ?token= query parameter (for direct browser tab downloads)
        $queryDownloadResponse = $this->get("/api/admin/properties/{$property->id}/documents/{$doc->id}/download?token={$adminToken}");
        $queryDownloadResponse->assertStatus(200);
        $this->assertEquals('sample-pdf-content', $queryDownloadResponse->streamedContent());

        // 5. View with ?token= query parameter (for direct browser tab preview)
        $queryViewResponse = $this->get("/api/admin/properties/{$property->id}/documents/{$doc->id}/download?view=1&token={$adminToken}");
        $queryViewResponse->assertStatus(200);
        $this->assertEquals('sample-pdf-content', $queryViewResponse->streamedContent());

        // 6. Non-admin should be rejected with 403
        $this->flushHeaders();
        app('auth')->forgetGuards();
        $sellerToken = $seller->createToken('seller_token')->plainTextToken;
        $forbiddenResponse = $this->get("/api/admin/properties/{$property->id}/documents/{$doc->id}/download?token={$sellerToken}");
        $forbiddenResponse->assertStatus(403);
    }
}
