/**
 * Generate a cryptographically secure room ID
 * Format: room-XXXXXXXX (8 alphanumeric characters)
 */
export const generateRoomId = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  
  const randomString = Array.from(array)
    .map((byte) => chars[byte % chars.length])
    .join('');
  
  return `room-${randomString}`;
};

/**
 * Validate a room ID format
 */
export const isValidRoomId = (roomId: string): boolean => {
  const pattern = /^room-[a-z0-9]{8,}$/;
  return pattern.test(roomId);
};

/**
 * Format room ID for display (uppercase for readability)
 */
export const formatRoomIdDisplay = (roomId: string): string => {
  return roomId.toUpperCase();
};
