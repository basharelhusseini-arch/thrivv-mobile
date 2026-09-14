import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import { memberActor, memberBody, memberResult, owned, MemberResourceError } from '@/lib/member-resource';
export async function PUT(req: NextRequest, {params}: {params:{id:string;entryId:string}}) {
 return memberResult(async () => {
  const user=await memberActor(req); owned(store.getHabit(params.id),user.id);
  owned(store.getHabitEntries(params.id).find(e=>e.id===params.entryId && e.memberId===user.id),user.id);
  const b=await memberBody(req,user.id);
  if(typeof b.completed!=='boolean') throw new MemberResourceError('Invalid completion.',400);
  return store.updateHabitEntry(params.entryId,{completed:b.completed},{memberId:user.id,habitId:params.id});
 });
}
