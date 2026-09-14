export function workoutPlanView(p: any) {
 return { id:p.id, memberId:p.member_id, name:p.name, description:p.description, goal:p.goal, duration:p.duration, frequency:p.frequency, difficulty:p.difficulty, status:p.status, createdAt:p.created_at, startDate:p.start_date, endDate:p.end_date, createdBy:p.created_by };
}
export function workoutView(w:any) {
 return {id:w.id,workoutPlanId:w.workout_plan_id,memberId:w.member_id,name:w.name,date:w.date,exercises:w.exercises,duration:w.duration,status:w.status,notes:w.notes,rating:w.rating,completedAt:w.completed_at,warmup:w.warmup,weekNumber:w.week_number,sessionType:w.session_type,dayTheme:w.day_theme,purpose:w.purpose};
}
