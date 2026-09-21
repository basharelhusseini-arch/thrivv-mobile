import React from 'react';
import { act, create } from 'react-test-renderer';
import { LanguageProvider, LanguageSwitch } from '@/lib/i18n/client';
const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
test('switch updates language, direction and saved cookie and restores English', () => {
  const doc={documentElement:{lang:'en',dir:'ltr'},cookie:''};
  const oldDocument=Object.getOwnPropertyDescriptor(globalThis,'document'), oldLocation=Object.getOwnPropertyDescriptor(globalThis,'location');
  Object.defineProperty(globalThis,'document',{configurable:true,value:doc});
  Object.defineProperty(globalThis,'location',{configurable:true,value:{protocol:'https:'}});
  let tree: ReturnType<typeof create>;
  try {
    act(()=>{tree=create(<LanguageProvider initialLocale="en"><LanguageSwitch/></LanguageProvider>);});
    act(()=>{tree!.root.findAllByType('button')[1].props.onClick();});
    expect(doc.documentElement).toEqual({lang:'ar',dir:'rtl'});expect(doc.cookie).toContain('thrivv-language=ar');expect(doc.cookie).toContain('Secure');expect(refresh).toHaveBeenCalled();
    act(()=>{tree!.root.findAllByType('button')[0].props.onClick();});
    expect(doc.documentElement).toEqual({lang:'en',dir:'ltr'});expect(doc.cookie).toContain('thrivv-language=en');
    act(()=>tree!.unmount());
  } finally {
    if(oldDocument)Object.defineProperty(globalThis,'document',oldDocument);else Reflect.deleteProperty(globalThis,'document');
    if(oldLocation)Object.defineProperty(globalThis,'location',oldLocation);else Reflect.deleteProperty(globalThis,'location');
  }
});
