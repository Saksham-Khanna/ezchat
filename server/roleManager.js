const roomManager = require('./roomManager');

const canPerformAction = (networkId, roomId, userId, action) => {
  const room = roomManager.getRoom(networkId, roomId);
  if (!room) return false;

  const member = room.members.find(m => m.userId === userId);
  if (!member) return false;

  const role = member.role;

  switch (action) {
    case 'rename':
    case 'delete':
    case 'close':
    case 'promote':
    case 'demote':
      return role === 'admin';
    case 'remove_user':
      return role === 'admin' || role === 'manager';
    case 'invite':
      return role === 'admin' || role === 'manager';
    default:
      return false;
  }
};

module.exports = {
  canPerformAction
};
