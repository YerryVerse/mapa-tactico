'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {DEFAULT_LANGUAGE,languages,readLanguage,rememberLanguage,type Language} from '../lib/languages';
import {message,type MessageKey} from '../lib/messages';
const LanguageContext=createContext<{language:Language;setLanguage:(language:Language)=>void;t:(key:MessageKey)=>string}>({language:DEFAULT_LANGUAGE,setLanguage:()=>{},t:key=>message(DEFAULT_LANGUAGE,key)});
export function LanguageProvider({children}:{children:React.ReactNode}){
 const [language,setCurrent]=useState<Language>(DEFAULT_LANGUAGE);
 useEffect(()=>{const frame=window.requestAnimationFrame(()=>{let storage:Storage|null=null;try{storage=window.localStorage;}catch{}setCurrent(readLanguage(storage));});return()=>window.cancelAnimationFrame(frame);},[]);
 const setLanguage=(next:Language)=>{setCurrent(next);let storage:Storage|null=null;try{storage=window.localStorage;}catch{}rememberLanguage(storage,next);};
 const t=(key:MessageKey)=>message(language,key);
 useEffect(()=>{document.documentElement.lang=language;document.documentElement.dir=languages.find(l=>l.id===language)!.dir;document.querySelector('meta[name="description"]')?.setAttribute('content',message(language,'metadataDescription'));},[language]);
 return <LanguageContext.Provider value={{language,setLanguage,t}}>{children}</LanguageContext.Provider>;
}
export const useLanguage=()=>useContext(LanguageContext);
