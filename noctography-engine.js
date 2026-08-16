/* Noctography engine: meteor rates, sky brightness, weather.
   Astronomy, shower data and rate model carried over from Meteor Watch. */
"use strict";
(function(){
if (window.NoctoEngine) return;   // one engine per page: keep the loaded atlas and forecast

/* the extracted engine calls back into the old page's renderers; the app re-renders itself */
function renderChips(){}
function renderRibbon(){}
function renderNight(){}
function refresh(){}
function writeHash(){}
function $(){ return null; }
const D2R=Math.PI/180,R2D=180/Math.PI;
const sin=a=>Math.sin(a*D2R),cos=a=>Math.cos(a*D2R),tan=a=>Math.tan(a*D2R);
const norm=a=>((a%360)+360)%360;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function jdFrom(d){return d.getTime()/86400000+2440587.5;}
function centuries(jd){return (jd-2451545.0)/36525;}

function sunPos(jd){
  const n=jd-2451545.0;
  const L=norm(280.460+0.9856474*n), g=norm(357.528+0.9856003*n);
  const lam=norm(L+1.915*sin(g)+0.020*sin(2*g));
  const eps=23.439-0.0000004*n;
  const ra=norm(Math.atan2(cos(eps)*sin(lam),cos(lam))*R2D);
  const dec=Math.asin(sin(eps)*sin(lam))*R2D;
  const T=centuries(jd);
  const lam2000=norm(lam-1.396971*T-0.0003086*T*T); // IMO quotes solar longitude for equinox J2000
  return {lam,lam2000,ra,dec};
}
/* Moon position from the standard periodic series (Meeus, Astronomical Algorithms ch. 47).
   The four-term latitude approximation this started with is fine for knowing where the moon is
   in the sky, but an eclipse turns on a tenth of a degree of ecliptic latitude, which that model
   cannot see: it would call a comfortably total lunar eclipse a partial one. Coefficients are
   millionths of a degree for longitude and latitude, and metres for the distance. */
const MOON_LON = [
  [0,0,1,0,6288774,-20905355],[2,0,-1,0,1274027,-3699111],[2,0,0,0,658314,-2955968],
  [0,0,2,0,213618,-569925],[0,1,0,0,-185116,48888],[0,0,0,2,-114332,-3149],
  [2,0,-2,0,58793,246158],[2,-1,-1,0,57066,-152138],[2,0,1,0,53322,-170733],
  [2,-1,0,0,45758,-204586],[0,1,-1,0,-40923,-129620],[1,0,0,0,-34720,108743],
  [0,1,1,0,-30383,104755],[2,0,0,-2,15327,10321],[0,0,1,2,-12528,0],
  [0,0,1,-2,10980,79661],[4,0,-1,0,10675,-34782],[0,0,3,0,10034,-23210],
  [4,0,-2,0,8548,-21636],[2,1,-1,0,-7888,24208],[2,1,0,0,-6766,30824],
  [1,0,-1,0,-5163,-8379],[1,1,0,0,4987,-16675],[2,-1,1,0,4036,-12831],
  [2,0,2,0,3994,-10445],[4,0,0,0,3861,-11650],[2,0,-3,0,3665,14403],
  [0,1,-2,0,-2689,-7003],[2,0,-1,2,-2602,0],[2,-1,-2,0,2390,10056],
  [1,0,1,0,-2348,6322],[2,-2,0,0,2236,-9884],[0,1,2,0,-2120,5751],
  [0,2,0,0,-2069,0],[2,-2,-1,0,2048,-4950],[2,0,1,-2,-1773,4130],
  [2,0,0,2,-1595,0],[4,-1,-1,0,1215,-3958],[0,0,2,2,-1110,0],
  [3,0,-1,0,-892,3258],[2,1,1,0,-810,2616],[4,-1,-2,0,759,-1897],
  [0,2,-1,0,-713,-2117],[2,2,-1,0,-700,2354],[2,1,-2,0,691,0],
  [2,-1,0,-2,596,0],[4,0,1,0,549,-1423],[0,0,4,0,537,-1117],
  [4,-1,0,0,520,-1571],[1,0,-2,0,-487,-1739],[2,1,0,-2,-399,0],
  [0,0,2,-2,-381,-4421],[1,1,1,0,351,0],[3,0,-2,0,-340,0],
  [4,0,-3,0,330,0],[2,-1,2,0,327,0],[0,2,1,0,-323,1165],
  [1,1,-1,0,299,0],[2,0,3,0,294,0],[2,0,-1,-2,0,8752]
];
const MOON_LAT = [
  [0,0,0,1,5128122],[0,0,1,1,280602],[0,0,1,-1,277693],[2,0,0,-1,173237],
  [2,0,-1,1,55413],[2,0,-1,-1,46271],[2,0,0,1,32573],[0,0,2,1,17198],
  [2,0,1,-1,9266],[0,0,2,-1,8822],[2,-1,0,-1,8216],[2,0,-2,-1,4324],
  [2,0,1,1,4200],[2,1,0,-1,-3359],[2,-1,-1,1,2463],[2,-1,0,1,2211],
  [2,-1,-1,-1,2065],[0,-1,-1,1,-1870],[4,0,-1,-1,1828],[0,1,0,1,-1794],
  [0,0,0,3,-1749],[0,-1,1,1,-1565],[1,0,0,1,-1491],[0,1,1,1,-1475],
  [0,1,1,-1,-1410],[0,1,0,-1,-1344],[1,0,0,-1,-1335],[0,0,3,1,1107],
  [4,0,0,-1,1021],[4,0,-1,1,833],[0,0,1,-3,777],[4,0,-2,1,671],
  [2,0,0,-3,607],[2,0,2,-1,596],[2,-1,1,-1,491],[2,0,-2,1,-451],
  [0,0,3,-1,439],[2,0,2,1,422],[2,0,-3,-1,421],[2,1,-1,1,-366],
  [2,1,0,1,-351],[4,0,0,1,331],[2,-1,1,1,315],[2,-2,0,-1,302],
  [0,0,1,3,-283],[2,1,1,-1,-229],[1,1,0,-1,223],[1,1,0,1,223],
  [0,1,-1,-1,-220],[2,1,-1,-1,-220],[1,0,1,1,-185],[2,-1,-2,-1,181],
  [0,1,2,1,-177],[4,0,-2,-1,176],[4,-1,-1,-1,166],[1,0,1,-1,-164],
  [4,0,1,-1,132],[1,0,-1,-1,-119],[4,-1,0,-1,115],[2,-2,0,1,107]
];
function moonPos(jd){
  const T=centuries(jd), T2=T*T, T3=T2*T, T4=T3*T;
  const Lp=norm(218.3164477+481267.88123421*T-0.0015786*T2+T3/538841-T4/65194000);
  const D =norm(297.8501921+445267.1114034*T-0.0018819*T2+T3/545868-T4/113065000);
  const M =norm(357.5291092+35999.0502909*T-0.0001536*T2+T3/24490000);
  const Mp=norm(134.9633964+477198.8675055*T+0.0087414*T2+T3/69699-T4/14712000);
  const F =norm(93.2720950+483202.0175233*T-0.0036539*T2-T3/3526000+T4/863310000);
  // the sun's varying eccentricity, which slowly changes the size of every term involving M
  const E=1-0.002516*T-0.0000074*T2;
  let sl=0,sr=0,sb=0;
  for(let i=0;i<MOON_LON.length;i++){
    const t=MOON_LON[i], a=t[0]*D+t[1]*M+t[2]*Mp+t[3]*F;
    const e=t[1]===0?1:(t[1]===1||t[1]===-1?E:E*E);
    sl+=t[4]*e*sin(a); sr+=t[5]*e*cos(a);
  }
  for(let i=0;i<MOON_LAT.length;i++){
    const t=MOON_LAT[i], a=t[0]*D+t[1]*M+t[2]*Mp+t[3]*F;
    const e=t[1]===0?1:(t[1]===1||t[1]===-1?E:E*E);
    sb+=t[4]*e*sin(a);
  }
  const lam=norm(Lp+sl/1e6), bet=sb/1e6, distKm=385000.56+sr/1000;
  const eps=23.439-0.0000004*(jd-2451545.0);
  const ra=norm(Math.atan2(sin(lam)*cos(eps)-tan(bet)*sin(eps),cos(lam))*R2D);
  const dec=Math.asin(sin(bet)*cos(eps)+cos(bet)*sin(eps)*sin(lam))*R2D;
  return {lam,bet,ra,dec,distKm};
}
function moonIllum(jd,s,m){
  s=s||sunPos(jd); m=m||moonPos(jd);
  const elong=Math.acos(clamp(cos(s.dec)*cos(m.dec)*cos(s.ra-m.ra)+sin(s.dec)*sin(m.dec),-1,1))*R2D;
  const SUN=149598000;
  const phase=Math.abs(Math.atan2(SUN*sin(elong),m.distKm-SUN*cos(elong))*R2D);
  return {elong,phase,frac:(1+cos(phase))/2};
}
function lstOf(jd,lon){
  const T=centuries(jd);
  return norm(280.46061837+360.98564736629*(jd-2451545.0)+0.000387933*T*T+lon);
}
function eq2horiz(ra,dec,lat,lst){
  const H=norm(lst-ra);
  const alt=Math.asin(clamp(sin(dec)*sin(lat)+cos(dec)*cos(lat)*cos(H),-1,1))*R2D;
  const az=norm(Math.atan2(-cos(dec)*sin(H),sin(dec)*cos(lat)-cos(dec)*sin(lat)*cos(H))*R2D);
  return {alt,az};
}
function angSep(a1,z1,a2,z2){
  return Math.acos(clamp(sin(a1)*sin(a2)+cos(a1)*cos(a2)*cos(z1-z2),-1,1))*R2D;
}
/* Kasten & Young 1989 airmass. The original Krisciunas & Schaefer approximation tops out
   near 5 airmasses, which leaves a setting moon far too bright and puts a cliff in the
   rate curve at moonset. This version keeps rising towards the horizon, so the moon fades. */
function airmass(alt){
  const h=Math.max(alt,-1);
  return 1/(sin(h)+0.50572*Math.pow(h+6.07995,-1.6364));
}
/* Krisciunas & Schaefer 1991, moonlight sky brightness in nanolamberts */
function moonSky(alpha,rho,moonAlt,targetAlt,k){
  k=k||0.20;
  if(moonAlt<=-0.8) return 0;
  const Istar=Math.pow(10,-0.4*(3.84+0.026*Math.abs(alpha)+4e-9*Math.pow(alpha,4)));
  const f=Math.pow(10,5.36)*(1.06+cos(rho)*cos(rho))+Math.pow(10,6.15-rho/40);
  return f*Istar*Math.pow(10,-0.4*k*airmass(moonAlt))*(1-Math.pow(10,-0.4*k*airmass(Math.max(targetAlt,5))));
}
const nl2mag=B=>(20.7233-Math.log(B/34.08))/0.92104;
const mag2nl=V=>34.08*Math.exp(20.7233-0.92104*V);

/* ============================ shower data ============================ */
/* lam: solar longitude (J2000) of maximum. bB/bA: activity slope before/after max,
   ZHR = zhr*10^(-b*|dlam|) (+ a broad "wide" component where the stream has long wings). */
const SHOWERS=[
 {code:'QUA',name:'Quadrantids',lam:283.15,zhr:106,r:2.1,ra:230,dec:49.5,dRa:0.4,dDec:-0.2,v:41,bB:1.0,bA:1.0,span:6,wide:{zhr:4,b:0.30},
  active:'28 Dec – 12 Jan',parent:'Asteroid 2003 EH1 (probably a dormant comet)',
  facts:'The sharpest peak of any major shower: full rates last only a few hours, so being clouded out at the wrong moment costs you the whole event. Meteors are medium speed and often bluish, with few persistent trains but a fair number of bright ones. The radiant sits in northern Boötes, in the old constellation Quadrans Muralis that was dropped from the official list in 1922, and is circumpolar from northern mid-latitudes, climbing highest before dawn.'},
 {code:'LYR',name:'Lyrids',lam:32.32,zhr:18,r:2.1,ra:271,dec:34,dRa:1.1,dDec:0.0,v:49,bB:1.0,bA:1.0,span:8,
  active:'14 – 30 April',parent:'Comet C/1861 G1 Thatcher (415-year orbit)',
  facts:'The oldest shower with a continuous record, noted by Chinese observers in 687 BC. Normally modest, but capable of short outbursts, most recently around 90 an hour in 1982. Meteors are fast, frequently bright, and around a quarter leave persistent trains. The radiant near Vega is high all night from northern latitudes, which makes even a moderate ZHR worthwhile.'},
 {code:'ETA',name:'Eta Aquariids',lam:45.5,zhr:50,r:2.4,ra:338,dec:-1,dRa:0.9,dDec:0.4,v:66,bB:0.10,bA:0.10,span:20,
  active:'19 April – 28 May',parent:'Comet 1P/Halley',
  facts:'Debris shed by Halley on its inbound leg. Very fast at 66 km/s, with a high proportion of long trails and persistent trains. The catch for northern observers is geometry: the radiant rises only shortly before dawn from northern latitudes, so you see a small fraction of the quoted rate in a short window. Superb from the tropics and the southern hemisphere.'},
 {code:'SDA',name:'Southern Delta Aquariids',lam:125.0,zhr:25,r:2.5,ra:340,dec:-16,dRa:0.8,dDec:0.2,v:41,bB:0.09,bA:0.15,span:22,
  active:'12 July – 23 August',parent:'Likely the 96P/Machholz complex',
  facts:'A broad plateau of activity rather than a peak, so any clear night in late July is roughly as good as the next. Meteors are medium speed and mostly faint, which makes dark skies matter more than usual. From northern latitudes the radiant stays low in the south, capping the rate you can actually achieve.'},
 {code:'CAP',name:'Alpha Capricornids',lam:127.0,zhr:5,r:2.5,ra:307,dec:-10,dRa:0.9,dDec:0.3,v:23,bB:0.06,bA:0.06,span:24,
  active:'3 July – 15 August',parent:'Comet 169P/NEAT',
  facts:'Low rates but a disproportionate share of slow, brilliant, long-lasting fireballs, which is why it is worth leaving a camera running through late July even though the predicted count is only a few an hour. The stream is young and unusually broad; models suggest it will strengthen over the next few centuries.'},
 {code:'PER',name:'Perseids',lam:140.0,zhr:80,r:2.2,ra:48,dec:58,dRa:1.35,dDec:0.25,v:59,bB:0.35,bA:0.25,span:20,wide:{zhr:23,b:0.05},
  active:'17 July – 24 August',parent:'Comet 109P/Swift-Tuttle (133-year orbit, 26 km nucleus)',
  facts:'The reliable summer shower, recorded for close to two thousand years and once called the tears of St Lawrence. Fast, bright meteors with plenty of persistent trains. The wide activity profile matters for planning: the week either side of maximum still delivers useful rates, so a clear night three days off peak beats a cloudy peak. The radiant is very high from northern latitudes and climbs all night, which pushes the best window into the small hours.'},
 {code:'KCG',name:'Kappa Cygnids',lam:140.5,zhr:3,r:3.0,ra:286,dec:59,dRa:0.6,dDec:0.2,v:25,bB:0.10,bA:0.10,span:12,
  active:'3 – 25 August',parent:'Uncertain, possibly asteroid 2008 ED69',
  facts:'A minor stream that shares the Perseid dates and is easily mistaken for it, except that the meteors are noticeably slow and the radiant sits in Cygnus, near the zenith. Activity varies from year to year, with enhanced returns roughly every seven years, and it produces occasional bright fireballs.'},
 {code:'AUR',name:'Alpha Aurigids',lam:158.6,zhr:6,r:2.5,ra:91,dec:39,dRa:1.1,dDec:0.0,v:66,bB:1.0,bA:1.0,span:5,
  active:'28 August – 5 September',parent:'Comet C/1911 N1 Kiess',
  facts:'Usually a footnote, but it has produced brief outbursts of 30 to 50 an hour in 1935, 1986, 1994 and 2019, each lasting under two hours. Fast meteors from a radiant that only gets useful after midnight.'},
 {code:'SPE',name:'September Epsilon Perseids',lam:166.7,zhr:5,r:2.9,ra:48,dec:40,dRa:1.0,dDec:0.1,v:64,bB:0.4,bA:0.4,span:8,
  active:'5 – 21 September',parent:'Unknown long-period comet',
  facts:'Only properly characterised once video meteor networks came along. Fast and mostly faint, with unexpected outbursts in 2008 and 2013 that suggest an old dust trail crossing Earth\u2019s path.'},
 {code:'DRA',name:'October Draconids',lam:195.4,zhr:5,r:2.6,ra:262,dec:54,dRa:0.0,dDec:0.0,v:20,bB:2.5,bA:2.5,span:3,
  active:'6 – 10 October',parent:'Comet 21P/Giacobini-Zinner',
  facts:'The odd one out in two ways. The meteors are exceptionally slow at 20 km/s, and the radiant is highest in the evening rather than before dawn, so this is a shower you watch straight after dusk. Rates are usually near zero, but it produced true storms in 1933 and 1946 and strong showings in 2011 and 2018, always tied to the comet\u2019s return.'},
 {code:'STA',name:'Southern Taurids',lam:197.0,zhr:5,r:2.3,ra:32,dec:9,dRa:0.8,dDec:0.2,v:27,bB:0.026,bA:0.026,span:35,
  active:'10 September – 20 November',parent:'Comet 2P/Encke',
  facts:'Part of Encke\u2019s enormous, ancient dust complex. Rates are low for weeks on end, but the meteors are slow, often orange, and include an unusually high share of fireballs. In certain years the Earth meets a swarm of larger fragments, as in 2005, 2015 and 2022, and the fireball count jumps.'},
 {code:'ORI',name:'Orionids',lam:208.0,zhr:20,r:2.5,ra:95,dec:16,dRa:1.2,dDec:0.1,v:66,bB:0.12,bA:0.12,span:18,
  active:'2 October – 7 November',parent:'Comet 1P/Halley',
  facts:'Halley\u2019s other shower, this time from the outbound leg. Very fast, with frequent persistent trains, and a broad flat maximum spread over several nights instead of one sharp peak, which is forgiving for anyone chasing a gap in the cloud. The radiant lies near Betelgeuse and is well placed from midnight onwards.'},
 {code:'NTA',name:'Northern Taurids',lam:230.0,zhr:5,r:2.3,ra:58,dec:22,dRa:0.8,dDec:0.2,v:29,bB:0.026,bA:0.026,span:35,
  active:'20 October – 10 December',parent:'Comet 2P/Encke',
  facts:'The northern branch of the same complex, peaking a month after its southern twin and with the radiant higher from northern latitudes. Same character: low counts, slow meteors, an outsized proportion of fireballs.'},
 {code:'LEO',name:'Leonids',lam:235.27,zhr:12,r:2.5,ra:152,dec:22,dRa:0.7,dDec:-0.4,v:71,bB:0.55,bA:0.55,span:12,wide:{zhr:3,b:0.10},
  active:'6 – 30 November',parent:'Comet 55P/Tempel-Tuttle (33-year orbit)',
  facts:'The fastest meteors you will routinely see, entering at 71 km/s and often leaving trains that hang for seconds. Famous for the storms of 1833, 1866, 1966 and 1999 to 2002, when rates reached thousands an hour; between comet returns it is a modest shower. The radiant rises around midnight.'},
 {code:'HYD',name:'Sigma Hydrids',lam:256.0,zhr:7,r:3.0,ra:127,dec:2,dRa:0.9,dDec:-0.2,v:58,bB:0.4,bA:0.4,span:10,
  active:'3 – 20 December',parent:'Unknown long-period comet',
  facts:'Long dismissed as a shower at the edge of visual detection, but video data pushed the estimate up and it repeatedly turns in bright meteors. It runs alongside the Geminid build-up, so keep an eye on the direction a meteor came from before logging it.'},
 {code:'MON',name:'December Monocerotids',lam:260.9,zhr:3,r:3.0,ra:100,dec:8,dRa:1.0,dDec:-0.1,v:42,bB:0.5,bA:0.5,span:10,
  active:'27 November – 17 December',parent:'Comet C/1917 F1 Mellish',
  facts:'A weak stream that shares the sky with the Geminids and is frequently confused with them. Medium speed, low rates, but the radiant is well placed and the meteors are distinctly slower than Geminids.'},
 {code:'GEM',name:'Geminids',lam:262.2,zhr:135,r:2.6,ra:112,dec:33,dRa:1.02,dDec:-0.15,v:35,bB:0.59,bA:0.81,span:9,wide:{zhr:18,b:0.14},
  active:'4 – 20 December',parent:'Asteroid 3200 Phaethon, a rock comet',
  facts:'The strongest and most dependable annual shower, and unusual in coming from an asteroid rather than a comet. Only recognised in the 1860s and it has strengthened ever since as the stream drifts into Earth\u2019s path. Meteors are medium speed, plentiful, often bright with a yellow cast, and leave few trains. The radiant is up from early evening and near the zenith by 02:00 from northern latitudes, so you can shoot a full night. The counterweight is December weather and cold.'},
 {code:'URS',name:'Ursids',lam:270.7,zhr:10,r:3.0,ra:217,dec:76,dRa:0.0,dDec:-0.2,v:33,bB:1.0,bA:1.0,span:5,
  active:'17 – 26 December',parent:'Comet 8P/Tuttle',
  facts:'Overlooked because it falls in the week before Christmas, immediately after the Geminids. The radiant near Kochab is circumpolar from northern latitudes, so it is available all night, and short bursts have been recorded in 1945, 1986 and 2000.'},
];
const ANT={code:'ANT',name:'Antihelion source',r:3.0,v:30,
  active:'Most of the year',parent:'Mixed short-period comet debris',
  facts:'Not a shower so much as a diffuse patch of activity roughly opposite the Sun, drifting steadily along the ecliptic through the year and delivering two or three meteors an hour. Useful to know about because it explains meteors that seem to belong to no shower but clearly are not random.'};
const SPO={code:'SPO',name:'Sporadic background',r:3.0,v:35,
  active:'Every night',parent:'No single parent body',
  facts:'Meteors not tied to any recognised stream. Rates roughly double between early evening and dawn, because after midnight your side of the planet turns to face the direction Earth is travelling and sweeps up particles head-on rather than waiting to be caught. On a night with no shower running, this is what you are shooting.'};

const BORTLE=[null,
 {sqm:22.0,nelm:7.7,label:'1 – Pristine'},
 {sqm:21.9,nelm:7.3,label:'2 – Truly dark'},
 {sqm:21.7,nelm:6.9,label:'3 – Rural'},
 {sqm:21.3,nelm:6.4,label:'4 – Rural / suburban transition'},
 {sqm:20.4,nelm:6.0,label:'5 – Suburban'},
 {sqm:19.3,nelm:5.5,label:'6 – Bright suburban'},
 {sqm:18.7,nelm:5.0,label:'7 – Suburban / urban transition'},
 {sqm:18.2,nelm:4.5,label:'8 – City'},
 {sqm:17.8,nelm:4.0,label:'9 – Inner city'}];


/* ============================ light pollution atlas ============================ */
/* Two grids baked from David Lorenz's 2025 light pollution atlas, itself modelled from
   NASA/NOAA VIIRS night lights. Pixel values are (22.0 - sky brightness) x 20, so byte 0
   is a pristine 22.0 mag/arcsec2. A higher-resolution grid covers north-west Europe at the atlas's own 1.5 arcmin;
   the world grid averages artificial brightness over 0.2 degree cells. */
const ATLAS={
  uk:{lat0:48.5,lat1:61.5,lon0:-11.5,lon1:3.0,w:580,h:520,label:'1.5 arcmin grid',data:null,
      px:'data:image/png;base64,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'},
  world:{lat0:-65,lat1:75,lon0:-180,lon1:180,w:1800,h:700,label:'0.2 degree average',data:null,
      px:'data:image/png;base64,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'}
};
function loadAtlas(){
  return Promise.all(Object.keys(ATLAS).map(k=>new Promise(done=>{
    const L=ATLAS[k];
    if(L.data||L.tried) return done();
    L.tried=true;
    const img=new Image();
    img.onload=()=>{
      try{
        const cv=document.createElement('canvas');
        if(!cv.getContext) return done();
        cv.width=L.w;cv.height=L.h;
        const cx=cv.getContext('2d',{willReadFrequently:true});
        cx.drawImage(img,0,0);
        const px=cx.getImageData(0,0,L.w,L.h).data, out=new Uint8Array(L.w*L.h);
        for(let i=0;i<out.length;i++) out[i]=px[i*4];
        L.data=out;
      }catch(e){L.data=null;}
      done();
    };
    img.onerror=()=>done();
    img.src=L.px;
  })));
}
function atlasSky(lat,lon){
  for(const k of ['uk','world']){
    const L=ATLAS[k];
    if(!L.data) continue;
    if(lat<L.lat0||lat>L.lat1||lon<L.lon0||lon>L.lon1) continue;
    const x=Math.floor((lon-L.lon0)/(L.lon1-L.lon0)*L.w);
    const y=Math.floor((L.lat1-lat)/(L.lat1-L.lat0)*L.h);
    if(x<0||y<0||x>=L.w||y>=L.h) continue;
    return {sqm:22.0-L.data[y*L.w+x]/20,source:k,label:L.label};
  }
  return null;
}
/* naked-eye limiting magnitude interpolated from sky brightness rather than snapped
   to one of nine Bortle steps, so a 21.4 site is not treated the same as a 20.5 one */
const SKY_NELM=[[22.0,7.7],[21.9,7.3],[21.7,6.9],[21.3,6.4],[20.4,6.0],[19.3,5.5],[18.7,5.0],[18.2,4.5],[17.8,4.0]];
function nelmFor(sqm){
  if(sqm>=22.0) return 7.7;
  if(sqm<=17.8) return Math.max(3.2,4.0-(17.8-sqm));
  for(let i=1;i<SKY_NELM.length;i++){
    const a=SKY_NELM[i-1],b=SKY_NELM[i];
    if(sqm<=a[0]&&sqm>=b[0]) return b[1]+(a[1]-b[1])*(sqm-b[0])/(a[0]-b[0]);
  }
  return 6.0;
}
function bortleFor(sqm){
  const t=[[21.95,1],[21.85,2],[21.6,3],[20.9,4],[19.9,5],[19.2,6],[18.6,7],[18.0,8]];
  for(const r of t) if(sqm>=r[0]) return r[1];
  return 9;
}
function updateSky(){
  if(state.skyMode==='auto'){
    const a=atlasSky(state.lat,state.lon);
    if(a){state.sky={sqm:a.sqm,nelm:nelmFor(a.sqm),bortle:bortleFor(a.sqm),auto:true,label:a.label};return;}
    const d=BORTLE[4];   // atlas not loaded yet, or outside its coverage: hold a sane default
    state.sky={sqm:d.sqm,nelm:d.nelm,bortle:4,auto:true,label:'atlas not available here'};
    return;
  }
  const b=BORTLE[state.skyMode];
  state.sky={sqm:b.sqm,nelm:b.nelm,bortle:state.skyMode,auto:false,label:'set by hand'};
}

/* ============================ engine ============================ */
function dlam(a,b){let d=a-b;while(d>180)d-=360;while(d<-180)d+=360;return d;}
function zhrAt(sh,lam){
  const d=dlam(lam,sh.lam);
  if(Math.abs(d)>sh.span) return 0;
  let z=sh.zhr*Math.pow(10,-(d<0?sh.bB:sh.bA)*Math.abs(d));
  if(sh.wide) z+=sh.wide.zhr*Math.pow(10,-sh.wide.b*Math.abs(d));
  return z;
}
function radiantAt(sh,lam){
  const d=dlam(lam,sh.lam);
  return {ra:norm(sh.ra+sh.dRa*d),dec:sh.dec+sh.dDec*d};
}
function antihelionRadiant(sunLam){
  const lam=norm(sunLam+195),eps=23.44;
  return {ra:norm(Math.atan2(sin(lam)*cos(eps),cos(lam))*R2D),dec:Math.asin(sin(eps)*sin(lam))*R2D};
}
function sporadicZhr(h){h=((h%24)+24)%24;return 6.5+3.5*cos((h-6)/24*360);}

function sampleSky(jd,lat,lon,sky,cloud){
  const st=lstOf(jd,lon), s=sunPos(jd), m=moonPos(jd);
  const sh=eq2horiz(s.ra,s.dec,lat,st), mh=eq2horiz(m.ra,m.dec,lat,st);
  const il=moonIllum(jd,s,m);
  return {jd,st,sun:s,sunAlt:sh.alt,moonAlt:mh.alt,moonAz:mh.az,illum:il.frac,phase:il.phase,b:sky,cloud};
}
/* Thin cloud and haze do not simply block the sky: they scatter town glow and moonlight
   back down at you, so the same 40% high cloud is harmless at a pristine site and ruinous
   under a city. veil is the see-through fraction of cloud, hum the aerosol haze from humidity. */
const NATURAL_SKY=22.0;   // natural airglow floor, mag/arcsec2
function airFactors(c){
  if(!c) return {veil:0,hum:0};
  const veil = (c.low==null)
    ? clamp(0.40*(c.total||0)/100,0,1)
    : clamp((0.75*(c.high||0)+0.50*(c.mid||0)+0.25*(c.low||0))/100,0,1);
  const hum = (c.rh==null) ? 0 : clamp((c.rh-65)/35,0,1);
  return {veil,hum};
}
function limitingMag(s,viewAlt,viewAz){
  const {veil,hum}=airFactors(s.cloud);
  // artificial component of the sky glow, amplified by whatever is up there to scatter it
  const artificial=Math.max(0,mag2nl(s.b.sqm)-mag2nl(NATURAL_SKY));
  const amp=1+3.5*veil+1.0*hum;
  let skyMag=nl2mag(mag2nl(NATURAL_SKY)+artificial*amp);
  const glowLoss=s.b.sqm-skyMag;               // magnitudes lost to scattered ground light
  let twLoss=0;
  if(s.sunAlt>-18){twLoss=5.0*Math.pow(Math.min(1,(s.sunAlt+18)/18),2);skyMag-=twLoss;}
  let moonLoss=0;
  if(s.moonAlt>-0.8){
    const rho=angSep(viewAlt,viewAz,s.moonAlt,s.moonAz);
    const B=moonSky(s.phase,rho,s.moonAlt,viewAlt)*(1+2.5*veil+0.8*hum);
    const before=skyMag; skyMag=nl2mag(mag2nl(skyMag)+B); moonLoss=before-skyMag;
  }
  const humLoss=0.6*hum;                       // straight loss of transparency from haze
  const nelm=Math.max(0.5,s.b.nelm-(s.b.sqm-skyMag)-humLoss);
  return {nelm,sky:skyMag,moonLoss,twLoss,glowLoss,humLoss,veil,hum};
}
/* Watchers look about 40 degrees away from the radiant, towards the zenith. Past the zenith
   that direction continues down the far side, which keeps the assumed sightline continuous
   as the radiant climbs (an abrupt switch here put a false notch in the curve). */
function viewDirection(radAlt,radAz){
  const a=Math.max(radAlt,0)+40;
  return a<=90 ? {alt:a,az:radAz} : {alt:180-a,az:norm(radAz+180)};
}
function clearFraction(c){
  if(!c) return null;
  if(c.low==null) return clamp(1-(c.total||0)/100,0,1);
  return clamp((1-c.low/100)*(1-0.9*c.mid/100)*(1-0.55*c.high/100),0,1);
}
function rateFor(sh,s,lat,lon){
  const lam=s.sun.lam2000;
  let zhr,pop,rad,zmax;
  if(sh.code==='ANT'){
    if(lam>115&&lam<165) return null;   // swamped by the July/August southern showers
    zhr=3;zmax=3;pop=3.0;rad=antihelionRadiant(s.sun.lam);
  }else if(sh.code==='SPO'){
    const localSolar=((s.jd+0.5)%1)*24+lon/15;
    zhr=sporadicZhr(localSolar);zmax=10;pop=3.0;rad=null;
  }else{
    zhr=zhrAt(sh,lam);zmax=zhrAt(sh,sh.lam);pop=sh.r;rad=radiantAt(sh,lam);
  }
  if(zhr<=0) return null;
  let radAlt,radAz,view;
  if(rad){const h=eq2horiz(rad.ra,rad.dec,lat,s.st);radAlt=h.alt;radAz=h.az;view=viewDirection(radAlt,radAz);}
  else {radAlt=90;radAz=180;view={alt:60,az:180};}
  const lm=limitingMag(s,view.alt,view.az);
  // near the horizon meteors are cut off by extinction and terrain, so taper rather than snap
  const altFactor=sh.code==='SPO'?1:(radAlt<=0?0:sin(radAlt)*clamp(radAlt/8,0,1));
  const skyFactor=Math.pow(pop,lm.nelm-6.5);
  const moonFactor=Math.pow(pop,-lm.moonLoss);
  const twFactor=Math.pow(pop,-lm.twLoss);
  const transFactor=Math.pow(pop,-(lm.glowLoss+lm.humLoss));
  const cf=clearFraction(s.cloud), clear=cf==null?1:cf;
  return {code:sh.code,name:sh.name,sh,zhr,zmax,radAlt,radAz,nelm:lm.nelm,sky:lm.sky,
          moonLoss:lm.moonLoss,twLoss:lm.twLoss,glowLoss:lm.glowLoss,humLoss:lm.humLoss,
          veil:lm.veil,hum:lm.hum,altFactor,skyFactor,moonFactor,twFactor,transFactor,
          darkFactor:Math.pow(pop,(s.b.nelm-6.5)),clear,cf,assumed:!!(s.cloud&&s.cloud.assumed),
          typical:!!(s.cloud&&s.cloud.typical),
          activityFrac:zmax>0?zhr/zmax:1,
          rate:zhr*altFactor*skyFactor*clear*PERCEPTION};
}
const LO=Math.log10(4), HI=Math.log10(91);
const alphaOf=r=>clamp((Math.log10(1+r)-LO)/(HI-LO),0,1);
const scoreOf=r=>100*alphaOf(r);
/* ZHR assumes a perfect observer watching the whole sky. Real people, even experienced ones,
   catch roughly three quarters of that, so every rate is scaled by this perception factor. */
const PERCEPTION=0.75;

/* ============================ state ============================ */
const state={
  lat:52.958,lon:0.573,place:'Thornham, Norfolk',skyMode:'auto',sky:null,
  tzOffset:-new Date().getTimezoneOffset(), // minutes east of UTC
  start:null, selected:null, weather:null, weatherStatus:'pending',
  assumedCloud:'typical', focal:'24', range:60, clim:null, climStatus:'idle', nights:[], past:[],
  wind:null, windStatus:'idle', ovationGrid:null, ovationAt:0, ovationStatus:'idle',
  northCloud:null, northCloudStatus:'idle', alerts:[], alertStatus:'idle', outlook27:[], outlookStatus:'idle'
};
const STEP=15; // minutes per sample

const pad=n=>String(n).padStart(2,'0');
function localParts(dateUTC){
  const t=new Date(dateUTC.getTime()+state.tzOffset*60000);
  return {y:t.getUTCFullYear(),m:t.getUTCMonth(),d:t.getUTCDate(),h:t.getUTCHours(),mi:t.getUTCMinutes()};
}
function fmtTime(dateUTC){const p=localParts(dateUTC);return pad(p.h)+':'+pad(p.mi);}
function toUTC(y,m,d,h,mi){return new Date(Date.UTC(y,m,d,h,mi||0)-state.tzOffset*60000);}
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(y,m,d){return d+' '+MONTHS[m];}
const COMPASS=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
const compass=az=>COMPASS[Math.round(norm(az)/22.5)%16];

/* ============================ weather ============================ */
async function loadWeather(){
  state.weatherStatus='pending'; renderChips();
  const url='https://api.open-meteo.com/v1/forecast?latitude='+state.lat.toFixed(4)+
    '&longitude='+state.lon.toFixed(4)+
    '&hourly=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,relative_humidity_2m,temperature_2m,dew_point_2m,wind_speed_10m,wind_gusts_10m,visibility'+
    '&past_days=' + HISTORY_NIGHTS + '&forecast_days=16&timezone=auto';
  try{
    const res=await fetch(url);
    if(!res.ok) throw new Error('HTTP '+res.status);
    const j=await res.json();
    const off=j.utc_offset_seconds/60;
    state.tzOffset=off;
    const map={};
    j.hourly.time.forEach((t,i)=>{
      const utc=new Date(new Date(t+':00Z').getTime()-off*60000);
      map[utc.toISOString().slice(0,13)]={
        total:j.hourly.cloud_cover[i],low:j.hourly.cloud_cover_low[i],
        mid:j.hourly.cloud_cover_mid[i],high:j.hourly.cloud_cover_high[i],
        rh:j.hourly.relative_humidity_2m[i],
        temp:j.hourly.temperature_2m[i],dew:j.hourly.dew_point_2m[i],
        wind:j.hourly.wind_speed_10m?j.hourly.wind_speed_10m[i]:null,
        gust:j.hourly.wind_gusts_10m?j.hourly.wind_gusts_10m[i]:null,
        vis:j.hourly.visibility?j.hourly.visibility[i]:null};
    });
    state.weather=map; state.weatherStatus='live';
  }catch(e){
    state.weather=null; state.weatherStatus='unavailable';
  }
}
/* Beyond the forecast horizon, fall back to what this location actually does at this time of
   year: mean night-time cloud for the same calendar dates over the last three years, from the
   Open-Meteo ERA5 archive. Labelled as typical, never as a forecast. */
async function loadClimatology(){
  state.climStatus='loading';
  const base=new Date(Date.UTC(state.start.y,state.start.m,state.start.d));
  const sums={},counts={};
  let got=0;
  for(let back=1;back<=3;back++){
    const a=new Date(base.getTime()); a.setUTCFullYear(a.getUTCFullYear()-back);
    const b=new Date(a.getTime()+(state.range+2)*86400000);
    const iso=d=>d.toISOString().slice(0,10);
    const url='https://archive-api.open-meteo.com/v1/archive?latitude='+state.lat.toFixed(3)+
      '&longitude='+state.lon.toFixed(3)+'&start_date='+iso(a)+'&end_date='+iso(b)+
      '&hourly=cloud_cover&timezone=UTC';
    try{
      const r=await fetch(url); if(!r.ok) continue;
      const j=await r.json();
      if(!j.hourly||!j.hourly.time) continue;
      j.hourly.time.forEach((t,i)=>{
        const v=j.hourly.cloud_cover[i];
        if(v==null) return;
        // spread each reading over a week-wide window: three years of single dates is far too
        // noisy to present as typical, and cloud climate varies over weeks, not days
        const ms=new Date(t+':00Z').getTime();
        for(let off=-3;off<=3;off++){
          const k=new Date(ms+off*86400000).toISOString().slice(5,13);
          sums[k]=(sums[k]||0)+v; counts[k]=(counts[k]||0)+1;
        }
      });
      got++;
    }catch(e){ /* archive unavailable, keep the manual assumption */ }
  }
  if(!got){state.clim=null;state.climStatus='unavailable';return false;}
  const out={};
  Object.keys(sums).forEach(k=>out[k]=sums[k]/counts[k]);
  state.clim=out; state.climStatus='ready'; state.climYears=got;
  return true;
}
function climAt(dateUTC){
  if(!state.clim) return null;
  const v=state.clim[dateUTC.toISOString().slice(5,13)];
  return v==null?null:v;
}
function cloudAt(dateUTC){
  if(!state.weather) return null;
  const ms=dateUTC.getTime(), h0=Math.floor(ms/3600000)*3600000;
  const a=state.weather[new Date(h0).toISOString().slice(0,13)];
  if(!a) return null;
  const b=state.weather[new Date(h0+3600000).toISOString().slice(0,13)];
  if(!b) return a;
  const raw=(ms-h0)/3600000;
  // smoothstep between hourly samples: linear interpolation meets at a corner, and every corner
  // becomes a visible kink once the rate raises it to a power
  const f=raw*raw*(3-2*raw), mix=(x,y)=>(x==null||y==null)?x:x+(y-x)*f;
  const low=mix(a.low,b.low), mid=mix(a.mid,b.mid), high=mix(a.high,b.high);
  // each layer interpolates on its own, which can leave total below a layer it contains
  let total=mix(a.total,b.total);
  [low,mid,high].forEach(v=>{ if(v!=null && (total==null || v>total)) total=v; });
  return {total,low,mid,high,rh:mix(a.rh,b.rh),temp:mix(a.temp,b.temp),dew:mix(a.dew,b.dew),
          wind:mix(a.wind,b.wind),gust:mix(a.gust,b.gust),vis:mix(a.vis,b.vis)};
}

/* ============================ night computation ============================ */
function computeNight(y,m,d){
  const startL=toUTC(y,m,d,16,0), endL=toUTC(y,m,d+1,8,0);
  const slots=[];
  let peak=null,total=0,darkMin=0,moonMin=0,cloudSum=0,cloudN=0,forecast=false;
  let rhSum=0,rhN=0,dewGap=null,dewAt=null,typical=false;
  const byShower={};
  for(let t=startL.getTime();t<=endL.getTime();t+=STEP*60000){
    const dt=new Date(t), jd=jdFrom(dt);
    let cl=cloudAt(dt);
    if(cl) forecast=true;
    else if(state.assumedCloud==='typical'){
      const c=climAt(dt);
      if(c!=null){cl={total:c,assumed:true,typical:true};typical=true;}
    }
    const fallback=(state.assumedCloud==='typical')?0:state.assumedCloud;
    const s=sampleSky(jd,state.lat,state.lon,state.sky,cl||{total:fallback,assumed:true});
    const slot={t:dt,sunAlt:s.sunAlt,moonAlt:s.moonAlt,illum:s.illum,cloud:cl,rate:0,best:null,sources:[],env:s};
    if(s.sunAlt<-6){
      const cands=SHOWERS.concat([ANT,SPO]);
      for(const sh of cands){
        const r=rateFor(sh,s,state.lat,state.lon);
        if(!r||r.rate<0.02) continue;
        slot.sources.push(r);
        slot.rate+=r.rate;
        if(sh.code!=='SPO'&&sh.code!=='ANT'&&(!slot.best||r.rate>slot.best.rate)) slot.best=r;
        const acc=byShower[sh.code]||(byShower[sh.code]={code:sh.code,name:sh.name,sh,peak:0,at:null,total:0,det:null});
        acc.total+=r.rate*STEP/60;
        if(r.rate>acc.peak){acc.peak=r.rate;acc.at=dt;acc.det=r;}
      }
      if(s.sunAlt<-15) darkMin+=STEP;
      if(s.moonAlt>0) moonMin+=STEP;
      if(cl){
        cloudSum+=cl.total;cloudN++;
        if(cl.rh!=null){rhSum+=cl.rh;rhN++;}
        if(cl.temp!=null&&cl.dew!=null){
          const gap=cl.temp-cl.dew;
          if(dewGap==null||gap<dewGap){dewGap=gap;dewAt=dt;}
        }
      }
      total+=slot.rate*STEP/60;
      if(!peak||slot.rate>peak.rate) peak={rate:slot.rate,t:dt,slot};
    }
    slots.push(slot);
  }
  // contiguous window around the peak where the rate holds at 70% of its best
  let win=null;
  if(peak){
    const dark=slots.filter(x=>x.sunAlt<-6);
    const pi=dark.indexOf(peak.slot);
    if(pi>=0){
      const thr=peak.rate*0.7;
      let a=pi,b=pi;
      while(a>0&&dark[a-1].rate>=thr) a--;
      while(b<dark.length-1&&dark[b+1].rate>=thr) b++;
      win={from:dark[a].t,to:dark[b].t};
    }
  }
  // moon above the horizon during darkness
  let moonWin=null;
  slots.filter(x=>x.sunAlt<-6&&x.moonAlt>0).forEach(x=>{
    if(!moonWin) moonWin={from:x.t,to:x.t,maxIllum:x.illum};
    else {moonWin.to=x.t;moonWin.maxIllum=Math.max(moonWin.maxIllum,x.illum);}
  });
  const list=Object.values(byShower).sort((a,b)=>b.peak-a.peak);
  const headline=list.find(x=>x.code!=='SPO'&&x.code!=='ANT')||list[0]||null;
  return {y,m,d,slots,peak,total,darkMin,moonMin,forecast,typical,win,moonWin,
          rh:rhN?rhSum/rhN:null,dewGap,dewAt,
          cloud:cloudN?cloudSum/cloudN:null,showers:list,headline,
          score:peak?scoreOf(peak.rate):0};
}
/* Recent history. Open-Meteo returns the same hourly fields for past days, so these nights are
   computed exactly like the forecast ones: the difference is only that they already happened. */
const HISTORY_NIGHTS=5;
function computeAll(){
  const s=state.start;
  state.nights=[];
  state.past=[];
  for(let i=HISTORY_NIGHTS;i>=1;i--){
    const b=new Date(Date.UTC(s.y,s.m,s.d-i));
    state.past.push(computeNight(b.getUTCFullYear(),b.getUTCMonth(),b.getUTCDate()));
  }
  for(let i=0;i<state.range;i++){
    const base=new Date(Date.UTC(s.y,s.m,s.d+i));
    state.nights.push(computeNight(base.getUTCFullYear(),base.getUTCMonth(),base.getUTCDate()));
  }
  if(!state.selected||state.selected>=state.range) state.selected=0;
}


/* Catmull-Rom through the sample points, emitted as cubic beziers. The samples are exact;
   only the line between them is smoothed, so peak values still read true off the curve. */
function smoothPath(pts){
  if(!pts.length) return '';
  if(pts.length<3) return 'M'+pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' L');
  let d='M'+pts[0][0].toFixed(1)+','+pts[0][1].toFixed(1);
  for(let i=0;i<pts.length-1;i++){
    const p0=pts[i-1]||pts[i], p1=pts[i], p2=pts[i+1], p3=pts[i+2]||pts[i+1];
    const c1x=p1[0]+(p2[0]-p0[0])/6, c1y=p1[1]+(p2[1]-p0[1])/6;
    const c2x=p2[0]-(p3[0]-p1[0])/6, c2y=p2[1]-(p3[1]-p1[1])/6;
    d+=' C'+c1x.toFixed(1)+','+c1y.toFixed(1)+' '+c2x.toFixed(1)+','+c2y.toFixed(1)+
       ' '+p2[0].toFixed(1)+','+p2[1].toFixed(1);
  }
  return d;
}
function nightChart(n){
  /* Sized to fit a phone screen whole: the point is an overview of one night, so the design
     width is small and the type is large relative to it, rather than a wide chart you scroll. */
  const W=400,H=300,L=34,R=34,T=44,B=54;
  const dark=n.slots.filter(s=>s.sunAlt<-3);
  if(!dark.length) return '<div class="loading">The Sun never gets low enough for meteor watching on this night at this latitude.</div>';
  const t0=dark[0].t.getTime(), t1=dark[dark.length-1].t.getTime();
  const PH=H-T-B;
  const X=t=>L+(t-t0)/(t1-t0)*(W-L-R);
  const maxRate=Math.max(6,...dark.map(s=>s.rate));
  const Y=r=>T+PH*(1-r/maxRate);
  const YA=a=>T+PH*(1-clamp(a,0,90)/90);
  const F='JetBrains Mono,monospace';
  const txt=(x,y,t,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'" font-family="'+F+'" font-size="'+(o.s||13)+
    '" fill="'+(o.f||'#A9A8C4')+'"'+(o.a?' text-anchor="'+o.a+'"':'')+(o.ls?' letter-spacing="'+o.ls+'"':'')+
    (o.tr?' transform="'+o.tr+'"':'')+'>'+t+'</text>';};
  let g='<svg width="100%" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Hour by hour conditions for the selected night">';

  // ---- background: twilight, then the best window ----
  dark.forEach((s,i)=>{
    if(i===dark.length-1) return;
    const x=X(s.t.getTime()), w=X(dark[i+1].t.getTime())-x+0.5;
    const fill = s.sunAlt>-12 ? '#2B2560' : s.sunAlt>-18 ? '#1B1546' : '#0F0B33';
    g+='<rect x="'+x+'" y="'+T+'" width="'+w+'" height="'+PH+'" fill="'+fill+'"/>';
  });
  if(n.win){
    const xa=X(n.win.from.getTime()), xb=X(n.win.to.getTime());
    if(xb>xa){
      g+='<rect x="'+xa+'" y="'+T+'" width="'+(xb-xa)+'" height="'+PH+'" fill="#FAA338" opacity="0.09"/>';
      const by=H-B+30;
      g+='<line x1="'+xa+'" y1="'+by+'" x2="'+xb+'" y2="'+by+'" stroke="#FAA338" stroke-width="1.2"/>';
      g+='<line x1="'+xa+'" y1="'+(by-5)+'" x2="'+xa+'" y2="'+(by+5)+'" stroke="#FAA338" stroke-width="1.2"/>';
      g+='<line x1="'+xb+'" y1="'+(by-5)+'" x2="'+xb+'" y2="'+(by+5)+'" stroke="#FAA338" stroke-width="1.2"/>';
      g+=txt(clamp((xa+xb)/2,L+56,W-R-56),by+16,'best '+fmtTime(n.win.from)+'\u2013'+fmtTime(n.win.to),
             {s:12.5,f:'#FAA338',a:'middle'});
    }
  }

  // ---- cloud lane, always drawn so an empty lane still reads as "no cloud" ----
  const CY=4,CH=16;
  g+='<rect x="'+L+'" y="'+CY+'" width="'+(W-L-R)+'" height="'+CH+'" fill="#1C1546"/>';
  const withCloud=dark.filter(s=>s.cloud&&(!s.cloud.assumed||s.cloud.typical));
  const climOnly=withCloud.length>1&&withCloud[0].cloud.typical;
  if(withCloud.length>1){
    const cpts=withCloud.map(s=>[X(s.t.getTime()),CY+CH-CH*clamp(s.cloud.total/100,0,1)]);
    let cp='M'+X(withCloud[0].t.getTime()).toFixed(1)+','+(CY+CH)+' L'+smoothPath(cpts).slice(1)+
      ' L'+X(withCloud[withCloud.length-1].t.getTime()).toFixed(1)+','+(CY+CH)+' Z';
    g+='<path d="'+cp+'" fill="#E6E3F4" opacity="'+(climOnly?0.4:0.72)+'"/>';
    g+='<line x1="'+L+'" y1="'+(CY+CH/2)+'" x2="'+(W-R)+'" y2="'+(CY+CH/2)+'" stroke="rgba(245,245,245,.20)" stroke-width="0.6" stroke-dasharray="3 4"/>';
    g+=txt(W-R+4,CY+6.5,'100',{s:9,f:'#A9A8C4'});
    g+=txt(W-R+4,CY+CH+2,'0',{s:9,f:'#A9A8C4'});
    if(climOnly) g+=txt(L+4,CY+CH-4,'typical, not a forecast',{s:9.5,f:'#8583A8'});
  } else {
    g+=txt(L+4,CY+12,'no cloud forecast',{s:10.5,f:'#8583A8'});
  }
  g+='<rect x="'+L+'" y="'+CY+'" width="'+(W-L-R)+'" height="'+CH+'" fill="none" stroke="rgba(245,245,245,.14)"/>';
  g+=txt(L-3,CY+12,'CLOUD',{s:9,a:'end',f:'#A9A8C4',ls:'0.06em'});

  // ---- meteors per hour ----
  const rpts=dark.map(s=>[X(s.t.getTime()),Y(s.rate)]);
  const rline=smoothPath(rpts);
  const path=rline+' L'+X(t1).toFixed(1)+','+Y(0).toFixed(1)+' L'+X(t0).toFixed(1)+','+Y(0).toFixed(1)+' Z';
  g+='<path d="'+path+'" fill="#FAA338" opacity="0.26"/>';
  g+='<path d="'+rline+'" fill="none" stroke="#FAA338" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';

  // ---- moon altitude, only while it is up ----
  let mseg=[],mruns=[],mlast=null;
  dark.forEach(s=>{
    if(s.moonAlt>0){ const x=X(s.t.getTime()),y=YA(s.moonAlt); mseg.push([x,y]); mlast={x,y}; }
    else if(mseg.length){ mruns.push(mseg); mseg=[]; }
  });
  if(mseg.length) mruns.push(mseg);
  const mp=mruns.map(smoothPath).join(' ');
  if(mp){
    g+='<path d="'+mp+'" fill="none" stroke="#9FB6D8" stroke-width="1.8" opacity="0.95"/>';
    const near=mlast.x>W-R-46;
    g+=txt(mlast.x+(near?-5:5),Math.max(mlast.y-6,T+13),'Moon',{s:12,f:'#9FB6D8',a:near?'end':'start'});
  } else {
    g+=txt(L+5,H-B-8,'Moon down all night',{s:12,f:'#9FB6D8'});
  }

  // ---- radiant altitude of the headline shower ----
  if(n.headline){
    const rad=[];let rlast=null;
    dark.forEach(s=>{
      const src=s.sources.find(x=>x.code===n.headline.code);
      if(!src) return;
      const x=X(s.t.getTime()),y=YA(src.radAlt);
      rad.push([x,y]);rlast={x,y};
    });
    const rp=smoothPath(rad), started=rad.length>1;
    if(started){
      /* The radiant is read against the right-hand ALT axis, not the rate axis, so it takes the
         axis's own white rather than amber: dashed for a radiant, solid for the moon. */
      g+='<path d="'+rp+'" fill="none" stroke="#E6E3F4" stroke-width="1.4" stroke-dasharray="5 4" opacity="0.85"/>';
      const near=rlast.x>W-R-46;
      g+=txt(rlast.x+(near?-5:5),clamp(rlast.y-6,T+13,H-B-4),n.headline.code,{s:12,f:'#E6E3F4',a:near?'end':'start'});
    }
  }

  // ---- frame and scales ----
  g+='<line x1="'+L+'" y1="'+(H-B)+'" x2="'+(W-R)+'" y2="'+(H-B)+'" stroke="rgba(245,245,245,.20)"/>';
  dark.forEach(s=>{const p=localParts(s.t);if(p.mi===0&&p.h%2===0){
    const x=X(s.t.getTime());
    g+='<line x1="'+x+'" y1="'+T+'" x2="'+x+'" y2="'+(H-B)+'" stroke="rgba(245,245,245,.08)" stroke-width="0.7"/>';
    g+=txt(x,H-B+16,pad(p.h),{s:12.5,a:'middle'});
  }});
  [0,0.5,1].forEach(f=>{
    const r=maxRate*f;
    g+='<line x1="'+L+'" y1="'+Y(r)+'" x2="'+(W-R)+'" y2="'+Y(r)+'" stroke="rgba(245,245,245,.08)" stroke-width="0.6"/>';
    g+=txt(L-3,Y(r)+4.5,r.toFixed(0),{s:12.5,a:'end',f:'#FAA338'});
  });
  [0,45,90].forEach(a=>{
    g+=txt(W-R+4,YA(a)+4.5,a+'\u00b0',{s:11.5,f:'#E6E3F4'});
  });
  g+=txt(L-3,T-7,'/HR',{s:9,f:'#FAA338',a:'end',ls:'0.06em'});
  g+=txt(W-R+4,T-7,'ALT',{s:9,f:'#E6E3F4',ls:'0.06em'});

  // ---- where full astronomical darkness starts and ends ----
  for(let i=1;i<dark.length;i++){
    const a=dark[i-1].sunAlt,b=dark[i].sunAlt;
    if((a>-18&&b<=-18)||(a<=-18&&b>-18)){
      const x=X(dark[i].t.getTime());
      g+='<line x1="'+x+'" y1="'+T+'" x2="'+x+'" y2="'+(H-B)+'" stroke="#6E6BA8" stroke-width="1" stroke-dasharray="2 4"/>';
      const lead=b<=-18;
      g+=txt(x+(lead?4:-4),T+(lead?13:27),(lead?'dark from ':'dark ends ')+fmtTime(dark[i].t),
             {s:11,f:'#9FB6D8',a:lead?'start':'end'});
    }
  }
  if(n.peak){
    const x=X(n.peak.t.getTime());
    g+='<line x1="'+x+'" y1="'+Y(n.peak.rate)+'" x2="'+x+'" y2="'+(H-B)+'" stroke="#FAA338" stroke-width="1" stroke-dasharray="2 3" opacity="0.65"/>';
  }
  g+='</svg>';
  return g;
}

function fovFraction(focal){
  const w=36,h=24,f=+focal;
  const wd=2*Math.atan(w/2/f)*R2D, ht=2*Math.atan(h/2/f)*R2D;
  const om=4*Math.asin(sin(wd/2)*sin(ht/2)); // steradians
  return {frac:om/(2*Math.PI),wd,ht};
}


function verdictWord(s){
  if(s>=82) return 'exceptional';
  if(s>=60) return 'very good';
  if(s>=40) return 'worth going out';
  if(s>=20) return 'quiet but shootable';
  if(s>=6)  return 'thin';
  return 'background only';
}
function speedWord(v){return v<25?'slow':v<45?'medium':v<60?'fast':'very fast';}

function sentence(sw,n){
  const d=sw.det;
  const parts=[];
  if(sw.code==='SPO'){
    parts.push('Background meteors with no parent stream, running at about '+sw.peak.toFixed(1)+' an hour at best and rising towards dawn.');
  }else{
    const when=sw.at?fmtTime(sw.at):'–';
    parts.push('Peaks for you around '+when+' at roughly '+sw.peak.toFixed(1)+' an hour, with the radiant '+Math.round(d.radAlt)+'° above the horizon in the '+compass(d.radAz)+'.');
    if(d.activityFrac<0.25) parts.push('The shower itself is well off its maximum, at about '+Math.round(d.activityFrac*100)+'% of peak strength.');
  }
  if(d.moonLoss>1.2) parts.push('Moonlight is the limiting factor tonight, costing around '+d.moonLoss.toFixed(1)+' magnitudes of sky darkness.');
  else if(d.moonLoss>0.3) parts.push('Some moon interference, costing about '+d.moonLoss.toFixed(1)+' magnitudes.');
  if(d.cf!=null&&d.cf<0.35) parts.push('Cloud is the bigger problem: the forecast leaves only about '+Math.round(d.clear*100)+'% of the sky usable.');
  if(d.glowLoss>0.35) parts.push('Thin cloud is scattering ground light and moonlight back down, costing a further '+d.glowLoss.toFixed(1)+' magnitudes on top of the blocking.');
  if(d.humLoss>0.25) parts.push('Humid air is hazing the sky as well, worth about '+d.humLoss.toFixed(1)+' magnitudes of transparency.');
  if(state.sky&&state.sky.bortle>=6) parts.push('At Bortle '+state.sky.bortle+' you are losing most of the fainter meteors before anything else gets a say.');
  return parts.join(' ');
}



/* ---------------- Noctography additions ---------------- */
const MW_RA = 266.42, MW_DEC = -29.01;   // galactic centre

function crossings(slots, key, level){
  const out = [];
  for (let i = 1; i < slots.length; i++){
    const a = slots[i-1][key], b = slots[i][key];
    if ((a <= level && b > level) || (a > level && b <= level))
      out.push({ t: slots[i].t, rising: b > a });
  }
  return out;
}

/* Sunrise for a local calendar day at the current site, read off the sun's own altitude.
   Returns null where the sun does not rise at all: polar day and polar night both. */
function sunriseOn(y, m, d){
  let prev = null;
  for (let mi = 0; mi <= 14 * 60; mi += 10){
    const dt = toUTC(y, m, d, 0, mi), jd = jdFrom(dt), s = sunPos(jd);
    const h = eq2horiz(s.ra, s.dec, state.lat, lstOf(jd, state.lon)).alt;
    if (prev && prev.h <= HORIZON_SUN && h > HORIZON_SUN){
      const f = (HORIZON_SUN - prev.h) / (h - prev.h);
      return new Date(prev.t.getTime() + f * (dt.getTime() - prev.t.getTime()));
    }
    prev = { t: dt, h };
  }
  return null;
}

/* Which night the app is showing. While it is still dark you are on last night, so the screen
   only rolls over to the coming night thirty minutes before sunrise, which moves with the
   season and the latitude, where a fixed hour does not. Inside either polar circle the sun may
   not rise from this site at all, and there 06:00 local is the fallback. */
function nightAnchor(now){
  now = now || new Date();
  const p = localParts(now);
  if (p.h >= 12) return { y: p.y, m: p.m, d: p.d, rollover: null, rise: null };
  const rise = sunriseOn(p.y, p.m, p.d);
  const roll = rise ? new Date(rise.getTime() - 30 * 60000) : toUTC(p.y, p.m, p.d, 6, 0);
  const back = now.getTime() < roll.getTime() ? 1 : 0;
  const base = new Date(Date.UTC(p.y, p.m, p.d - back));
  return { y: base.getUTCFullYear(), m: base.getUTCMonth(), d: base.getUTCDate(), rollover: roll, rise };
}

/* ============================ eclipses ============================
   Both kinds fall out of the same sun and moon positions the rest of the app uses. A lunar
   eclipse is the moon entering the Earth's shadow, which everyone on the night side sees
   identically, so it is found once and then checked against the moon's altitude here. A solar
   eclipse is local, and is worked out from where the site actually stands on the globe. */
const EARTH_R = 6378.14, MOON_KM = 1737.4, SUN_SEMI = 0.2666, SUN_PARALLAX = 0.00224;
function wrap180(a){ let d = a; while (d > 180) d -= 360; while (d < -180) d += 360; return d; }

/* Fraction of disc 1 hidden behind disc 2, both as circles of angular radius r1 and r2
   separated by d. Used for the covered share of the sun, which is what you actually notice. */
function discOverlap(d, r1, r2){
  if (d >= r1 + r2) return 0;
  if (d <= Math.abs(r1 - r2)) return r2 >= r1 ? 1 : (r2 * r2) / (r1 * r1);
  const a1 = Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1));
  const a2 = Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
  const area = r1 * r1 * (a1 - Math.sin(2 * a1) / 2) + r2 * r2 * (a2 - Math.sin(2 * a2) / 2);
  return clamp(area / (Math.PI * r1 * r1), 0, 1);
}

function lunarEclipse(t0, t1){
  const STEP_MS = 10 * 60000, rows = [];
  for (let t = t0; t <= t1; t += STEP_MS){
    const jd = jdFrom(new Date(t)), s = sunPos(jd), m = moonPos(jd);
    const dl = wrap180(m.lam - s.lam - 180) * cos(m.bet);
    rows.push({ t, jd, sep: Math.sqrt(dl * dl + m.bet * m.bet), dist: m.distKm, ra: m.ra, dec: m.dec });
  }
  if (!rows.length) return null;
  const best = rows.reduce((a, b) => b.sep < a.sep ? b : a);
  const parM = Math.asin(EARTH_R / best.dist) * R2D;
  const semiM = Math.asin(MOON_KM / best.dist) * R2D;
  // the 1.02 is the standard enlargement for the Earth's atmosphere, which widens the shadow
  const umbra = 1.02 * (parM + SUN_PARALLAX - SUN_SEMI);
  const penumbra = 1.02 * (parM + SUN_PARALLAX + SUN_SEMI);
  let kind = null;
  if (best.sep + semiM < umbra) kind = 'total';
  else if (best.sep - semiM < umbra) kind = 'partial';
  else if (best.sep - semiM < penumbra) kind = 'penumbral';
  if (!kind) return null;
  const altOf = r => eq2horiz(r.ra, r.dec, state.lat, lstOf(r.jd, state.lon)).alt;
  const span = lim => {
    const i = rows.filter(r => r.sep - semiM < lim);
    return i.length ? { from: new Date(i[0].t), to: new Date(i[i.length - 1].t), rows: i } : null;
  };
  const pen = span(penumbra), umb = kind === 'penumbral' ? null : span(umbra);
  const shown = umb || pen;
  const maxAlt = shown ? Math.max.apply(null, shown.rows.map(altOf)) : -90;
  return { type: 'lunar', kind, greatest: new Date(best.t), alt: altOf(best), maxAlt,
    mag: Math.max(0, (umbra + semiM - best.sep) / (2 * semiM)),
    umbral: umb ? { from: umb.from, to: umb.to } : null,
    penumbral: pen ? { from: pen.from, to: pen.to } : null };
}

/* Is there a solar eclipse anywhere on Earth in this window? Cheap geocentric test, run first
   so the expensive topocentric scan only happens on the handful of days it can matter. */
function solarEclipseGlobal(t0, t1){
  const STEP_MS = 10 * 60000;
  let best = null;
  for (let t = t0; t <= t1; t += STEP_MS){
    const jd = jdFrom(new Date(t)), s = sunPos(jd), m = moonPos(jd);
    const dl = Math.abs(wrap180(m.lam - s.lam));
    if (!best || dl < best.dl) best = { dl, bet: Math.abs(m.bet), t };
  }
  if (!best || best.dl > 1.8) return null;
  return best.bet < 1.58 ? { at: new Date(best.t), bet: best.bet } : null;
}

/* The moon and sun as the site itself sees them: close enough that standing on the surface
   rather than at the centre of the Earth shifts the moon by up to a degree against the sun,
   which is the whole reason a total eclipse is a narrow track and not a hemisphere. */
function solarSample(t){
  const jd = jdFrom(new Date(t)), s = sunPos(jd), m = moonPos(jd), st = lstOf(jd, state.lon);
  const cl = cos(state.lat), sl = sin(state.lat);
  const ox = EARTH_R * cl * cos(st), oy = EARTH_R * cl * sin(st), oz = EARTH_R * sl;
  const r = m.distKm;
  const mx = r * cos(m.dec) * cos(m.ra) - ox, my = r * cos(m.dec) * sin(m.ra) - oy, mz = r * sin(m.dec) - oz;
  const rt = Math.sqrt(mx * mx + my * my + mz * mz);
  const ra = norm(Math.atan2(my, mx) * R2D), dec = Math.asin(mz / rt) * R2D;
  return { t, sep: angSep(dec, ra, s.dec, s.ra), semiM: Math.asin(MOON_KM / rt) * R2D,
           sunAlt: eq2horiz(s.ra, s.dec, state.lat, st).alt };
}

function solarEclipse(t0, t1){
  const glob = solarEclipseGlobal(t0, t1);
  if (!glob) return null;
  const STEP_MS = 5 * 60000, rows = [];
  for (let t = t0; t <= t1; t += STEP_MS) rows.push(solarSample(t));
  const inside = rows.filter(r => r.sep < SUN_SEMI + r.semiM && r.sunAlt > -0.5);
  if (!inside.length) return { type: 'solar', kind: 'elsewhere', at: glob.at, greatest: glob.at };
  const depth = r => SUN_SEMI + r.semiM - r.sep;
  let g = inside.reduce((a, b) => depth(b) > depth(a) ? b : a);
  // Totality lasts a couple of minutes. A five-minute grid steps straight over it and would
  // report the deepest total eclipse as a partial one, so the moment of greatest eclipse is
  // resampled at ten seconds: only ever on the handful of days that get this far.
  for (let t = g.t - 10 * 60000; t <= g.t + 10 * 60000; t += 10000){
    const r = solarSample(t);
    if (r.sunAlt > -0.5 && depth(r) > depth(g)) g = r;
  }
  const kind = g.sep < Math.abs(g.semiM - SUN_SEMI) ? (g.semiM >= SUN_SEMI ? 'total' : 'annular') : 'partial';
  return { type: 'solar', kind, from: new Date(inside[0].t), to: new Date(inside[inside.length - 1].t),
    greatest: new Date(g.t), alt: g.sunAlt, obscuration: discOverlap(g.sep, SUN_SEMI, g.semiM) };
}

/* Eclipses belonging to one night: local midday to the next, so every eclipse lands on exactly
   one night and none is counted twice. The scan runs three hours wider at each end: an eclipse
   straddling the boundary would otherwise be measured on a truncated half of itself, and the
   result is then kept only if greatest fell inside the night proper. Cached, because the outlook
   asks for ten nights on every render and the answer never moves. */
const ECL_CACHE = {};
function eclipsesFor(y, m, d){
  const key = y + '-' + m + '-' + d + '|' + state.lat.toFixed(2) + '|' + state.lon.toFixed(2);
  if (ECL_CACHE[key]) return ECL_CACHE[key];
  const t0 = toUTC(y, m, d, 12, 0).getTime(), t1 = toUTC(y, m, d + 1, 12, 0).getTime();
  const PAD = 3 * 3600000;
  const owns = x => x && (x.greatest || x.at).getTime() >= t0 && (x.greatest || x.at).getTime() < t1;
  const lunar = lunarEclipse(t0 - PAD, t1 + PAD), solar = solarEclipse(t0 - PAD, t1 + PAD);
  const out = { lunar: owns(lunar) ? lunar : null, solar: owns(solar) ? solar : null };
  ECL_CACHE[key] = out;
  return out;
}

/* Everything the home screen needs for the coming night. */
function tonight(){
  const a = nightAnchor();
  const n = computeNight(a.y, a.m, a.d);

  const slots = n.slots;
  slots.forEach(s => {
    const jd = jdFrom(s.t), st = lstOf(jd, state.lon);
    const mw = eq2horiz(MW_RA, MW_DEC, state.lat, st);
    s.mwAlt = mw.alt; s.mwAz = mw.az;
    const m = moonPos(jd), mh = eq2horiz(m.ra, m.dec, state.lat, st);
    s.moonAz = mh.az;
  });

  const dark = slots.filter(s => s.sunAlt < -18);
  const naut = slots.filter(s => s.sunAlt < -12);
  const usable = dark.length ? dark : naut;
  const darkWin = usable.length ? { from: usable[0].t, to: usable[usable.length-1].t, full: dark.length > 0 } : null;

  const mc = crossings(slots, 'moonAlt', 0);
  const moonRise = (mc.find(c => c.rising) || {}).t || null;
  const moonSet  = (mc.find(c => !c.rising) || {}).t || null;

  // Milky Way core, only counted while it is dark
  let mwBest = null;
  usable.forEach(s => { if (!mwBest || s.mwAlt > mwBest.mwAlt) mwBest = s; });

  // shooting quality per slot: clear sky x sky darkness lost to moon
  let best = null;
  usable.forEach(s => {
    const cf = clearFraction(s.cloud);
    const clear = cf == null ? 0.75 : cf;
    const moonPen = s.moonAlt > 0 ? clamp(1 - (0.25 + 0.75 * s.illum) * Math.min(1, (s.moonAlt + 5) / 45), 0.12, 1) : 1;
    s.quality = clear * moonPen;
    if (!best || s.quality > best.quality) best = s;
  });
  let win = null, meanQ = 0;
  if (best){
    usable.forEach(s => { meanQ += s.quality; });
    meanQ /= usable.length;
    const thr = Math.max(best.quality * 0.7, 0.12);
    const i = usable.indexOf(best);
    let a = i, b = i;
    while (a > 0 && usable[a-1].quality >= thr) a--;
    while (b < usable.length - 1 && usable[b+1].quality >= thr) b++;
    // never advertise a window shorter than an hour: grow towards whichever side holds up better
    const minSlots = Math.min(usable.length - 1, Math.round(60 / STEP));
    while (b - a < minSlots){
      const ca = a > 0 ? usable[a-1].quality : -1;
      const cb = b < usable.length - 1 ? usable[b+1].quality : -1;
      if (ca < 0 && cb < 0) break;
      if (cb >= ca) b++; else a--;
    }
    win = { from: usable[a].t, to: usable[b].t, quality: best.quality };
  }

  // cloud is reported over exactly the hours the verdict is judged on, so the two agree
  const winds = usable.filter(s => s.cloud && s.cloud.wind != null).map(s => s.cloud.wind);
  const gusts = usable.filter(s => s.cloud && s.cloud.gust != null).map(s => s.cloud.gust);
  const wind = winds.length ? { mean: winds.reduce((a, b) => a + b, 0) / winds.length,
    max: Math.max.apply(null, winds), gust: gusts.length ? Math.max.apply(null, gusts) : null } : null;
  const cloudSeries = usable.filter(s => s.cloud).map(s => {
    const cf = clearFraction(s.cloud);
    return { t: s.t, v: cf == null ? s.cloud.total : (1 - cf) * 100, assumed: !!s.cloud.assumed };
  });
  const midIllum = slots[Math.floor(slots.length / 2)].illum;

  // headline verdict for the greeting
  const q = best ? 0.5 * best.quality + 0.5 * meanQ : 0;
  const hours = usable.length * STEP / 60;
  let verdict;
  if (!usable.length) verdict = 'too light for astro, the sun barely sets';
  else if (q >= 0.72 && meanQ >= 0.6 && hours > 2) verdict = 'great';
  else if (q >= 0.5 && meanQ >= 0.35) verdict = 'not bad';
  else if (q >= 0.28 || best.quality >= 0.6) verdict = 'challenging';
  else verdict = 'quite rough';

  const sun = sunTimes(n), mt = moonTimes(n), fog = fogRisk(n);
  return { night: n, darkWin, moonRise, moonSet, midIllum, mwBest, win, best, cloudSeries, wind, sun, mt, fog,
           verdict, quality: q, peakQuality: best ? best.quality : 0, meanQuality: meanQ, darkHours: hours };
}

/* Where an altitude is crossed, with the time interpolated between the two straddling slots
   rather than snapped to a 15-minute step. */
function crossTime(slots, key, level, wantRising){
  for (let i = 1; i < slots.length; i++){
    const a = slots[i-1][key], b = slots[i][key];
    const rising = b > a;
    if (rising !== wantRising) continue;
    if ((a <= level && b > level) || (a > level && b <= level)){
      const f = (level - a) / (b - a);
      return new Date(slots[i-1].t.getTime() + f * (slots[i].t.getTime() - slots[i-1].t.getTime()));
    }
  }
  return null;
}
const HORIZON_SUN = -0.833, HORIZON_MOON = 0.125;   // refraction, and the moon's semi-diameter

function sunTimes(n){
  return { set: crossTime(n.slots, 'sunAlt', HORIZON_SUN, false),
           rise: crossTime(n.slots, 'sunAlt', HORIZON_SUN, true) };
}
function moonTimes(n){
  return { set: crossTime(n.slots, 'moonAlt', HORIZON_MOON, false),
           rise: crossTime(n.slots, 'moonAlt', HORIZON_MOON, true) };
}

/* Radiation fog: the classic clear, still, damp night that ruins an otherwise perfect forecast.
   It needs the air to reach its dew point, almost no wind to mix it away, and a clear sky to
   radiate heat to, which is exactly the night you would otherwise have driven out for. */
function fogRisk(n){
  const dark = n.slots.filter(s => s.sunAlt < -6 && s.cloud);
  if (!dark.length) return null;
  let worst = null;
  dark.forEach(s => {
    const c = s.cloud;
    if (c.temp == null || c.dew == null) return;
    const gap = c.temp - c.dew;
    const wind = c.wind == null ? null : c.wind;
    const cover = c.total == null ? 50 : c.total;
    // each term is 0 to 1, and all three have to line up for fog to form
    const damp = clamp((2.5 - gap) / 2.5, 0, 1);
    const still = wind == null ? 0.5 : clamp((10 - wind) / 8, 0, 1);
    const clear = clamp((70 - cover) / 50, 0, 1);
    let score = damp * still * clear;
    // a visibility forecast, where there is one, is worth more than the proxy
    if (c.vis != null && c.vis < 5000) score = Math.max(score, clamp((5000 - c.vis) / 4000, 0, 1));
    if (!worst || score > worst.score) worst = { score, t: s.t, gap, wind, cover, vis: c.vis };
  });
  if (!worst || worst.score < 0.28) return null;
  return {
    level: worst.score >= 0.62 ? 'likely' : worst.score >= 0.42 ? 'possible' : 'slight',
    score: worst.score, t: worst.t, gap: worst.gap, wind: worst.wind, vis: worst.vis,
  };
}

/* ---- Real-world sky brightness ----
   The atlas gives what a site would read on a perfect moonless night. What you actually get is
   that, plus moonlight, plus whatever haze the humidity has put in the air, plus town glow
   scattered back down by thin cloud. This evaluates the full model at the zenith through the
   dark hours and reports the median, so one bright half-hour does not define the night. */
function realSky(n){
  const dark = n.slots.filter(s => s.sunAlt < -15 && s.env && s.env.b);
  const slots = dark.length ? dark : n.slots.filter(s => s.env && s.env.b);
  if (!slots.length) return null;
  const vals = slots.map(s => {
    const lm = limitingMag(s.env, 90, 0);
    return { sqm: lm.sky, nelm: lm.nelm, moonLoss: lm.moonLoss, humLoss: lm.humLoss, glowLoss: lm.glowLoss };
  }).sort((a, b) => a.sqm - b.sqm);
  const med = vals[Math.floor(vals.length / 2)];
  const best = vals[vals.length - 1];
  const worst = vals[0];
  return {
    sqm: med.sqm, bortle: bortleFor(med.sqm), nelm: med.nelm,
    moonLoss: med.moonLoss, humLoss: med.humLoss, glowLoss: med.glowLoss,
    bestSqm: best.sqm, bestBortle: bortleFor(best.sqm),
    worstBortle: bortleFor(worst.sqm),
    baseBortle: state.sky ? state.sky.bortle : null,
    baseSqm: state.sky ? state.sky.sqm : null,
  };
}

/* One row of the ten-night outlook. */
function nightSummary(n){
  const dark18 = n.slots.filter(s => s.sunAlt < -18);
  const dark12 = n.slots.filter(s => s.sunAlt < -12);
  const usable = dark18.length ? dark18 : dark12;
  const darkWin = usable.length ? { from: usable[0].t, to: usable[usable.length - 1].t } : null;

  const withCloud = usable.filter(s => s.cloud);
  const live = withCloud.filter(s => !s.cloud.assumed);
  const quoted = live.length ? live : withCloud;
  let cloud = null, cloudKind = 'none';
  if (quoted.length){
    const vals = quoted.map(s => { const cf = clearFraction(s.cloud); return cf == null ? s.cloud.total : (1 - cf) * 100; });
    cloud = vals.reduce((a, b) => a + b, 0) / vals.length;
    cloudKind = live.length ? (live.length < withCloud.length ? 'partial' : 'live') : 'typical';
  }

  const mid = usable.length ? usable[Math.floor(usable.length / 2)] : n.slots[Math.floor(n.slots.length / 2)];
  const moonUp = usable.some(s => s.moonAlt > 0);
  return {
    y: n.y, m: n.m, d: n.d, t: usable.length ? usable[0].t : n.slots[0].t,
    darkWin, darkHours: usable.length * STEP / 60,
    cloud, cloudKind,
    moonPct: mid ? mid.illum * 100 : 0, moonUp,
    sky: realSky(n), sun: sunTimes(n), mt: moonTimes(n), fog: fogRisk(n),
    peakRate: n.peak ? n.peak.rate : 0,
    headline: n.headline ? n.headline.code : null,
    headlineName: n.headline ? n.headline.name : null,
    win: n.win, score: n.score,
  };
}

/* NOAA planetary K index, 3-hourly forecast */
/* NOAA planetary K index, 3-hourly forecast, about three days ahead.
   The whole series is returned; windowing it to a particular night is the caller's job,
   because a rolling window around "now" says nothing about the night being displayed. */
async function loadKp(){
  try{
    const r = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json');
    const j = await r.json();
    let rows = [];
    if (Array.isArray(j) && j.length && Array.isArray(j[0])){
      rows = j.slice(1).map(x => ({ t: new Date(String(x[0]).replace(' ', 'T') + 'Z'), kp: parseFloat(x[1]) }));
    } else if (Array.isArray(j)){
      rows = j.map(x => ({ t: new Date(String(x.time_tag).replace(' ', 'T') + (String(x.time_tag).endsWith('Z') ? '' : 'Z')), kp: parseFloat(x.kp) }));
    }
    rows = rows.filter(x => !isNaN(x.kp) && !isNaN(x.t.getTime())).sort((a, b) => a.t - b.t);
    return rows.length ? { rows } : null;
  }catch(e){ return null; }
}

/* Peak and shape of Kp across one night's dark hours. A 3-hourly sample stamped 21:00 describes
   21:00-24:00, so a sample counts when its three-hour span overlaps the window at all. */
function kpForNight(kp, win){
  if (!kp || !kp.rows || !kp.rows.length || !win) return null;
  const a = win.from.getTime(), b = win.to.getTime(), SPAN = 3 * 3600000;
  const s = kp.rows.filter(x => x.t.getTime() + SPAN > a && x.t.getTime() < b);
  if (!s.length) return null;
  const peak = s.reduce((m, x) => x.kp > m.kp ? x : m);
  return { peak: peak.kp, at: peak.t, series: s, first: s[0].kp, last: s[s.length - 1].kp };
}

/* Place search. Photon (Komoot, on OpenStreetMap) is the primary because it takes a proximity bias
   and knows the places people actually drive to at night: fens, reserves, viewpoints, car parks.
   Open-Meteo only indexes populated places ranked by population, which is why searching "Newton"
   from Cambridgeshire returned eight American towns and no English villages. It stays as the
   fallback. Both are free, keyless and CORS-open.

   OSM answers a place name with everything that carries it: the village, its parish boundary, a
   signpost, and a suburban street named after it two counties away. So results are ranked by what
   kind of thing they are before how far away they are, and the raw tag is never shown to anyone. */
const GEO_DROP_KEYS = ['highway', 'building', 'information', 'barrier', 'man_made', 'power', 'railway',
  'office', 'shop', 'craft', 'healthcare', 'emergency', 'advertising', 'entrance', 'traffic_sign'];
const GEO_PLACE = ['city', 'town', 'village', 'hamlet', 'suburb', 'locality', 'isolated_dwelling', 'farm', 'island', 'islet'];
/* what a person would call it, or nothing at all */
const GEO_KIND = {
  administrative: 'parish', nature_reserve: 'nature reserve', camp_site: 'campsite',
  caravan_site: 'caravan site', parking: 'car park', viewpoint: 'viewpoint', attraction: 'attraction',
  picnic_site: 'picnic site', beach: 'beach', water: 'lake', wetland: 'wetland', wood: 'wood',
  heath: 'heath', moor: 'moor', peak: 'hill', bay: 'bay', cape: 'headland', cliff: 'cliff',
  common: 'common', park: 'park', forest: 'forest', meadow: 'meadow', reservoir: 'reservoir',
};
function geoRank(key, val){
  if(key === 'place' && GEO_PLACE.indexOf(val) >= 0) return 0;      // the village itself
  if(key === 'boundary' && val === 'administrative') return 1;      // its parish, near enough
  if(key === 'leisure' && val === 'nature_reserve') return 1;
  if(key === 'natural' || key === 'landuse' || key === 'historic') return 2;
  if(key === 'tourism') return val === 'viewpoint' ? 1 : 3;
  if(key === 'amenity') return (val === 'parking' || val === 'picnic_site') ? 3 : 5;
  if(key === 'leisure' || key === 'place') return 3;
  return 4;
}
function geoNorm(s){ return String(s).toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim(); }
async function geocode(q, near){
  const want = geoNorm(q);
  const bias = near && near.lat != null ? '&lat=' + near.lat.toFixed(3) + '&lon=' + near.lon.toFixed(3) : '';
  const kmTo = (la, lo) => {
    if(!near || near.lat == null) return null;
    const R = 6371, d = Math.PI / 180;
    const dla = (la - near.lat) * d, dlo = (lo - near.lon) * d;
    const h = Math.sin(dla / 2) ** 2 + Math.cos(near.lat * d) * Math.cos(la * d) * Math.sin(dlo / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  try{
    const r = await fetch('https://photon.komoot.io/api/?limit=20&lang=en&q=' + encodeURIComponent(q) + bias);
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    const out = [];
    (j.features || []).forEach(f => {
      const pr = f.properties || {}, c = (f.geometry && f.geometry.coordinates) || [];
      if(!isFinite(c[0]) || !isFinite(c[1]) || !pr.name) return;
      const key = pr.osm_key, val = pr.osm_value;
      if(GEO_DROP_KEYS.indexOf(key) >= 0) return;
      const rank = geoRank(key, val);
      if(rank >= 4) return;
      const row = {
        name: pr.name,
        admin1: pr.state || null,
        admin2: pr.county || pr.district || pr.city || null,
        country: pr.country || null,
        country_code: pr.countrycode || null,
        kind: GEO_KIND[val] || (GEO_PLACE.indexOf(val) >= 0 ? val : null),
        rank,
        /* what you typed beats what is nearest: an exact name is the strongest signal there is */
        tier: geoNorm(pr.name) === want ? 0 : geoNorm(pr.name).indexOf(want) === 0 ? 1 : 2,
        latitude: c[1], longitude: c[0],
        km: kmTo(c[1], c[0]),
      };
      /* the village and its parish boundary are the same answer: keep the better-named one */
      const near2 = out.findIndex(x => x.name === row.name
        && Math.abs(x.latitude - row.latitude) < 0.05 && Math.abs(x.longitude - row.longitude) < 0.05);
      if(near2 >= 0){ if(row.tier < out[near2].tier || (row.tier === out[near2].tier && row.rank < out[near2].rank)) out[near2] = row; return; }
      out.push(row);
    });
    /* kind of thing first, distance second: a street named after a village is not the village */
    out.sort((a, b) => (a.tier - b.tier) || (a.rank - b.rank) || ((a.km == null ? 0 : a.km) - (b.km == null ? 0 : b.km)));
    if(out.length) return out.slice(0, 8);
    throw new Error('no usable hits');
  }catch(err){
    try{
      const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=8&language=en&format=json&name=' + encodeURIComponent(q));
      const j = await r.json();
      return (j.results || []).map(x => ({ ...x, kind: null, rank: 0, tier: 0, km: kmTo(x.latitude, x.longitude) }));
    }catch(e2){ return []; }
  }
}

/* Rough home location from the browser timezone, for when GPS is refused. */
const TZ_HOME = {
  'Europe/London':[52.958,0.573,'Thornham, Norfolk'], 'Europe/Dublin':[53.35,-6.26,'Dublin'],
  'Europe/Paris':[48.86,2.35,'Paris'], 'Europe/Berlin':[52.52,13.40,'Berlin'], 'Europe/Madrid':[40.42,-3.70,'Madrid'],
  'Europe/Rome':[41.90,12.50,'Rome'], 'Europe/Amsterdam':[52.37,4.90,'Amsterdam'], 'Europe/Oslo':[59.91,10.75,'Oslo'],
  'Europe/Stockholm':[59.33,18.07,'Stockholm'], 'Europe/Helsinki':[60.17,24.94,'Helsinki'], 'Europe/Warsaw':[52.23,21.01,'Warsaw'],
  'Europe/Lisbon':[38.72,-9.14,'Lisbon'], 'Europe/Zurich':[47.38,8.54,'Zurich'], 'Europe/Vienna':[48.21,16.37,'Vienna'],
  'America/New_York':[40.71,-74.01,'New York'], 'America/Chicago':[41.88,-87.63,'Chicago'],
  'America/Denver':[39.74,-104.99,'Denver'], 'America/Los_Angeles':[34.05,-118.24,'Los Angeles'],
  'America/Toronto':[43.65,-79.38,'Toronto'], 'America/Vancouver':[49.28,-123.12,'Vancouver'],
  'Australia/Sydney':[-33.87,151.21,'Sydney'], 'Australia/Melbourne':[-37.81,144.96,'Melbourne'],
  'Australia/Perth':[-31.95,115.86,'Perth'], 'Pacific/Auckland':[-36.85,174.76,'Auckland'],
  'Africa/Johannesburg':[-26.20,28.05,'Johannesburg'], 'Asia/Tokyo':[35.68,139.69,'Tokyo'],
  'Asia/Singapore':[1.35,103.82,'Singapore'], 'Asia/Dubai':[25.20,55.27,'Dubai'], 'Asia/Kolkata':[28.61,77.21,'Delhi'],
};
function homeFromTimezone(){
  let tz = '';
  try{ tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; }catch(e){}
  const hit = TZ_HOME[tz];
  if (hit) return { lat: hit[0], lon: hit[1], place: hit[2], guessed: true };
  // fall back to the offset: put them mid-latitude at the right longitude
  const lon = clamp(-new Date().getTimezoneOffset() / 4, -180, 180);
  return { lat: 52.958, lon: 0.573, place: 'Thornham, Norfolk', guessed: true, unknownTz: true, lonHint: lon };
}

/* ======================= noctilucent cloud ======================= */
/* There is no NLC forecast anywhere and this does not pretend to be one. Season and latitude are
   climatology; the window is geometry. The ice sits near 83 km and shines by sunlight after the
   ground is already dark, which is the stretch when the sun is between 6 and 16 degrees below the
   horizon: any shallower and the sky drowns it, any deeper and the cloud itself is in shadow. */
const NLC_DEEP = -16, NLC_SHALLOW = -6;
function nlcSeason(y, m, d, lat){
  lat = lat == null ? state.lat : lat;
  const md = (m + 1) * 100 + d;
  const north = lat >= 0;
  const inSeason = north ? (md >= 520 && md <= 820) : (md >= 1115 || md <= 215);
  /* June and July are the season proper. Either side of that it does happen, but rarely and
     faintly, and the app says so rather than promising the same thing all summer. */
  const core = north ? (md >= 601 && md <= 731) : (md >= 1201 || md <= 131);
  const peak = north ? (md >= 615 && md <= 715) : (md >= 1210 || md <= 110);
  const a = Math.abs(lat);
  const band = a < 45 ? 'unlikely' : a < 50 ? 'possible' : a <= 58 ? 'prime' : a <= 62 ? 'possible' : 'bright';
  return { inSeason, peak, core, edge: inSeason && !core, band, north,
    bandWord: band === 'prime' ? 'prime latitude for them'
      : band === 'possible' ? 'possible from this latitude'
      : band === 'bright' ? 'this far poleward midsummer twilight is too bright, they return later in the season'
      : 'rarely works from this latitude' };
}
/* The twilight window, or windows: displays that fade in the evening often come back before dawn
   as the cloud drifts back out of the Earth's shadow. */
function nlcWindows(n){
  const runs = [];
  let cur = null;
  n.slots.forEach(s => {
    const ok = s.sunAlt <= NLC_SHALLOW && s.sunAlt >= NLC_DEEP;
    if(ok){
      if(!cur) cur = { from: s.t, to: s.t, slots: [s] };
      else { cur.to = s.t; cur.slots.push(s); }
    } else if(cur){ runs.push(cur); cur = null; }
  });
  if(cur) runs.push(cur);
  return runs.filter(r => (r.to - r.from) >= 20 * 60000).map((r, i, all) => {
    const mid = r.slots[Math.floor(r.slots.length / 2)];
    const env = mid.env;
    const az = env && env.sun ? eq2horiz(env.sun.ra, env.sun.dec, state.lat, env.st).az : null;
    const withCloud = r.slots.filter(s => s.cloud && s.cloud.total != null);
    return {
      from: r.from, to: r.to, az,
      compass: az == null ? null : compass(az),
      label: all.length > 1 ? (i === 0 ? 'evening' : i === all.length - 1 ? 'before dawn' : 'later') : 'tonight',
      cloud: withCloud.length ? withCloud.reduce((a2, b) => a2 + b.cloud.total, 0) / withCloud.length : null,
      assumed: withCloud.length ? withCloud.every(s => s.cloud.assumed) : true,
    };
  });
}

/* ============================ aurora ============================ */
/* Kp is a three-hourly planetary average. Everything below turns it, and the live solar wind,
   into something local: where the oval sits relative to this user, how high the arc would stand
   above their horizon, and what the sky in that direction is actually like. */

/* Dipole geomagnetic latitude. IGRF pole for 2025 is 80.7N 72.7W; a dipole is good to a fraction
   of a degree here, and the oval geometry it feeds is only good to a couple of degrees anyway. */
const GEOMAG_POLE = { lat: 80.7, lon: -72.7 };
function geomagLat(lat, lon){
  const d = Math.PI / 180;
  const s = Math.sin(lat * d) * Math.sin(GEOMAG_POLE.lat * d) +
            Math.cos(lat * d) * Math.cos(GEOMAG_POLE.lat * d) * Math.cos((lon - GEOMAG_POLE.lon) * d);
  return Math.asin(clamp(s, -1, 1)) / d;
}
/* Equatorward edge of the auroral oval by Kp, in geomagnetic latitude: the standard
   "aurora may be overhead this far down" table, near enough 2 degrees per Kp step. */
function ovalEdge(kp){ return 66.5 - 2.07 * clamp(kp, 0, 9); }

/* Elevation of an emission layer h km up standing dDeg of latitude away, on a spherical Earth.
   Negative when the layer is over the horizon. */
function arcElevation(dDeg, h){
  const R = 6371, th = Math.abs(dDeg) * 111.195 / R;
  return Math.atan2((R + h) * Math.cos(th) - R, (R + h) * Math.sin(th)) * 180 / Math.PI;
}
function destPoint(lat, lon, brg, km){
  const d = Math.PI / 180, R = 6371, ad = km / R;
  const la = lat * d, lo = lon * d, b = brg * d;
  const la2 = Math.asin(Math.sin(la) * Math.cos(ad) + Math.cos(la) * Math.sin(ad) * Math.cos(b));
  const lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(ad) * Math.cos(la), Math.cos(ad) - Math.sin(la) * Math.sin(la2));
  return { lat: la2 / d, lon: ((lo2 / d + 540) % 360) - 180 };
}

/* Where the aurora would stand for this user, from a Kp value.
   The tabulated Kp latitude is the equatorward limit of where aurora can be SEEN, low on the
   poleward horizon. The band people photograph stands about 8 degrees of latitude poleward of
   that limit, which is why a Kp 6 night from Norfolk is a glow on the horizon and not curtains
   overhead. ARC_OFFSET is the load-bearing constant here and wants validating against the
   Aurorasaurus archive before anyone treats it as settled. */
const ARC_OFFSET = 8;
function auroraGeometry(kp, lat, lon){
  const la = lat == null ? state.lat : lat, lo = lon == null ? state.lon : lon;
  const mlat = geomagLat(la, lo);
  const limit = ovalEdge(kp);
  const arcLat = limit + ARC_OFFSET;
  const gap = arcLat - Math.abs(mlat);        // degrees poleward of the user, 0 or less is overhead
  const low = arcElevation(gap > 0 ? gap : 0, 100);
  const high = arcElevation(gap > 0 ? gap : 0, 250);
  return {
    mlat, edge: limit, arcLat, gap,
    overhead: gap <= 0,
    low: Math.max(0, low), high: Math.max(0, high),
    reaches: Math.abs(mlat) >= limit,          // aurora reaches this latitude at all
    visible: gap <= 0 || high > 1,
    km: Math.round(Math.max(0, gap) * 111.195),
    poleward: la >= 0 ? 'north' : 'south',
  };
}

/* ---- live solar wind (NOAA SWPC, L1) ---- */
/* Two calls, deliberately unequal. The minute-cadence history file is 1.4 MB, so it is fetched
   once and then kept current from a 60-byte summary that costs nothing to poll: these are free
   public endpoints and the trace only needs the last hour. Fields are read at runtime because
   the L1 fleet changed in 2026 (SOLAR-1 primary, IMAP backup) and will change again. */
const SW_SEED = 'https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json';
const SW_MAG_NOW = 'https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json';
const SW_SPEED_NOW = 'https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json';
async function loadSolarWind(){
  const get = async u => { const r = await fetch(u); if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };
  const parse = t => Date.parse(/[zZ]$/.test(String(t)) ? String(t) : String(t).replace(' ', 'T') + 'Z');
  try{
    /* 195 minutes because the coupling integrals below want a full three hours behind them */
    const keepMin = Math.max(195, ((state.wind && state.wind.lag) || 60) + 30);
    let series = (state.wind && state.wind.series) || [];
    const seedAge = Date.now() - (state.windSeedAt || 0);
    if(!series.length || seedAge > 15 * 60000){
      const rows = await get(SW_SEED);          // newest first
      const seeded = [];
      for(const r of rows){
        const t = parse(r.time_tag), bz = parseFloat(r.bz_gsm);
        if(!isFinite(t) || !isFinite(bz)) continue;
        if(Date.now() - t > keepMin * 60000) break;
        seeded.push({ t, bz, bt: isFinite(parseFloat(r.bt)) ? parseFloat(r.bt) : null, by: isFinite(parseFloat(r.by_gsm)) ? parseFloat(r.by_gsm) : null });
      }
      seeded.reverse();
      if(seeded.length){ series = seeded; state.windSeedAt = Date.now(); state.windSource = rows[0] && rows[0].source || null; }
    }
    const [nowMag, nowSpeed] = await Promise.all([get(SW_MAG_NOW).catch(() => null), get(SW_SPEED_NOW).catch(() => null)]);
    const m = nowMag && nowMag[0], sp = nowSpeed && nowSpeed[0];
    if(m && isFinite(parseFloat(m.bz_gsm))){
      const t = parse(m.time_tag);
      if(!series.length || t > series[series.length - 1].t) series = series.concat([{ t, bz: parseFloat(m.bz_gsm), bt: isFinite(parseFloat(m.bt)) ? parseFloat(m.bt) : null, by: isFinite(parseFloat(m.by_gsm)) ? parseFloat(m.by_gsm) : null }]);
    }
    series = series.filter(s => Date.now() - s.t <= keepMin * 60000);
    if(!series.length) throw new Error('no mag samples');
    const speed = sp && isFinite(parseFloat(sp.proton_speed)) ? parseFloat(sp.proton_speed) : (state.wind && state.wind.speed) || null;
    const density = null;
    const now = series[series.length - 1].t;
    const within = m => series.filter(s => now - s.t <= m * 60000);
    const m30 = within(30), h60 = within(60);
    const mean30 = m30.length ? m30.reduce((a, b) => a + b.bz, 0) / m30.length : null;
    const southFrac = h60.length ? h60.filter(s => s.bz < 0).length / h60.length : null;
    let run = 0;
    for(let i = series.length - 1; i >= 0; i--){ if(series[i].bz < -2) run = (now - series[i].t) / 60000 + 1; else break; }
    let flips = 0;
    for(let i = 1; i < h60.length; i++) if((h60[i].bz < 0) !== (h60[i - 1].bz < 0)) flips++;
    state.wind = {
      bz: series[series.length - 1].bz, bt: series[series.length - 1].bt,
      speed, density, series, mean30, southFrac, run: Math.round(run), flips,
      lag: speed ? Math.round(1.5e6 / speed / 60) : null,
      at: now, stale: (Date.now() - now) > 10 * 60000,
    };
    state.windStatus = 'live';
    return true;
  }catch(e){ state.windStatus = 'unavailable'; return false; }
}

/* First match wins, in the order a chaser reads them. */
function windState(){
  const w = state.wind;
  if(!w || w.bz == null) return { key: 'none', label: 'No live data', tier: '', open: false };
  const tier = w.bz <= -15 ? 'severe' : w.bz <= -8 ? 'strong' : w.bz <= -4 ? 'moderate' : '';
  if(w.mean30 != null && w.mean30 <= -4 && w.southFrac >= 0.75) return { key: 'holding', label: 'South and holding', tier, open: true };
  if(w.bz <= -4) return { key: 'swung', label: 'Swung south', tier, open: true };
  if(w.flips >= 3 && w.mean30 != null && Math.abs(w.mean30) < 2) return { key: 'flicker', label: 'Flickering', tier: '', open: false };
  if(w.mean30 != null && w.mean30 > 0) return { key: 'north', label: 'North, door closed', tier: '', open: false };
  return { key: 'quiet', label: 'Quiet', tier: '', open: false };
}

/* ---- OVATION probability grid: one global file, sampled on the device ---- */
async function loadOvation(){
  if(state.ovationGrid && Date.now() - state.ovationAt < 5 * 60000) return true;
  try{
    const r = await fetch('https://services.swpc.noaa.gov/json/ovation_aurora_latest.json');
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    const grid = {};
    (j.coordinates || []).forEach(c => { grid[c[0] + ',' + c[1]] = c[2]; });
    if(!Object.keys(grid).length) throw new Error('empty grid');
    state.ovationGrid = grid;
    state.ovationAt = Date.now();
    state.ovationTime = j['Forecast Time'] || j['Observation Time'] || null;
    state.ovationStatus = 'live';
    return true;
  }catch(e){ state.ovationStatus = 'unavailable'; return false; }
}
function ovationAt(lat, lon){
  const g = state.ovationGrid;
  if(!g) return null;
  let lo = Math.round(((lon % 360) + 360) % 360); if(lo > 359) lo -= 360;
  const v = g[lo + ',' + Math.round(clamp(lat, -90, 90))];
  return v == null ? null : v;
}
/* The oval is usually poleward of the user. Aurora 100 to 250 km up is visible from a long way
   equatorward, so the poleward cells are scanned and the best one that still clears the horizon
   is kept: that, not the user's own cell, is the number worth acting on at mid latitudes. */
function ovationScan(lat, lon){
  lat = lat == null ? state.lat : lat; lon = lon == null ? state.lon : lon;
  const own = ovationAt(lat, lon), sign = lat >= 0 ? 1 : -1;
  let best = null;
  for(let d = 1; d <= 12; d++){
    const el = arcElevation(d, 150);
    if(el < 1) break;
    const v = ovationAt(lat + sign * d, lon);
    if(v == null) continue;
    if(!best || v > best.p) best = { p: v, offset: d, elev: el };
  }
  return { own, best };
}

/* ---- what the sky in that direction is actually like ---- */
/* Horizon glow is drawn on an ABSOLUTE scale, not against the worst sector in view: a pristine
   horizon has to look pristine. The quantity is artificial brightness as a multiple of the natural
   sky, distance-weighted, and full height is GLOW_FULL, about what a town-lit Bortle 7 horizon
   reads. Logarithmic, because brightness is, and because the eye is.
     ratio 0.1 (Bortle 1) -> 3%     0.9 (Bortle 3) -> 19%
     2.7  (Bortle 4)      -> 38%    10.5 (Bortle 5) -> 71%    30 (Bortle 7) -> 100% */
const GLOW_FULL = 30;
function glowLevel(meanRatio){
  if(meanRatio == null || !(meanRatio > 0)) return 0;
  return clamp(Math.log10(1 + meanRatio) / Math.log10(1 + GLOW_FULL), 0, 1);
}

/* The atlas sampled across the poleward quarter, out to where a low arc sits. Near glow dominates
   a horizon, so each sample is weighted by distance. */
function polewardGlow(lat, lon){
  lat = lat == null ? state.lat : lat; lon = lon == null ? state.lon : lon;
  const centre = lat >= 0 ? 0 : 180;
  const zen = atlasSky(lat, lon);
  const sectors = [];
  let sqmSum = 0, sqmWt = 0;
  for(let i = 0; i < 10; i++){
    const brg = (centre - 45 + i * 10 + 360) % 360;
    let art = 0, wsum = 0, got = 0, sqm = null;
    [15, 40, 80, 140].forEach(km => {
      const p = destPoint(lat, lon, brg, km);
      const a = atlasSky(p.lat, p.lon);
      if(!a) return;
      got++;
      if(sqm == null || a.sqm < sqm) sqm = a.sqm;
      const ratio = Math.max(0, Math.pow(10, (22.0 - a.sqm) / 2.5) - 1);
      const w = 1 / (1 + km / 40);
      art += ratio * w; wsum += w;
      sqmSum += a.sqm * w; sqmWt += w;
    });
    sectors.push({ brg, art: got && wsum ? art / wsum : null, sqm });
  }
  sectors.forEach(s => { s.level = glowLevel(s.art); });
  const arts = sectors.map(s => s.art).filter(v => v != null).sort((x, y) => x - y);
  const median = arts.length ? arts[Math.floor(arts.length / 2)] : 0;
  const meanSqm = sqmWt ? sqmSum / sqmWt : null;
  const worst = sectors.reduce((a, b) => (b.art != null && (!a || b.art > a.art)) ? b : a, null);
  return {
    sectors, meanSqm,
    bortle: meanSqm == null ? null : bortleFor(meanSqm),
    zenithSqm: zen ? zen.sqm : null,
    zenithBortle: zen ? bortleFor(zen.sqm) : null,
    worst: worst && worst.art > 0.3 && worst.art > median * 1.5 ? worst : null,
    label: lat >= 0 ? 'NW to NE' : 'SE to SW',
  };
}

/* The whole horizon, not just the poleward quarter. The atlas is sampled on sixteen bearings out
   to 150 km, weighted so a nearby town dominates the way it actually does on a real horizon. Haze
   is what puts that light back in your eyes, so humidity and high cloud scale the whole ring: the
   same glow is far worse on a muggy night than a dry one. */
const COMPASS16 = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
function allSkyGlow(lat, lon, opts){
  lat = lat == null ? state.lat : lat; lon = lon == null ? state.lon : lon;
  opts = opts || {};
  const zen = atlasSky(lat, lon);
  const known = opts.rh != null || opts.highCloud != null;
  const rh = opts.rh == null ? 60 : opts.rh;
  const hi = opts.highCloud == null ? 0 : opts.highCloud;
  const haze = known ? 1 + 0.9 * clamp((rh - 60) / 40, 0, 1) + 0.6 * clamp(hi / 100, 0, 1) : 1;
  const sectors = COMPASS16.map((name, i) => {
    const brg = i * 22.5;
    let art = 0, wsum = 0, sqm = null;
    [10, 30, 60, 100, 150].forEach(km => {
      const p = destPoint(lat, lon, brg, km);
      const a = atlasSky(p.lat, p.lon);
      if(!a) return;
      if(sqm == null || a.sqm < sqm) sqm = a.sqm;
      const ratio = Math.max(0, Math.pow(10, (22.0 - a.sqm) / 2.5) - 1);
      const w = 1 / (1 + km / 35);
      art += ratio * w; wsum += w;
    });
    return { name, brg, art: wsum ? (art / wsum) * haze : null, sqm };
  });
  const arts = sectors.map(s => s.art).filter(v => v != null);
  const peak = arts.length ? Math.max(...arts) : 0;
  const low = arts.length ? Math.min(...arts) : 0;
  sectors.forEach(s => { s.level = glowLevel(s.art); });
  const worst = sectors.reduce((a, b) => (b.art != null && (!a || b.art > a.art)) ? b : a, null);
  const best = sectors.reduce((a, b) => (b.art != null && (!a || b.art < a.art)) ? b : a, null);
  return {
    sectors, haze, hazeKnown: known, worst, best,
    even: peak > 0 ? (low / peak) : 1,
    zenithSqm: zen ? zen.sqm : null,
    zenithBortle: zen ? bortleFor(zen.sqm) : null,
  };
}

/* Cloud over the sky the arc would occupy, rather than over the user's head. */
async function loadPolewardCloud(win){
  const sign = state.lat >= 0 ? 1 : -1;
  const las = [clamp(state.lat + sign * 0.5, -89, 89), clamp(state.lat + sign * 1.0, -89, 89)];
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + las.map(v => v.toFixed(3)).join(',') +
    '&longitude=' + las.map(() => state.lon.toFixed(3)).join(',') +
    '&hourly=cloud_cover,cloud_cover_low&forecast_days=3&timezone=UTC';
  try{
    const r = await fetch(url);
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    const rows = Array.isArray(j) ? j : [j];
    let tot = 0, low = 0, n = 0;
    rows.forEach(p => {
      const h = p.hourly; if(!h || !h.time) return;
      h.time.forEach((t, i) => {
        const ms = Date.parse(t + ':00Z');
        if(win && (ms < win.from.getTime() - 1800000 || ms > win.to.getTime() + 1800000)) return;
        const c = h.cloud_cover[i], l = h.cloud_cover_low[i];
        if(c == null) return;
        tot += c; low += (l == null ? 0 : l); n++;
      });
    });
    state.northCloud = n ? { total: tot / n, low: low / n, hours: n } : null;
    state.northCloudStatus = n ? 'live' : 'unavailable';
    return !!n;
  }catch(e){ state.northCloud = null; state.northCloudStatus = 'unavailable'; return false; }
}

/* ---- camera and eye thresholds ----
   One signal, two thresholds. A sensor holding the shutter open picks up aurora five to ten times
   fainter than a dark-adapted eye, which is colour-blind and far less sensitive. The thresholds
   move with moon, cloud and site brightness; the signal does not. */
function auroraThresholds(opts){
  opts = opts || {};
  const scan = ovationScan();
  const own = scan.own == null ? null : scan.own;
  const pole = scan.best ? scan.best.p : null;
  const signal = (own == null && pole == null) ? null : Math.max(own || 0, (pole || 0) * 0.85);
  const moonIll = opts.moonIllum == null ? 0 : opts.moonIllum;
  const moonUp = opts.moonUp ? 1 : 0;
  const cloud = opts.cloud == null ? 0.25 : clamp(opts.cloud / 100, 0, 1);
  const bortle = opts.bortle == null ? 4 : opts.bortle;
  const skyPen = 1 + Math.max(0, bortle - 3) * 0.09;
  const cloudPen = 1 + cloud * 1.6;
  const camera = clamp(12 * (1 + 0.6 * moonIll * moonUp) * skyPen * cloudPen, 4, 96);
  const eye = clamp(42 * (1 + 1.8 * moonIll * moonUp) * skyPen * cloudPen, 8, 98);
  const state_ = signal == null ? 'none' : signal >= eye ? 'eye' : signal >= camera ? 'camera' : 'quiet';
  return { signal, own, pole, polewardOffset: scan.best ? scan.best.offset : null, camera, eye, state: state_ };
}

/* ---- storm watches and the 27-day outlook ---- */
const MON3 = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
async function loadAlerts(){
  try{
    const r = await fetch('https://services.swpc.noaa.gov/products/alerts.json');
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    const out = [];
    const yr = new Date().getUTCFullYear();
    j.slice(0, 80).forEach(a => {
      const id = String(a.product_id || ''), msg = String(a.message || '');
      const isWatch = /^WATA/.test(id) || /WATCH/i.test(msg);
      const inEffect = /^(WARK|ALTK)/.test(id);
      if(!isWatch && !inEffect) return;
      /* the "Highest Storm Level Predicted by Day" block is the parseable part; the body text is
         display only, never trusted for logic */
      const days = [...msg.matchAll(/([A-Z][a-z]{2})\s+(\d{1,2}):\s*G([1-5])/g)].map(m => ({
        m: MON3.indexOf(m[1].toLowerCase()), d: parseInt(m[2], 10), g: parseInt(m[3], 10),
      })).filter(x => x.m >= 0);
      const g = (msg.match(/Category G([1-5])/i) || msg.match(/G([1-5])/) || [])[1];
      if(!days.length && !g) return;
      out.push({ id, watch: isWatch && !inEffect, inEffect, g: g ? parseInt(g, 10) : null, days, year: yr, issued: a.issue_datetime || null });
    });
    state.alerts = out;
    state.alertStatus = 'live';
    return true;
  }catch(e){ state.alerts = []; state.alertStatus = 'unavailable'; return false; }
}
/* G level to Kp, as SWPC define it. */
function gToKp(g){ return g == null ? null : Math.min(9, 4 + g); }
function watchFor(y, m, d){
  const list = state.alerts || [];
  for(const a of list){
    for(const day of a.days){
      if(day.m === m && day.d === d) return { g: day.g, inEffect: a.inEffect, kp: gToKp(day.g) };
    }
  }
  return null;
}

async function loadOutlook27(){
  try{
    const r = await fetch('https://services.swpc.noaa.gov/text/27-day-outlook.txt');
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const txt = await r.text();
    const rows = [];
    txt.split('\n').forEach(line => {
      const m = line.match(/^(\d{4})\s+([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d+)\s+(\d+)\s+(\d+)/);
      if(!m) return;
      const mo = MON3.indexOf(m[2].toLowerCase());
      if(mo < 0) return;
      rows.push({ y: +m[1], m: mo, d: +m[3], flux: +m[4], a: +m[5], kp: +m[6] });
    });
    state.outlook27 = rows;
    state.outlookStatus = rows.length ? 'live' : 'unavailable';
    state.outlookAt = Date.now();
    return !!rows.length;
  }catch(e){ state.outlook27 = []; state.outlookStatus = 'unavailable'; return false; }
}
function outlookKp(y, m, d){
  const row = (state.outlook27 || []).find(r => r.y === y && r.m === m && r.d === d);
  return row ? row.kp : null;
}
/* The next elevated stretch beyond the ten-night view: a sentence, never a chart. Coronal holes
   come back round about every 27 days; CME storms never do. */
function recurrenceAhead(skipDays){
  const rows = state.outlook27 || [];
  if(!rows.length) return null;
  const cut = new Date(Date.now() + (skipDays || 10) * 86400000);
  const runs = [];
  let cur = null;
  rows.forEach(r => {
    const dt = new Date(Date.UTC(r.y, r.m, r.d));
    if(dt < cut || r.kp < 5){ if(cur){ runs.push(cur); cur = null; } return; }
    if(cur && (dt - cur.end) <= 86400000 * 1.5) cur.end = dt; else { if(cur) runs.push(cur); cur = { start: dt, end: dt, kp: r.kp }; }
    cur.kp = Math.max(cur.kp, r.kp);
  });
  if(cur) runs.push(cur);
  return runs.length ? runs[0] : null;
}

/* ============================ aurora v2: measured now, driven next, forecast later ============================
   Three sources answer the same question over different stretches of the night, and the job of
   everything below is to turn them into one likelihood for this site rather than three indices.

     up to now      Hp30, a half-hourly measurement of how disturbed the field actually is
     next 15-90 min the solar wind at L1, which has left the spacecraft and not yet arrived
     after that     NOAA's three-hourly Kp forecast, faded in as the live picture decays

   Kp is capped at 9 and averaged over three hours; Hp30 is neither, which is why it can carry a
   slope worth reading. That slope, crossed with the driving, is the whole of couplingState(). */

const AURORA_CAL = {
  A: 66.5, B: 2.07,                       // oval edge: boundaryLat = A - B x level
  OFFSET: { overhead: 0, eye: 3, camera: 6 },  // degrees equatorward the band is still reachable
  LIKELY: 1.0,                            // index units between "possible" and "likely"
  TAU_PERSIST_MIN: 90,                    // half life of confidence in the live picture
  HP_FRESH_MIN: 45,
  V_DEFAULT: 450,
  NEWELL_TO_G: [[0, 0], [1500, 2], [4000, 3.5], [8000, 5], [15000, 7], [25000, 8.5], [40000, 10]],
};

/* ---- Hp30: the measured half-hourly index, with estimated Kp as the understudy ---- */
const HP30_URL = 'https://kp.gfz.de/app/json/';
const KP_EST_URL = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json';
async function loadHp30(){
  const iso = t => new Date(t).toISOString().slice(0, 19) + 'Z';
  try{
    const url = HP30_URL + '?start=' + iso(Date.now() - 6 * 3600000) + '&end=' + iso(Date.now()) + '&index=Hp30';
    const r = await fetch(url);
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    const times = j.datetime || [], vals = j.Hp30 || [];
    const series = [];
    for(let i = 0; i < times.length; i++){
      const t = Date.parse(times[i]), v = Number(vals[i]);
      if(isFinite(t) && isFinite(v) && v >= 0) series.push({ t, v });
    }
    if(!series.length) throw new Error('no Hp30 rows');
    const last = series[series.length - 1];
    const age = (Date.now() - (last.t + 30 * 60000)) / 60000;
    if(age > AURORA_CAL.HP_FRESH_MIN) throw new Error('stale');
    state.hp30 = { series, source: 'hp30', at: last.t, age };
    state.hp30Status = 'live';
    return true;
  }catch(e){
    /* NOAA's minute estimate of the running 3-hour Kp: blunter, always there */
    try{
      const r = await fetch(KP_EST_URL);
      if(!r.ok) throw new Error('HTTP ' + r.status);
      const rows = await r.json();
      const raw = [];
      (Array.isArray(rows) ? rows : []).forEach(row => {
        const tag = String(row.time_tag);
        const t = Date.parse(tag + (/[zZ]$/.test(tag) ? '' : 'Z'));
        const v = Number(row.estimated_kp != null ? row.estimated_kp : row.kp_index);
        if(isFinite(t) && isFinite(v)) raw.push({ t, v });
      });
      if(!raw.length) throw new Error('no estimate rows');
      /* Bucketed to half hours so the slope means the same thing it would from Hp30: the estimate
         is a running 3-hour figure, so minute-to-minute differences are noise, not trend. */
      const buckets = new Map();
      raw.forEach(p => buckets.set(Math.floor(p.t / 1800000), p));
      const series = [...buckets.keys()].sort((a, b) => a - b).slice(-8).map(k => buckets.get(k));
      state.hp30 = { series, source: 'kpEst', at: series[series.length - 1].t, age: (Date.now() - series[series.length - 1].t) / 60000 };
      state.hp30Status = 'estimated';
      return true;
    }catch(e2){ state.hp30 = null; state.hp30Status = 'unavailable'; return false; }
  }
}

/* Level now, and which way it is going. The direction is the half of this the old model threw
   away: the same number rising and falling mean opposite things to somebody deciding to drive. */
/* blockKp is NOAA's value for the 3-hour block we are in. It matters because the two NOAA products
   disagree: the minute feed is a running estimate from a subset of observatories and can sit at
   0.00 while the 3-hour product for the same moment reads 1.33. The 3-hour figure is the more
   authoritative level, so it wins; the minute series is still the only thing with a usable slope,
   so it keeps the trend. Hp30, when we can reach it, does both jobs properly and ignores this. */
function setBlockKp(v){ state.blockKp = (v == null || !isFinite(v)) ? null : v; }
function hpNow(blockKp){
  const h = state.hp30;
  if(!h || !h.series.length) return null;
  const s = h.series;
  const est = h.source !== 'hp30';
  /* callers may pass it, but the stored value is the default so nightCurve, couplingState and
     anything added later cannot quietly read a different "now" from the rest of the screen */
  const bk = blockKp == null ? state.blockKp : blockKp;
  const v = (est && bk != null && isFinite(bk)) ? bk : s[s.length - 1].v;
  const prev = s.length > 1 ? s[s.length - 2].v : null;
  const prev2 = s.length > 2 ? s[s.length - 3].v : null;
  const d1 = prev == null ? null : v - prev;
  const d2 = prev2 == null ? null : prev - prev2;
  let dir = 'flat';
  if(d1 != null){
    const avg = d2 == null ? d1 : (d1 + d2) / 2;
    dir = avg >= 0.5 ? 'rising' : avg <= -0.5 ? 'falling' : 'flat';
  }
  return {
    value: v, prev, prev2, delta: d1, dir,
    source: h.source, at: h.at, age: h.age,
    estimated: est,
    fromBlock: est && blockKp != null && isFinite(blockKp),
    recent: s.slice(-6),
  };
}

/* ---- what the wind is doing, as numbers rather than a label ---- */
function newell(v, by, bz){
  const bp = Math.hypot(by == null ? 0 : by, bz);
  const theta = Math.abs(Math.atan2(by == null ? 0 : by, bz));
  return Math.pow(v, 4 / 3) * Math.pow(bp, 2 / 3) * Math.pow(Math.sin(theta / 2), 8 / 3);
}
function interp(pairs, x){
  if(x <= pairs[0][0]) return pairs[0][1];
  for(let i = 1; i < pairs.length; i++){
    if(x <= pairs[i][0]){
      const [x0, y0] = pairs[i - 1], [x1, y1] = pairs[i];
      return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
    }
  }
  return pairs[pairs.length - 1][1];
}
/* Driving, banked energy and how long the front of it still has to run. */
function windDerived(){
  const w = state.wind;
  if(!w || !w.series || !w.series.length) return null;
  const now = w.series[w.series.length - 1].t;
  const win = m => w.series.filter(s => now - s.t <= m * 60000);
  const mean = (a, f) => a.length ? a.reduce((x, y) => x + f(y), 0) / a.length : null;
  const m10 = win(10), m20 = win(20), m45 = win(45), m180 = win(180);
  const speed = w.speed || AURORA_CAL.V_DEFAULT;
  const bzSus = mean(m20, s => s.bz);
  /* least squares slope, nT per hour: negative is diving further south */
  let trend = null;
  if(m45.length > 4){
    const t0 = m45[0].t;
    const xs = m45.map(s => (s.t - t0) / 3600000), ys = m45.map(s => s.bz);
    const mx = mean(xs, x => x), my = mean(ys, y => y);
    let num = 0, den = 0;
    xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) * (x - mx); });
    trend = den ? num / den : null;
  }
  let southRun = 0;
  for(let i = w.series.length - 1; i >= 0; i--){ if(w.series[i].bz < -3) southRun = (now - w.series[i].t) / 60000 + 1; else break; }
  const nw20 = mean(m20, s => newell(speed, s.by, s.bz));
  const nw180 = mean(m180, s => newell(speed, s.by, s.bz));
  const sbzh = m180.reduce((a, s) => a + Math.max(0, -s.bz), 0) / 60;
  return {
    bzNow: mean(m10, s => s.bz), bzSus, trend, southRun: Math.round(southRun),
    nw20, nw180, sbzh,
    speed, speedAssumed: !w.speed,
    arrivalMin: Math.round(1.45e6 / speed / 60),
    gDriver: nw20 == null ? null : clamp(interp(AURORA_CAL.NEWELL_TO_G, nw20), 0, 11),
    strong: bzSus != null && bzSus <= -10,
    moderate: bzSus != null && bzSus <= -5,
    turningNorth: trend != null && trend >= 4 && (mean(m10, s => s.bz) || 0) > -5,
    loaded: sbzh >= 6, heavy: sbzh >= 15,
    stale: !!w.stale,
  };
}

/* ---- hemispheric power: the one number for how much energy is going into the sky ---- */
async function loadHemiPower(){
  try{
    const r = await fetch('https://services.swpc.noaa.gov/text/aurora-nowcast-hemi-power.txt');
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const txt = await r.text();
    const rows = txt.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
    if(!rows.length) throw new Error('empty');
    const p = rows[rows.length - 1].trim().split(/\s+/);
    const north = parseFloat(p[p.length - 2]), south = parseFloat(p[p.length - 1]);
    if(!isFinite(north) || !isFinite(south)) throw new Error('unparsed');
    state.hemiPower = { north, south, at: Date.now() };
    state.hemiStatus = 'live';
    return true;
  }catch(e){ state.hemiPower = null; state.hemiStatus = 'unavailable'; return false; }
}

/* ---- what any given level would mean from THIS site ----
   The oval swells equatorward as the index climbs, so the question is never "what is Kp" but
   "how far does it have to stretch to reach me". Three bands, each a level rather than a yes. */
function personalBands(lat, lon){
  const mlat = geomagLat(lat == null ? state.lat : lat, lon == null ? state.lon : lon);
  const abs = Math.abs(mlat);
  const band = off => {
    const possible = clamp((AURORA_CAL.A - (abs + off)) / AURORA_CAL.B, 0, 11);
    return { possible, likely: clamp(possible + AURORA_CAL.LIKELY, 0, 11) };
  };
  return {
    mlat, abs,
    camera: band(AURORA_CAL.OFFSET.camera),
    eye: band(AURORA_CAL.OFFSET.eye),
    overhead: band(AURORA_CAL.OFFSET.overhead),
    poleward: (lat == null ? state.lat : lat) >= 0 ? 'north' : 'south',
  };
}

/* Likelihood, not a verdict. A logistic across the possible-to-likely span, then knocked down by
   the sky actually in the way: cloud over that patch, the moon, the town glow behind it. */
function chanceAt(level, opts){
  opts = opts || {};
  const bands = opts.bands || personalBands();
  const cloud = opts.cloud == null ? 0.25 : clamp(opts.cloud / 100, 0, 1);
  const moon = (opts.moonUp ? 1 : 0) * (opts.moonIllum == null ? 0 : opts.moonIllum);
  const bortle = opts.bortle == null ? 4 : opts.bortle;
  const sky = Math.max(0, 1 - 0.9 * cloud);
  const one = (band, moonHit, glowHit) => {
    if(level == null) return null;
    const mid = (band.possible + band.likely) / 2;
    const raw = 1 / (1 + Math.exp(-(level - mid) / 0.42));
    return clamp(raw * sky * (1 - moonHit * moon) * (1 - glowHit * Math.max(0, bortle - 3)), 0, 0.97);
  };
  return { camera: one(bands.camera, 0.18, 0.025), eye: one(bands.eye, 0.5, 0.06) };
}
function chanceWord(p){
  if(p == null) return 'no reading';
  if(p >= 0.8) return 'very likely';
  if(p >= 0.55) return 'likely';
  if(p >= 0.3) return 'possible';
  return 'unlikely';
}

/* ---- the handover, as one curve ----
   Measured owns the present, the wind that has already left L1 owns the next hour or so, and past
   that the NOAA forecast fades in with a 90-minute half life. Nothing switches: it blends, which
   is why the line can be drawn continuously and the doubt drawn as a widening band. */
function nightCurve(win, kpSeries, opts){
  if(!win) return [];
  const hp = hpNow(), wd = windDerived();
  const eNow = hp ? hp.value : null;
  const now = Date.now();
  const arrival = now + (wd && wd.arrivalMin != null ? wd.arrivalMin : 45) * 60000;
  const kpAt = t => {
    if(!kpSeries || !kpSeries.length) return null;
    let best = null;
    kpSeries.forEach(k => { const kt = k.t || k.time; if(kt != null && kt <= t && (!best || kt > (best.t || best.time))) best = k; });
    return best ? (best.v != null ? best.v : best.kp) : null;
  };
  const from = Math.min(win.from, now), to = win.to;
  const slots = [];
  for(let t = from; t <= to; t += 15 * 60000){
    let level, source;
    if(t <= now){
      level = eNow; source = 'measured';
    } else if(t <= arrival){
      level = Math.max(eNow == null ? 0 : eNow, wd && wd.gDriver != null ? wd.gDriver : 0) || eNow;
      source = 'driver';
    } else {
      const base = Math.max(eNow == null ? 0 : eNow, wd && wd.gDriver != null ? wd.gDriver : 0) || eNow;
      const w = Math.exp(-(t - arrival) / (AURORA_CAL.TAU_PERSIST_MIN * 60000));
      const f = kpAt(t);
      level = f == null ? base : (base == null ? f : w * base + (1 - w) * f);
      source = w > 0.5 ? 'driver' : 'forecast';
    }
    if(level == null) continue;
    /* doubt grows with how far past measurement we are: a fifth of an index unit now, a unit and
       a half by the far end of the night */
    const hoursOut = Math.max(0, (t - now) / 3600000);
    const spread = t <= now ? 0.2 : Math.min(1.6, 0.25 + hoursOut * 0.28);
    slots.push({
      t, level, source, spread,
      chance: chanceAt(level, opts),
      lo: chanceAt(Math.max(0, level - spread), opts),
      hi: chanceAt(level + spread, opts),
    });
  }
  return slots;
}

/* ---- driving against response ----
   The pair, not either alone. Hard south with the ground index climbing is a display growing;
   hard south with it flat is energy going into the tail and not yet coming out; hard south with
   it falling is the gap between two of those. Same two readings, three different nights. */
function couplingState(){
  const hp = hpNow(), wd = windDerived();
  if(!hp && !wd) return { key: 'none', label: 'No live data', urgent: false, line: 'Waiting for the feeds.' };
  const dir = hp ? hp.dir : 'flat';
  const driving = !wd ? 'unknown' : wd.strong ? 'hard' : wd.moderate ? 'weak' : (wd.bzSus != null && wd.bzSus > 0 ? 'north' : 'weak');
  if(driving === 'hard' && dir === 'rising') return {
    key: 'climbing', label: 'Building', urgent: true,
    line: 'The wind has been pushing the right way and the disturbance measured here has climbed with it. Something is happening, and it is still growing.',
  };
  if(driving === 'hard' && dir === 'flat') return {
    key: 'loaded', label: 'Loaded', urgent: true,
    line: 'The wind has been pushing hard for hours, but the disturbance measured here has not moved with it. Energy is going in and not coming back out yet. When it does, it tends to arrive all at once.',
  };
  if(driving === 'hard' && dir === 'falling') return {
    key: 'between', label: 'Between bursts', urgent: false,
    line: 'The wind is still pushing, but the last burst here has passed its peak. Another is likely while the wind keeps up.',
  };
  if(driving === 'weak' && dir === 'rising') return {
    key: 'efficient', label: 'Responding', urgent: false,
    line: 'Only a modest push from the wind, but the sky here is reacting more than it usually would. Worth keeping an eye on.',
  };
  if(dir === 'falling' || (wd && wd.turningNorth)) return {
    key: 'easing', label: 'Easing', urgent: false,
    line: 'The wind has turned back north. What has built up already may still show, but nothing more is being added.',
  };
  if(driving === 'north') return { key: 'closed', label: 'Quiet', urgent: false, line: 'The wind is pointing the wrong way, which is the usual state of things.' };
  return { key: 'unsettled', label: 'Unsettled', urgent: false, line: 'Nothing much in the wind, and nothing much measured here.' };
}


/* ============================ airglow ============================
   The atmosphere's own light: green oxygen from a layer near 95 km, orange hydroxyl just below it,
   deep red oxygen higher up. Its brightness follows the solar cycle, and the standard proxy for the
   extreme-ultraviolet that drives the chemistry is the 10.7 cm radio flux, measured daily at
   Penticton since 1947. This is a fuel gauge for the spell you are in, never a per-night promise:
   the ripples and bands people photograph come from gravity waves in the weather below, and nobody
   forecasts those. */
const AIRGLOW_CAL = {
  LOW_MAX: 100, HIGH_MIN: 150,      // sfu, deliberately round and tunable
  FLARE_GUARD: 1.3,                 // a single reading this far above the running mean is a radio burst
  KP_STORM: 5, KP_AURORA_WINS: 7, MAGLAT_AURORA_WINS: 55,
  MIN_DARK_H: 1, MOON_ILLUM_MAX: 0.25, BORTLE_MAX: 4, CLEAR_MIN: 0.4,
  STALE_DAYS: 5,
};
const F107_URL = 'https://services.swpc.noaa.gov/json/f107_cm_flux.json';
async function loadF107(){
  try{
    const r = await fetch(F107_URL);
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const rows = await r.json();
    /* three readings a day; the 20:00 UT one is the official daily value and the only one that
       carries the running mean, so it is the series worth keeping */
    const noon = [];
    (Array.isArray(rows) ? rows : []).forEach(x => {
      const sched = String(x.reporting_schedule || '');
      const tag = String(x.time_tag || '');
      const isNoon = sched === 'Noon' || /T20:00/.test(tag);
      const flux = Number(x.flux);
      const t = Date.parse(tag + (/[zZ]$/.test(tag) ? '' : 'Z'));
      if(isNoon && isFinite(flux) && flux > 0 && isFinite(t)) noon.push({ t, flux, mean90: Number(x.ninety_day_mean) || null });
    });
    if(!noon.length) throw new Error('no daily values');
    noon.sort((a, b) => a.t - b.t);
    state.f107 = { noon, at: Date.now() };
    state.f107Status = 'live';
    return true;
  }catch(err){ if(!state.f107) state.f107 = null; state.f107Status = 'unavailable'; return false; }
}

/* Atomic oxygen at 95 km builds up over days, so the running level matters more than today's
   wobble: the effective flux is the daily value blended with the 27-day mean, one solar rotation. */
function airglowState(opts){
  const f = state.f107;
  if(!f || !f.noon.length) return null;
  opts = opts || {};
  const C = AIRGLOW_CAL;
  const now = Date.now();
  const win = f.noon.filter(r => now - r.t <= 27 * 86400000);
  const use = win.length ? win : f.noon;
  const mean27 = use.reduce((a, b) => a + b.flux, 0) / use.length;
  const latest = f.noon[f.noon.length - 1];
  const ageDays = (now - latest.t) / 86400000;
  const flare = latest.flux > C.FLARE_GUARD * mean27;
  const stale = ageDays > C.STALE_DAYS;
  const fEff = (flare || stale) ? mean27 : (latest.flux + mean27) / 2;
  const tier = fEff < C.LOW_MAX ? 'low' : fEff < C.HIGH_MIN ? 'moderate' : 'high';

  /* A storm reddens the sky at mid-latitudes independently of the flux, but where aurora is the
     likelier show it should be the aurora tile's story, not this one. */
  const kp = opts.kp == null ? null : opts.kp;
  const mlat = opts.mlat == null ? null : Math.abs(opts.mlat);
  const auroraWins = kp != null && (kp >= C.KP_AURORA_WINS || (kp >= C.KP_STORM && mlat != null && mlat > C.MAGLAT_AURORA_WINS));
  const storm = kp != null && kp >= C.KP_STORM && !auroraWins;

  const gates = [
    { key: 'flux', ok: tier === 'high' || (tier === 'moderate' && storm), why: 'the solar flux is only moderate' },
    { key: 'dark', ok: (opts.darkHours == null ? 0 : opts.darkHours) >= C.MIN_DARK_H, why: 'it never gets properly dark tonight' },
    { key: 'moon', ok: !opts.moonUp || (opts.moonIllum == null ? 0 : opts.moonIllum) <= C.MOON_ILLUM_MAX, why: 'the moon is up and bright enough to wash it out' },
    { key: 'sky', ok: (opts.bortle == null ? 9 : opts.bortle) <= C.BORTLE_MAX, why: 'this site is too light polluted for it to show' },
    { key: 'cloud', ok: (opts.clear == null ? 0 : opts.clear) >= C.CLEAR_MIN, why: 'there is too much cloud forecast' },
  ];
  const failed = gates.filter(x => !x.ok);
  return {
    fEff, tier, storm, mean27, latest: latest.flux, at: latest.t, ageDays, flare, stale,
    primed: failed.length === 0,
    failed: failed.map(x => x.key),
    /* naming the one thing in the way is useful; naming four is nagging */
    blocker: failed.length === 1 ? failed[0].why : null,
  };
}

window.NoctoEngine = {
  state, STEP, SHOWERS, BORTLE, ANT, SPO,
  loadAtlas, atlasSky, updateSky, nelmFor, bortleFor,
  loadWeather, loadClimatology, computeNight, computeAll,
  sunPos, moonPos, moonIllum, lstOf, eq2horiz, jdFrom, clamp, norm,
  clearFraction, rateFor, sampleSky, scoreOf, alphaOf,
  localParts, fmtTime, fmtDate, toUTC, pad, MONTHS, compass, tzOffset: () => state.tzOffset,
  nightChart, fovFraction, verdictWord, speedWord, sentence,
  tonight, realSky, nightSummary, sunTimes, moonTimes, fogRisk, loadKp, kpForNight, geocode, homeFromTimezone, MW_RA, MW_DEC,
  nightAnchor, sunriseOn, eclipsesFor, lunarEclipse, solarEclipse,
  nlcSeason, nlcWindows,
  geomagLat, ovalEdge, arcElevation, destPoint, auroraGeometry,
  loadSolarWind, windState, loadOvation, ovationAt, ovationScan,
  polewardGlow, allSkyGlow, COMPASS16, loadPolewardCloud, auroraThresholds,
  loadAlerts, watchFor, gToKp, loadOutlook27, outlookKp, recurrenceAhead,
  AURORA_CAL, loadHp30, hpNow, loadHemiPower, windDerived, newell,
  personalBands, chanceAt, chanceWord, nightCurve, couplingState,
  AIRGLOW_CAL, loadF107, airglowState, setBlockKp,
};
})();
