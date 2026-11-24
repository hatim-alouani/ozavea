import { locales, type Locale } from '@/lib/i18n';
import { supabasePublic } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Storefront from '@/components/store/storefront';
export default async function StorePage({params}:{params:Promise<{locale:string}>}){
 const {locale}=await params; if(!locales.includes(locale as Locale)) notFound();
 let products:any[]=[]; try{const {data,error}=await supabasePublic().from('products').select('*').eq('active',true).order('created_at',{ascending:false}).limit(12); if(!error&&data)products=data;}catch{}
 return <Storefront locale={locale as Locale} databaseProducts={products}/>;
}
