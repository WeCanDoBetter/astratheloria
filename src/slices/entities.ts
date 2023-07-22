import { createSlice } from "@reduxjs/toolkit";
import { RemoveFunctions } from "../lobby.js";
import { Entity } from "../entity.js";

export interface EntitiesSliceState {
  entities: Record<string, RemoveFunctions<Entity>>;
}

const initialState: EntitiesSliceState = {
  entities: {},
};

const entitiesSlice = createSlice({
  name: "entities",
  initialState,
  reducers: {
    addEntity: (state, action) => {
      state.entities[action.payload.id] = action.payload;
    },
    removeEntity: (state, action) => {
      delete state.entities[action.payload.id];
    },
  },
});

export const { addEntity, removeEntity } = entitiesSlice.actions;
export default entitiesSlice.reducer;
