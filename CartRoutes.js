const express = require('express');
const router = express.Router();
const Cart = require('./models/Cart');
const usersmodel = require('./models/users');
const Product = require('./models/Products');

const getCart = async (userId) => {
  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = new Cart({ userId, items: [] });
    await cart.save();
  }
  return cart.populate('items.product');
};


router.post('/addToCart', express.json(), async (req, res) => {
  try {
    const { userId, productId, quantity = 1 } = req.body;
    if (!userId || !productId) {
      return res.status(400).json({ message: "userId and productId required" });
    }

    const cart = await getCart(userId);
    const existingItemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    
    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }
    
    await cart.save();
    await cart.populate('items.product');
    res.json({ message: "Added to cart", cart: cart.items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const cart = await getCart(userId);
    res.json(cart.items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


router.delete('/removeFromCart/:userId/:productId', async (req, res) => {
  try {
    const { userId, productId } = req.params;
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    cart.items = cart.items.filter(item => item.product.toString() !== productId);
    await cart.save();
    res.json({ message: "Removed from cart" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


router.put('/updateCart/:userId/:productId', express.json(), async (req, res) => {
  try {
    const { userId, productId } = req.params;
    const { quantity } = req.body;
    if (quantity <= 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }
    
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    
    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not in cart" });
    }
    
    cart.items[itemIndex].quantity = quantity;
    await cart.save();
    res.json({ message: "Updated cart" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

