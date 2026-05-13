import * as admin from "./admin";
import {
  notificationList,
  notificationMarkAllRead,
  notificationMarkRead,
} from "./notification";
import { reminderArchive, reminderCreate, reminderList } from "./reminder";
import {
  taskAddLink,
  taskArchive,
  taskCreate,
  taskGetById,
  taskList,
  taskListEvents,
  taskRemoveLink,
  taskStats,
  taskUpdate,
} from "./task";

export default {
  admin,
  notification: {
    list: notificationList,
    markAllRead: notificationMarkAllRead,
    markRead: notificationMarkRead,
  },
  reminder: {
    archive: reminderArchive,
    create: reminderCreate,
    list: reminderList,
  },
  task: {
    addLink: taskAddLink,
    archive: taskArchive,
    create: taskCreate,
    getById: taskGetById,
    list: taskList,
    listEvents: taskListEvents,
    removeLink: taskRemoveLink,
    stats: taskStats,
    update: taskUpdate,
  },
};
