import { LEARNING_KEY, VOCAB_KEY } from "./config.js";

export const state = {
  bookData: null,
  currentLesson: 1,
  vocabMarkVisible: localStorage.getItem(VOCAB_KEY) !== "0",
  learningMode: localStorage.getItem(LEARNING_KEY) === "1",
  revealedByLesson: {},
  activeQuizWord: null,
};
