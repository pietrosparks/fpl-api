const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const invitesSchema = Schema(
  {
    groupId: {
      type: String
    },
    token: {
      type: String
    },
    adminId: {
      type: String
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Invites', invitesSchema);
