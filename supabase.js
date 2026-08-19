import dotenv from 'dotenv';

// ALLOWING SUPABASE.JS TO GET ACCESS TO MY .ENV FILE'S CONTENT
dotenv.config();

// @noImplicitAny: false

// ---cut---
import { createClient } from '@supabase/supabase-js'

// Create Supabase client
export const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

// Upload images using standard upload
const uploadImages = async (file, res) => {

    const { data, error } = await supabase.storage.from('venue').upload(`images/${Date.now()}-${file.originalname}`, file.buffer)
    if (error) {
        console.error(error)
        res.status(400).json({ message: "Unable to load the image into supabase" });
    } else {
        res.status(200).json({ message: "Successfully loaded the images into supabase", data })
    }

}