const User = require('../models/User')
const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

//list users
router.get('/', async (req, res) => {
    const userList = await User.find().select('-passwordHash')

    if (!userList) {
        return res.status(500).json({
            success: false,
            message: 'no users found',
        })
    }
    res.send(userList)
})

//create user
router.post('/', async (req, res) => {
    let user = new User({
        name: req.body.name,
        email: req.body.email,
        passwordHash: bcrypt.hashSync(req.body.password, 10),
        phone: req.body.phone,
        isAdmin: req.body.isAdmin,
        apartment: req.body.apartment,
        city: req.body.city,
        country: req.body.country,
        street: req.body.street,
        zip: req.body.zip,
    })

    user = await user.save()

    if (!user) return res.status(400).send('the user cannot be created')

    res.send(user)
})

//get user
router.get('/:id', async (req, res) => {
    const user = await User.findById(req.params.id).select('-passwordHash')
    if (!user) {
        res.status(500).json({
            success: false,
        })
    }
    res.send(user)
})

//register user
router.post('/register', async (req, res) => {
    let user = new User({
        name: req.body.name,
        email: req.body.email,
        passwordHash: bcrypt.hashSync(req.body.password, 10),
        phone: req.body.phone,
        isAdmin: req.body.isAdmin,
        apartment: req.body.apartment,
        city: req.body.city,
        country: req.body.country,
        street: req.body.street,
        zip: req.body.zip,
    })

    user = await user.save()

    if (!user) return res.status(400).send('the user cannot be created')

    res.send(user)
})

//update user
router.put('/:id', async (req, res) => {
    const userExist = await User.findById(req.params.id)
    let newPassword
    if (req.body.password) {
        newPassword = bcrypt.hashSync(req.body.password, 10)
    } else {
        newPassword = userExist.passwordHash
    }

    const user = await User.findByIdAndUpdate(
        req.params.id,
        {
            name: req.body.name,
            email: req.body.email,
            passwordHash: newPassword,
            phone: req.body.phone,
            isAdmin: req.body.isAdmin,
            apartment: req.body.apartment,
            city: req.body.city,
            country: req.body.country,
            street: req.body.street,
            zip: req.body.zip,
        },
        { new: true }
    )

    if (!user) return res.status(404).send('the category cannot be updated')

    res.send(user)
})

//login user
router.post('/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email })
    const secret = process.env.secret

    if (!user) {
        return res.status(400).send('The user not found')
    }

    if (user && bcrypt.compareSync(req.body.password, user.passwordHash)) {
        const token = jwt.sign(
            {
                userId: user.id,
                isAdmin:  user.isAdmin
            },
            secret,
            { expiresIn: '1d' }
        )
        res.status(200).send({
            user: user.email,
            token: token,
        })
    } else {
        res.status(400).send('password is wrong!')
    }
})

//delete user
router.delete('/:id', (req, res) => {
    User.findByIdAndRemove(req.params.id)
        .then((user) => {
            if (user) {
                return res.status(200).json({
                    success: true,
                    message: 'the user is deleted',
                })
            } else {
                return res.status(404).json({
                    success: false,
                    message: 'user not found',
                })
            }
        })
        .catch((err) => {
            return res.status(500).json({
                success: false,
                error: err,
            })
        })
})

//get users count
router.get(`/get/count`, async (req, res) => {
    const userCount = await User.countDocuments()

    if (!userCount) {
        res.status(500).json({ success: false })
    }
    res.send({
        userCount: userCount,
    })
})

module.exports = router
