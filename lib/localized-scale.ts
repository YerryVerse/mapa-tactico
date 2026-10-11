import type {Map,IControl} from 'maplibre-gl';
import type {Language} from './languages';
import {number} from './locale-format';
export function lengthLabel(language:Language,meters:number){
 const value=meters>=1000?meters/1000:meters,unit=meters>=1000?'kilometer':'meter';
 if(language==='pnb-Arab')return `${number(language,value)} ${unit==='kilometer'?'کلومیٹر':'میٹر'}`;
 return number(language,value,{style:'unit',unit,unitDisplay:'short',maximumFractionDigits:2});
}
export class LocalizedScale implements IControl{
 private map?:Map;private element?:HTMLDivElement;
 constructor(private language:Language){}
 setLanguage(language:Language){this.language=language;this.update();}
 onAdd(map:Map){this.map=map;this.element=document.createElement('div');this.element.className='maplibregl-ctrl maplibregl-ctrl-scale';this.element.dir='auto';map.on('move',this.update);this.update();return this.element;}
 onRemove(){this.map?.off('move',this.update);this.element?.remove();this.map=undefined;}
 private update=()=>{
  if(!this.map||!this.element||this.map.getZoom()<8)return;
  const c=this.map.getCenter(),pixel=this.map.project(c),a=this.map.unproject(pixel),b=this.map.unproject([pixel.x+100,pixel.y]);
  const rad=Math.PI/180,h=Math.sin((b.lat-a.lat)*rad/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin((b.lng-a.lng)*rad/2)**2;
  const meters=2*6371008.8*Math.asin(Math.sqrt(Math.min(1,h)));
  if(!Number.isFinite(meters)||meters<=0)return;
  const magnitude=10**Math.floor(Math.log10(meters)),nice=[5,3,2,1].find(n=>n*magnitude<=meters)??1,value=nice*magnitude;
  this.element.style.width=`${100*value/meters}px`;this.element.textContent=lengthLabel(this.language,value);
 };
}
