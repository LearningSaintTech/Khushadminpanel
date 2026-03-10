import { combineReducers } from "@reduxjs/toolkit";
import globalReducer from "./GlobalSlice";

const rootReducer = combineReducers({
  global: globalReducer,
});

export default rootReducer;
