jest.mock('expo-notifications',()=>({getPermissionsAsync:jest.fn(),requestPermissionsAsync:jest.fn(),cancelAllScheduledNotificationsAsync:jest.fn(),scheduleNotificationAsync:jest.fn(),setNotificationChannelAsync:jest.fn(),AndroidImportance:{DEFAULT:3},SchedulableTriggerInputTypes:{DATE:'date'}}),{virtual:true});
jest.mock('react-native',()=>({Platform:{OS:'ios'}}),{virtual:true});
// Keep React Native's ambient DOM types out of the web project's type graph.
const {Notifications,parseReminderMessage,updateDeviceReminders} = require('../../thrivv-mobile/lib/reminders');
const url='https://thrivv.dev/member/notifications';
const message={type:'thrivv.reminders' as const,requestPermission:false,scheduled:[{id:'expiry:1',kind:'expiry' as const,at:new Date(Date.now()+86400000).toISOString()}]};
beforeEach(()=>{jest.clearAllMocks();(Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({granted:true});(Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({granted:false});});
test('native reminder bridge requires both message source and current page to be a trusted app URL',()=>{
 expect(parseReminderMessage(JSON.stringify(message),url,url)).toEqual(message);
 for(const origin of ['https://evil.test/','https://thrivv.dev.evil.test/','javascript:alert(1)','https://api.prod.whoop.com/']){
  expect(parseReminderMessage(JSON.stringify(message),origin,url)).toBeNull();expect(parseReminderMessage(JSON.stringify(message),url,origin)).toBeNull();
 }
});
test('rejects unknown kinds, invalid dates and excessive scheduling payloads',()=>{
 for(const scheduled of [[{id:'x',kind:'arbitrary',at:message.scheduled[0].at}],[{id:'x',kind:'expiry',at:'invalid'}],Array(7).fill(message.scheduled[0])])expect(parseReminderMessage(JSON.stringify({...message,scheduled}),url,url)).toBeNull();
});
test('foreground refresh schedules only when already authorized and never asks permission',async()=>{
 expect(await updateDeviceReminders(message)).toBe(true);expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({identifier:'expiry:1',content:expect.objectContaining({title:'Check your voucher expiry'})}));
});
test('denied permissions and opt-out cancel scheduled reminders without sending',async()=>{
 (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({granted:false});expect(await updateDeviceReminders({...message,requestPermission:true})).toBe(false);expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
 await updateDeviceReminders({...message,scheduled:[]});expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(2);
});
test('past and overly distant timestamps never schedule stale notifications',async()=>{
 await updateDeviceReminders({...message,scheduled:[{id:'old',kind:'weekly',at:'2000-01-01T00:00:00Z'},{id:'future',kind:'weekly',at:'2099-01-01T00:00:00Z'}]});expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});
