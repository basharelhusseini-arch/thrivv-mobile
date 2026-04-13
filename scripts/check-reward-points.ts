/**
 * Quick diagnostic script to check reward points
 * Run: npx tsx scripts/check-reward-points.ts
 */

import { supabase } from '../lib/supabase';

async function checkRewardPoints() {
  try {
    console.log('🔍 Checking reward points...\n');

    // Get the most recent user (assuming it's you)
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, reward_points')
      .order('created_at', { ascending: false })
      .limit(1);

    if (userError) {
      console.error('❌ Error fetching user:', userError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('❌ No users found');
      return;
    }

    const user = users[0];
    console.log('👤 User:', user.email);
    console.log('💰 Reward Points in DB:', user.reward_points || 0);
    console.log('');

    // Check reward history
    const { data: history, error: historyError } = await supabase
      .from('reward_history')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (historyError) {
      console.error('❌ Error fetching history:', historyError);
      return;
    }

    if (!history || history.length === 0) {
      console.log('⚠️  No reward history found - you need to complete a check-in first!');
      return;
    }

    console.log('📊 Reward History:');
    console.log('─────────────────────────────────────────────────────────────');
    
    let totalPoints = 0;
    history.forEach((entry: any) => {
      console.log(`Date: ${entry.date}`);
      console.log(`  Health Score: ${entry.health_score}`);
      console.log(`  Confidence Score: ${entry.confidence_score || 30}`);
      console.log(`  Total Rewards Score: ${entry.total_rewards_score || entry.health_score}`);
      console.log(`  Confidence Multiplier: ${entry.confidence_multiplier || 1.0}x`);
      console.log(`  Points Earned: ${entry.points_earned || 0}`);
      console.log('');
      totalPoints += Number(entry.points_earned || 0);
    });

    console.log('─────────────────────────────────────────────────────────────');
    console.log(`✅ Total Points (calculated from history): ${totalPoints}`);
    console.log(`💾 Total Points (in users table): ${user.reward_points || 0}`);
    
    if (totalPoints !== Number(user.reward_points || 0)) {
      console.log('\n⚠️  MISMATCH DETECTED! Updating...');
      
      // Fix the mismatch
      const { error: updateError } = await supabase
        .from('users')
        .update({ reward_points: totalPoints })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Error updating:', updateError);
      } else {
        console.log('✅ Fixed! User reward_points updated to:', totalPoints);
      }
    } else {
      console.log('\n✅ Everything looks good!');
    }

    // Check today's check-in
    const today = new Date().toISOString().split('T')[0];
    const { data: todayCheckin } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    console.log('\n📅 Today\'s Check-in:', todayCheckin ? 'COMPLETED ✅' : 'NOT COMPLETED ❌');
    if (todayCheckin) {
      console.log(`  Workout: ${todayCheckin.did_workout ? 'Yes' : 'No'}`);
      console.log(`  Calories: ${todayCheckin.calories || 0}`);
      console.log(`  Sleep: ${todayCheckin.sleep_hours || 0} hours`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkRewardPoints();
