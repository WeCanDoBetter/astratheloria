import { configureStore } from "@reduxjs/toolkit";
import entities from "./slices/entities.js";
import arena from "./slices/arena.js";

const store = configureStore({
  reducer: {
    arena,
    entities,
  },
});

export default store;

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
