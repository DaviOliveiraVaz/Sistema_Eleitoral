const { Schema, model } = require("mongoose");

const CandidatoSchema = new Schema({
  nome: { type: String, required: true },
  cpf: { type: String, required: true, unique: true },
<<<<<<< HEAD
  numero: { type: Number, unique: true, sparse: true }, 
  cargo: { 
    type: String, 
    enum: ["Presidente", "Governador", "Senador", "Deputado Federal", "Deputado Estadual"]
  },
  partido: { type: String },

  dataNascimento: { type: Date, required: true },
  estado: { type: String, required: true },
  cidade: { type: String, required: true },

  nacionalidade: { type: String, required: true, default: "Brasileira" },
  slogan: { type: String },
  descricao: { type: String }, 
  votos: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ["Pendente", "Homologado", "Rejeitado"],
    default: "Pendente"
  },

  votou: { type: Boolean, default: false },
  senha: { type: String, required: true }
=======
  numero: { type: Number, required: true, unique: true },
  cargo: { 
    type: String, 
    required: true,
    enum: ["Presidente", "Governador", "Senador", "Deputado Federal", "Deputado Estadual"]
  },
  partido: { type: String, required: true },
  municipio: { type: String, required: true },
  idade: { type: Number, required: true },
  naturalidade: { type: String, required: false },
  nacionalidade: { type: String, required: true, default: "Brasileira" },
  votos: { type: Number, default: 0 },
  status: {
  type: String,
  enum: ["Pendente", "Homologado", "Rejeitado"],
  default: "Pendente"
}
>>>>>>> e077e616750ecbc5f6dee404d7c35f30468a753e
});

module.exports = model("Candidato", CandidatoSchema, "Candidatos");