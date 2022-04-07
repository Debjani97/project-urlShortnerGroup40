const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
    
    urlCode: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },

    longUrl: { 
        type: String, 
        required: true,
       // unique: true,
        trim: true
    },  //check in db if longurl exists or not

    shortUrl: {
        type: String,
        required: true, 
        unique: true,
        trim: true
    },
    
}, { timestamps: true })
module.exports = mongoose.model('urls', urlSchema)