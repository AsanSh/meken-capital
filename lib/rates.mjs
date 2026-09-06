export const NBKR_URL = 'https://www.nbkr.kg/XML/daily.xml';
export function parseNbkr(xml) {
  const date = /<CurrencyRates\b[^>]*\bDate="(\d{2})\.(\d{2})\.(\d{4})"/.exec(xml);
  const usd = /<Currency\b[^>]*\bISOCode="USD"[^>]*>([\s\S]*?)<\/Currency>/.exec(xml)?.[1];
  const nominal = Number(/<Nominal>\s*([\d.,]+)\s*<\/Nominal>/.exec(usd || '')?.[1]?.replace(',', '.'));
  const value = Number(/<Value>\s*([\d.,]+)\s*<\/Value>/.exec(usd || '')?.[1]?.replace(',', '.'));
  if (!date || !Number.isFinite(value) || value <= 0 || !Number.isFinite(nominal) || nominal <= 0) throw new Error('Invalid NBKR exchange rate');
  const rateDate = `${date[3]}-${date[2]}-${date[1]}`;
  if (new Date(rateDate).toISOString().slice(0,10) !== rateDate) throw new Error('Invalid NBKR date');
  return { usdKgs: value / nominal, rateDate, rateSource: 'НБКР', rateUrl: NBKR_URL };
}
export function createRateService({ read, write, fetcher = fetch, clock = Date.now }) {
  let pending, nextCheck = 0, failed = false;
  function cached() { const v=read();return v?.rateSource==='НБКР'?v:null; }
  return async function rates() {
    if(clock() >= nextCheck && !pending) pending=(async()=>{
      try {
        const response=await fetcher(NBKR_URL,{signal:AbortSignal.timeout(8000)});
        if(!response.ok) throw new Error('NBKR unavailable');
        const value={...parseNbkr(await response.text()),rateCheckedAt:new Date(clock()).toISOString()};
        write(value); failed=false;nextCheck=clock()+3600000;
      } catch {failed=true;nextCheck=clock()+300000;}
      finally {pending=null;}
    })();
    if(pending)await pending;
    const v=cached();return v?{...v,rateStale:failed}:{rateUnavailable:true};
  };
}
