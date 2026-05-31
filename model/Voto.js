const { Schema, model } = require("mongoose");

const VotoSchema = new Schema({
<<<<<<< HEAD
//removi o EleitorID daqui
=======
  eleitorId: { 
    type: Schema.Types.ObjectId, 
    ref: "Eleitor", 
    required: true 
  },
>>>>>>> e077e616750ecbc5f6dee404d7c35f30468a753e

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