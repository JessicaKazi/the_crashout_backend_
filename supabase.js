import dotenv from 'dotenv';

// ALLOWING SUPABASE.JS TO GET ACCESS TO MY .ENV FILE'S CONTENT
dotenv.config();

// @noImplicitAny: false

// ---cut---
import { createClient } from '@supabase/supabase-js'

// Create Supabase client
export const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

// Upload images using standard upload
 export const uploadImages = async (file) => {
 
    const { data, error } = await supabase.storage.from('venues').upload(`images/${Date.now()}-${file.originalname}`, file.buffer);
    if (error) {
        console.error(error)
       return  error ;
    } else {
      const { path } = data;
      
      const imageFilePath = await supabase.storage.from("venues").getPublicUrl(path) ;

      const url = imageFilePath.data.publicUrl
      return url ;
    }

}

// Uploading the documents into the database 

export const uploadDocuments = async (file) =>{
    const { data, error } = await supabase.storage.from('venues').upload(`documents/${Date.now()}-${file.originalname}`, file.buffer);

    if(error){
        console.error(error);
        return  error;
    }

    else{
const { path } = data;

const documentUrl = await supabase.storage("venues").getPublicUrl(path);

const url = documentUrl.data.publicUrl;
return url;
    }
}