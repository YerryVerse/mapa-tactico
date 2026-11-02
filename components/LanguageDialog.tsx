'use client';
import {useEffect,useRef} from 'react';
import {useLanguage} from './LanguageProvider';
import LanguageSelector from './LanguageSelector';

export default function LanguageDialog({open,onClose}:{open:boolean;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const outsidePress=useRef<{x:number;y:number;moved:boolean}|null>(null);
 const {t}=useLanguage();
 useEffect(()=>{
  const element=dialog.current;
  if(!element)return;
  if(open&&!element.open)element.showModal();
  else if(!open&&element.open)element.close();
 },[open]);
 return <dialog ref={dialog} className="map-panel language-dialog" aria-label={t('language')} onClose={onClose} onKeyDown={event=>{if(event.key==='Escape')event.stopPropagation();}}
  onPointerDown={event=>{const r=event.currentTarget.getBoundingClientRect();outsidePress.current=event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom?{x:event.clientX,y:event.clientY,moved:false}:null;}}
  onPointerMove={event=>{const press=outsidePress.current;if(press&&Math.hypot(event.clientX-press.x,event.clientY-press.y)>6)press.moved=true;}}
  onPointerCancel={()=>{outsidePress.current=null;}}
  onClick={event=>{const press=outsidePress.current;outsidePress.current=null;const r=event.currentTarget.getBoundingClientRect();if(press&&!press.moved&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))event.currentTarget.close();}}>
  <div className="panel-top"><h1>{t('language')}</h1><button type="button" className="icon-button" aria-label={t('close')} onClick={()=>dialog.current?.close()}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>
  <LanguageSelector autoFocus/>
 </dialog>;
}
