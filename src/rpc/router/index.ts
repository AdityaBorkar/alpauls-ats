import * as admin from "./admin";
import {
  clientArchive,
  clientCreate,
  clientGetById,
  clientGetUploadUrl,
  clientList,
  clientListEvents,
  clientUpdate,
} from "./client";
import {
  contractArchive,
  contractCreate,
  contractGetById,
  contractList,
  contractListEvents,
  contractUpdate,
} from "./client-contract";
import {
  filterViewCreate,
  filterViewDelete,
  filterViewList,
  filterViewUpdate,
} from "./filter-view";
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
import { usersList } from "./users";

export const router = {
  admin,
  client: {
    archive: clientArchive,
    create: clientCreate,
    getById: clientGetById,
    getUploadUrl: clientGetUploadUrl,
    list: clientList,
    listEvents: clientListEvents,
    update: clientUpdate,
  },
  contract: {
    archive: contractArchive,
    create: contractCreate,
    getById: contractGetById,
    list: contractList,
    listEvents: contractListEvents,
    update: contractUpdate,
  },
  filterView: {
    create: filterViewCreate,
    delete: filterViewDelete,
    list: filterViewList,
    update: filterViewUpdate,
  },
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
  users: {
    list: usersList,
  },
};
