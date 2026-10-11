import type { Metadata } from 'next';
import './globals.css';
import {SITE_NAME} from '../lib/identity';
export const metadata: Metadata = {title:SITE_NAME,description:'Explora el mundo y consulta acontecimientos documentados.',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="es"><body>{children}</body></html>;}
