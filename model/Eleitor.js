const { Schema, model } = require("mongoose");

const EleitorSchema = new Schema({
  nome: { type: String, required: true },
  cpf: { type: String, required: true, unique: true },
<<<<<<< HEAD

  dataNascimento: { type: Date, required: true },
  estado: { type: String, required: true },
  cidade: { type: String, required: true },

  nacionalidade: { type: String, required: true, default: "Brasileira" },
  votou: { type: Boolean, default: false },
  senha: { type: String, required: true }
=======
  municipio: { type: String, required: true },
  idade: { type: Number, required: true },
  naturalidade: { type: String, required: false },
  nacionalidade: { type: String, required: true, default: "Brasileira" },
  votou: { type: Boolean, default: false }
>>>>>>> e077e616750ecbc5f6dee404d7c35f30468a753e
});

module.exports = model("Eleitor", EleitorSchema, "Eleitores");