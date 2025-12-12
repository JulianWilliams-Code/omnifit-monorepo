# OmniFit Reward Engine Security Guide

## Overview

The OmniFit Reward Engine implements a secure off-chain verification system with queued on-chain mint requests. This document outlines the security architecture, audit procedures, and production deployment guidelines.

## Architecture

### Off-Chain Components

1. **Reward Processing Queue (BullMQ)**
   - Event-driven reward calculation
   - Configurable rule engine
   - Retry mechanisms with exponential backoff
   - Dead letter queue for failed jobs

2. **Mint Request System**
   - Two-phase commit for claim requests
   - Risk assessment and fraud detection
   - Admin approval workflow for high-risk requests
   - JSON-based audit trail

3. **Database Models**
   - `RewardRule` - Configurable reward calculation rules
   - `RewardJob` - Queue job tracking and results
   - `MintRequest` - On-chain mint request records
   - `RewardAudit` - Comprehensive audit logging
   - `SystemMetrics` - Performance and security metrics

## Security Features

### 1. Risk Assessment

The system automatically evaluates mint requests based on:

- **Account Age**: New accounts (< 7 days) receive higher risk scores
- **Claim Amount**: Large claims (> 5,000 tokens) are flagged
- **Request Frequency**: Multiple requests within 24 hours are monitored
- **Wallet Reuse**: Cross-user wallet usage detection
- **User Behavior Patterns**: Anomaly detection for unusual activity

### 2. Multi-Tier Approval System

```
User Claim → Risk Assessment → Routing Decision
                    ↓
            Low Risk: QUEUED → Automatic Processing
            High Risk: ADMIN_REVIEW → Manual Approval
```

### 3. Comprehensive Audit Logging

All actions are logged to the `RewardAudit` table with:

- User identification and IP tracking
- Action type and resource affected
- Before/after state changes
- Triggering context and metadata
- Cryptographic signatures for integrity

### 4. Secure Key Management

```bash
# Production Key Storage Structure
apps/blockchain/keypairs/
├── authorities/
│   ├── [mint-address]-authority.json   # Mint authority keypair
│   └── [mint-address]-freeze.json      # Freeze authority (mainnet only)
├── multisig/
│   ├── proposal-keypairs/              # Multisig proposal keys
│   └── member-keypairs/                # Multisig member keys
└── payer.json                          # Transaction fee payer
```

## Production Security Procedures

### 1. Multisig Setup (CRITICAL for mainnet)

For production deployments, implement a multisig wallet for mint authority:

```typescript
// Example multisig configuration
const multisigConfig = {
  members: [
    "GovPubKey1...",  // Governance member 1
    "GovPubKey2...",  // Governance member 2
    "GovPubKey3...",  // Governance member 3
  ],
  threshold: 2,       // Require 2 of 3 signatures
  authority: "mint"   // Controls token minting
};
```

### 2. Admin Approval Workflow

High-risk mint requests require admin approval:

```bash
# Check pending admin reviews
npm run mint:monitor report

# Approve a specific request
curl -X PUT /api/admin/rewards/mint-requests/{id}/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"notes": "Verified user identity and activity"}'

# Process approved requests
npm run mint:process
```

### 3. Monitoring and Alerting

Set up monitoring for:

- **Failed Mint Operations**: `status = 'FAILED'`
- **High Risk Requests**: `riskScore > 0.7`
- **Queue Backlogs**: `pending jobs > 100`
- **Unusual Claim Patterns**: Multiple large claims from single user

### 4. Backup and Recovery

Regular backups of critical data:

```bash
# Backup reward rules and configurations
pg_dump -t reward_rules -t system_config omnifitdb > reward_config_backup.sql

# Backup mint request audit trail
pg_dump -t mint_requests -t reward_audits omnifitdb > mint_audit_backup.sql

# Backup blockchain keypairs (encrypted storage required)
gpg -c apps/blockchain/keypairs/ > keypairs_backup.gpg
```

## Environment Configuration

### Development Environment

```bash
# .env.development
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
REDIS_URL=redis://localhost:6379
REWARD_WORKER_CONCURRENCY=5
```

### Production Environment

```bash
# .env.production
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
REDIS_URL=redis://production-redis:6379
REWARD_WORKER_CONCURRENCY=10
MINT_APPROVAL_THRESHOLD=0.7
MULTISIG_ENABLED=true
SECURITY_AUDIT_ENABLED=true
```

## Operational Procedures

### Daily Operations

1. **Monitor Queue Health**
   ```bash
   npm run mint:monitor report
   ```

2. **Review High-Risk Requests**
   ```bash
   # Check admin review queue
   curl /api/admin/rewards/mint-requests/pending
   ```

3. **Process Approved Mints**
   ```bash
   npm run mint:process
   ```

### Weekly Security Review

1. **Audit Trail Analysis**
   ```sql
   -- Check for suspicious patterns
   SELECT userId, COUNT(*), SUM(amount) as total_claimed
   FROM mint_requests 
   WHERE requestedAt > NOW() - INTERVAL '7 days'
   GROUP BY userId 
   HAVING COUNT(*) > 5 OR SUM(amount) > 50000
   ORDER BY total_claimed DESC;
   ```

2. **Rule Effectiveness Review**
   ```bash
   # Generate reward analytics
   curl /api/admin/rewards/analytics/overview?days=7
   ```

3. **Failed Transaction Investigation**
   ```bash
   # Check failed mint operations
   npm run mint:monitor scan | jq '.summary.failed'
   ```

## Incident Response

### Security Incident Types

1. **Unauthorized Token Minting**
   - Immediately freeze mint authority
   - Investigate transaction signatures
   - Review admin approval logs

2. **Fraudulent Reward Claims**
   - Suspend user account
   - Analyze claim patterns
   - Review reward rule exploitation

3. **System Compromise**
   - Rotate all API keys and tokens
   - Backup and rebuild compromised systems
   - Audit all recent transactions

### Emergency Procedures

```bash
# Emergency: Pause all minting operations
export EMERGENCY_STOP=true
systemctl stop omnifit-reward-worker

# Emergency: Freeze token mint (requires freeze authority)
npm run blockchain:emergency-freeze [MINT_ADDRESS]

# Emergency: Generate security report
npm run security:incident-report [INCIDENT_ID]
```

## Compliance and Regulations

### Data Privacy (GDPR/CCPA)

- User reward data is encrypted at rest
- Audit logs include data minimization
- Right to erasure procedures available
- Cross-border data transfer compliance

### Financial Regulations

- Token minting caps and rate limits
- Transaction monitoring and reporting
- Anti-money laundering (AML) compliance
- Know Your Customer (KYC) integration points

## Testing and Validation

### Security Testing Checklist

- [ ] Penetration testing of API endpoints
- [ ] Smart contract audit (if applicable)
- [ ] Key management security review
- [ ] Database encryption validation
- [ ] Network security assessment
- [ ] Business logic vulnerability scan

### Automated Security Tests

```bash
# Run security test suite
npm run test:security

# Validate reward rule logic
npm run test:reward-rules

# Test mint request validation
npm run test:mint-validation
```

## Contact and Escalation

### Security Team Contacts

- **Security Lead**: security@omnifit.app
- **Infrastructure Team**: infra@omnifit.app
- **Emergency Hotline**: +1-XXX-XXX-XXXX

### Escalation Matrix

1. **Level 1**: Standard operational issues
2. **Level 2**: Security policy violations
3. **Level 3**: Active security incidents
4. **Level 4**: Critical system compromise

## Appendices

### A. Reward Rule Examples

```json
{
  "name": "Daily Workout Bonus",
  "conditions": {
    "eventType": ["WORKOUT"],
    "minDuration": 30,
    "timeOfDay": "morning"
  },
  "baseAmount": 50,
  "multiplierRules": [
    {
      "condition": "first_activity_of_day",
      "multiplier": 1.5,
      "description": "Early bird bonus"
    }
  ],
  "maxDailyAmount": 500
}
```

### B. Risk Score Calculation

```typescript
// Risk factors and their weights
const riskFactors = {
  newAccount: 0.4,        // < 7 days old
  largeAmount: 0.3,       // > 10,000 tokens
  frequentRequests: 0.3,  // > 3 in 24h
  walletReuse: 0.2        // Wallet used by others
};
```

### C. Multisig Implementation

Refer to `apps/blockchain/scripts/multisig/` for production multisig setup scripts and procedures.