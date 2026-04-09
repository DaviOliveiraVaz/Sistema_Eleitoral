const { Schema, model } = require("mongoose");

const VotoSchema = new Schema({
  eleitorId: { 
    type: Schema.Types.ObjectId, 
    ref: "Eleitor", 
    required: true 
  },

  votos: {
    presidente: { type: Schema.Types.ObjectId, ref: "Candidato" },
    governador: { type: Schema.Types.ObjectId, ref: "Candidato" },
    senador: { type: Schema.Types.ObjectId, ref: "Candidato" },
    deputadoFederal: { type: Schema.Types.ObjectId, ref: "Candidato" },
    deputadoEstadual: { type: Schema.Types.ObjectId, ref: "Candidato" }
  },

  data: { type: Date, default: Date.now }
});

module.exports = model("Voto", VotoSchema, "Votos");