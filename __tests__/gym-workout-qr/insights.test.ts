import { healthInsights } from '@/lib/health-insights';
const score={complete:true,score:43.5,subtotal:43.5,training_score:39.5,recovery_score:4,habit_score:0,whoop_recovery:20,workouts_complete:true};
test('explains actual components and low recovery without inventing a cause',()=>{
 const text=healthInsights(score,[{sport_name:'Strength',workout_score:49.4,score_input_valid:true}]).join(' ');
 expect(text).toContain('43.5/110');expect(text).toContain('Training 39.5/80');expect(text).toContain('Recovery 4/20');expect(text).toContain('20/100');expect(text).toContain('do not add intensity');expect(text).not.toMatch(/you slept|alcohol|dehydrated|poor sleep|1.2/);
});
test('distinguishes missing workouts from complete zero and marks provisional',()=>{
 const pending=healthInsights({...score,complete:false,score:null,workouts_complete:false,training_score:null,whoop_recovery:null,recovery_score:null},[]).join(' ');
 expect(pending).toContain('Provisional');expect(pending).toContain('not evidence that you did not train');expect(pending).toContain('Recovery is unavailable');
 expect(healthInsights({...score,training_score:0},[]).join(' ')).toContain('recorded zero');
 expect(healthInsights(null,[]).join(' ')).toContain('no missing values are treated as zero');
});
