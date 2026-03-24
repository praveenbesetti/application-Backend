const mongoose = require('mongoose');

const employeeSchema= new mongoose.Schema({
    name:{type:String},
    email:{type:String},
    phone:{type:String},
    password:{type:String}
})

 const  Employee=mongoose.model("Employee",employeeSchema)

  module.exports={Employee}