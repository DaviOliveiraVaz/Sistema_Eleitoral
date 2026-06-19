const { Schema, model } = require("mongoose");

const VotoSchema = new Schema({
  votos: {
    presidente: { type: String },
    governador: { type: String },
    senador: { type: String },
    deputadoFederal: { type: String },
    deputadoEstadual: { type: String },
    prefeito: { type: String },
    vereador: { type: String }
  },
  data: { type: Date, default: Date.now }
});

module.exports = model("Voto", VotoSchema, "Votos");