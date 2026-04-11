const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  }
});

const addressSchema = new mongoose.Schema({
  line1: String,
  line2: String,
  city: String,
  state: String,
  pincode: String,
  phone: String
});

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  items: [orderItemSchema],
  address: {
    type: addressSchema,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'CARD', 'UPI',"RAZORPAY"],
    default: 'COD'
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paymentIntentId: {
    type: String
  },
  paymentStatus: {
    type: String,
    default: 'succeeded'
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);

