'use client';
import {useEffect} from 'react';
import {reportBrowserError} from '@/lib/browser-error-reporting';
export default function ErrorPage({error,reset}:{error:Error;reset:()=>void}){
 useEffect(()=>reportBrowserError(error),[error]);
 return <section role="alert" className="p-8 text-white"><h1 className="text-xl">This page could not load.</h1><p className="my-4">Please try again.</p><button className="btn-primary px-5 py-3" onClick={reset}>Try again</button></section>;
}
