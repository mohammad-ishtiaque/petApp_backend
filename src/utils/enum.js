const USER_ROLE = {
    USER: "USER",
    OWNER: "OWNER",
    ADMIN: "ADMIN",
  };
  
  const ENUM_NOTIFICATION_TYPE = {
    LIKE: "LIKE",
    MESSAGE: "MESSAGE",
    BOOKING: "BOOKING",
    NONE: "NONE",
  };
  
  const ENUM_SOCKET_EVENT = {
    CONNECT: "connection",
    MESSAGE_NEW: "new-message",
    CONVERSATION_UPDATE: "conversation_update",
    MARK_MESSAGES_AS_READ: "mark_message_as_read"
  };
  
  const HTTP_STATUS = {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
  };
  
  module.exports = {
    USER_ROLE,
    HTTP_STATUS,
    ENUM_NOTIFICATION_TYPE,
    ENUM_SOCKET_EVENT
  };
  