const paths:Record<string,string>={
knob:'<circle cx="12" cy="12" r="8"/><path d="m12 12 4-5M4 21h16"/>',
palette:'<circle cx="12" cy="12" r="9"/><circle cx="8" cy="8" r="1"/><circle cx="15" cy="7" r="1"/><circle cx="7" cy="14" r="1"/><path d="M20 15h-5l-2 5"/>',
sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
plant:'<path d="M5 15h14l-2 7H7zM12 15V7m0 5C4 12 4 3 4 3s9 0 8 9m0-2c0-7 8-8 8-8s1 8-8 8"/>',
drop:'<path d="M12 2S4 11 4 15a8 8 0 0 0 16 0c0-4-8-13-8-13z"/>',
piano:'<rect x="2" y="5" width="20" height="15" rx="2"/><path d="M7 5v15m5-15v15m5-15v15M5 5v7m5-7v7m5-7v7m5-7v7"/>',
key:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M7 7V3h10v4m-9 6h8"/>',
speaker:'<path d="m3 9 5 0 5-5v16l-5-5H3zm14-2c4 3 4 7 0 10m-2-7c1 1 1 3 0 4"/>',
screen:'<rect x="2" y="4" width="20" height="15" rx="2"/><path d="M8 23h8m-4-4v4M6 10h5m-5 4h12"/>',
temperature:'<path d="M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0zm3-7v11"/>',
servo:'<rect x="4" y="9" width="16" height="12" rx="2"/><circle cx="12" cy="9" r="3"/><path d="M12 6V2m-5 0h10"/>',
power:'<path d="M12 2v10m-6-7a9 9 0 1 0 12 0"/>',
wifi:'<path d="M2 7a16 16 0 0 1 20 0M5 11a11 11 0 0 1 14 0m-11 4a6 6 0 0 1 8 0"/><circle cx="12" cy="20" r="1"/>',
browser:'<rect x="2" y="3" width="20" height="18" rx="2"/><path d="M2 8h20m-16-3h1m3 0h1"/>',
message:'<path d="M21 11a8 8 0 0 1-8 8H8l-5 3 1-6a8 8 0 1 1 17-5Z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/>',
home:'<path d="m3 11 9-8 9 8M5 10v11h5v-7h4v7h5V10"/>',
book:'<path d="M12 5v16M3 4c3-1 6-1 9 1 3-2 6-2 9-1v15c-3-1-6-1-9 1-3-2-6-2-9-1z"/>',
chip:'<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 3v3m6-3v3M9 18v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3"/><rect x="9" y="9" width="6" height="6"/>',
play:'<path d="m9 5 11 7-11 7z"/>',stop:'<rect x="6" y="6" width="12" height="12" rx="1"/>',
settings:'<path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3z"/><circle cx="12" cy="12" r="3"/>',
globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 9h18M3 15h18"/>',
left:'<path d="m14 5-7 7 7 7"/>',right:'<path d="m10 5 7 7-7 7"/>',
rotateLeft:'<path d="M5 8a7 7 0 1 1-1 7M5 3v5h5"/>',rotateRight:'<path d="M19 8a7 7 0 1 0 1 7M19 3v5h-5"/>',
minus:'<path d="M5 12h14"/>',plus:'<path d="M5 12h14M12 5v14"/>',
reset:'<path d="M5 8a7 7 0 1 1-1 7M5 3v5h5"/>',
flow:'<circle cx="12" cy="12" r="9"/><path d="M12 4v16m-3-5 3 3 3-3"/>',
schematic:'<path d="M2 12h4l2-5 4 10 4-10 2 5h4"/>',
copy:'<rect x="8" y="7" width="12" height="14" rx="2"/><path d="M16 7V3H4v14h4"/>',
expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
collapse:'<path d="M3 8h5V3m8 0v5h5M3 16h5v5m8 0v-5h5"/>',
close:'<path d="m6 6 12 12M18 6 6 18"/>',
focus:'<circle cx="12" cy="12" r="5"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5"/>',
bulb:'<path d="M9 18h6m-6 3h6m-6-7c-5-5-2-11 3-11s8 6 3 11l-1 2h-4z"/>',
wave:'<path d="M2 13h4V6h5v12h5V6h4v7h2"/>',
clock:'<circle cx="12" cy="13" r="8"/><path d="M9 2h6m-3 4v7l3 2"/>',
send:'<path d="m3 3 19 9-19 9 4-9zm4 9h15"/>'
};
export function icon(name:string,size=20){return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.chip)+'</svg>';}
export function thumb(kind:string){
 let body='';
 if(['serial','clock','alarm'].includes(kind)){const symbols:Record<string,string>={serial:'&gt;_ 115200',clock:'millis()',alarm:'ALARM'};return '<svg class="thumb" viewBox="0 0 96 70" aria-hidden="true"><path d="m13 19 62-5 8 39-64 5z" fill="#3c505a" stroke="#303647" stroke-width="2"/><path d="m22 25 45-4 4 23-45 4z" fill="#20373d"/><text x="47" y="36" text-anchor="middle" fill="#b8d8cc" font-size="8" font-family="monospace">'+symbols[kind]+'</text><path d="m28 53 35-3" stroke="#b9a260" stroke-width="4" stroke-dasharray="2 3"/></svg>';}
 if(kind==='plant'||kind==='project'){
  const plant='<path d="m27 40 43-5-7 29-29 1z" fill="#bd8767" stroke="#303647" stroke-width="2"/><ellipse cx="48" cy="39" rx="22" ry="6" fill="#73553e" stroke="#303647"/><path d="M48 38V15" stroke="#537e59" stroke-width="3"/><path d="M48 27C20 28 21 6 21 6s27 0 27 21m0-7C48 0 75 2 75 2s-1 24-27 18" fill="#75a16b" stroke="#3d644f" stroke-width="2"/>';
  body=kind==='plant'?plant:'<g transform="translate(-6 10) scale(.75)">'+plant+'</g><path d="M45 46h9" fill="none" stroke="#699b95" stroke-width="2"/><rect x="52" y="34" width="38" height="27" rx="4" fill="#426777" stroke="#303647" stroke-width="2"/><rect x="57" y="39" width="28" height="17" rx="1" fill="#203c43"/><path d="M62 47h4l3-4 4 8 4-5h4" fill="none" stroke="#a9d5cf" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M57 17a22 22 0 0 1 28 0m-23 6a14 14 0 0 1 18 0" fill="none" stroke="#5b928d" stroke-width="3" stroke-linecap="round"/><circle cx="71" cy="29" r="2" fill="#5b928d"/>';
 }
 else if(kind==='piano')body='<path d="m10 25 63-5 13 28-65 9z" fill="#3e545c" stroke="#303647" stroke-width="2"/>'+Array.from({length:8},(_,i)=>'<path d="m'+(14+i*7.7)+' 29 6-.5 8 18-6 .6z" fill="#eee8d8" stroke="#69736c"/>').join('');
 else if(kind==='light')body='<path d="M59 43V14m-13 0h27L62 2z" fill="#c6a66b" stroke="#303647" stroke-width="2"/><ellipse cx="59" cy="47" rx="21" ry="5" fill="#b5a88a" stroke="#303647"/><circle cx="24" cy="39" r="11" fill="#c99c62" stroke="#303647" stroke-width="2"/><path d="m19 33 0 11 4-11 0 11 4-11 0 11" fill="none" stroke="#6d5045"/>';
 else if(kind==='board')body='<path d="m10 22 53-10 23 32-53 12z" fill="#36464d" stroke="#303647" stroke-width="2"/><path d="m37 18 20-4 11 15-20 4z" fill="#b9bdb5" stroke="#303647"/><path d="m12 28 12-3 6 9-12 3z" fill="#c6c7bb" stroke="#303647"/><path d="m16 40 48-9m-30 19 44-9" stroke="#b8a362" stroke-width="5" stroke-dasharray="2 3"/><text x="39" y="43" fill="#efead9" font-size="8">ESP32</text>';
 else if(kind==='led'||kind==='rgb')body='<path d="M43 39v22m11-22v18" stroke="#666a68" stroke-width="3"/><path d="M35 31V19a13 13 0 0 1 26 0v12z" fill="'+(kind==='rgb'?'#ab76bf':'#c95e4f')+'" stroke="#303647" stroke-width="2"/><ellipse cx="48" cy="31" rx="15" ry="4" fill="#ae6c61" stroke="#303647"/><path d="M41 15c0-5 4-7 7-7" stroke="#f3d5c4" stroke-width="3"/>';
 else if(kind==='button')body='<path d="m19 32 33-10 27 17-35 13z" fill="#424851" stroke="#303647" stroke-width="2"/><path d="m19 32 1 10 25 17 34-10V39" fill="#343944" stroke="#303647"/><ellipse cx="48" cy="27" rx="16" ry="11" fill="#c65e4e" stroke="#303647" stroke-width="2"/><path d="M25 45v10m45-7v10" stroke="#adb4ad" stroke-width="3"/>';
 else if(kind==='pot')body='<path d="m28 34 22-5 15 10-22 6z" fill="#5983a4" stroke="#303647"/><path d="M30 34v16l15 10 20-6V39" fill="#334f6d" stroke="#303647" stroke-width="2"/><path d="M37 14h21v23H37z" fill="#424852"/><ellipse cx="48" cy="14" rx="11" ry="6" fill="#5b5e64" stroke="#303647"/><path d="M45 10v9" stroke="#e6decb" stroke-width="2"/>';
 else if(kind==='oled'||kind==='browser')body='<path d="m15 18 57-6 8 36-56 8z" fill="#426777" stroke="#303647" stroke-width="2"/><path d="m23 23 42-4 5 23-42 4z" fill="#203c43"/><path d="m30 29 23-2m-22 8 31-3" stroke="#a9d5cf" stroke-width="2"/><path d="m29 53 39-4" stroke="#b7a167" stroke-width="5" stroke-dasharray="2 3"/>';
 else if(kind==='router')body='<path d="m15 37 42-8 24 13-45 9z" fill="#dedccf" stroke="#303647" stroke-width="2"/><path d="M21 34V12m49 21V10" stroke="#38444e" stroke-width="4"/><path d="m33 40 21-4" stroke="#65a691" stroke-width="3"/>';
 else if(kind==='servo')body='<path d="m28 24 25-5 15 11v24l-26 5-14-10z" fill="#47729d" stroke="#303647" stroke-width="2"/><ellipse cx="47" cy="22" rx="9" ry="5" fill="#d4d6cf" stroke="#303647"/><path d="m25 24 42-9" stroke="#eeeadc" stroke-width="5"/>';
 else if(kind==='buzzer')body='<path d="M30 22v24c0 12 36 12 36 0V22" fill="#303846" stroke="#303647" stroke-width="2"/><ellipse cx="48" cy="22" rx="18" ry="11" fill="#495361" stroke="#303647" stroke-width="2"/><ellipse cx="48" cy="22" rx="4" ry="3" fill="#202936"/><path d="M38 53v9m20-9v9" stroke="#959d97" stroke-width="2"/>';
 else body='<path d="M35 27h26v20H35z" fill="#303a44" stroke="#303647" stroke-width="2"/><path d="M36 27a12 10 0 0 1 24 0" fill="#35424c" stroke="#303647" stroke-width="2"/><path d="M39 46v17m9-17v17m9-17v17" stroke="#b0b6ae" stroke-width="2"/><text x="36" y="40" font-size="7" fill="#e8e7d9">TMP36</text>';
 return '<svg class="thumb" viewBox="0 0 96 70" aria-hidden="true">'+body+'</svg>';
}
