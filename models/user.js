const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const findOrCreate = require('mongoose-findorcreate')

const userSchema = Schema({
    email: {
        type: String
    },
    accountNumber:{
        type: String
    },
    teamId:{
        type: String
    },
    bank: {
        type: Schema.Types.ObjectId,
        ref: 'Bank'
    },
    password: {
        type: String
    }
}, {
    timestamps: true
});

userSchema.plugin(findOrCreate);
module.exports = mongoose.model('Users', userSchema);