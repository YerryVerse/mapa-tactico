import {it,expect} from 'vitest';
import {languages} from '../../lib/languages';
import {number,date,resultCount,parseCoordinate} from '../../lib/locale-format';
import {lengthLabel} from '../../lib/localized-scale';
it('preserves distance units while localizing labels',()=>{expect(lengthLabel('en',1000)).toBe('1 km');expect(lengthLabel('en',200)).toBe('200 m');expect(lengthLabel('pnb-Arab',1000)).toContain('کلومیٹر');});
it('supports explicit number/date/plural conventions in every registered language',()=>{for(const l of languages){expect(number(l.id,12345.67)).toBeTruthy();expect(date(l.id,new Date('2026-10-11T00:00:00Z'))).toBeTruthy();expect(resultCount(l.id,1)).not.toContain('{count}');expect(resultCount(l.id,8)).not.toContain('{count}');}expect(number('es',12345.67)).toBe('12.345,67');expect(date('pnb-Arab',new Date('2026-10-11T00:00:00Z'))).toContain('اکتوبر');});
it('parses coordinates without discarding signs, Arabic or Indic digits',()=>{expect(parseCoordinate('−٦٩٫٨٨٤٥')).toBe(-69.8845);expect(parseCoordinate('१८,४७३७')).toBe(18.4737);expect(parseCoordinate('۱۸.۴۷۳۷')).toBe(18.4737);expect(parseCoordinate('')).toBeNaN();expect(parseCoordinate('1e9')).toBeNaN();expect(parseCoordinate('1,2,3')).toBeNaN();});
