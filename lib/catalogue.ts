import raw from '../content/context.json';
import {categories,readCatalogue} from './scenario-contract';
export const entries=readCatalogue(raw);
export const availableCategories=categories.filter(c=>entries.some(e=>e.category===c));
export async function loadContext(id:string){const entry=entries.find(e=>e.id===id);if(!entry)throw new Error('Entry unavailable');return readCatalogue([entry])[0];}
