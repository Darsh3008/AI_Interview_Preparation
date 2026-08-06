import mongoose, { mongo } from "mongoose";


const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        unique:true,
        required:true
    },
    credits:{
        type:Number,
        default:100
    }
}, {
    timestamps: true

})

const User = new mongoose.model("user", userSchema)

export default User

