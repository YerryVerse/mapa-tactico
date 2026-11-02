import type { Metadata } from 'next';
import './globals.css';
import {SITE_NAME} from '../lib/identity';
import {LanguageProvider} from '../components/LanguageProvider';
import {DEFAULT_LANGUAGE} from '../lib/languages';
import {message} from '../lib/messages';
export const metadata: Metadata = {title:SITE_NAME,description:message(DEFAULT_LANGUAGE,'metadataDescription'),icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang={DEFAULT_LANGUAGE} dir="ltr"><body><LanguageProvider>{children}</LanguageProvider></body></html>;}
