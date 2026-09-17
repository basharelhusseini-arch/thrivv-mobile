'use client';
import {useEffect} from 'react';
import {reportBrowserError} from '@/lib/browser-error-reporting';
export default function GlobalError({error,reset}:{error:Error;reset:()=>void}){
 useEffect(()=>reportBrowserError(error),[error]);
 return <html lang="en"><body style={{background:'#0d0f14',color:'white',padding:32,fontFamily:'sans-serif'}}><h1>Something went wrong.</h1><p>Your saved account data is still available. Try opening Thrivv again.</p><button onClick={reset}>Try again</button></body></html>;
}
