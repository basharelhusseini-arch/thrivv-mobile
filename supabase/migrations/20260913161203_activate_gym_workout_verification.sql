-- Turn on verified gym scans. Point issuance remains disabled until a separate,
-- explicit product decision supplies both the conversion rate and daily cap.
UPDATE public.gym_reward_config
SET verification_enabled = true,
    rewards_enabled = false,
    effective_date = NULL,
    points_per_health_point = NULL,
    max_daily_points = NULL
WHERE singleton = true;
