const {Schema, model} = require('mongoose');
const mongoose = require('mongoose');


const UserScema = new Schema({
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    _teleId: {
        type: String,
        required: true,
        unique: true
    },
    n:{
        type: Number,
        required: true,
    }
})
module.exports = model('User', UserScema)