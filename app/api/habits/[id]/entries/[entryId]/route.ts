import { NextRequest } from 'next/server';
import { memberRecords as store } from '@/lib/member-records';
import { memberActor, memberBody, memberResult, owned, MemberResourceError } from '@/lib/member-resource';
export async function PUT(req: NextRequest, props: {params: Promise<{id:string;entryId:string}>}) {
 const params = await props.params;
 return memberResult(async () => {
  const user=await memberActor(req); owned(await store.getHabit(params.id, user.id),user.id);
  owned((await store.getHabitEntries(params.id, user.id)).find(e=>e.id===params.entryId && e.memberId===user.id),user.id);
  const b=await memberBody(req,user.id);
  if(typeof b.completed!=='boolean') throw new MemberResourceError('Invalid completion.',400);
  return store.updateHabitEntry(params.entryId,{completed:b.completed},{memberId:user.id,habitId:params.id});
 });
}
