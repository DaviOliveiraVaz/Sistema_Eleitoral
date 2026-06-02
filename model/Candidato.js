const { Schema, model } = require("mongoose");

const CandidatoSchema = new Schema({
  nome: { type: String, required: true },
  cpf: { type: String, required: true, unique: true },
  numero: { type: Number, unique: true, sparse: true }, 
  cargo: { 
    type: String, 
    enum: ["Presidente", "Governador", "Senador", "Deputado Federal", "Deputado Estadual"]
  },
  partido: { type: String },
  dataNascimento: { type: Date, required: true },
  idade: { type: Number, required: true },
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
  senha: { type: String, required: true }
});

module.exports = model("Candidato", CandidatoSchema, "Candidatos");