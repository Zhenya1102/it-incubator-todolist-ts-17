import { appAction } from "app/app-reducer";
import { createSlice } from "@reduxjs/toolkit";
import { addTodolist, fetchTodolists, removeTodolist, todolistsAction } from "features/TodolistsList/todolists-reducer";
import { createAppAsyncThunk, handleServerAppError, handleServerNetworkError } from "common/utils";
import { TaskPriorities, TaskStatuses } from "common/enums";
import { AddTaskArg, tasksApi, TaskType, UpdateTaskArg, UpdateTaskModelType } from "features/TodolistsList/tasksApi";

const initialState: TasksStateType = {};

const slice = createSlice({
  name: "tasks",
  initialState: {} as TasksStateType,
  reducers: {
    //
  },
  extraReducers: (builder) => {
    builder
      .addCase(removeTask.fulfilled, (state, action) => {
        const tasksForTodolist = state[action.payload.todolistId];
        const index = tasksForTodolist.findIndex((task) => task.id === action.payload.taskId);
        if (index !== -1) tasksForTodolist.splice(index, 1);
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state[action.payload.todolistId] = action.payload.tasks;
      })
      .addCase(addTask.fulfilled, (state, action) => {
        const tasksForCurrentTodolist = state[action.payload.task.todoListId];
        tasksForCurrentTodolist.unshift(action.payload.task);
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const tasksForTodolist = state[action.payload.todolistId];
        const index = tasksForTodolist.findIndex((task) => task.id === action.payload.taskId);
        if (index !== -1) {
          tasksForTodolist[index] = { ...tasksForTodolist[index], ...action.payload.domainModel };
        }
      })
      .addCase(todolistsAction.clearTodosData, (state, action) => {
        return {};
      })
      .addCase(fetchTodolists.fulfilled, (state, action) => {
        action.payload.todolists.forEach((tl) => {
          state[tl.id] = [];
        });
      })
      .addCase(removeTodolist.fulfilled, (state, action) => {
        delete state[action.payload.todolistId];
      })
      .addCase(addTodolist.fulfilled, (state, action) => {
        state[action.payload.todolist.id] = [];
      });
  },
});

// thunks
// Почти идеальная Санка
const fetchTasks = createAppAsyncThunk<{ tasks: TaskType[]; todolistId: string }, string>(
  "tasks/fetchTasks",
  async (todolistId, thunkAPI) => {
    const { dispatch, rejectWithValue } = thunkAPI;
    try {
      dispatch(appAction.setAppStatus({ status: "loading" }));
      const res = await tasksApi.getTasks(todolistId);
      const tasks = res.data.items;
      dispatch(appAction.setAppStatus({ status: "succeeded" }));
      return { tasks, todolistId };
    } catch (e) {
      handleServerNetworkError(e, dispatch);
      return rejectWithValue(null);
    }
  },
);

export enum ResultCode {
  success,
  error,
  captcha,
}

const addTask = createAppAsyncThunk<{ task: TaskType }, AddTaskArg>("tasks/addTask", async (arg, thunkAPI) => {
  const { dispatch, rejectWithValue } = thunkAPI;
  try {
    dispatch(appAction.setAppStatus({ status: "loading" }));
    const res = await tasksApi.createTask(arg);
    if (res.data.resultCode === ResultCode.success) {
      dispatch(appAction.setAppStatus({ status: "succeeded" }));
      const task = res.data.data.item;
      return { task };
    } else {
      handleServerAppError(res.data, dispatch);
      return rejectWithValue(null);
    }
  } catch (e) {
    handleServerNetworkError(e, dispatch);
    return rejectWithValue(null);
  }
});

export const removeTask = createAppAsyncThunk<
  any,
  {
    todolistId: string;
    taskId: string;
  }
>("tasks/removeTask", async (arg, thunkAPI) => {
  const { dispatch, rejectWithValue } = thunkAPI;
  try {
    dispatch(appAction.setAppStatus({ status: "loading" }));
    const res: any = await tasksApi.deleteTask(arg.todolistId, arg.taskId);
    if (res.data.resultCode === ResultCode.success) {
      dispatch(appAction.setAppStatus({ status: "succeeded" }));
      return { todolistId: arg.todolistId, taskId: arg.taskId };
    } else {
      handleServerAppError(res.data, dispatch);
      return rejectWithValue(null);
    }
  } catch (e) {
    handleServerNetworkError(e, dispatch);
    return rejectWithValue(null);
  }
});

const updateTask = createAppAsyncThunk<UpdateTaskArg, UpdateTaskArg>("tasks/updateTask", async (arg, thunkAPI) => {
  const { dispatch, rejectWithValue, getState } = thunkAPI;
  try {
    const state = getState();
    const task = state.tasks[arg.todolistId].find((t) => t.id === arg.taskId);
    if (!task) {
      console.warn("task not found in the state");
      return rejectWithValue(null);
    }
    const apiModel: UpdateTaskModelType = {
      deadline: task.deadline,
      description: task.description,
      priority: task.priority,
      startDate: task.startDate,
      title: task.title,
      status: task.status,
      ...arg.domainModel,
    };

    const res = await tasksApi.updateTask(arg.todolistId, arg.taskId, apiModel);
    if (res.data.resultCode === ResultCode.success) {
      return { taskId: arg.taskId, domainModel: arg.domainModel, todolistId: arg.todolistId };
    } else {
      handleServerAppError(res.data, dispatch);
      return rejectWithValue(null);
    }
  } catch (e) {
    handleServerNetworkError(e, dispatch);
    return rejectWithValue(null);
  }
});

export const tasksReducer = slice.reducer;
export const tasksAction = slice.actions;
export const tasksThunks = { fetchTasks, addTask, updateTask, removeTask };
// types
export type UpdateDomainTaskModelType = {
  title?: string;
  description?: string;
  status?: TaskStatuses;
  priority?: TaskPriorities;
  startDate?: string;
  deadline?: string;
};
export type TasksStateType = {
  [key: string]: Array<TaskType>;
};
