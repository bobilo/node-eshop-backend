const Order = require('../models/Order')
const express = require('express')
const OrderItem = require('../models/OrderItem')
const Product = require('../models/Product')
const router = express.Router()
const stripe = require('stripe')(
    'sk_test_51JG0akIFCBL0Oy1uzPNWP428PmjYK0J8P24CMCOObMujMngmPgUKEVRnKPRLCMrW90Py2bfVScMH6ZCfgLHUB5Ub00Zn7TGGKT'
)

//list orders
router.get('/', async (req, res) => {
    const orderList = await Order.find()
        .populate('user', 'name')
        .sort({ dateOrdered: -1 })

    if (!orderList) {
        res.status(500).json({ success: false })
    }
    res.send(orderList)
})

//create order
router.post('/', async (req, res) => {
    const orderItemIds = Promise.all(
        req.body.orderItems.map(async (orderItem) => {
            let newOrderItem = new OrderItem({
                quantity: orderItem.quantity,
                product: orderItem.product,
            })
            newOrderItem = await newOrderItem.save()

            return newOrderItem._id
        })
    )
    const resolvedOrderItemsids = await orderItemIds

    const totalPrices = await Promise.all(
        resolvedOrderItemsids.map(async (orderItemId) => {
            const orderItem = await OrderItem.findById(orderItemId).populate(
                'product',
                'price'
            )
            const totalPrice = orderItem.product.price * orderItem.quantity
            return totalPrice
        })
    )

    const totalPrice = totalPrices.reduce((a, b) => a + b, 0)

    let order = new Order({
        orderItems: resolvedOrderItemsids,
        shippingAddress1: req.body.shippingAddress1,
        shippingAddress2: req.body.shippingAddress2,
        city: req.body.city,
        zip: req.body.zip,
        country: req.body.country,
        phone: req.body.phone,
        status: req.body.status,
        totalPrice: totalPrice,
        user: req.body.user,
    })
    order = await order.save()

    if (!order) return res.status(404).send('the order cannot be created')

    res.send(order)
})

router.post('/create-checkout-session', async (req, res) => {
    const orderItems = req.body

    if (!orderItems) {
        return res.status(400).send('checkout session cannot be created - check the order items')
    }

    const lineItems = await Promise.all(
        orderItems.map(async (orderItem) => {
            const product = await Product.findById(orderItem.product)
            return {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: product.name,
                    },
                    unit_amount: product.price * 100,
                },
                quantity: orderItem.quantity,
            }
        })
    )
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: 'http://localhost:4200/success',
        cancel_url: 'http://localhost:4200/error'
    })
    res.json({id: session.id})
})

//get order
router.get('/:id', async (req, res) => {
    const order = await Order.findById(req.params.id)
        .populate('user', 'name')
        .populate({
            path: 'orderItems',
            populate: {
                path: 'product',
                populate: 'category',
            },
        })

    if (!order) {
        res.status(500).json({ success: false })
    }
    res.send(order)
})

//update order status
router.put('/:id', async (req, res) => {
    const order = await Order.findByIdAndUpdate(
        req.params.id,
        {
            status: req.body.status,
        },
        { new: true }
    )

    if (!order) return res.status(404).send('the order cannot be updated')

    res.send(order)
})

//delete order
router.delete('/:id', async (req, res) => {
    const order = await Order.findByIdAndRemove(req.params.id).populate(
        'orderItems'
    )
    if (order) {
        order.orderItems.map(async (orderItem) => {
            await OrderItem.findByIdAndRemove(orderItem._id)
        })
        return res.status(200).json({
            success: true,
            message: 'the order has been deleted successfully',
        })
    } else {
        return res.status(404).json({
            success: false,
            message: 'order not found',
        })
    }
})

//get total sales
router.get('/get/totalsales', async (req, res) => {
    const totalSales = await Order.aggregate([
        { $group: { _id: null, totalsales: { $sum: '$totalPrice' } } },
    ])
    if (!totalSales) {
        return res.status(400).send('total sales could not be agrregated')
    }
    res.send({
        totalSales: totalSales.pop().totalsales,
    })
})

//get orders count
router.get(`/get/count`, async (req, res) => {
    const ordersCount = await Order.countDocuments()

    if (!ordersCount) {
        res.status(500).json({ success: false })
    }
    res.send({
        ordersCount: ordersCount,
    })
})

//list user orders
router.get('/get/userorders/:userid', async (req, res) => {
    const userOrderList = await Order.find({ user: req.params.userid })
        .populate({
            path: 'orderItems',
            populate: {
                path: 'product',
                populate: 'category',
            },
        })
        .sort({ dateOrdered: -1 })

    if (!userOrderList) {
        res.status(500).json({ success: false })
    }
    res.send(userOrderList)
})

module.exports = router
