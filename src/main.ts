import Phaser from 'phaser';
import { BattleScene } from './scenes/BattleScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1c1814',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1120,
    height: 720,
  },
  scene: [BattleScene],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
