import type {Instrumentation} from 'next';
export const onRequestError: Instrumentation.onRequestError = async(error,request,context)=>{
 if(process.env.NEXT_RUNTIME==='nodejs'){
  const {recordProductionError}=await import('./lib/error-reporting');
  await recordProductionError('server',context.routePath||request.path,error);
 }
};
