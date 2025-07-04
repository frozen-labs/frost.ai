import { sql } from "drizzle-orm";
import { db } from "./server";

let initialized = false;

export async function initializePgCron() {
  // Only run once per app lifecycle
  if (initialized) return;
  initialized = true;
  
  try {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') return;
    
    // Don't run in test environment
    if (process.env.NODE_ENV === 'test') return;
    
    console.log("🔧 Checking pg_cron setup...");
    
    // 1. Try to create extension (idempotent)
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_cron`);
    
    // 2. Check if cron schema exists
    const schemaCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata 
        WHERE schema_name = 'cron'
      ) as exists
    `);
    
    if (!schemaCheck.rows[0].exists) {
      // pg_cron not available, skip silently
      return;
    }
    
    // 3. Create or replace the renewal function
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION renew_platform_fees()
      RETURNS TABLE(renewed_count int, skipped_count int)
      LANGUAGE plpgsql
      AS $$
      DECLARE
        renewed_count int := 0;
        skipped_count int := 0;
        fee_record RECORD;
      BEGIN
        FOR fee_record IN 
          SELECT 
            ft.*,
            a.platform_fee_enabled,
            a.platform_fee_cents,
            a.platform_fee_billing_cycle
          FROM agent_fee_transactions ft
          JOIN agents a ON a.id = ft.agent_id
          WHERE ft.fee_type = 'platform'
            AND ft.is_active = true
            AND ft.next_billing_date IS NOT NULL
            AND ft.next_billing_date <= NOW()
            AND a.platform_fee_enabled = true
        LOOP
          DECLARE
            next_date timestamp with time zone;
            last_day_of_month int;
          BEGIN
            IF fee_record.billing_cycle = 'monthly' THEN
              next_date := fee_record.next_billing_date + interval '1 month';
            ELSIF fee_record.billing_cycle = 'yearly' THEN
              next_date := fee_record.next_billing_date + interval '1 year';
            END IF;
            
            IF fee_record.billing_anchor_day IS NOT NULL THEN
              last_day_of_month := extract(day from (date_trunc('month', next_date) + interval '1 month - 1 day'))::int;
              next_date := date_trunc('month', next_date) + 
                          (least(fee_record.billing_anchor_day - 1, last_day_of_month - 1) * interval '1 day') +
                          interval '12 hours';
            END IF;
            
            INSERT INTO agent_fee_transactions (
              id, customer_id, agent_id, fee_type, amount_cents,
              billing_cycle, billing_anchor_day, billing_timezone,
              next_billing_date, previous_transaction_id, metadata
            ) VALUES (
              gen_random_uuid(),
              fee_record.customer_id,
              fee_record.agent_id,
              'platform',
              fee_record.platform_fee_cents,
              fee_record.billing_cycle,
              fee_record.billing_anchor_day,
              fee_record.billing_timezone,
              next_date,
              fee_record.id,
              jsonb_build_object(
                'triggeredBy', 'pg_cron_renewal',
                'previousTransactionId', fee_record.id,
                'renewedAt', NOW()
              )
            );
            
            UPDATE agent_fee_transactions
            SET is_active = false
            WHERE id = fee_record.id;
            
            renewed_count := renewed_count + 1;
          END;
        END LOOP;
        
        SELECT COUNT(*) INTO skipped_count
        FROM agent_fee_transactions ft
        JOIN agents a ON a.id = ft.agent_id
        WHERE ft.fee_type = 'platform'
          AND ft.is_active = true
          AND ft.next_billing_date IS NOT NULL
          AND ft.next_billing_date <= NOW()
          AND a.platform_fee_enabled = false;
        
        RETURN QUERY SELECT renewed_count, skipped_count;
      END;
      $$
    `);
    
    // 4. Alter or create cron job
    const existingJob = await db.execute(sql`
      SELECT jobid FROM cron.job 
      WHERE jobname = 'renew-platform-fees' 
      LIMIT 1
    `);
    
    if (existingJob.rows.length > 0) {
      await db.execute(sql`
        SELECT cron.alter_job(
          jobid := ${existingJob.rows[0].jobid}::bigint,
          schedule := '0 2 * * *',
          command := 'SELECT * FROM renew_platform_fees();'
        )
      `);
      console.log("✅ pg_cron job updated");
    } else {
      await db.execute(sql`
        SELECT cron.schedule(
          'renew-platform-fees',
          '0 2 * * *',
          'SELECT * FROM renew_platform_fees();'
        )
      `);
      console.log("✅ pg_cron job created");
    }
    
  } catch (error) {
    // Silently handle errors - pg_cron is optional
    if (process.env.NODE_ENV === 'development') {
      console.log("ℹ️  pg_cron not available (this is normal in local dev)");
    }
  }
}

// Helper to manually trigger renewal (export for use in other files)
export async function triggerPlatformFeeRenewal() {
  try {
    const result = await db.execute(sql`SELECT * FROM renew_platform_fees()`);
    return result.rows[0];
  } catch (error) {
    console.error('Error triggering platform fee renewal:', error);
    throw error;
  }
}