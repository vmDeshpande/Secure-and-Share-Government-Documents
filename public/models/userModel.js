const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  contact: String,
  aadhar_number: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  documents: [
    {
      name: { type: String, required: true },        // filename or custom name
      fileType: { type: String, required: true },    // <-- add this line
      uploadDate: { type: Date, default: Date.now }, // when uploaded
      file: {                                       // reference to GridFS ObjectId
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
      },
    },
  ],
});

module.exports = mongoose.model('User', userSchema);
