const { Schema, model } = require("mongoose");

const EleicaoSchema = new Schema({
 nome:String,
 tipo:{type:String, enum:["Geral","Municipal"], required:true},
 ativa:{type:Boolean, default:false}
});

module.exports = model("Eleicao", EleicaoSchema);
