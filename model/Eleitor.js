const { Schema, model } = require("mongoose");

const EleitorSchema = new Schema({
  nome: { type: String, required: true },
  cpf: { type: String, required: true, unique: true },
  municipio: { type: String, required: true },
  idade: { type: Number, required: true },
  naturalidade: { type: String, required: false },
  nacionalidade: { type: String, required: true, default: "Brasileira" }
});

module.exports = model("Eleitor", EleitorSchema, "Eleitores");