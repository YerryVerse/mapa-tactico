import {it,expect,vi} from 'vitest';
import {languages} from '../../lib/languages';
import {number,date,resultCount,parseCoordinate} from '../../lib/locale-format';
import {lengthLabel} from '../../lib/localized-scale';
it('preserves distance units while localizing labels',()=>{expect(lengthLabel('en',1000)).toBe('1 km');expect(lengthLabel('en',200)).toBe('200 m');expect(lengthLabel('pnb-Arab',1000)).toContain('کلومیٹر');});
it('supports explicit number/date/plural conventions in every registered language',()=>{for(const l of languages){expect(number(l.id,12345.67)).toBeTruthy();expect(date(l.id,new Date('2026-10-11T00:00:00Z'))).toBeTruthy();expect(resultCount(l.id,1)).not.toContain('{count}');expect(resultCount(l.id,8)).not.toContain('{count}');}expect(number('es',12345.67)).toBe('12.345,67');expect(date('pnb-Arab',new Date('2026-10-11T00:00:00Z'))).toContain('اکتوبر');});
it('parses coordinates without discarding signs, Arabic or Indic digits',()=>{expect(parseCoordinate('−٦٩٫٨٨٤٥')).toBe(-69.8845);expect(parseCoordinate('१८,४७३७')).toBe(18.4737);expect(parseCoordinate('۱۸.۴۷۳۷')).toBe(18.4737);expect(parseCoordinate('')).toBeNaN();expect(parseCoordinate('1e9')).toBeNaN();expect(parseCoordinate('1,2,3')).toBeNaN();});
it('keeps Hausa numbers, dates, units and plurals when the browser lacks ha Intl data',()=>{
 const supported=Intl.NumberFormat.supportedLocalesOf.bind(Intl.NumberFormat);
 vi.spyOn(Intl.NumberFormat,'supportedLocalesOf').mockImplementation((locales,options)=>{
  const requested=typeof locales==='string'||locales instanceof Intl.Locale?[String(locales)]:Array.from(locales??[],String);
  return requested.includes('ha')?[]:supported(locales,options);
 });
 vi.spyOn(Intl.DateTimeFormat,'supportedLocalesOf').mockReturnValue([]);
 vi.spyOn(Intl.PluralRules,'supportedLocalesOf').mockReturnValue([]);
 try{
  expect(number('ha-Latn',12345.67)).toBe('12,345.67');
  expect(number('ha-Latn',-69.8845,{maximumFractionDigits:4,useGrouping:false})).toBe('-69.8845');
  expect(date('ha-Latn',new Date('2026-10-11T23:00:00-02:00'))).toBe('12 Oktoba, 2026');
  expect(date('ha-Latn',new Date('2026-01-01T00:00:00Z'))).toBe('1 Janairu, 2026');
  expect(lengthLabel('ha-Latn',1000)).toBe('1 km');
  expect(resultCount('ha-Latn',1)).toBe('Sakamako 1');
  expect(resultCount('ha-Latn',8)).toBe('Sakamako 8');
 }finally{vi.restoreAllMocks();}
});
