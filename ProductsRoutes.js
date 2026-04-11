const express = require('express');
const router = express.Router();
const  Product = require("./models/Products");
const multer = require('multer');
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,"uploads/");
    },
    filename:function(req,file,cb){
        cb(null,Date.now() + path.extname(file.originalname));
    },
});
const upload = multer({storage:storage});

router.post("/add",upload.single("image"),async(req,res)=>{
    try{
        const newProduct = new Product({
            name:req.body.name,
            category:req.body.category,
            price:req.body.price,
            description:req.body.description,
            image:req.file.filename
        });
        await newProduct.save();
        res.status(201).json({message:"Product added successfully"});
    }
    catch(error){
        console.error("Error adding product:",error);
        res.status(500).json({message:"Failed to add product"}); 
    }  
    });

   router.get("/all",async(req,res)=>{
    const products = await Product.find();
    res.json(products);
   });

   router.get("/:id",async(req,res)=>{
    try{
        const product = await Product.findById(req.params.id);
        if(!product){
            return res.status(404).json({message:"Product Not Found"});
        }
        res.json(product);
    }
    catch(err){
        console.error(err);
        res.status(500).json({message:"server error"});
    }
   });

   router.delete("/delete/:id",async(req,res)=>{
    try{
        const product = await Product.findById(req.params.id);
        if(!product){
            return res.status(404).json({message:"Product not found"});
        }
        const imagePath = "uploads/"+product.image;

        fs.unlink(imagePath,(err)=>{
            if(err){
                console.error("Error deleting image:",err);
            }
        });


        await Product.findByIdAndDelete(req.params.id);
        res.json({message:"Product deleted successfully"});
    }
    catch(error){
        console.error("Error deleting product:",error);
        res.status(500).json({message:"Failed to delete product"});
    }
   });
   router.put("/:id",upload.single("image"),async(req,res)=>{
    try{
        const UpdateData ={
            name:req.body.name,
            category:req.body.category,
            price:req.body.price,
            description:req.body.description,
        };
        if(req.file){
            const product = await Product.findById(req.params.id);

            if(product.image){
                const oldImagePath = "uploads/"+product.image;
                fs.unlink(oldImagePath,(err)=>{
                    if(err){
                        console.error("Error deleting old image:",err);
                    }
                });
            }
            UpdateData.image = req.file.filename;
        }
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id,UpdateData,{new:true});
        res.json(updatedProduct);
    }
    catch(error){
        res.status(500).json({error:error.message});
    }
   });
module.exports = router;