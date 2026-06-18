const { Schema, model } = require("mongoose");

const CandidatoSchema = new Schema({
  nome: { type: String, required: true },
  cpf: { type: String, required: true, unique: true },
  numero: { type: Number, unique: true, sparse: true }, 
  cargo: { 
    type: String, 
    enum: ["Presidente", "Governador", "Senador", "Deputado Federal", "Deputado Estadual", "Prefeito", "Vereador"]
  },
  partido: { type: String },
  dataNascimento: { type: Date, required: true },
  idade: { type: Number, required: true },
  estado: { type: String, required: true },
  cidade: { type: String, required: true },
  sexo: { type: String, required: true, enum: ["Masculino", "Feminino"] },
  zona: { type: String, required: true },
  secao: { type: String, required: true },
  nacionalidade: { type: String, required: true, default: "Brasileira" },
  slogan: { type: String },
  descricao: { type: String }, 
  votos: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["Nenhuma", "Pendente", "Homologado", "Rejeitado"],
    default: "Nenhuma"
  },
  votouGeral: { type: Boolean, default: false },
  votouMunicipal: { type: Boolean, default: false },
  
  historicoCandidaturas: [{
    cargo: String,
    numero: Number,
    partido: String,
    statusFinal: String,
    dataRegistro: { type: Date, default: Date.now }
  }],

  senha: { type: String, required: true },
  ativo: { type: Boolean, default: true }
});

module.exports = model("Candidato", CandidatoSchema, "Candidatos");