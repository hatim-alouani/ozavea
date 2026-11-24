'use server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
function client(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; if(!url||!key) throw Error('Missing Supabase environment'); return createClient(url,key);}
export async function saveProduct(formData:FormData){
 const name={ar:String(formData.get('name_ar')||''),fr:String(formData.get('name_fr')||''),en:String(formData.get('name_en')||'')};
 const description={ar:String(formData.get('desc_ar')||''),fr:String(formData.get('desc_fr')||''),en:String(formData.get('desc_en')||'')};
 const price=Number(formData.get('price')); const discountRaw=formData.get('discount'); const discount=discountRaw?Number(discountRaw):null; const quantity=Number(formData.get('quantity')); const image_url=String(formData.get('image_url')||'');
 if(!name.ar.trim()||!name.fr.trim()||!name.en.trim()||!Number.isFinite(price)||price<0||!Number.isInteger(quantity)||quantity<0|| (discount!==null&&(!Number.isFinite(discount)||discount<0||discount>=price))) throw Error('Invalid product data');
 const {error}=await client().from('products').insert({name,description,price,discount_price:discount,quantity,image_url:image_url||null,active:true}); if(error)throw Error(error.message); revalidatePath('/ar'); revalidatePath('/fr'); revalidatePath('/en'); revalidatePath('/admin');
}
