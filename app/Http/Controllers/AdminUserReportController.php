<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AdminUserReportController extends Controller
{
    /**
     * Get all submitted user reports with filtering.
     *
     * GET /api/admin/reports
     */
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', 'all');

        $query = UserReport::with(['reporter', 'reportedUser', 'actionedByAdmin'])
            ->latest();

        if (in_array($status, ['pending', 'resolved_banned', 'dismissed'])) {
            $query->where('status', $status);
        }

        $reports = $query->get()->map(function ($report) {
            return [
                'id' => $report->id,
                'reporter' => [
                    'id'   => $report->reporter?->id,
                    'name' => $report->reporter?->name,
                    'email'=> $report->reporter?->email,
                ],
                'reported_user' => [
                    'id'        => $report->reportedUser?->id,
                    'name'      => $report->reportedUser?->name,
                    'email'     => $report->reportedUser?->email,
                    'is_banned' => $report->reportedUser?->is_banned,
                ],
                'reason'       => $report->reason,
                'description'  => $report->description,
                'proof_url'    => $report->proof_path ? asset('storage/' . $report->proof_path) : null,
                'status'       => $report->status,
                'created_at'   => $report->created_at,
                'actioned_at'  => $report->actioned_at,
                'admin_notes'  => $report->admin_notes,
            ];
        });

        $counts = [
            'pending'         => UserReport::where('status', 'pending')->count(),
            'resolved_banned' => UserReport::where('status', 'resolved_banned')->count(),
            'dismissed'       => UserReport::where('status', 'dismissed')->count(),
            'total'           => UserReport::count(),
        ];

        return response()->json([
            'reports' => $reports,
            'counts'  => $counts,
        ]);
    }

    /**
     * Get detailed information for a specific user report.
     *
     * GET /api/admin/reports/{id}
     */
    public function show(int $id): JsonResponse
    {
        /** @var UserReport|null $report */
        $report = UserReport::with(['reporter', 'reportedUser', 'actionedByAdmin'])->find($id);

        if (!$report) {
            return response()->json(['message' => 'Report not found.'], 404);
        }

        $reportedUser = $report->reportedUser;

        // Collect reported user platform history
        $reportedUserHistory = null;
        if ($reportedUser) {
            $reportedUserHistory = [
                'id'                  => $reportedUser->id,
                'name'                => $reportedUser->name,
                'email'               => $reportedUser->email,
                'phone'               => $reportedUser->phone,
                'national_id'         => $reportedUser->national_id,
                'company_name'        => $reportedUser->company_name,
                'facebook_url'        => $reportedUser->facebook_url,
                'role'                => $reportedUser->role,
                'verification_status' => $reportedUser->verification_status,
                'is_banned'           => $reportedUser->is_banned,
                'ban_reason'          => $reportedUser->ban_reason,
                'banned_at'           => $reportedUser->banned_at,
                'created_at'          => $reportedUser->created_at,
                'total_properties'    => $reportedUser->properties()->count(),
                'total_reports'       => UserReport::where('reported_user_id', $reportedUser->id)->count(),
            ];
        }

        $proofFileExt = $report->proof_path ? strtolower(pathinfo($report->proof_path, PATHINFO_EXTENSION)) : null;

        return response()->json([
            'report' => [
                'id'            => $report->id,
                'reason'        => $report->reason,
                'description'   => $report->description,
                'proof_url'     => $report->proof_path ? asset('storage/' . $report->proof_path) : null,
                'proof_is_pdf'  => $proofFileExt === 'pdf',
                'status'        => $report->status,
                'admin_notes'   => $report->admin_notes,
                'created_at'    => $report->created_at,
                'actioned_at'   => $report->actioned_at,
                'reporter'      => $report->reporter ? [
                    'id'    => $report->reporter->id,
                    'name'  => $report->reporter->name,
                    'email' => $report->reporter->email,
                    'phone' => $report->reporter->phone,
                ] : null,
                'actioned_by'   => $report->actionedByAdmin ? [
                    'id'   => $report->actionedByAdmin->id,
                    'name' => $report->actionedByAdmin->name,
                ] : null,
            ],
            'reported_user' => $reportedUserHistory,
        ]);
    }

    /**
     * Admin Action: Permanently ban user and resolve report.
     *
     * POST /api/admin/reports/{id}/ban
     */
    public function banUserFromReport(int $id, Request $request): JsonResponse
    {
        /** @var UserReport|null $report */
        $report = UserReport::find($id);

        if (!$report) {
            return response()->json(['message' => 'Report not found.'], 404);
        }

        $validated = $request->validate([
            'admin_notes' => ['nullable', 'string', 'max:1000'],
            'ban_reason'  => ['nullable', 'string', 'max:500'],
        ]);

        /** @var User $admin */
        $admin = $request->user();

        /** @var User|null $reportedUser */
        $reportedUser = User::find($report->reported_user_id);

        if (!$reportedUser) {
            return response()->json(['message' => 'Reported user account no longer exists.'], 404);
        }

        if ($reportedUser->isAdmin()) {
            return response()->json(['message' => 'Cannot ban an administrator account.'], 403);
        }

        $banReason = $validated['ban_reason'] ?? ('Policy violation reported in Report #' . $report->id . ': ' . $report->reason);

        // Update user status
        $reportedUser->is_banned  = true;
        $reportedUser->ban_reason = $banReason;
        $reportedUser->banned_at  = now();
        $reportedUser->save();

        // Invalidate active Sanctum sessions/tokens immediately
        $reportedUser->tokens()->delete();

        // Update report status
        $report->status      = 'resolved_banned';
        $report->admin_notes = $validated['admin_notes'] ?? ('User permanently banned by Admin ' . $admin->name);
        $report->actioned_by = $admin->id;
        $report->actioned_at = now();
        $report->save();

        return response()->json([
            'message' => 'User ' . $reportedUser->name . ' has been permanently banned, and report #' . $report->id . ' is resolved.',
            'report'  => $report,
        ]);
    }

    /**
     * Admin Action: Dismiss report.
     *
     * POST /api/admin/reports/{id}/dismiss
     */
    public function dismissReport(int $id, Request $request): JsonResponse
    {
        /** @var UserReport|null $report */
        $report = UserReport::find($id);

        if (!$report) {
            return response()->json(['message' => 'Report not found.'], 404);
        }

        $validated = $request->validate([
            'admin_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        /** @var User $admin */
        $admin = $request->user();

        $report->status      = 'dismissed';
        $report->admin_notes = $validated['admin_notes'] ?? 'Dismissed as false or unverified claim.';
        $report->actioned_by = $admin->id;
        $report->actioned_at = now();
        $report->save();

        return response()->json([
            'message' => 'Report #' . $report->id . ' has been dismissed.',
            'report'  => $report,
        ]);
    }

    /**
     * Admin Direct User Management: Get list of users with ban status and report counts.
     *
     * GET /api/admin/users
     */
    public function listUsers(Request $request): JsonResponse
    {
        $search = $request->query('search');

        $query = User::withCount(['reportsReceived', 'properties']);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $users = $query->latest()->get()->map(function ($u) {
            return [
                'id'                   => $u->id,
                'name'                 => $u->name,
                'email'                => $u->email,
                'phone'                => $u->phone,
                'role'                 => $u->role,
                'verification_status'  => $u->verification_status,
                'is_banned'            => $u->is_banned,
                'ban_reason'           => $u->ban_reason,
                'banned_at'            => $u->banned_at,
                'reports_received_count'=> $u->reports_received_count,
                'properties_count'     => $u->properties_count,
                'created_at'           => $u->created_at,
            ];
        });

        return response()->json([
            'users' => $users,
        ]);
    }

    /**
     * Admin Direct Action: Ban User directly from user management table.
     *
     * POST /api/admin/users/{id}/ban
     */
    public function directBanUser(int $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ban_reason' => ['required', 'string', 'max:500'],
        ]);

        /** @var User|null $user */
        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        if ($user->isAdmin()) {
            return response()->json(['message' => 'Cannot ban an administrator account.'], 403);
        }

        $user->is_banned  = true;
        $user->ban_reason = $validated['ban_reason'];
        $user->banned_at  = now();
        $user->save();

        // Invalidate active tokens
        $user->tokens()->delete();

        return response()->json([
            'message' => 'User ' . $user->name . ' has been permanently banned.',
            'user'    => $user,
        ]);
    }

    /**
     * Admin Direct Action: Unban User.
     *
     * POST /api/admin/users/{id}/unban
     */
    public function directUnbanUser(int $id): JsonResponse
    {
        /** @var User|null $user */
        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        $user->is_banned  = false;
        $user->ban_reason = null;
        $user->banned_at  = null;
        $user->save();

        return response()->json([
            'message' => 'User ' . $user->name . ' account has been restored.',
            'user'    => $user,
        ]);
    }
}
