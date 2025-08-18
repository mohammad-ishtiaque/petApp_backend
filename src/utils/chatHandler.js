function generateRoomId(sender, receiver) {
    return [ `${sender.role}:${sender.id}`, `${receiver.role}:${receiver.id}` ]
      .sort()
      .join("-");
  }

  module.exports = {
    generateRoomId
  };