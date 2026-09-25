<?php

namespace App\Console\Commands;

use App\Models\Auction;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ExpireAuctionsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'auctions:expire';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Scan and process expired active auctions (awaiting confirmation if bids exist, or expired if no bids).';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $now = now();
        $expiredAuctions = Auction::query()
            ->where('status', 'active')
            ->where('end_time', '<=', $now)
            ->get();

        if ($expiredAuctions->isEmpty()) {
            $this->info('No expired active auctions found.');
            return Command::SUCCESS;
        }

        $processedCount = 0;

        foreach ($expiredAuctions as $auction) {
            DB::transaction(function () use ($auction, &$processedCount) {
                // Lock row to prevent race conditions during status transition
                $lockedAuction = Auction::where('id', $auction->id)->lockForUpdate()->first();

                if (!$lockedAuction || $lockedAuction->status !== 'active') {
                    return;
                }

                $highestBid = $lockedAuction->bids()->orderBy('amount', 'desc')->first();

                if ($highestBid) {
                    $lockedAuction->update([
                        'status'         => 'awaiting_seller_confirmation',
                        'winning_bid_id' => $highestBid->id,
                    ]);
                    $this->line("Auction #{$lockedAuction->id} (Property #{$lockedAuction->property_id}) closed with winning bid ৳" . number_format($highestBid->amount, 2) . " from User #{$highestBid->user_id}. Status: AwaitingSellerConfirmation.");
                } else {
                    $lockedAuction->update([
                        'status'         => 'expired',
                        'winning_bid_id' => null,
                    ]);
                    $this->line("Auction #{$lockedAuction->id} (Property #{$lockedAuction->property_id}) closed with NO bids. Status: Expired.");
                }

                $processedCount++;
            });
        }

        $this->info("Successfully processed {$processedCount} expired auction(s).");
        return Command::SUCCESS;
    }
}
