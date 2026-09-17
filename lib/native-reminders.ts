export type ScheduledReminder = {id:string;kind:'expiry'|'weekly';at:string};
export function sendNativeReminders(scheduled:ScheduledReminder[],requestPermission=false) {
  const bridge=(window as unknown as {ReactNativeWebView?:{postMessage:(message:string)=>void}}).ReactNativeWebView;
  if(!bridge)return false;
  bridge.postMessage(JSON.stringify({type:'thrivv.reminders',scheduled,requestPermission}));return true;
}
