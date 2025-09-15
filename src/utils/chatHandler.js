function generateRoomId(sender, receiver) {
    const normalize = (party) => {
      const role = (party?.role || '').toUpperCase();
      const id = party?.id?.toString();
      return `${role}:${id}`;
    };

    return [ normalize(sender), normalize(receiver) ]
      .sort()
      .join("_");
  }

  module.exports = {
    generateRoomId
  };