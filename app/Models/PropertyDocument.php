<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PropertyDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id',
        'document_type',
        'document_path',
        'original_name',
    ];

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }
}
