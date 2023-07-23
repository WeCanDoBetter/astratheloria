import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Arena {
  readonly id: string;
  readonly parentId?: string;
  readonly name: string;
  readonly description?: string;
  readonly author?: string;
  readonly license?: string;
  readonly homepage?: string;
  readonly repository?: string;
  readonly tags?: string[];
}

export interface ArenaSliceState {
  activeArena: Arena | null;
}

const initialState: ArenaSliceState = {
  activeArena: null,
};

const arenaSlice = createSlice({
  name: "arena",
  initialState,
  reducers: {
    setArena: (state, action: PayloadAction<Arena>) => {
      state.activeArena = action.payload;
    },
  },
});

export const { setArena } = arenaSlice.actions;
export default arenaSlice.reducer;
