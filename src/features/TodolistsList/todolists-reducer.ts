import { handleServerNetworkError } from "common/utils/handleServerNetworkError";
import { appAction, RequestStatusType } from "app/app-reducer";
import { createSlice, current, PayloadAction } from "@reduxjs/toolkit";
import { todolistsApi, TodolistType } from "features/TodolistsList/todolistsApi";
import { createAppAsyncThunk } from "common/utils";

const initialState: Array<TodolistDomainType> = [];

const slice = createSlice({
  name: "todolists",
  initialState: [] as TodolistDomainType[],
  reducers: {
    changeTodolistFilter: (state, action: PayloadAction<{ id: string; filter: FilterValuesType }>) => {
      const index = state.findIndex((todo) => todo.id === action.payload.id);
      if (index !== -1) state[index].filter = action.payload.filter;
    },
    changeTodolistEntityStatus: (state, action: PayloadAction<{ id: string; entityStatus: RequestStatusType }>) => {
      const index = state.findIndex((todo) => todo.id === action.payload.id);
      if (index !== -1) state[index].entityStatus = action.payload.entityStatus;
    },
    clearTodosData: (state, action: PayloadAction<{}>) => {
      return [];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchTodolists.fulfilled, (state, action) => {
      return action.payload.todolists.map((tl) => ({ ...tl, filter: "all", entityStatus: "idle" }));
    });
    builder.addCase(removeTodolist.fulfilled, (state, action) => {
      const index = state.findIndex((el) => el.id === action.payload.todolistId);
      if (index !== -1) state.splice(index, 1);
    });
    builder.addCase(addTodolist.fulfilled, (state, action) => {
      console.log(current(state));
      state.unshift({ ...action.payload.todolist, filter: "all", entityStatus: "idle" });
    });
    builder.addCase(changeTodolistTitle.fulfilled, (state, action) => {
      console.log(current(state));
      const index = state.findIndex((todo) => todo.id === action.payload.todolistId);
      if (index !== -1) state[index].title = action.payload.title;
    });
  },
});

// thunks
export const fetchTodolists = createAppAsyncThunk("todo/fetchTodolists", async (arg, thunkAPI) => {
  const { dispatch, rejectWithValue } = thunkAPI;
  dispatch(appAction.setAppStatus({ status: "loading" }));
  const res = await todolistsApi.getTodolists();
  try {
    dispatch(appAction.setAppStatus({ status: "succeeded" }));
    return { todolists: res.data };
  } catch (e) {
    handleServerNetworkError(e, dispatch);
    return rejectWithValue(null);
  }
});
export const removeTodolist = createAppAsyncThunk("todo/removeTodolist", async (todolistId: string, thunkAPI) => {
  const { dispatch, rejectWithValue } = thunkAPI;
  try {
    dispatch(appAction.setAppStatus({ status: "loading" }));
    dispatch(todolistsAction.changeTodolistEntityStatus({ id: todolistId, entityStatus: "loading" }));
    const res = await todolistsApi.deleteTodolist(todolistId);
    dispatch(appAction.setAppStatus({ status: "succeeded" }));
    return { todolistId };
  } catch (e) {
    handleServerNetworkError(e, dispatch);
    return rejectWithValue(null);
  }
  //
});

export const addTodolist = createAppAsyncThunk("todo/addTodolist", async (title: string, thunkAPI) => {
  const { dispatch, rejectWithValue } = thunkAPI;
  try {
    dispatch(appAction.setAppStatus({ status: "loading" }));
    const res = await todolistsApi.createTodolist(title);
    dispatch(appAction.setAppStatus({ status: "succeeded" }));
    return { todolist: res.data.data.item };
  } catch (e) {
    handleServerNetworkError(e, dispatch);
    return rejectWithValue(null);
  }
});
export const changeTodolistTitle = createAppAsyncThunk(
  "todo/changeTodolistTitle",
  async (arg: { todolistId: string; title: string }, thunkAPI) => {
    const { dispatch, rejectWithValue } = thunkAPI;
    try {
      await todolistsApi.updateTodolist(arg.todolistId, arg.title);
      return { todolistId: arg.todolistId, title: arg.title };
    } catch (e) {
      handleServerNetworkError(e, dispatch);
      return rejectWithValue(null);
    }
    //
  },
);

export const todolistsReducer = slice.reducer;
export const todolistsAction = slice.actions;
export const todosThunks = { fetchTodolists, removeTodolist, addTodolist, changeTodolistTitle };

export type FilterValuesType = "all" | "active" | "completed";
export type TodolistDomainType = TodolistType & {
  filter: FilterValuesType;
  entityStatus: RequestStatusType;
};
