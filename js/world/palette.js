// The CLAUDE.md palette as linear-space THREE.Colors. Every world material takes its colour from here
// (or from a mix of two of these); no other hues enter the scene.
import { Color } from 'three';

export const HEX = {
  ink: '#0A0A0B',
  char: '#15171A',
  steel: '#23262B',
  bone: '#F1E7D6',
  paper: '#FAF6EE',
  vermilion: '#FF5F1F',
  amber: '#FFA24A',
  cold: '#9FB4C8',
};

export const palette = Object.fromEntries(Object.entries(HEX).map(([name, hex]) => [name, new Color(hex)]));
