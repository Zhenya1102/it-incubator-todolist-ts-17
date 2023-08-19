import { todolistsAPI, TodolistType } from "api/todolists-api";
import { Dispatch } from "redux";
import { handleServerNetworkError } from "utils/error-utils";
import { AppThunk } from "app/store";
import { appAction, RequestStatusType } from "app/app-reducer";
import { createSlice, current, PayloadAction } from "@reduxjs/toolkit";
import { fetchTasksTC } from "features/TodolistsList/tasks-reducer";

const initialState: Array<TodolistDomainType> = [];

const slice = createSlice({
  name: "todolists",
  initialState: [] as TodolistDomainType[],
  reducers: {
    addTodolist: (state, action: PayloadAction<{ todolist: TodolistType }>) => {
      console.log(current(state));
      state.unshift({ ...action.payload.todolist, filter: "all", entityStatus: "idle" });
    },
    removeTodolist: (state, action: PayloadAction<{ id: string }>) => {
      const index = state.findIndex((el) => el.id === action.payload.id);
      if (index !== -1) state.splice(index, 1);
    },
    changeTodolistTitle: (state, action: PayloadAction<{ id: string; title: string }>) => {
      const index = state.findIndex((todo) => todo.id === action.payload.id);
      if (index !== -1) state[index].title = action.payload.title;
    },
    changeTodolistFilter: (state, action: PayloadAction<{ id: string; filter: FilterValuesType }>) => {
      const index = state.findIndex((todo) => todo.id === action.payload.id);
      if (index !== -1) state[index].filter = action.payload.filter;
    },
    changeTodolistEntityStatus: (state, action: PayloadAction<{ id: string; entityStatus: RequestStatusType }>) => {
      const index = state.findIndex((todo) => todo.id === action.payload.id);
      if (index !== -1) state[index].entityStatus = action.payload.entityStatus;
    },
    setTodolists: (state, action: PayloadAction<{ todolists: TodolistType[] }>) => {
      return action.payload.todolists.map((tl) => ({ ...tl, filter: "all", entityStatus: "idle" }));
    },
    clearTodosData: (state, action: PayloadAction<{}>) => {
      return [];
    },
  },
});

export const todolistsReducer = slice.reducer;
export const todolistsAction = slice.actions;

// thunks
export const fetchTodolistsTC = (): AppThunk => {
  return (dispatch) => {
    dispatch(appAction.setAppStatus({ status: "loading" }));
    todolistsAPI
      .getTodolists()
      .then((res) => {
        dispatch(todolistsAction.setTodolists({ todolists: res.data }));
        dispatch(appAction.setAppStatus({ status: "succeeded" }));
        return res.data;
      })
      .then((todo) => {
        todo.forEach((tl) => {
          dispatch(fetchTasksTC(tl.id));
        });
      })
      .catch((error) => {
        handleServerNetworkError(error, dispatch);
      });
  };
};
export const removeTodolistTC = (id: string): AppThunk => {
  return (dispatch) => {
    //изменим глобальный статус приложения, чтобы вверху полоса побежала
    dispatch(appAction.setAppStatus({ status: "loading" }));
    //изменим статус конкретного тудулиста, чтобы он мог задизеблить что надо
    dispatch(todolistsAction.changeTodolistEntityStatus({ id, entityStatus: "loading" }));
    todolistsAPI.deleteTodolist(id).then((res) => {
      dispatch(todolistsAction.removeTodolist({ id }));
      //скажем глобально приложению, что асинхронная операция завершена
      dispatch(appAction.setAppStatus({ status: "succeeded" }));
    });
  };
};
export const addTodolistTC = (title: string): AppThunk => {
  return (dispatch) => {
    dispatch(appAction.setAppStatus({ status: "loading" }));
    todolistsAPI.createTodolist(title).then((res) => {
      dispatch(todolistsAction.addTodolist({ todolist: res.data.data.item }));
      dispatch(appAction.setAppStatus({ status: "succeeded" }));
    });
  };
};
export const changeTodolistTitleTC = (id: string, title: string): AppThunk => {
  return (dispatch) => {
    todolistsAPI.updateTodolist(id, title).then((res) => {
      dispatch(todolistsAction.changeTodolistTitle({ id, title }));
    });
  };
};

export type FilterValuesType = "all" | "active" | "completed";
export type TodolistDomainType = TodolistType & {
  filter: FilterValuesType;
  entityStatus: RequestStatusType;
};
