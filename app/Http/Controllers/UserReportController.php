<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class UserReportController extends Controller
{
    /**
     * Submit a report against a user with optional proof attachment (image/PDF up to 5MB).
     *
     * POST /api/user-reports
     */
    public function store(Request $request): JsonResponse
    {
        /** @var User $reporter */
        $reporter = $request->user();

        $validated = $request->validate([
            'reported_user_id' => ['required', 'integer', 'exists:users,id', Rule::notIn([$reporter->id])],
            'reason'           => ['required', 'string', Rule::in([
                'Fraud/Scam',
                'Fake Listing',
                'Abusive Behavior',
                'Impersonation',
                'Other'
            ])],
            'description'      => ['required', 'string', 'min:10', 'max:3000'],
            'proof'            => ['nullable', 'file', 'mimes:jpeg,png,jpg,webp,pdf', 'max:5120'], // Max 5MB
        ]);

        /** @var User $reportedUser */
        $reportedUser = User::findOrFail($validated['reported_user_id']);

        if ($reportedUser->is_banned) {
            return response()->json([
                'message' => 'This user has already been suspended by administrators.',
            ], 422);
        }

        // Handle proof file upload
        $proofPath = null;
        if ($request->hasFile('proof') && $request->file('proof')->isValid()) {
            // Store under storage/app/public/reports/
            $proofPath = $request->file('proof')->store('reports', 'public');
        }

        $report = UserReport::create([
            'reporter_id'      => $reporter->id,
            'reported_user_id' => $reportedUser->id,
            'reason'           => $validated['reason'],
            'description'      => $validated['description'],
            'proof_path'       => $proofPath,
            'status'           => 'pending',
        ]);

        return response()->json([
            'message' => 'Your report has been submitted successfully and sent to administrators for review.',
            'report'  => [
                'id'               => $report->id,
                'reported_user_id' => $report->reported_user_id,
                'reason'           => $report->reason,
                'status'           => $report->status,
                'created_at'       => $report->created_at,
            ],
        ], 201);
    }
}
