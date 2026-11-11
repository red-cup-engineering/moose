import { defineGame } from "../../src/game.mjs";

export const gardenGame = defineGame({
  id: "feltos.garden",
  name: "The Small Garden",
  start: "garden-gate",
  rooms: {
    "garden-gate": {
      name: "The Garden Gate",
      description: "An iron gate stands open beneath a climbing rose.",
      exits: { north: "kitchen-garden" },
    },
    "kitchen-garden": {
      name: "The Kitchen Garden",
      description: "Orderly beds of herbs surround a rain-darkened path.",
      exits: { south: "garden-gate" },
    },
  },
  things: {
    lantern: {
      name: "a brass lantern",
      description: "The lantern is warm, though no flame is visible.",
      location: "garden-gate",
    },
  },
});
