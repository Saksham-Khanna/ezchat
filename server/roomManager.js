const wifiRooms = new Map(); // networkId -> Map(roomId -> roomData)

const getNetworkRooms = (networkId) => {
  if (!wifiRooms.has(networkId)) {
    wifiRooms.set(networkId, new Map());
  }
  return wifiRooms.get(networkId);
};

const createRoom = (networkId, data) => {
  const rooms = getNetworkRooms(networkId);
  const roomId = data.room_id || `room_${Date.now()}`;
  const roomData = {
    room_id: roomId,
    roomName: data.roomName,
    description: data.description,
    creatorId: data.creatorId,
    members: [
      {
        userId: data.creatorId,
        role: 'admin',
        username: data.username,
        avatar_url: data.avatar_url
      }
    ],
    maxUsers: 10,
    networkId
  };
  rooms.set(roomId, roomData);
  return roomData;
};

const getRoom = (networkId, roomId) => {
  const rooms = getNetworkRooms(networkId);
  return rooms.get(roomId);
};

const joinRoom = (networkId, roomId, userData) => {
  const room = getRoom(networkId, roomId);
  if (!room) return { error: "Room not found" };
  if (room.members.length >= room.maxUsers) return { error: "Room Full (10/10)" };
  
  const isAlreadyMember = room.members.find(m => m.userId === userData.userId);
  if (!isAlreadyMember) {
    room.members.push({
      userId: userData.userId,
      role: 'member',
      username: userData.username,
      avatar_url: userData.avatar_url
    });
  }
  
  return { room };
};

const leaveRoom = (networkId, roomId, userId) => {
  const room = getRoom(networkId, roomId);
  if (!room) return null;

  const memberIndex = room.members.findIndex(m => m.userId === userId);
  if (memberIndex === -1) return room;

  const member = room.members[memberIndex];
  room.members.splice(memberIndex, 1);

  if (member.role === 'admin') {
    // If admin leaves, close room
    const rooms = getNetworkRooms(networkId);
    rooms.delete(roomId);
    return null; // Room deleted
  }

  return room;
};

const removeUser = (networkId, roomId, targetId) => {
    const room = getRoom(networkId, roomId);
    if (!room) return null;
    room.members = room.members.filter(m => m.userId !== targetId);
    return room;
};

const updateRole = (networkId, roomId, targetId, role) => {
    const room = getRoom(networkId, roomId);
    if (!room) return null;
    const member = room.members.find(m => m.userId === targetId);
    if (member) {
        member.role = role;
    }
    return room;
};

const renameRoom = (networkId, roomId, newName) => {
    const room = getRoom(networkId, roomId);
    if (!room) return null;
    room.roomName = newName;
    return room;
};

module.exports = {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  removeUser,
  updateRole,
  renameRoom,
  getNetworkRooms
};
