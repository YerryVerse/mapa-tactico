import Globe from '../../../components/map/Globe';
import {SITE_NAME} from '../../../lib/identity';
export const metadata={title:`Verificación cartográfica — ${SITE_NAME}`,robots:{index:false,follow:false}};
export default function QA(){return <main style={{height:'100dvh'}}><Globe diagnostics/></main>;}
