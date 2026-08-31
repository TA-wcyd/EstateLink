<?php

namespace Database\Seeders;

use App\Models\Property;
use App\Models\PropertyDocument;
use App\Models\PropertyImage;
use App\Models\User;
use Illuminate\Database\Seeder;

class PropertySeeder extends Seeder
{
    /**
     * Seed initial demo properties (approved, pending, and rejected)
     * so that the public property browser and admin review panel are immediately testable.
     */
    public function run(): void
    {
        $admin = User::where('role', 'admin')->first();
        $user = User::where('email', 'seller_test@estatelink.com')->first() 
             ?? User::where('role', 'user')->first();

        if (!$user) {
            return;
        }

        $properties = [
            [
                'title'               => 'Gulshan Lakefront Luxury Penthouse',
                'property_type'       => 'apartment',
                'description'         => 'Exclusive 3,800 sq.ft lakefront penthouse offering panoramic 360-degree views of Gulshan Lake. Features 4 ensuite bedrooms, Italian marble flooring, smart home automation, private elevator access, and rooftop terrace.',
                'price'               => 48000000,
                'size'                => 3800,
                'bedrooms'            => 4,
                'bathrooms'           => 5,
                'location'            => 'Gulshan 2, Dhaka',
                'address'             => 'Road 71, Block NW, Gulshan-2, Dhaka 1212',
                'verification_status' => 'approved',
                'transaction_status'  => 'available',
                'submitted_at'        => now()->subDays(5),
                'reviewed_at'         => now()->subDays(4),
                'reviewed_by'         => $admin?->id,
                'images'              => [
                    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
                ],
            ],
            [
                'title'               => 'Modern 3BHK Apartment in Banani DOHS',
                'property_type'       => 'apartment',
                'description'         => 'Prime residential flat in the secure and peaceful neighborhood of Banani DOHS. 2,150 sqft with 3 bedrooms, large drawing & dining spaces, modern fitted kitchen, and dedicated basement parking.',
                'price'               => 22500000,
                'size'                => 2150,
                'bedrooms'            => 3,
                'bathrooms'           => 3,
                'location'            => 'Banani DOHS, Dhaka',
                'address'             => 'Lane 4, House 28, Banani DOHS, Dhaka',
                'verification_status' => 'approved',
                'transaction_status'  => 'negotiation',
                'submitted_at'        => now()->subDays(4),
                'reviewed_at'         => now()->subDays(3),
                'reviewed_by'         => $admin?->id,
                'images'              => [
                    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
                ],
            ],
            [
                'title'               => 'Contemporary 5-Bedroom Duplex Villa',
                'property_type'       => 'villa',
                'description'         => 'Architect-designed contemporary villa spanning 4,500 sq.ft across two levels. Includes private landscaped lawn, double-height living room, modular kitchen, helper quarters, and multi-car parking.',
                'price'               => 65000000,
                'size'                => 4500,
                'bedrooms'            => 5,
                'bathrooms'           => 6,
                'location'            => 'Bashundhara R/A, Block I, Dhaka',
                'address'             => 'Plot 180, Road 14, Block I, Bashundhara R/A, Dhaka',
                'verification_status' => 'approved',
                'transaction_status'  => 'available',
                'submitted_at'        => now()->subDays(3),
                'reviewed_at'         => now()->subDays(2),
                'reviewed_by'         => $admin?->id,
                'images'              => [
                    'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
                ],
            ],
            [
                'title'               => 'Prime Commercial Floor Space in Motijheel',
                'property_type'       => 'commercial',
                'description'         => 'High-yield commercial floor space on the 8th floor of a grade-A corporate building. Ideal for IT firms, financial institutions, or corporate headquarters with high-speed elevators and 100% power backup.',
                'price'               => 35000000,
                'size'                => 3200,
                'bedrooms'            => null,
                'bathrooms'           => 4,
                'location'            => 'Motijheel C/A, Dhaka',
                'address'             => 'City Centre, 90/1 Motijheel C/A, Dhaka',
                'verification_status' => 'approved',
                'transaction_status'  => 'available',
                'submitted_at'        => now()->subDays(2),
                'reviewed_at'         => now()->subDay(),
                'reviewed_by'         => $admin?->id,
                'images'              => [
                    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
                ],
            ],
            [
                'title'               => '5 Katha Residential Plot in Purbachal New Town',
                'property_type'       => 'land',
                'description'         => 'South-facing rectangular 5 Katha residential plot situated in Sector 14, Purbachal New Town. Wide 60ft frontage road, RAJUK approved demarcation, and ready for immediate construction.',
                'price'               => 18500000,
                'size'                => 3600,
                'bedrooms'            => null,
                'bathrooms'           => null,
                'location'            => 'Purbachal Sector 14, Dhaka',
                'address'             => 'Plot 42, Road 204, Sector 14, Purbachal New Town',
                'verification_status' => 'approved',
                'transaction_status'  => 'available',
                'submitted_at'        => now()->subDays(2),
                'reviewed_at'         => now()->subDay(),
                'reviewed_by'         => $admin?->id,
                'images'              => [
                    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
                ],
            ],
            [
                'title'               => 'Cozy 2BHK Studio Apartment in Dhanmondi',
                'property_type'       => 'apartment',
                'description'         => 'Bright and airy 1,350 sqft 2-bedroom flat located in Dhanmondi. Close proximity to Dhanmondi Lake, top English medium schools, and specialty hospitals.',
                'price'               => 14500000,
                'size'                => 1350,
                'bedrooms'            => 2,
                'bathrooms'           => 2,
                'location'            => 'Dhanmondi 9/A, Dhaka',
                'address'             => 'House 14, Road 9/A, Dhanmondi, Dhaka',
                'verification_status' => 'approved',
                'transaction_status'  => 'available',
                'submitted_at'        => now()->subDay(),
                'reviewed_at'         => now()->subHours(6),
                'reviewed_by'         => $admin?->id,
                'images'              => [
                    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
                ],
            ],
            // PENDING PROPERTY (Waiting for admin verification)
            [
                'title'               => 'Uttara Sector 11 Newly Built 3BHK Flat',
                'property_type'       => 'apartment',
                'description'         => 'Brand new 1,850 sq.ft unit on the 5th floor. Features high-quality fittings, backup generator, community hall, and 24/7 CCTV surveillance.',
                'price'               => 17000000,
                'size'                => 1850,
                'bedrooms'            => 3,
                'bathrooms'           => 3,
                'location'            => 'Uttara Sector 11, Dhaka',
                'address'             => 'Road 12, Sector 11, Uttara, Dhaka',
                'verification_status' => 'pending',
                'transaction_status'  => 'available',
                'submitted_at'        => now()->subHours(3),
                'reviewed_at'         => null,
                'reviewed_by'         => null,
                'images'              => [
                    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
                ],
            ],
            // REJECTED PROPERTY (With reason)
            [
                'title'               => 'Mirpur DOHS 4-Bed Spacious Flat',
                'property_type'       => 'apartment',
                'description'         => '2,600 sqft apartment in Mirpur DOHS.',
                'price'               => 19000000,
                'size'                => 2600,
                'bedrooms'            => 4,
                'bathrooms'           => 4,
                'location'            => 'Mirpur DOHS, Dhaka',
                'address'             => 'Road 8, Mirpur DOHS, Dhaka',
                'verification_status' => 'rejected',
                'rejection_reason'    => 'The submitted National ID scan was blurry and unreadable. Please upload a clear photo of your NID and the deed/mutation document.',
                'transaction_status'  => 'available',
                'submitted_at'        => now()->subDays(2),
                'reviewed_at'         => now()->subDay(),
                'reviewed_by'         => $admin?->id,
                'images'              => [
                    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
                ],
            ],
        ];

        foreach ($properties as $item) {
            $imgs = $item['images'];
            unset($item['images']);

            $item['user_id'] = $user->id;
            $prop = Property::create($item);

            foreach ($imgs as $idx => $imgUrl) {
                PropertyImage::create([
                    'property_id' => $prop->id,
                    'image_path'  => $imgUrl,
                    'is_primary'  => ($idx === 0),
                    'sort_order'  => $idx,
                ]);
            }

            // Create sample document records
            PropertyDocument::create([
                'property_id'   => $prop->id,
                'document_type' => 'nid',
                'document_path' => 'private/documents/nid/sample_nid.pdf',
                'original_name' => 'national_id_scan.pdf',
            ]);

            PropertyDocument::create([
                'property_id'   => $prop->id,
                'document_type' => 'ownership',
                'document_path' => 'private/documents/ownership/sample_deed.pdf',
                'original_name' => 'rajuk_mutation_deed.pdf',
            ]);
        }

        $this->command->info('Seeded ' . count($properties) . ' properties with images and documents.');
    }
}
