const { Schema, model } = require("mongoose");

const CandidatoSchema = new Schema({
  nome: { type: String, required: true },
  cpf: { type: String, required: true, unique: true },
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
});

module.exports = model("Candidato", CandidatoSchema, "Candidatos");