

javascript:let t=console.log,e=t=>("0"+t).slice(-2),o=t=>document.getElementById(t),a=[],n={},d=0,s="https://smartpaymapi.ovoenergy.com/usage/api/half-hourly/";async function l(o=0){let d=function(t=0){let e=new Date,o=new Date(e.getFullYear(),e.getMonth()-t,1),a=new Date(e.getFullYear(),e.getMonth()-t+1,0);return{fdom:o.getDay(),ldom:a.getDate(),month:o.getMonth()+1,mthName:o.toLocaleString("default",{month:"long"}),year:o.getFullYear()}}(o),l=0;total=0;let m=d.fdom,f=d.year,h=e(d.month),y=0,g=[],u=!0;for(t("Month: ",d.mthName),c("Month: "+d.mthName),i=1;i<=d.ldom&&u;i++,m=++m%7)if(m>0&&m<10){if(dts=`${f}-${h}-`+e(i),a.includes(dts)){t(dts+" bank holiday "+n[dts]),y++,g.push(n[dts]);continue}0;let o=s+dts;if(data=await fetch(o),!0!==data.ok){t("bad response for",o);continue}r();let d=await data.json();if(d.electricity){let o=d.electricity.data;if(u=d.electricity.next,o instanceof Array==0){t("1/2 hourly data is not an array",o);continue}48!=o.length&&t(dts,"1/2 hourly data length not 48: ",o.length),e427Tot=0,dayTot=0;for(let t=0;t<o.length;t++){dayTot+=o[t].consumption;let e=new Date(o[t].interval.start),a=e.getHours();0!=e.getTimezoneOffset()&&a++,a>=16&&a<19&&(e427Tot+=o[t].consumption)}if(total+=dayTot,l+=e427Tot,t(`${e(i)} day ${(100*e427Tot/dayTot).toFixed(3)}%  [${e427Tot.toFixed(3)}/${dayTot.toFixed(3)}]`),!0!==d.electricity.next)break}else t("Nooo for "+dts)}let p=`TOTAL ${(l/total*100).toFixed(2)}%  [${l.toFixed(3)} / ${total.toFixed(3)}] - bank holidays: ${y} `+g.join(", ");t(p),t(),c(p),c("&nbsp;")}function c(){for(let t of arguments)nd=document.createElement("div"),nd.innerHTML=t,msgs.append(nd)}function r(){d=!d,xDiv.innerText=d?"◉":"◎"}(async()=>{if(document.body.innerHTML='<div>Working: [<span id="X">+</span>]<p><div id="msgs"></div></div>',mDiv=o("msgs"),xDiv=o("X"),function(){let t=Object.fromEntries(document.cookie.split("; ").map((t=>t.split("=")))).mp_457e7322cdf0dcb51030b6a3bafd8805_mixpanel;if(void 0!==t&&(acct=JSON.parse(decodeURIComponent(t)),acctid=acct["Account Id"],acctid))return!0;return!1}())if("smartpaymapi.ovoenergy.com"==window.location.host){s=s+acctid+"?date=";try{let e=await fetch("https://www.gov.uk/bank-holidays.json");if(e.ok){let o=await e.json();for(let t of o["england-and-wales"].events)a.push(t.date),n[t.date]=t.title;t("got bank holidays")}}catch(t){c("Can't process bank holidays")}c("Press F12 for more info");for(let t=0;t<6;t++)await l(t)}else c('<b>ERROR:</b> <a href="https://smartpaymapi.ovoenergy.com/">CLICK HERE to go to the website</a> then ignore the onscreen message and use the bookmark again.');else c('<b>ERROR:</b> [<a href="https://account.ovoenergy.com/">CLICK HERE to sign into your Ovo account first.</a>]')})();

/*
//(() => { let spans = document.querySelectorAll("[data-testid='usage-table-data']"); let totalP = 0;for (let i = 32; i <= 37; i++) totalP += parseFloat(spans[i].innerText.match(/\d+\.\d+/)[0]); return totalP.toFixed(2); })();
// <span data-testid="usage-table-date">12:00pm</span> 48 of these in a day want 33 to 38

//(()=>{let e=document.querySelectorAll("[data-testid='usage-table-data']"),t=0;for(let a=32;a<=37;a++)t+=parseFloat(e[a].innerText);return t.toFixed(2)})();


//(()=>{let e=document.querySelectorAll("[data-testid='usage-table-data']"),let t=0;for(let a=32;a<=37;a++)t+=parseFloat(e[a].innerText);alert(t.toFixed(2) + " = " + (t*100/document.querySelector('[data-testid="single-fuel-usage"]').innerText).toFixed(2)+"%")})();

// <span data-testid="usage-table-data">0.19 kWh</span>
    // why don't classes hoist
//let YTP = new YTController();

Cookie to "bits"
Object.fromEntries(document.cookie.split('; ').map(c => c.split('=')))

foo = Object.fromEntries(document.cookie.split('; ').map(c => c.split('=')));
acct = JSON.parse( decodeURIComponent(foo.mp_457e7322cdf0dcb51030b6a3bafd8805_mixpanel) )
id = acct["Account Id"]

my msn 15K0096278
my acct 23032775
   mpan ?
    GUID or EUI

{
    "distinct_id": "1840cd15-f180-493a-aa97-8dc9d8dcdddd",
    "$device_id": "189af03fc3e669-060438abd939c-26031c51-232106-189af03fc3f71d",
    "$initial_referrer": "https://account.ovoenergy.com/",
    "$initial_referring_domain": "account.ovoenergy.com",
    "$user_id": "1840cd15-f180-493a-aa97-8dc9d8dcdddd",
    "Account Id": "23032775",
    "Customer Id": "1840cd15-f180-493a-aa97-8dc9d8dcdddd",
    "collectableBalanceAmount": 18.98,
    "utm_source": "navigation",
    "isSmart": true,
    "isHalfHourly": true,
    "fixedAmount": false,
    "amountLimit": null,
    "clientName": "OVO",
    "amount": "",
    "accountBalance": 59,
    "accountBalanceStatus": "credit",
    "currency": "GBP",
    "clientUrl": "https://account.ovoenergy.com/payments/make-card-payment/app/confirm",
    "successMessage": "Your payment is instant, but it can take up to 24 hours for your balance to update.",
    "$current_url": "",
    "$referer": "",
    "isApp": false,
    "utm_source [last touch]": "renew your plan",
    "utm_medium [last touch]": "MyOVO",
    "__mps": {},
    "__mpso": {},
    "__mpus": {},
    "__mpa": {},
    "__mpu": {},
    "__mpr": [],
    "__mpap": []
}

Meter readings for the past 400 days:
https://smartpaymapi.ovoenergy.com/rlc/rac-public-api/api/v5/supplypoints/electricity/{MPAN}/meters/{MSN}/readings

400 days all start at midnight
https://smartpaymapi.ovoenergy.com/orex/api/meter-readings/23032775

where {MPAN} and {MSN} are your specific MPAN and meter serial number. This is the basis for almost all the rest.

Direct Debit suggestions: https://smartpaymapi.ovoenergy.com/pace/recommended-dds/v1/{account}/projected-costs?limitNextYear=true

where {account} is your OVO account number, e.g. 3123456

fetch options include credentials: 'include'

If you login to ovo and then go to https://smartpaymapi.ovoenergy.com/ then fetch requests will work
e.g. https://smartpaymapi.ovoenergy.com/usage/api/half-hourly/23032775?date=2024-02-19


https://forum.ovoenergy.com/my-account-140/can-we-get-access-to-the-ovo-energy-online-account-api-to-download-our-smart-meter-usage-data-58
OVO order of play:
https://my.ovoenergy.com/api/v2/auth/login
https://smartpaym.ovoenergy.com/api/customer-and-account-ids
https://smartpaymapi.ovoenergy.com/usage/api/half-hourly/23032775?date=2024-02-19

let opts = {credentials: 'include', method: "POST"};
let login = fetch("https://my.ovoenergy.com/api/v2/auth/login", opts);
*/