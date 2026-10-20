import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

const ringtoneSource = require('../assets/sounds/ringtone.mp3');

let player: AudioPlayer | null = null;

function getPlayer(): AudioPlayer {
  if (!player) {
    player = createAudioPlayer(ringtoneSource);
    player.loop = true;
  }
  return player;
}

export async function startRingtone(): Promise<void> {
  const audio = getPlayer();
  await audio.seekTo(0);
  audio.play();
}

export async function stopRingtone(): Promise<void> {
  if (!player) return;
  player.pause();
  await player.seekTo(0);
}
