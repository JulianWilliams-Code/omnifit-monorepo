#!/usr/bin/env node

import * as fs from 'fs/promises';
import * as path from 'path';
import { TokenMinter } from './mint_to_account';

interface MintRequestSummary {
  total: number;
  queued: number;
  adminReview: number;
  approved: number;
  rejected: number;
  completed: number;
  failed: number;
  totalValue: number;
}

class MintRequestMonitor {
  private mintRequestsPath: string;
  private minter: TokenMinter;

  constructor() {
    this.mintRequestsPath = path.join(process.cwd(), 'apps/blockchain/mint-requests');
    this.minter = new TokenMinter(process.env.SOLANA_NETWORK || 'devnet');
  }

  async scanMintRequests(): Promise<{
    summary: MintRequestSummary;
    pendingRequests: any[];
    recentActivity: any[];
  }> {
    try {
      const files = await fs.readdir(this.mintRequestsPath);
      const requestFiles = files.filter(file => 
        file.startsWith('mint-request-') && file.endsWith('.json')
      );

      const summary: MintRequestSummary = {
        total: 0,
        queued: 0,
        adminReview: 0,
        approved: 0,
        rejected: 0,
        completed: 0,
        failed: 0,
        totalValue: 0
      };

      const pendingRequests: any[] = [];
      const recentActivity: any[] = [];
      const now = Date.now();
      const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);

      for (const file of requestFiles) {
        const filePath = path.join(this.mintRequestsPath, file);
        
        try {
          const requestData = await fs.readFile(filePath, 'utf-8');
          const request = JSON.parse(requestData);
          
          summary.total++;
          summary.totalValue += request.tokenAmount;

          // Count by status
          switch (request.status) {
            case 'QUEUED':
              summary.queued++;
              pendingRequests.push(request);
              break;
            case 'ADMIN_REVIEW':
              summary.adminReview++;
              pendingRequests.push(request);
              break;
            case 'APPROVED':
              summary.approved++;
              if (!request.mintSignature) {
                pendingRequests.push(request);
              }
              break;
            case 'REJECTED':
              summary.rejected++;
              break;
            case 'COMPLETED':
              summary.completed++;
              break;
            case 'FAILED':
              summary.failed++;
              break;
          }

          // Check for recent activity
          const requestTime = new Date(request.requestedAt).getTime();
          if (requestTime > twentyFourHoursAgo) {
            recentActivity.push({
              id: request.mintRequestId,
              status: request.status,
              amount: request.tokenAmount,
              wallet: request.recipientWallet,
              requestedAt: request.requestedAt,
              userId: request.userId
            });
          }

        } catch (error) {
          console.error(`Failed to parse ${file}:`, error);
        }
      }

      // Sort pending by priority (admin review first, then by amount)
      pendingRequests.sort((a, b) => {
        if (a.status === 'ADMIN_REVIEW' && b.status !== 'ADMIN_REVIEW') return -1;
        if (b.status === 'ADMIN_REVIEW' && a.status !== 'ADMIN_REVIEW') return 1;
        return b.tokenAmount - a.tokenAmount;
      });

      // Sort recent activity by time (newest first)
      recentActivity.sort((a, b) => 
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      );

      return {
        summary,
        pendingRequests: pendingRequests.slice(0, 20), // Top 20 pending
        recentActivity: recentActivity.slice(0, 10)     // Last 10 recent
      };

    } catch (error) {
      console.error('Failed to scan mint requests:', error);
      throw error;
    }
  }

  async processNextBatch(batchSize: number = 5): Promise<void> {
    console.log(`🔄 Processing next batch of ${batchSize} approved requests...`);
    
    try {
      const { pendingRequests } = await this.scanMintRequests();
      
      // Filter only approved requests that need minting
      const readyToMint = pendingRequests.filter(
        req => req.status === 'APPROVED' && !req.mintSignature
      );

      if (readyToMint.length === 0) {
        console.log('📭 No requests ready for minting');
        return;
      }

      const batch = readyToMint.slice(0, batchSize);
      console.log(`🔨 Processing ${batch.length} requests...`);

      for (const request of batch) {
        try {
          console.log(`\n💰 Minting ${request.tokenAmount} tokens for ${request.recipientWallet}`);
          
          const mintAddress = process.env.OMNIFIT_MINT_ADDRESS;
          if (!mintAddress) {
            throw new Error('OMNIFIT_MINT_ADDRESS not configured');
          }

          await this.minter.mintTokens({
            mintAddress,
            recipientWallet: request.recipientWallet,
            amount: request.tokenAmount * Math.pow(10, 9), // Convert to lamports
            decimals: 9,
            mintRequestId: request.mintRequestId
          });

          console.log(`✅ Successfully minted tokens for request ${request.mintRequestId}`);

        } catch (error) {
          console.error(`❌ Failed to process request ${request.mintRequestId}:`, error);
        }

        // Delay between mints to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log(`🎉 Batch processing completed`);

    } catch (error) {
      console.error('Batch processing failed:', error);
      throw error;
    }
  }

  async generateReport(): Promise<void> {
    console.log('📊 Generating Mint Request Report\n');
    
    try {
      const data = await this.scanMintRequests();
      
      // Summary
      console.log('📋 SUMMARY');
      console.log('=' .repeat(50));
      console.log(`Total Requests: ${data.summary.total}`);
      console.log(`Total Value: ${data.summary.totalValue.toLocaleString()} tokens`);
      console.log('');
      console.log('Status Breakdown:');
      console.log(`  🟡 Queued: ${data.summary.queued}`);
      console.log(`  🔴 Admin Review: ${data.summary.adminReview}`);
      console.log(`  🟠 Approved: ${data.summary.approved}`);
      console.log(`  ⚫ Rejected: ${data.summary.rejected}`);
      console.log(`  🟢 Completed: ${data.summary.completed}`);
      console.log(`  ❌ Failed: ${data.summary.failed}`);
      console.log('');

      // Pending requests
      if (data.pendingRequests.length > 0) {
        console.log('⏳ PENDING REQUESTS');
        console.log('=' .repeat(50));
        console.log('ID'.padEnd(8) + 'Status'.padEnd(12) + 'Amount'.padEnd(12) + 'Risk'.padEnd(8) + 'User');
        console.log('-'.repeat(50));
        
        data.pendingRequests.slice(0, 10).forEach(req => {
          const id = req.mintRequestId.substring(0, 8);
          const status = req.status;
          const amount = req.tokenAmount.toLocaleString();
          const risk = req.riskScore ? (req.riskScore * 100).toFixed(0) + '%' : 'N/A';
          const user = req.userId.substring(0, 8);
          
          console.log(
            id.padEnd(8) + 
            status.padEnd(12) + 
            amount.padEnd(12) + 
            risk.padEnd(8) + 
            user
          );
        });
        console.log('');
      }

      // Recent activity
      if (data.recentActivity.length > 0) {
        console.log('⚡ RECENT ACTIVITY (24h)');
        console.log('=' .repeat(50));
        
        data.recentActivity.forEach(activity => {
          const time = new Date(activity.requestedAt).toLocaleTimeString();
          const status = activity.status;
          const amount = activity.amount.toLocaleString();
          
          console.log(`${time} - ${status} - ${amount} tokens`);
        });
        console.log('');
      }

      // Alerts
      const alerts = [];
      if (data.summary.adminReview > 5) {
        alerts.push(`🚨 High number of requests awaiting admin review (${data.summary.adminReview})`);
      }
      if (data.summary.failed > 0) {
        alerts.push(`⚠️  Failed mint requests detected (${data.summary.failed})`);
      }
      if (data.pendingRequests.filter(r => r.riskScore > 0.8).length > 0) {
        alerts.push(`🔴 High-risk requests pending review`);
      }

      if (alerts.length > 0) {
        console.log('🚨 ALERTS');
        console.log('=' .repeat(50));
        alerts.forEach(alert => console.log(alert));
        console.log('');
      }

      // Recommendations
      console.log('💡 RECOMMENDATIONS');
      console.log('=' .repeat(50));
      
      if (data.summary.approved > 0) {
        console.log(`• Process ${data.summary.approved} approved requests for minting`);
      }
      if (data.summary.adminReview > 0) {
        console.log(`• Review ${data.summary.adminReview} requests awaiting admin approval`);
      }
      if (data.summary.failed > 0) {
        console.log(`• Investigate ${data.summary.failed} failed mint operations`);
      }
      if (alerts.length === 0) {
        console.log('• All systems operating normally');
      }
      console.log('');

    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  }

  async watchForChanges(): Promise<void> {
    console.log('👀 Watching for mint request changes...');
    console.log('Press Ctrl+C to stop\n');

    let lastFileCount = 0;
    let lastSummary: any = null;

    const checkChanges = async () => {
      try {
        const data = await this.scanMintRequests();
        
        // Check for new files
        if (data.summary.total !== lastFileCount) {
          const newRequests = data.summary.total - lastFileCount;
          console.log(`📥 ${newRequests} new mint request(s) detected`);
          lastFileCount = data.summary.total;
        }

        // Check for status changes
        if (lastSummary && (
          lastSummary.approved !== data.summary.approved ||
          lastSummary.completed !== data.summary.completed ||
          lastSummary.failed !== data.summary.failed
        )) {
          console.log(`📊 Status changes detected:`);
          console.log(`  Approved: ${lastSummary.approved} → ${data.summary.approved}`);
          console.log(`  Completed: ${lastSummary.completed} → ${data.summary.completed}`);
          console.log(`  Failed: ${lastSummary.failed} → ${data.summary.failed}`);
        }

        lastSummary = data.summary;

      } catch (error) {
        console.error('Error checking changes:', error);
      }
    };

    // Initial check
    await checkChanges();

    // Check every 30 seconds
    const interval = setInterval(checkChanges, 30000);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n👋 Stopping monitor...');
      clearInterval(interval);
      process.exit(0);
    });
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const monitor = new MintRequestMonitor();

  switch (command) {
    case 'report':
      await monitor.generateReport();
      break;

    case 'process':
      const batchSize = parseInt(args[1] || '5');
      await monitor.processNextBatch(batchSize);
      break;

    case 'watch':
      await monitor.watchForChanges();
      break;

    case 'scan':
      const data = await monitor.scanMintRequests();
      console.log(JSON.stringify(data, null, 2));
      break;

    default:
      console.log(`
OmniFit Mint Request Monitor

Commands:
  report          - Generate comprehensive status report
  process [size]  - Process next batch of approved requests (default: 5)
  watch          - Watch for real-time changes
  scan           - Scan and output raw JSON data

Examples:
  npm run mint:monitor report
  npm run mint:monitor process 10
  npm run mint:monitor watch
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { MintRequestMonitor };