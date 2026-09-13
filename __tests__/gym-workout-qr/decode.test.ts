import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { createGymWorkoutQr, verifyGymWorkoutQr } from '@/lib/gym-workout-qr';
test('real QR pixels decode locally into a verifiable signed workout payload',async()=>{
 const old=process.env.GYM_WORKOUT_QR_SECRET;process.env.GYM_WORKOUT_QR_SECRET=Buffer.alloc(32,8).toString('base64');
 try {
  const gym='00000000-0000-4000-8000-000000000001',operator='00000000-0000-4000-8000-000000000002';
  const {token}=await createGymWorkoutQr(gym,operator);
  const qr=QRCode.create('thrivv-workout:'+token,{errorCorrectionLevel:'M'});const scale=6,margin=4,size=(qr.modules.size+margin*2)*scale;
  const pixels=new Uint8ClampedArray(size*size*4).fill(255);
  for(let y=0;y<qr.modules.size;y++)for(let x=0;x<qr.modules.size;x++)if(qr.modules.get(y,x))for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++){
   const i=(((y+margin)*scale+dy)*size+(x+margin)*scale+dx)*4;pixels[i]=pixels[i+1]=pixels[i+2]=0;
  }
  const decoded=jsQR(pixels,size,size,{inversionAttempts:'dontInvert'});expect(decoded?.data).toBe('thrivv-workout:'+token);
  expect(await verifyGymWorkoutQr(decoded!.data.slice(15),gym)).toMatchObject({gymId:gym,operatorId:operator});
 } finally {if(old===undefined)delete process.env.GYM_WORKOUT_QR_SECRET;else process.env.GYM_WORKOUT_QR_SECRET=old;}
});
