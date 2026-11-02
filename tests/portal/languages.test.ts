import {describe,it,expect} from 'vitest';
import {languages,initialLanguage,matchLanguage,readLanguage,rememberLanguage} from '../../lib/languages';
import {messages} from '../../lib/messages';
describe('language negotiation and storage',()=>{
 it('has twenty distinct native options, including Western Punjabi',()=>{expect(languages).toHaveLength(20);expect(new Set(languages.map(l=>l.id)).size).toBe(20);expect(languages.filter(l=>l.dir==='rtl').map(l=>l.id)).toEqual(['ar','ur','pnb-Arab']);});
 it('starts in English without a valid saved manual choice',()=>{expect(initialLanguage('ar')).toBe('ar');expect(initialLanguage('es')).toBe('es');expect(initialLanguage('bad')).toBe('en');expect(initialLanguage(null)).toBe('en');expect(readLanguage(null)).toBe('en');});
 it('does not silently substitute Traditional Chinese or Eastern Punjabi',()=>{expect(matchLanguage('zh-TW')).toBeNull();expect(matchLanguage('zh-Hant')).toBeNull();expect(matchLanguage('zh-CN')).toBe('zh-Hans');expect(matchLanguage('pa-IN')).toBeNull();expect(matchLanguage('pa-Arab-PK')).toBe('pnb-Arab');expect(matchLanguage('ha-NG')).toBe('ha-Latn');});
 it('survives storage failures and malformed persisted values',()=>{const broken={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}};expect(readLanguage(broken)).toBe('en');expect(()=>rememberLanguage(broken,'ja')).not.toThrow();expect(readLanguage({getItem:()=>'{"id":"ar"}'})).toBe('en');});
 it('catalogue keys match extracted vocabulary',()=>{const keys=Object.keys(messages.es).sort();for(const l of languages){expect(Object.keys(messages[l.id]).sort()).toEqual(keys);expect(Object.values(messages[l.id]).every(v=>v.trim().length>0)).toBe(true);}});
});
