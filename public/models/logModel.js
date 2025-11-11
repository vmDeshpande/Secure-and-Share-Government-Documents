const mongoose = require('mongoose');
const logSchema = new mongoose.Schema(
    { action: String, 
      timestamp: Date 
    }
);
module.exports = mongoose.model('Log', logSchema);
