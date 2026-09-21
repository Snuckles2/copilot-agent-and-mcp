import { createSlice } from '@reduxjs/toolkit';

const USER_ROLES = ['member', 'administrator'];
const normalizeRole = role => USER_ROLES.includes(role) ? role : 'member';

const initialState = {
  token: localStorage.getItem('token') || null,
  username: localStorage.getItem('username') || null,
  role: normalizeRole(localStorage.getItem('role')),
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser(state, action) {
      state.token = action.payload.token;
      state.username = action.payload.username;
      state.role = normalizeRole(action.payload.role);
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('username', action.payload.username);
      localStorage.setItem('role', state.role);
    },
    logout(state) {
      state.token = null;
      state.username = null;
      state.role = 'member';
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('role');
    },
  },
});

export const { setUser, logout } = userSlice.actions;
export default userSlice.reducer;
