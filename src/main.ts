import Phaser from 'phaser';
import { BattleScene } from './scenes/BattleScene';
import { getLayout } from './presentation/layout';

const layout = getLayout();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1c1814',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: layout.width,
    height: layout.height,
  },
  input: {
    activePointers: 3,
  },
  scene: [BattleScene],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
