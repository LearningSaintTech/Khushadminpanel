export const selectLoading = (state) => state.global.loading;

export const selectError = (state) => state.global.error;

export const selectToken = (state) => state.global.token;

export const selectIsLoggedIn = (state) =>
  Boolean(state.global.token);
