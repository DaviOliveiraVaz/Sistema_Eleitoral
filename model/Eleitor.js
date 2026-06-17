const { Schema, model } = require("mongoose");

const EleitorSchema = new Schema({
  nome: { type: String, required: true },
  cpf: { type: String, required: true, unique: true },
  dataNascimento: { type: Date, required: true },
  idade: { type: Number, required: true },
  estado: { type: String, required: true },
  cidade: { type: String, required: true },
  sexo: { type: String, required: true, enum: ["Masculino", "Feminino"] },
  zona: { type: String, required: true },
  secao: { type: String, required: true },
  nacionalidade: { type: String, required: true, default: "Brasileira" },
  votou: { type: Boolean, default: false },
  senha: { type: String, required: true },
  ativo: { type: Boolean, default: true }
});

module.exports = model("Eleitor", EleitorSchema, "Eleitores");