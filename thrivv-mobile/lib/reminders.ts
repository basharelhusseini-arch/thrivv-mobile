import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { appUrl } from './navigation';
export type ReminderMessage = {type:'thrivv.reminders';requestPermission:boolean;scheduled:{id:string;kind:'expiry'|'weekly';at:string}[]};
export function parseReminderMessage(raw:string,sourceUrl:string,currentUrl:string):ReminderMessage|null {
  if(!appUrl(sourceUrl) || !appUrl(currentUrl) || raw.length>5000)return null;
  try {
    const d=JSON.parse(raw);
    if(d?.type!=='thrivv.reminders' || typeof d.requestPermission!=='boolean' || !Array.isArray(d.scheduled) || d.scheduled.length>6)return null;
    if(!d.scheduled.every((r:Record<string,unknown>)=>r && typeof r.id==='string' && r.id.length<=100 && ['expiry','weekly'].includes(String(r.kind)) && typeof r.at==='string' && Number.isFinite(Date.parse(r.at))))return null;
    return d;
  } catch {return null;}
}
let pending=Promise.resolve(false);
/** Device-local only: no push token, merchant information or member data leaves the device. */
export function updateDeviceReminders(message:ReminderMessage):Promise<boolean> {
 pending=pending.catch(()=>false).then(async()=>{
  if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('reminders',{name:'Optional reminders',importance:Notifications.AndroidImportance.DEFAULT});
  let permission=await Notifications.getPermissionsAsync();
  if(message.requestPermission && !permission.granted)permission=await Notifications.requestPermissionsAsync();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if(!permission.granted)return false;
  for(const r of message.scheduled){
    const timestamp=Date.parse(r.at);if(timestamp<=Date.now() || timestamp>Date.now()+7*86400000)continue;
    await Notifications.scheduleNotificationAsync({identifier:r.id,content:{title:r.kind==='expiry'?'Check your voucher expiry':'Your weekly attendance target',body:r.kind==='expiry'?'A saved voucher expires tomorrow. Open Thrivv for the latest status.':'Check your progress toward the weekly target you chose.',data:{path:'/member/notifications'}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(timestamp),channelId:'reminders'}});
  }
  return true;
 });
 return pending;
}
export {Notifications};
