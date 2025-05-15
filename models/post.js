const mongoose = require ('mongoose')

const postSchema = mongoose.Schema ({
    user:{type:mongoose.Schema.Types.ObjectId, ref: 'user'},
    data:{
        type: Date,
        default: Date.now
    },
    caption: String,
    body:String,
    likes: [
        {
            type: mongoose.Schema.Types.ObjectId, ref: 'user'
        }
    ]
})


module.exports = mongoose.model ('post', postSchema)