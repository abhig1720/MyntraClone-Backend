const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name:String,
    category:String,
    price:Number,
    description:String,
    image:String,
    createdAt:{
        type:Date,
        default:Date.now
    }
});

module.exports = mongoose.model("Product",productSchema);