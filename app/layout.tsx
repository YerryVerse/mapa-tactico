import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'ATLAS — Escenarios',description:'Explora el mundo y consulta acontecimientos documentados.',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="es"><body>{children}</body></html>;}
